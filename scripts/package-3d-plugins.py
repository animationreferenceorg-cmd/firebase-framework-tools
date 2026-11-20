"""
Package the Autodesk Maya and Blender plugins into clean, production-ready ZIP
archives inside public/downloads/ (excluding __pycache__, *.pyc, and local caches).
"""

from __future__ import annotations

import os
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOWNLOADS_DIR = os.path.join(ROOT, "public", "downloads")

SKIP_DIRS = {"__pycache__", ".git", ".pytest_cache", "Animo_Prefs"}
SKIP_EXTS = {".pyc", ".pyo", ".DS_Store"}


def _should_skip(name: str) -> bool:
    if name in SKIP_DIRS:
        return True
    _, ext = os.path.splitext(name)
    return ext in SKIP_EXTS or name.startswith(".")


def _add_dir(zf: zipfile.ZipFile, src_dir: str, arc_prefix: str) -> int:
    count = 0
    for root, dirs, files in os.walk(src_dir):
        dirs[:] = [d for d in dirs if not _should_skip(d)]
        for fn in sorted(files):
            if _should_skip(fn):
                continue
            full = os.path.join(root, fn)
            rel = os.path.relpath(full, src_dir).replace("\\", "/")
            arc = f"{arc_prefix}/{rel}" if arc_prefix else rel
            zf.write(full, arc)
            count += 1
    return count


def package_maya() -> tuple[str, int]:
    out_zip = os.path.join(DOWNLOADS_DIR, "animref_maya_plugin.zip")
    maya_root = os.path.join(ROOT, "integrations", "animo-maya")
    with zipfile.ZipFile(out_zip, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        count = 0
        for top_file in ("drag_and_drop_install.py", "README.md"):
            full = os.path.join(maya_root, top_file)
            if os.path.isfile(full):
                zf.write(full, f"animref_maya_plugin/{top_file}")
                count += 1
        count += _add_dir(
            zf,
            os.path.join(maya_root, "Animo_Data", "Animo_AnimRef"),
            "animref_maya_plugin/Animo_Data/Animo_AnimRef",
        )
    return out_zip, count


def package_blender() -> tuple[str, int]:
    out_zip = os.path.join(DOWNLOADS_DIR, "animref_blender_addon.zip")
    addon_dir = os.path.join(ROOT, "integrations", "animref-blender", "animref_blender_addon")
    with zipfile.ZipFile(out_zip, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        count = _add_dir(zf, addon_dir, "animref_blender_addon")
    return out_zip, count


def main() -> None:
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)
    maya_zip, maya_n = package_maya()
    blender_zip, blender_n = package_blender()
    print(f"[Package] Maya:    {maya_zip} ({maya_n} files, {os.path.getsize(maya_zip):,} bytes)")
    print(f"[Package] Blender: {blender_zip} ({blender_n} files, {os.path.getsize(blender_zip):,} bytes)")


if __name__ == "__main__":
    main()
