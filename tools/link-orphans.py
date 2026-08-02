#!/usr/bin/env python3
"""
Give the 13 unreachable pages a route in from navigation.

Run from the repo root:   python3 tools/link-orphans.py

These pages were fully built but nothing linked to them, so no visitor and no
search engine crawler could reach them:

  austria, belgium, germany, ireland, italy, netherlands, norway, portugal,
  spain, switzerland (visa pages), plus student-visa-services, news and team.

Two routes in:
  1. The nav dropdowns, which are duplicated across all 36 pages.
  2. The Schengen page's Member Countries grid, whose cards now link to the
     dedicated page where one exists. Ireland is deliberately not in that grid
     -- it is an EU member but not part of the Schengen Area -- so it is only
     reachable from the nav.
"""
import glob
import re

LINK_S = 'class="block px-4 py-2 text-sm hover:bg-gray-50" style="color: #696969;"'
LINK_D = 'class="block px-4 py-1.5 text-sm hover:bg-gray-50" style="color: #696969;"'

# anchor to insert after -> the new markup
NAV_EDITS = [
    (
        '<a href="message-from-ceo.html" class="block px-4 py-2 text-sm hover:bg-gray-50" style="color: #696969;">Message from CEO</a>',
        f'\n                                <a href="team.html" {LINK_S}>Our Team</a>'
        f'\n                                <a href="news.html" {LINK_S}>News &amp; Insights</a>',
    ),
    (
        '<a href="citizenship-immigration.html" class="block px-4 py-2 text-sm hover:bg-gray-50" style="color: #696969;">Citizenship and Immigration</a>',
        f'\n                                <a href="student-visa-services.html" {LINK_S}>Student Visa Services</a>',
    ),
    (
        '<a href="turkey-visa.html" class="block px-4 py-1.5 text-sm hover:bg-gray-50" style="color: #696969;">Turkey Visa</a>',
        "".join(
            f'\n                                <a href="{page}" {LINK_D}>{label}</a>'
            for page, label in [
                ("germany-visa.html", "Germany Visa"),
                ("italy-visa.html", "Italy Visa"),
                ("spain-visa.html", "Spain Visa"),
                ("netherlands-visa.html", "Netherlands Visa"),
                ("switzerland-visa.html", "Switzerland Visa"),
                ("austria-visa.html", "Austria Visa"),
                ("belgium-visa.html", "Belgium Visa"),
                ("portugal-visa.html", "Portugal Visa"),
                ("norway-visa.html", "Norway Visa"),
                ("ireland-visa.html", "Ireland Visa"),
            ]
        ),
    ),
]

# Schengen member-country cards that have a dedicated page: flag code -> page
SCHENGEN_CARDS = {
    "at": "austria-visa.html",
    "be": "belgium-visa.html",
    "de": "germany-visa.html",
    "it": "italy-visa.html",
    "nl": "netherlands-visa.html",
    "no": "norway-visa.html",
    "pt": "portugal-visa.html",
    "es": "spain-visa.html",
    "ch": "switzerland-visa.html",
}


def update_nav():
    count = 0
    for page in sorted(glob.glob("*.html")):
        if page in ("dashboard.html", "new-footer.html"):
            continue
        html = open(page, encoding="utf-8", errors="replace").read()
        original = html
        for anchor, addition in NAV_EDITS:
            if anchor in html and addition.strip() not in html:
                html = html.replace(anchor, anchor + addition, 1)
        if html != original:
            open(page, "w", encoding="utf-8").write(html)
            count += 1
    print(f"  nav dropdowns updated on {count} pages")


def update_schengen():
    page = "schengen-visa.html"
    html = open(page, encoding="utf-8", errors="replace").read()
    linked = 0

    def wrap(match):
        nonlocal linked
        card = match.group(0)
        code = re.search(r"flagcdn\.com/w320/([a-z]{2})\.png", card)
        if not code:
            return card
        target = SCHENGEN_CARDS.get(code.group(1))
        if not target or f'href="{target}"' in card:
            return card
        linked += 1
        # Make the whole card a link, and hint that it leads somewhere.
        card = card.replace(
            '<div class="country-card bg-white rounded-lg shadow-md hover:shadow-xl overflow-hidden">',
            f'<a href="{target}" class="country-card block bg-white rounded-lg shadow-md '
            'hover:shadow-xl overflow-hidden transition-shadow">',
            1,
        )
        card = card[: card.rindex("</div>")] + "</a>"
        return card

    html = re.sub(
        r'<div class="country-card bg-white rounded-lg shadow-md hover:shadow-xl overflow-hidden">.*?</div>\s*</div>',
        wrap,
        html,
        flags=re.S,
    )
    open(page, "w", encoding="utf-8").write(html)
    print(f"  {linked} Schengen country cards now link to their dedicated page")


if __name__ == "__main__":
    update_nav()
    update_schengen()
