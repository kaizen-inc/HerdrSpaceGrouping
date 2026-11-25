"""Build the public ZIP, then verify that its installer works from an extraction."""
import hashlib
import os
import re
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path

version = Path("VERSION").read_text().strip()
if not re.fullmatch(r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)", version):
    raise SystemExit("Invalid VERSION")
out = Path(".dist")
out.mkdir(exist_ok=True)
name = f"herdr-space-grouping-v{version}"
archive = out / f"{name}.zip"
paths = [Path(file) for file in ("LICENSE", "README.md", "RECIPE.md", "VERSION", "install.sh", "preview.png", "layouts/grouped-spaces.json")]
paths += sorted(path for path in Path("mods").glob("*/*") if path.is_file() and path.suffix in {".js", ".json", ".svg"})
with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
    for path in paths:
        bundle.writestr(f"{name}/{path.as_posix()}", path.read_bytes())
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix(".zip.sha256").write_text(f"{digest}  {archive.name}\n", encoding="ascii")

with tempfile.TemporaryDirectory() as temp:
    home = Path(temp) / "app"
    with zipfile.ZipFile(archive) as bundle:
        bundle.extractall(temp)
    bash = Path(shutil.which("bash") or "bash")
    # Git for Windows' native launcher preserves argv and environment from Python.
    if os.name == "nt" and bash.parent.parent.name.lower() == "usr":
        bash = bash.parents[2] / "bin/bash.exe"
    subprocess.run([str(bash), "install.sh"], cwd=Path(temp) / name,
                   env={**os.environ, "HERDR_APP_HOME": home.as_posix()}, check=True)
    assert (home / "layouts/grouped-spaces.json").is_file()
    assert (home / "mods/space-group-picker/groups.js").read_bytes() == (home / "mods/grouped-spaces/groups.js").read_bytes()
    for icon in ("expand-all.svg", "collapse-all.svg"):
        assert (home / "mods/grouped-spaces" / icon).is_file()

print(archive)
