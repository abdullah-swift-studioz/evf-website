#!/usr/bin/env python3
"""
Generate sitemap.xml and robots.txt from the pages actually in the repo.

Run from the repo root:   python3 tools/gen-sitemap.py

SITE is imported from rewrite-heads.py so the canonical host is defined in
exactly one place. The live site serves on the bare domain -- www 301s to it --
so every URL here names the bare domain, matching the canonical tags.

dashboard.html is excluded and disallowed: it is an internal admin page with no
public content to index.
"""
import glob
import importlib.util
import os

spec = importlib.util.spec_from_file_location(
    "rewrite_heads", os.path.join(os.path.dirname(__file__), "rewrite-heads.py"))
rewrite_heads = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rewrite_heads)
SITE = rewrite_heads.SITE

EXCLUDE = {"dashboard.html"}
PRIORITY = {
    "index.html": "1.0",
    "contact.html": "0.9",
    "services.html": "0.9",
    "disclaimer.html": "0.3",
    "news.html": "0.6",
}


def main():
    pages = sorted(p for p in glob.glob("*.html") if p not in EXCLUDE)

    rows = []
    for p in pages:
        loc = f"{SITE}/" if p == "index.html" else f"{SITE}/{p}"
        rows.append(
            "  <url>\n"
            f"    <loc>{loc}</loc>\n"
            "    <changefreq>monthly</changefreq>\n"
            f"    <priority>{PRIORITY.get(p, '0.8')}</priority>\n"
            "  </url>"
        )

    with open("sitemap.xml", "w") as fh:
        fh.write('<?xml version="1.0" encoding="UTF-8"?>\n'
                 '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                 + "\n".join(rows) + "\n</urlset>\n")

    with open("robots.txt", "w") as fh:
        fh.write("User-agent: *\n"
                 "Allow: /\n\n"
                 "# Internal admin page: no public content to index.\n"
                 "Disallow: /dashboard.html\n\n"
                 f"Sitemap: {SITE}/sitemap.xml\n")

    print(f"  sitemap.xml  {len(pages)} URLs on {SITE}")
    print("  robots.txt   written")


if __name__ == "__main__":
    main()
