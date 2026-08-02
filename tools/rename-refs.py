#!/usr/bin/env python3
"""
Rewrite image references after tools/optimize-images.py converted PNGs to JPEG.

Run from the repo root:   python3 tools/rename-refs.py

Reads tools/renames.txt (old<TAB>new) and rewrites matching paths in every
.html/.css/.js file. Matches both src="..." attributes and CSS url(...) forms,
including the URL-escaped spelling of names that contained a space.
"""
import glob
import os
import urllib.parse

renames = {}
with open("tools/renames.txt") as fh:
    for line in fh:
        line = line.strip()
        if line:
            old, new = line.split("\t")
            renames[old] = new

# A path containing a space may appear raw or percent-encoded in the source.
variants = {}
for old, new in renames.items():
    variants[old] = new
    if " " in old:
        variants[urllib.parse.quote(old)] = new
        variants[old.replace(" ", "%20")] = new

targets = sorted(glob.glob("*.html") + glob.glob("*.css") + glob.glob("*.js"))
total = 0
for path in targets:
    text = open(path, encoding="utf-8", errors="replace").read()
    original = text
    hits = 0
    for old, new in variants.items():
        if old in text:
            hits += text.count(old)
            text = text.replace(old, new)
    if text != original:
        open(path, "w", encoding="utf-8").write(text)
        print(f"  {hits:>3} replaced in {path}")
        total += hits

print(f"\n{total} references updated across {len(targets)} files.")

# Verify nothing still points at a file that no longer exists.
import re
missing = []
for path in glob.glob("*.html"):
    html = open(path, encoding="utf-8", errors="replace").read()
    refs = re.findall(r'(?:src|href)="(?!https?:|#|mailto:|tel:|data:|//)([^"]+)"', html)
    refs += re.findall(r"url\(\s*['\"]?(?!https?:|data:)([^'\")]+)", html)
    for r in refs:
        r = urllib.parse.unquote(r.split("?")[0].split("#")[0].strip())
        if r.startswith("images/") and not os.path.isfile(r):
            missing.append((path, r))
if missing:
    print("\nSTILL BROKEN:")
    for p, r in missing:
        print(f"  {p}: {r}")
else:
    print("Verified: every images/ reference resolves to a file on disk.")
