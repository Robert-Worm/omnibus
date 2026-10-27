"""Prepare complete blind-reader inputs; never invent readings or approve content."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import shutil
import stat
import subprocess

from pypdf import PdfReader, __version__ as pypdf_version

SKILL = Path(__file__).resolve().parent.parent
CONTRACTS = ("CONTRACT.md", "record_contract.py")
ROLES = ("extractor", "inventory")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe_path(value, directory=False):
    """Refuse links before resolving: inputs belong to the local coordinator."""
    path = Path(value).absolute()
    for part in (path, *path.parents):
        if part.is_symlink() or getattr(part.lstat(), "st_file_attributes", 0) & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0):
            raise ValueError("Source and destination must not use links")
    if directory and not path.is_dir():
        raise ValueError("Destination parent must already exist")
    if not directory and not path.is_file():
        raise ValueError("Expected a regular input file")
    return path


def write(path, value):
    data = value if isinstance(value, bytes) else json.dumps(value, ensure_ascii=False, indent=2).encode("utf8")
    with path.open("xb") as stream:
        stream.write(data)
    return digest(data)


def prepare_source(pdf_path, destination, pdf_sha256, source_id, renderer="pdftoppm"):
    if not re.fullmatch(r"[a-f0-9]{64}", pdf_sha256):
        raise ValueError("Externally retained PDF checksum required")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,127}", source_id):
        raise ValueError("Invalid source identity")
    pdf = safe_path(pdf_path)
    if pdf.stat().st_size > 256 * 1024 * 1024:
        raise ValueError("PDF exceeds 256 MiB; prepare a separately reviewed route")
    original = pdf.read_bytes()
    if digest(original) != pdf_sha256:
        raise ValueError("PDF differs from external checksum")
    reader = PdfReader(io.BytesIO(original), strict=True)
    if reader.is_encrypted:
        raise ValueError("Encrypted PDF: provide an authorized readable source")
    if not 0 < len(reader.pages) <= 2000:
        raise ValueError("Expected 1..2000 complete pages; never take a sample")
    text, pages = "", []
    for number, page in enumerate(reader.pages, 1):
        content = page.extract_text() or ""
        start = len(text)
        text += f"===== PAGE {number} =====\n{content}\n"
        pages.append(dict(page=number, start=start, end=len(text), characters=len(content)))
    source = dict(source_id=source_id, pdf_path="source.pdf", pdf_sha256=pdf_sha256,
                  text_sha256=digest(text.encode("utf8")), start=0, end=len(text), quote=text, pages=pages)
    if len(json.dumps(source, ensure_ascii=False).encode("utf8")) > 7 * 1024 * 1024:
        raise ValueError("Source JSON exceeds portable evidence budget; do not truncate")
    # Read only the distributed instructions, never execute scripts from a packet.
    kit = SKILL / "references" / "report-kit"
    resources = {"contracts/" + name: (kit / "contracts" / name).read_bytes() for name in CONTRACTS}
    for name in ("roles/source-reader.md", "QUALITY.md", "SOURCE-OUTPUT.md"):
        resources[name] = (kit / name).read_bytes()
    program = shutil.which(str(renderer))
    if not program:
        raise ValueError("Install Poppler pdftoppm or pass its executable path")
    root = Path(destination).absolute()
    safe_path(root.parent, directory=True)
    root = root.resolve()
    if root.is_relative_to(SKILL):
        raise ValueError("Keep generated packets outside the skill")
    root.mkdir()  # Exclusive: never replace a packet, including a partial one.
    write(root / "source.pdf", original)
    write(root / "source.txt", text.encode("utf8"))
    write(root / "SOURCE.json", source)
    visual = root / "visual"
    visual.mkdir()
    subprocess.run([program, "-scale-to", "1600", "-png", str(root / "source.pdf"), str(visual / "page")],
                   check=True, capture_output=True, timeout=300)
    actual = {}
    for path in visual.iterdir():
        safe_path(path)
        match = re.fullmatch(r"page-([0-9]+)\.png", path.name)
        if not match or int(match[1]) in actual:
            raise ValueError("Unexpected or duplicate rendered page")
        image = path.read_bytes()
        if len(image) < 24 or image[:8] != b"\x89PNG\r\n\x1a\n" or image[12:16] != b"IHDR":
            raise ValueError("Renderer did not return PNG page images")
        actual[int(match[1])] = path
    if set(actual) != set(range(1, len(pages) + 1)):
        raise ValueError("Rendered page set differs from complete PDF")
    source_names = ["source.pdf", "source.txt", "SOURCE.json", *["visual/" + actual[n].name for n in sorted(actual)]]
    frozen = {name: digest((root / name).read_bytes()) for name in source_names}
    for role, prefix in zip(ROLES, ("E", "I")):
        folder = root / role
        folder.mkdir()
        (folder / "output").mkdir()
        (folder / "visual").mkdir()
        for name in source_names:
            frozen[f"{role}/{name}"] = write(folder / name, (root / name).read_bytes())
        for name in CONTRACTS:
            frozen[f"{role}/{name}"] = write(folder / name, resources["contracts/" + name])
        task = "\n".join(resources[name].decode("utf8") for name in
                         ("roles/source-reader.md", "QUALITY.md", "SOURCE-OUTPUT.md"))
        task += (f"\nToegewezen rol: {role}. source_id: {source_id}. Recordprefix: {source_id}-{prefix}. "
                 f"Volledige pagina's: 1..{len(pages)}. PDF: source.pdf. Afbeeldingen: visual/. "
                 "Lees alleen deze eigen map. Schrijf uitsluitend in output/.\n")
        frozen[f"{role}/TASK.md"] = write(folder / "TASK.md", task.encode("utf8"))
    if pdf.read_bytes() != original or (root / "source.pdf").read_bytes() != original:
        raise ValueError("Source changed during preparation")
    freeze = dict(pdf_sha256=pdf_sha256, text_sha256=source["text_sha256"], source_pages=len(pages),
                  characters=len(text), packet_hashes=frozen, preparation=dict(
                      tool="prepare-source.py", tool_sha256=digest(Path(__file__).read_bytes()),
                      pypdf_version=pypdf_version, renderer_sha256=digest(Path(program).read_bytes()),
                      resource_hashes={name: digest(data) for name, data in resources.items()}))
    # Written last: an interrupted/failed conversion has no completed input freeze.
    freeze_hash = write(root / "INPUT-FREEZE.json", freeze)
    return dict(status="INPUTS_PREPARED_NOT_READ", pages=len(pages), pdf_sha256=pdf_sha256,
                input_freeze_sha256=freeze_hash, publishable=False, contentValidated=False, reviewValidated=False)



if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--packet", required=True)
    parser.add_argument("--pdf-sha256", required=True)
    parser.add_argument("--source-id", required=True)
    parser.add_argument("--renderer", default="pdftoppm")
    args = parser.parse_args()
    try:
        print(json.dumps(prepare_source(args.pdf, args.packet, args.pdf_sha256, args.source_id, args.renderer), indent=2))
    except Exception as error:
        parser.exit(1, f"Preparation stopped: {error}\n")
