"""Inspect, never extract, the locally saved Docker archive (Python stdlib only)."""
import hashlib
import json
import sys
import tarfile


def inspect(archive_path, package_path, canary):
    with open(package_path + '/runtime-package.json', 'rb') as source:
        manifest_bytes = source.read()
    receipt = json.loads(manifest_bytes)
    expected = {**receipt['files'], 'runtime-package.json': {
        'bytes': len(manifest_bytes), 'sha256': hashlib.sha256(manifest_bytes).hexdigest()}}
    seen = set()
    prefix = 'app/omnibus-runtime/'
    layer_count = 0
    with tarfile.open(archive_path, 'r') as archive:
        manifests = json.load(archive.extractfile('manifest.json'))
        assert len(manifests) == 1, 'Expected one image'
        for layer_name in manifests[0]['Layers']:
            layer_count += 1
            with tarfile.open(fileobj=archive.extractfile(layer_name), mode='r|*') as layer:
                for member in layer:
                    path = member.name.removeprefix('./').rstrip('/')
                    assert '..' not in path.split('/') and not path.startswith('/'), 'Unsafe layer path'
                    assert 'OMNIBUS_SYNTHETIC_CONTEXT_EXCLUSION_CANARY' not in path
                    if path.startswith(prefix) and not member.isdir():
                        name = path[len(prefix):]
                        assert name in expected and member.isfile(), 'Unexpected application layer file: ' + name
                        seen.add(name)
                        assert member.size == expected[name]['bytes'], 'Application layer size mismatch'
                    if member.isfile():
                        digest = hashlib.sha256()
                        tail = b''
                        stream = layer.extractfile(member)
                        while chunk := stream.read(1024 * 1024):
                            assert canary not in tail + chunk, 'Excluded canary present in image layer'
                            tail = (tail + chunk)[-(len(canary) - 1):]
                            digest.update(chunk)
                        if path.startswith(prefix):
                            assert digest.hexdigest() == expected[path[len(prefix):]]['sha256'], 'Application layer hash mismatch'
    assert seen == set(expected), 'Application layer inventory incomplete'
    return {'layers': layer_count, 'applicationFiles': len(seen), 'canaryAbsent': True}


if __name__ == '__main__':
    print(json.dumps(inspect(sys.argv[1], sys.argv[2], sys.argv[3].encode())))
