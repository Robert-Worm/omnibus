"""Synthetic PDFs only: no real reading, review, or approval."""
import base64
import importlib.util
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "skills/omnibus-add-report/scripts/prepare-source.py"
spec = importlib.util.spec_from_file_location("prepare_source", SCRIPT)
prep = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prep)
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV3sAAAAASUVORK5CYII=")


class PreparationTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.pdf = self.root / "input.pdf"
        writer = PdfWriter()
        page = writer.add_blank_page(width=200, height=200)
        font = writer._add_object(DictionaryObject({NameObject("/Type"): NameObject("/Font"), NameObject("/Subtype"): NameObject("/Type1"), NameObject("/BaseFont"): NameObject("/Helvetica")}))
        page[NameObject("/Resources")] = DictionaryObject({NameObject("/Font"): DictionaryObject({NameObject("/F1"): font})})
        stream = DecodedStreamObject()
        stream.set_data(b"BT /F1 12 Tf 10 100 Td (Synthetic source only) Tj ET")
        page[NameObject("/Contents")] = writer._add_object(stream)
        writer.add_blank_page(width=200, height=200)
        with self.pdf.open("wb") as output:
            writer.write(output)
        self.original = self.pdf.read_bytes()
        self.packet = self.root / "packet"

    def render(self, args, **kwargs):
        self.assertEqual(args[1:4], ["-scale-to", "1600", "-png"])
        self.assertTrue(kwargs["check"])
        self.assertEqual(kwargs["timeout"], 300)
        for number in (1, 2):
            Path(args[-1] + f"-{number}.png").write_bytes(PNG)

    def prepare(self, renderer=None):
        if renderer:
            return prep.prepare_source(self.pdf, self.packet, prep.digest(self.original), "synthetic-report", renderer)
        with patch.object(prep.shutil, "which", return_value=str(SCRIPT)), patch.object(prep.subprocess, "run", side_effect=self.render):
            return prep.prepare_source(self.pdf, self.packet, prep.digest(self.original), "synthetic-report")

    def test_complete_inputs_are_frozen_without_reading_claims(self):
        result = self.prepare()
        self.assertEqual(result["status"], "INPUTS_PREPARED_NOT_READ")
        self.assertFalse(result["publishable"] or result["contentValidated"] or result["reviewValidated"])
        source = json.loads((self.packet / "SOURCE.json").read_text("utf8"))
        self.assertEqual([p["page"] for p in source["pages"]], [1, 2])
        self.assertEqual(source["pages"][1]["characters"], 0)
        self.assertIn("Synthetic source only", source["quote"])
        self.assertEqual(source["quote"], (self.packet / "source.txt").read_text("utf8"))
        self.assertEqual(source["end"], len(source["quote"]))
        freeze = json.loads((self.packet / "INPUT-FREEZE.json").read_text("utf8"))
        self.assertEqual(prep.digest((self.packet / "INPUT-FREEZE.json").read_bytes()), result["input_freeze_sha256"])
        for name, expected in freeze["packet_hashes"].items():
            self.assertEqual(prep.digest((self.packet / name).read_bytes()), expected)
        for role in prep.ROLES:
            self.assertEqual(list((self.packet / role / "output").iterdir()), [])
            for name in ("source.pdf", "source.txt", "SOURCE.json", "visual/page-1.png", "visual/page-2.png"):
                self.assertEqual((self.packet / role / name).read_bytes(), (self.packet / name).read_bytes())
        self.assertFalse((self.packet / "FIRST-SUBMISSIONS.json").exists())
        self.assertEqual(self.pdf.read_bytes(), self.original)

    def test_missing_or_failed_render_never_creates_a_freeze(self):
        def incomplete(args, **kwargs):
            Path(args[-1] + "-1.png").write_bytes(PNG)
        with patch.object(prep.shutil, "which", return_value=str(SCRIPT)), patch.object(prep.subprocess, "run", side_effect=incomplete):
            with self.assertRaisesRegex(ValueError, "complete PDF"):
                prep.prepare_source(self.pdf, self.packet, prep.digest(self.original), "synthetic-report")
        self.assertFalse((self.packet / "INPUT-FREEZE.json").exists())
        with self.assertRaises(FileExistsError):
            self.prepare()

    def test_wrong_pin_encrypted_and_empty_sources_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "external checksum"):
            prep.prepare_source(self.pdf, self.packet, "0" * 64, "synthetic-report")
        for encrypted in (False, True):
            writer = PdfWriter()
            if encrypted:
                writer.add_blank_page(width=100, height=100)
                writer.encrypt("synthetic-test")
            data = io.BytesIO(); writer.write(data); self.pdf.write_bytes(data.getvalue())
            with self.assertRaises(ValueError):
                prep.prepare_source(self.pdf, self.packet, prep.digest(data.getvalue()), "synthetic-report")
        self.assertFalse(self.packet.exists())

    def test_existing_packet_is_never_overwritten(self):
        self.prepare()
        before = (self.packet / "INPUT-FREEZE.json").read_bytes()
        with self.assertRaises(FileExistsError):
            self.prepare()
        self.assertEqual((self.packet / "INPUT-FREEZE.json").read_bytes(), before)

    def test_changed_pdf_during_render_has_no_freeze(self):
        def changed(args, **kwargs):
            self.render(args, **kwargs)
            self.pdf.write_bytes(b"changed source")
        with patch.object(prep.shutil, "which", return_value=str(SCRIPT)), patch.object(prep.subprocess, "run", side_effect=changed):
            with self.assertRaisesRegex(ValueError, "Source changed"):
                prep.prepare_source(self.pdf, self.packet, prep.digest(self.original), "synthetic-report")
        self.assertFalse((self.packet / "INPUT-FREEZE.json").exists())

    def test_non_bmp_text_uses_codepoint_offsets_without_normalization(self):
        text = "Café 😀\ne\u0301"
        pages = [SimpleNamespace(extract_text=lambda: text), SimpleNamespace(extract_text=lambda: "")]
        with patch.object(prep, "PdfReader", return_value=SimpleNamespace(is_encrypted=False, pages=pages)):
            self.prepare()
        source = json.loads((self.packet / "SOURCE.json").read_text("utf8"))
        first = source["pages"][0]
        self.assertEqual(first["characters"], len(text))
        self.assertEqual(source["quote"][first["start"]:first["end"]], "===== PAGE 1 =====\n" + text + "\n")
        self.assertEqual(source["pages"][1]["start"], first["end"])

    @unittest.skipUnless(shutil.which("node"), "Node required for the phase-helper integration test")
    def test_frozen_source_connects_to_stage_checks_without_approving_content(self):
        prepared = self.prepare()
        files = {}
        names = ["scripts/prepare-source.py", "scripts/stage-receipts.mjs", "scripts/report-stages.mjs"]
        names += ["references/report-kit/" + name for name in (
            "contracts/CONTRACT.md", "contracts/record_contract.py", "roles/source-reader.md", "QUALITY.md", "SOURCE-OUTPUT.md")]
        for name in names:
            target = self.packet / "kit" / name
            target.parent.mkdir(parents=True, exist_ok=True)
            data = (prep.SKILL / name).read_bytes()
            target.write_bytes(data); files[name] = prep.digest(data)
        manifest_hash = prep.write(self.packet / "kit/RELEASE-MANIFEST.json", dict(author_agent="synthetic-author", files=files))
        approval_hash = prep.write(self.packet / "kit/APPROVAL.json", dict(decision="APPROVE", reviewer_agent="synthetic-reviewer", target_manifest_sha256=manifest_hash))
        prep.write(self.packet / "RELEASE-BINDING.json", dict(kit_manifest_path="kit/RELEASE-MANIFEST.json", kit_manifest_sha256=manifest_hash,
                   kit_approval_path="kit/APPROVAL.json", kit_approval_sha256=approval_hash))
        args = [shutil.which("node"), str(prep.SKILL / "scripts/stage-receipts.mjs"), "start", "--packet", str(self.packet),
                "--stage", "source_a", "--actor", "synthetic-reader-a", "--release-sha256", manifest_hash, "--approval-sha256", approval_hash]
        rejected = subprocess.run(args, capture_output=True, text=True, timeout=30)
        self.assertNotEqual(rejected.returncode, 0)
        self.assertIn("input freeze hash required", rejected.stderr)
        args += ["--input-freeze-sha256", prepared["input_freeze_sha256"]]
        result = subprocess.run(args, capture_output=True, text=True, timeout=30, check=True)
        self.assertEqual(json.loads(result.stdout)["status"], "STAGE_STARTED")
        (self.packet / "inventory/visual/page-1.png").write_bytes(b"changed image")
        args[args.index("source_a")] = "source_b"
        rejected = subprocess.run(args, capture_output=True, text=True, timeout=30)
        self.assertNotEqual(rejected.returncode, 0)
        self.assertIn("input/output changed", rejected.stderr)
        freeze = json.loads((self.packet / "INPUT-FREEZE.json").read_text("utf8"))
        del freeze["preparation"]
        (self.packet / "INPUT-FREEZE.json").write_text(json.dumps(freeze), encoding="utf8")
        rejected = subprocess.run(args, capture_output=True, text=True, timeout=30)
        self.assertNotEqual(rejected.returncode, 0)
        self.assertIn("input freeze hash required", rejected.stderr)

    @unittest.skipUnless(shutil.which("pdftoppm"), "Poppler unavailable; real render is also checked locally")
    def test_real_poppler_prepares_both_pdf_pages(self):
        installed = self.root / "standalone-skill"
        shutil.copytree(prep.SKILL, installed)
        process = subprocess.run([sys.executable, "-B", str(installed / "scripts/prepare-source.py"),
            "--pdf", str(self.pdf), "--packet", str(self.packet), "--pdf-sha256", prep.digest(self.original),
            "--source-id", "synthetic-report", "--renderer", shutil.which("pdftoppm")],
            check=True, capture_output=True, text=True, timeout=30)
        result = json.loads(process.stdout)
        self.assertEqual(result["pages"], 2)
        self.assertEqual(len(list((self.packet / "visual").glob("*.png"))), 2)


if __name__ == "__main__":
    unittest.main()
