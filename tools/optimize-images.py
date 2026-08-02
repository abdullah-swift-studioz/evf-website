#!/usr/bin/env python3
"""
Resize and re-encode every image in images/ to web-appropriate dimensions.

Run from the repo root:   python3 tools/optimize-images.py [--dry-run]

The source images were 4000-8000px originals straight from a camera or stock
site, displayed at 200-650px. This resizes each to roughly 2x its real display
size (enough for retina) and re-encodes as progressive JPEG.

Hero banners all sit behind a `from-blue-900/80 via-blue-800/70` gradient, so
they are 70-80% obscured and tolerate a lower quality setting than content
images, which are shown unobscured.

Heroes use `object-cover` / `bg-cover` in an h-[60vh] box, so anything taller
than ~1000px is cropped away by the browser and never seen. HERO_MAX_H trims
that centrally instead of shipping it.

Every PNG in this repo was verified fully opaque -- they are photographs, not
graphics -- so they convert to JPEG. Run tools/rename-refs.py afterwards to
update the HTML references.

Originals are recoverable from git history (commit b8f8b9a).
"""
import io
import os
import sys
from PIL import Image

DRY_RUN = "--dry-run" in sys.argv

HERO_MAX_H = 1000

# (max_width, jpeg_quality, cap_height_for_object_cover)
SETTINGS = {
    "images/services-images":        (1600, 78, HERO_MAX_H),   # hero bg, behind overlay
    "images/top-destination-images": (1600, 78, HERO_MAX_H),   # hero bg, behind overlay
    "images/home-page-images":       (1200, 82, None),         # content, shown clearly
    "images/team":                   (800,  82, None),         # portraits
}
DEFAULT = (1600, 82, None)
OVERRIDES = {
    "images/logo.jpeg": (320, 88, None),  # nav logo renders at 96px tall
}

RENAMES = {}


def settings_for(path):
    if path in OVERRIDES:
        return OVERRIDES[path]
    return SETTINGS.get(os.path.dirname(path), DEFAULT)


def optimise(path):
    before = os.path.getsize(path)
    max_w, quality, cap_h = settings_for(path)

    im = Image.open(path)
    im.load()
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    if cap_h and im.height > cap_h:
        top = (im.height - cap_h) // 2
        im = im.crop((0, top, im.width, top + cap_h))

    stem, ext = os.path.splitext(path)
    if ext.lower() == ".png":
        # "uk-visa (1).png" -> "uk-visa.jpg"; the space is invalid in a URL
        out = stem.replace(" (1)", "") + ".jpg"
        RENAMES[path] = out
    else:
        out = path

    im = im.convert("RGB")
    if DRY_RUN:
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=quality, optimize=True,
                progressive=True, subsampling=2)
        after = len(buf.getvalue())
    else:
        im.save(out, "JPEG", quality=quality, optimize=True,
                progressive=True, subsampling=2)
        if out != path:
            os.remove(path)
        after = os.path.getsize(out)
    return before, after, out, im.size


def main():
    files = []
    for root, _dirs, names in os.walk("images"):
        for n in sorted(names):
            if n.lower().endswith((".jpg", ".jpeg", ".png")):
                files.append(os.path.join(root, n))

    total_before = total_after = 0
    print(f"{'BEFORE':>12} {'AFTER':>9} {'SAVED':>6}  {'FINAL':>10}  FILE")
    for f in sorted(files):
        b, a, out, size = optimise(f)
        total_before += b
        total_after += a
        pct = (1 - a / b) * 100 if b else 0
        name = f"{f} -> {os.path.basename(out)}" if out != f else f
        print(f"{b:>12,} {a:>9,} {pct:5.1f}%  {size[0]:>4}x{size[1]:<5}  {name}")

    saved = total_before - total_after
    print(f"\nTOTAL {total_before:,} -> {total_after:,} bytes  "
          f"({(1 - total_after / total_before) * 100:.1f}% smaller, {saved / 1e6:.1f} MB saved)")

    if RENAMES and not DRY_RUN:
        with open("tools/renames.txt", "w") as fh:
            for old, new in sorted(RENAMES.items()):
                fh.write(f"{old}\t{new}\n")
        print(f"\n{len(RENAMES)} PNGs converted to JPEG -> tools/renames.txt")
        print("Next: python3 tools/rename-refs.py")


if __name__ == "__main__":
    main()
