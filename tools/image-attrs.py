#!/usr/bin/env python3
"""
Add loading/decoding/width/height attributes to every <img> on every page.

Run from the repo root:   python3 tools/image-attrs.py

  - width/height are read from the file on disk. CSS classes still control the
    rendered size; these attributes only give the browser an aspect ratio to
    reserve space with, which removes the layout shift as images arrive.
  - Images above the fold (the nav logo, the hero) load eagerly with high
    fetch priority. Everything else is lazy, so a visitor who never scrolls
    never downloads them.

dashboard.html is deliberately untouched.
"""
import glob
import os
import re
from PIL import Image

SKIP = {"dashboard.html", "new-footer.html"}

# Above the fold on every page: don't lazy-load these.
EAGER = ("logo",)

_dims = {}


def dims(src):
    if src in _dims:
        return _dims[src]
    path = src.split("?")[0].split("#")[0]
    try:
        with Image.open(path) as im:
            _dims[src] = im.size
    except Exception:
        _dims[src] = None
    return _dims[src]


def process(page):
    html = open(page, encoding="utf-8", errors="replace").read()
    hero = None
    m = re.search(r'<link rel="preload" as="image" href="([^"]+)"', html)
    if m:
        hero = m.group(1)

    changed = 0

    def fix(match):
        nonlocal changed
        tag = match.group(0)
        src_m = re.search(r'\ssrc="([^"]+)"', tag)
        if not src_m:
            return tag
        src = src_m.group(1)

        attrs = []
        above_fold = src.startswith("http") is False and (
            any(k in src for k in EAGER) or src == hero
        )
        if "loading=" not in tag and "decoding=" not in tag:
            if above_fold:
                attrs.append('loading="eager"')
                attrs.append('decoding="async"')
                if src == hero:
                    attrs.append('fetchpriority="high"')
            else:
                attrs.append('loading="lazy"')
                attrs.append('decoding="async"')

        if "width=" not in tag and not src.startswith("http"):
            wh = dims(src)
            if wh:
                attrs.append(f'width="{wh[0]}"')
                attrs.append(f'height="{wh[1]}"')

        if not attrs:
            return tag
        changed += 1
        return tag[:-1].rstrip() + " " + " ".join(attrs) + ">"

    html = re.sub(r"<img\b[^>]*>", fix, html)
    if changed:
        open(page, "w", encoding="utf-8").write(html)
    return changed


def main():
    total = 0
    for page in sorted(glob.glob("*.html")):
        if page in SKIP:
            continue
        n = process(page)
        total += n
        if n:
            print(f"  {n:>3} imgs updated in {page}")
    print(f"\n{total} <img> tags given loading/decoding/dimension attributes.")


if __name__ == "__main__":
    main()
