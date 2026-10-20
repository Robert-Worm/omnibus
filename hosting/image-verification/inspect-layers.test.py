import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('layers', Path(__file__).with_name('inspect-layers.py'))
layers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(layers)


class LayerChecks(unittest.TestCase):
    def inspect(self, extra=None):
        with tempfile.TemporaryDirectory(prefix='omnibus-image-layer-') as root:
            root = Path(root)
            manifest = b'{"files":{}}'
            (root / 'runtime-package.json').write_bytes(manifest)
            blob = io.BytesIO()
            with tarfile.open(fileobj=blob, mode='w') as layer:
                entries = [('app/omnibus-runtime/runtime-package.json', manifest)]
                if extra:
                    entries.append(extra)
                for name, value in entries:
                    member = tarfile.TarInfo(name)
                    member.size = len(value)
                    layer.addfile(member, io.BytesIO(value))
            archive = root / 'synthetic.tar'
            with tarfile.open(archive, 'w') as outer:
                for name, value in [('manifest.json', json.dumps([{'Layers': ['layer.tar']}]).encode()),
                                    ('layer.tar', blob.getvalue())]:
                    member = tarfile.TarInfo(name)
                    member.size = len(value)
                    outer.addfile(member, io.BytesIO(value))
            return layers.inspect(str(archive), str(root), b'SYNTHETIC_CANARY')

    def test_exact_inventory(self):
        self.assertEqual(self.inspect(), {'layers': 1, 'applicationFiles': 1, 'canaryAbsent': True})

    def test_unexpected_application_file(self):
        with self.assertRaisesRegex(AssertionError, 'Unexpected application'):
            self.inspect(('app/omnibus-runtime/private.sqlite', b'synthetic'))

    def test_canary_outside_app(self):
        with self.assertRaisesRegex(AssertionError, 'Excluded canary'):
            self.inspect(('tmp/removed-secret', b'SYNTHETIC_CANARY'))

    def test_changed_application_bytes(self):
        with self.assertRaisesRegex(AssertionError, 'hash mismatch'):
            self.inspect(('app/omnibus-runtime/runtime-package.json', b'{"files":[]}'))

    def test_changed_application_size(self):
        with self.assertRaisesRegex(AssertionError, 'size mismatch'):
            self.inspect(('app/omnibus-runtime/runtime-package.json', b'short'))

    def test_unsafe_layer_path(self):
        with self.assertRaisesRegex(AssertionError, 'Unsafe layer path'):
            self.inspect(('../outside', b'synthetic'))

    def test_canary_in_path(self):
        with self.assertRaisesRegex(AssertionError, 'Excluded canary'):
            self.inspect(('tmp/OMNIBUS_SYNTHETIC_CONTEXT_EXCLUSION_CANARY', b'synthetic'))


class OptimizationChecks(unittest.TestCase):
    def test_validation_survives_flags_and_inherited_environment(self):
        for flag, optimization in [('-O', None), ('-OO', None), (None, '1')]:
            with self.subTest(flag=flag, optimization=optimization):
                env = dict(os.environ)
                env.pop('PYTHONOPTIMIZE', None)
                if optimization is not None:
                    env['PYTHONOPTIMIZE'] = optimization
                command = [sys.executable, '-B']
                if flag:
                    command.append(flag)
                # Select only fixtures: never recursively run this driver.
                command.extend([str(Path(__file__).resolve()), 'LayerChecks'])
                result = subprocess.run(command, env=env, capture_output=True,
                                        text=True, timeout=15, check=False)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
