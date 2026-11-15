#!/usr/bin/env python3
"""Cache the latest day of NASA EPIC natural-color images inside the static site.

Why: epic.gsfc.nasa.gov serves the images without CORS headers, so a static page can show
them but cannot read their pixels to re-project them onto the 3D globe. A same-origin copy
fixes that. Images are NASA EPIC public-domain data; nothing is altered except resizing.

Usage: python3 tools/bake_epic.py   (requires Pillow)  -> writes data/epic/
"""
import io, json, re, sys, urllib.request
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "data" / "epic"
UA = {"User-Agent": "CodexHiveAstra/0.2 (+https://astra.codex-hive.com)"}
SIZE = 640


def get(url, timeout=60):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read()


def main():
    meta = json.loads(get("https://epic.gsfc.nasa.gov/api/natural"))
    meta = sorted([m for m in meta if m.get("image") and m.get("date") and m.get("centroid_coordinates")], key=lambda m: m["date"])
    if not meta:
        print("EPIC returned no frames; leaving existing cache untouched")
        return 0
    day = meta[-1]["date"][:10]
    meta = [m for m in meta if m["date"][:10] == day]
    OUT.mkdir(parents=True, exist_ok=True)
    try:
        old = json.loads((OUT / "manifest.json").read_text())
        if old.get("day") == day and [f["meta"]["image"] for f in old.get("frames", [])] == [m["image"] for m in meta] \
                and all((OUT / f["file"]).exists() for f in old["frames"]):
            print("EPIC cache already current for", day, "- nothing to do")
            return 0
    except (OSError, ValueError, KeyError):
        pass
    frames = []
    for m in meta:
        if not re.fullmatch(r"epic_1b_\d{14}", m["image"]):
            continue
        y, mo, d = day.split("-")
        raw = get(f"https://epic.gsfc.nasa.gov/archive/natural/{y}/{mo}/{d}/jpg/{m['image']}.jpg")
        im = Image.open(io.BytesIO(raw)).convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)
        name = m["image"] + ".webp"
        im.save(OUT / name, "WEBP", quality=78, method=6)
        keep = {k: m[k] for k in ("identifier", "image", "date", "centroid_coordinates", "caption") if k in m}
        frames.append({"file": name, "meta": keep})
        print("cached", m["date"], name)
    if not frames:
        return 1
    keepnames = {f["file"] for f in frames}
    for p in OUT.glob("epic_1b_*.webp"):
        if p.name not in keepnames:
            p.unlink()
    manifest = {"day": day, "source": "https://epic.gsfc.nasa.gov/api/natural", "license": "NASA EPIC imagery, public domain (NASA/NOAA DSCOVR)",
                "baked_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "frames": frames}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
