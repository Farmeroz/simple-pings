"""Build a clean Foundry archive from an explicit runtime allowlist."""
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'module.json').read_text())
output = root / 'dist'
output.mkdir(exist_ok=True)
with ZipFile(output / f"simple-pings-v{manifest['version']}.zip", 'w', ZIP_DEFLATED) as archive:
    paths = [root / name for name in ['module.json', 'README.md', 'NOTICE.md', 'LICENSE', 'COPYING', 'package.json']]
    paths += sorted((root / 'scripts').glob('*.js'))
    for path in paths:
        archive.write(path, Path('simple-pings') / path.relative_to(root))
(output / 'module.json').write_text(json.dumps(manifest, indent=2) + '\n')
