#!/usr/bin/env python3
"""
Inline the site's stylesheets into every page, and version-stamp script.js.

Run from the repo root:   python3 tools/inline-css.py
Run it after any change to styles.css, script.js or the Tailwind build.

Why the CSS is inlined
----------------------
The nav rendered broken on a first visit and came good on a reload. The bar's
layout lives in dist/tailwind.css (the utilities deciding which nav is on
screen, keeping the dropdown panels off it, painting the white bar) and in
styles.css. Both were render-blocking <link>s -- but a stylesheet the browser
never receives does not block anything, it simply never applies, and the page
paints with whatever it has. That is what visitors were seeing: the document,
unstyled.

Inlining an abridged "critical" block fixed the masthead but left the rest of
the page exposed, and a client hit exactly that -- a correct nav sitting above
a completely unstyled body. Icons from cdnjs had loaded on that same view while
both same-origin sheets had not, which is the tell: the failure is in getting
these two files from the origin, not in the CSS.

That origin is slow -- roughly 1.1s to first byte for a 5.6KB static file -- so
each page load spent about a second on the HTML and another on the two sheets
before it could paint correctly. A wide window for a request to drop, and the
sheets carry a one-year cache with no version in the URL, so a bad or outdated
cache entry sticks and a normal reload will not clear it.

Inlining removes the whole class of problem. There is no same-origin CSS
request left to fail, be blocked, or come back stale, and first paint costs one
round trip instead of three. The page cannot render unstyled because its styles
arrive in the same response as its markup.

The trade is page weight: ~15KB gzipped of CSS in every page rather than once
across the site. On a static marketing site whose HTML is already served
no-cache, that is worth a second off first paint and the bug being impossible.

Version stamps
--------------
script.js is still a separate request and is served with the same one-year
cache, so it gets ?v=<content hash>. Change the file and the URL changes with
it; leave it alone and returning visitors keep their cached copy. Images are
deliberately not stamped -- replace an image by giving it a new filename.

dashboard.html is deliberately untouched.
"""
import glob
import hashlib
import os
import re
import sys

SKIP = {"dashboard.html", "new-footer.html"}

START = "<!-- inline-css:start -->"
END = "<!-- inline-css:end -->"

# Inlined in this order, which is the order they used to be linked in: the
# utilities first, then the hand-written rules that override them.
SHEETS = ["dist/tailwind.css", "styles.css"]

# Stamped with a hash of their contents so a deploy always busts the cache.
STAMPED = ["script.js"]

HEADER = """\
    <!-- The stylesheets are inlined, not linked. A <link> the browser never
         receives does not block rendering -- it just never applies, and the
         page paints unstyled. This origin is slow enough, and its one-year
         cache sticky enough, that visitors were hitting exactly that. Styles
         arriving in the same response as the markup cannot fail separately
         from it.

         Generated -- do not edit here. Edit the source stylesheet and re-run:
             python3 tools/inline-css.py -->"""

# Whatever is currently in the head gets replaced: these markers on a re-run,
# or the earlier critical-CSS block on the first run.
REGION = re.compile(
    r"[ \t]*" + re.escape(START) + r".*?" + re.escape(END) + r"\n"
    r"|[ \t]*<!-- critical-css:start -->.*?<!-- critical-css:end -->\n"
    r"|[ \t]*<!-- Critical masthead CSS.*?</style>\n",
    re.S,
)

# The <link>s the inlined blocks replace, plus the comment that introduced them.
LINKS = re.compile(
    r"[ \t]*<!-- Prebuilt Tailwind[^\n]*\n"
    r"|[ \t]*<link rel=\"stylesheet\" href=\"(?:dist/tailwind\.css|styles\.css)\"[^>]*>\n",
)

# Where to put the block on a page that has neither markers nor a critical
# block: immediately above the remaining stylesheet links.
ANCHOR = re.compile(r"([ \t]*<!-- Last: a third-party sheet"
                    r"|[ \t]*<link rel=\"stylesheet\" href=\"https://fonts\.googleapis\.com)")


def digest(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()[:8]


def build_block():
    parts = [f"    {START}", HEADER]
    for sheet in SHEETS:
        css = open(sheet, encoding="utf-8").read().strip()
        if "</style" in css.lower():
            sys.exit(f"{sheet} contains a </style> sequence and cannot be inlined")
        parts.append(f"    <!-- {sheet} -->")
        parts.append(f"    <style>{css}</style>")
    parts.append(f"    {END}")
    return "\n".join(parts) + "\n"


def main():
    for sheet in SHEETS + STAMPED:
        if not os.path.exists(sheet):
            sys.exit(f"missing {sheet} -- run this from the repo root")

    block = build_block()
    stamps = {asset: digest(asset) for asset in STAMPED}

    pages = [p for p in sorted(glob.glob("*.html")) if os.path.basename(p) not in SKIP]
    if not pages:
        sys.exit("no pages found -- run this from the repo root")

    written = 0
    for page in pages:
        html = original = open(page, encoding="utf-8", errors="replace").read()

        # The CSS block, replacing whatever stood in for it before.
        html, n = REGION.subn(lambda _m: block, html, count=1)
        if n == 0:
            html, n = ANCHOR.subn(lambda m: block + m.group(1), html, count=1)
            if n == 0:
                print(f"  !! {page}: nowhere to put the inlined CSS")
                continue

        # The links it replaces.
        html = LINKS.sub("", html)

        # Version stamps.
        for asset, stamp in stamps.items():
            html = re.sub(
                r'(src|href)="' + re.escape(asset) + r'(?:\?v=[0-9a-f]+)?"',
                lambda m: f'{m.group(1)}="{asset}?v={stamp}"',
                html,
            )

        if html != original:
            open(page, "w", encoding="utf-8").write(html)
            print(f"  {page:<38} inlined")
            written += 1
        else:
            print(f"  {page:<38} already current")

    sizes = ", ".join(f"{s} {os.path.getsize(s) // 1024}KB" for s in SHEETS)
    print(f"\n{written} page(s) updated. Inlined: {sizes}.")
    print("Stamped: " + ", ".join(f"{a}?v={v}" for a, v in stamps.items()))


if __name__ == "__main__":
    main()
