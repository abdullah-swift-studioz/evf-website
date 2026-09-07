#!/usr/bin/env python3
"""
Rewrite the <head> of every public page for performance and SEO.

Run from the repo root:   python3 tools/rewrite-heads.py

What it changes, per page:
  - Tailwind Play CDN (a ~120KB JS compiler that rebuilds the CSS on every page
    load) -> the prebuilt dist/tailwind.css
  - Swiper CSS+JS removed everywhere except about.html, the only page with
    swiper markup
  - the @heroicons/react ES module removed from services.html (a React library
    on a static page; it does nothing)
  - Font Awesome switched to a non-blocking load, with preconnect
  - Google Fonts moved out of styles.css's @import (which serialised
    styles.css -> fonts.css -> font files) into a preconnected <link>
  - blocking Firebase SDK tags removed; script.js now loads Firebase on demand
    when a visitor first touches the contact form
  - meta description, canonical, Open Graph and Twitter tags added
  - the hero image preloaded so it can start downloading before CSS resolves

dashboard.html is deliberately untouched.
"""
import importlib.util
import os
import re
import sys

# The site's CSS is inlined into every page rather than linked, for the reasons
# set out in inline-css.py. This script rewrites whole heads, so it has to emit
# the same block -- otherwise a run here drops the styles back to two <link>s
# and pages start rendering unstyled again whenever the origin misses them.
_spec = importlib.util.spec_from_file_location(
    "inline_css", os.path.join(os.path.dirname(__file__), "inline-css.py"))
inline_css = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(inline_css)

# The live site serves on the bare domain; www.evisafacilitation.com 301s to it.
# Canonicals must name the final URL, not one that redirects.
SITE = "https://evisafacilitation.com"

# Pages whose <title> was copy-pasted from student-visa-services.html and never
# updated. Keyed by filename -> corrected title.
TITLE_FIXES = {
    "austria-visa.html": "Austria Visa Services - Express Visa Facilitation",
    "belgium-visa.html": "Belgium Visa Services - Express Visa Facilitation",
    "ireland-visa.html": "Ireland Visa Services - Express Visa Facilitation",
    "italy-visa.html": "Italy Visa Services - Express Visa Facilitation",
    "netherlands-visa.html": "Netherlands Visa Services - Express Visa Facilitation",
    "norway-visa.html": "Norway Visa Services - Express Visa Facilitation",
    "portugal-visa.html": "Portugal Visa Services - Express Visa Facilitation",
    "spain-visa.html": "Spain Visa Services - Express Visa Facilitation",
    "switzerland-visa.html": "Switzerland Visa Services - Express Visa Facilitation",
}

# Two pages also carry the wrong <h1>.
H1_FIXES = {
    "netherlands-visa.html": ("Student Visa Services", "Netherlands Visa Services"),
    "spain-visa.html": ("Student Visa Services", "Spain Visa Services"),
}

DESCRIPTIONS = {
    "index.html": "Express Visa Facilitation helps you apply for tourist, work and study visas with 14+ years of experience and a 98% success rate. Free initial consultation.",
    "about.html": "Learn how Express Visa Facilitation guides applicants through visa documentation, embassy requirements and refusal appeals across Pakistan.",
    "company.html": "Express Visa Facilitation is a Pakistan-based visa consultancy with over 14 years of experience working with foreign missions.",
    "management-team.html": "Meet the management team behind Express Visa Facilitation and their experience with foreign missions and visa processing.",
    "message-from-ceo.html": "A message from the CEO of Express Visa Facilitation on our approach to honest, transparent visa consultancy.",
    "team.html": "Meet the visa consultants at Express Visa Facilitation who handle your application from consultation to embassy submission.",
    "contact.html": "Contact Express Visa Facilitation for a free visa consultation. Call +92 320 888 9091 or send us your query and we will reply within 24 hours.",
    "services.html": "Full range of visa and immigration services: work, business, tourist, family, student visas, document verification and residency applications.",
    "news.html": "Latest visa news, embassy policy updates and immigration insights from the consultants at Express Visa Facilitation.",
    "disclaimer.html": "Disclaimer for Express Visa Facilitation: we are an independent visa consultancy and are not affiliated with any embassy, consulate or government body.",
    "schengen-visa.html": "Apply for a Schengen visa covering 29 European countries. Requirements, supporting documents, fees and processing times explained.",
    "work-and-business-visa.html": "Work and business visa services including employer documentation, invitation letters and financial evidence for your application.",
    "tourist-and-visit-visas.html": "Tourist and visit visa applications handled end to end, including itineraries, sponsorship letters and proof of funds.",
    "family-and-spousal-visa.html": "Family and spousal visa services covering relationship evidence, sponsorship requirements and dependant applications.",
    "immigration-and-residency.html": "Immigration and residency application support including permanent residency, settlement routes and long-stay permits.",
    "document-verification.html": "Professional verification and attestation of educational, personal and financial documents for visa applications.",
    "citizenship-immigration.html": "Citizenship and immigration guidance including naturalisation routes, residency requirements and long-term settlement.",
    "student-visa-services.html": "Student visa services covering university admission, CAS and I-20 documentation, financial evidence and interview preparation.",
}
# Country pages share one pattern.
COUNTRY = {
    "uk-visa.html": "UK", "us-visa.html": "US", "canada-visa.html": "Canada",
    "australia-visa.html": "Australia", "japan-visa.html": "Japan",
    "china-visa.html": "China", "uae-visa.html": "UAE", "ksa-visa.html": "Saudi Arabia",
    "turkey-visa.html": "Turkey", "germany-visa.html": "Germany",
    "austria-visa.html": "Austria", "belgium-visa.html": "Belgium",
    "ireland-visa.html": "Ireland", "italy-visa.html": "Italy",
    "netherlands-visa.html": "Netherlands", "norway-visa.html": "Norway",
    "portugal-visa.html": "Portugal", "spain-visa.html": "Spain",
    "switzerland-visa.html": "Switzerland",
}
for page, country in COUNTRY.items():
    DESCRIPTIONS.setdefault(
        page,
        f"{country} visa services from Express Visa Facilitation: requirements, "
        f"supporting documents, embassy fees and processing times. Free consultation."
    )

SKIP = {"dashboard.html", "new-footer.html"}


def hero_image(html):
    """
    The image inside the first full-height hero section -- the LCP candidate.

    Only looks inside that section: a page's first local image is often a
    below-the-fold content photo, and preloading that actively hurts, because it
    competes with the real hero for bandwidth. Returns remote URLs too (several
    heroes are Unsplash-hosted). Returns None when the hero has no image, e.g.
    index.html, whose hero is a <video>.
    """
    body = html.split("</head>", 1)[-1]
    sec = re.search(r'<section[^>]*class="[^"]*\bh-(?:screen|\[\d+vh\])[^"]*"[^>]*>(.*?)</section>',
                    body, re.S)
    if not sec:
        return None
    block = sec.group(1)
    # A video hero paints its poster first, so that is the LCP image.
    poster = re.search(r'<video[^>]*\sposter="([^"]+)"', block)
    if poster:
        return poster.group(1)
    m = re.search(r"""(?:url\(\s*['"]?|<img[^>]*\ssrc=")([^'")\s]+)""", block)
    if not m:
        return None
    ref = m.group(1)
    return None if "logo" in ref else ref


def build_head(page, title, description, hero):
    canonical = f"{SITE}/" if page == "index.html" else f"{SITE}/{page}"
    remote_hero = bool(hero) and hero.startswith("http")
    if not hero:
        og_image = f"{SITE}/images/logo.jpeg"
    elif remote_hero:
        og_image = hero
    else:
        og_image = f"{SITE}/{hero}"
    swiper = page == "about.html"

    lines = [
        '    <meta charset="UTF-8">',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        f'    <title>{title}</title>',
        f'    <meta name="description" content="{description}">',
        f'    <link rel="canonical" href="{canonical}">',
        '',
        '    <!-- Open Graph / social preview -->',
        '    <meta property="og:type" content="website">',
        f'    <meta property="og:title" content="{title}">',
        f'    <meta property="og:description" content="{description}">',
        f'    <meta property="og:url" content="{canonical}">',
        f'    <meta property="og:image" content="{og_image}">',
        '    <meta property="og:site_name" content="Express Visa Facilitation">',
        '    <meta name="twitter:card" content="summary_large_image">',
        '',
        '    <!-- Warm up the third-party origins we still use -->',
        '    <link rel="preconnect" href="https://fonts.googleapis.com">',
        '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        '    <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>',
    ]
    if remote_hero:
        lines.append('    <link rel="preconnect" href="https://images.unsplash.com" crossorigin>')
    if hero:
        lines.append('')
        lines.append('    <!-- Hero is the LCP element: start it before CSS resolves -->')
        lines.append(f'    <link rel="preload" as="image" href="{hero}" fetchpriority="high">')

    lines += [
        '',
        '    <link rel="icon" type="image/x-icon" href="favicon.ico">',
        '    <link rel="icon" type="image/jpeg" sizes="32x32" href="images/logo.jpeg">',
        '    <link rel="apple-touch-icon" sizes="180x180" href="images/logo.jpeg">',
        '',
        inline_css.build_block().rstrip("\n"),
        '',
        '    <!-- Only cross-origin sheets are linked. Ours are inlined above. -->',
        '    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">',
    ]
    if swiper:
        lines.append('    <link rel="stylesheet" href="https://unpkg.com/swiper/swiper-bundle.min.css">')
        lines.append('    <script src="https://unpkg.com/swiper/swiper-bundle.min.js" defer></script>')

    lines += [
        '',
        '    <!-- Icons are decorative: load without blocking first paint -->',
        '    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"',
        '          media="print" onload="this.media=\'all\'; this.onload=null">',
        '    <noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"></noscript>',
    ]
    return "<head>\n" + "\n".join(lines) + "\n</head>"


def main():
    pages = [p for p in sorted(os.listdir(".")) if p.endswith(".html") and p not in SKIP]
    for page in pages:
        html = open(page, encoding="utf-8", errors="replace").read()

        if page in TITLE_FIXES:
            html = re.sub(r"<title>.*?</title>", f"<title>{TITLE_FIXES[page]}</title>",
                          html, count=1, flags=re.S)
        if page in H1_FIXES:
            old, new = H1_FIXES[page]
            html = re.sub(r"(<h1[^>]*>\s*)" + re.escape(old) + r"(\s*</h1>)",
                          rf"\g<1>{new}\g<2>", html, count=1, flags=re.S)

        title_m = re.search(r"<title>(.*?)</title>", html, re.S)
        title = re.sub(r"\s+", " ", title_m.group(1)).strip() if title_m else "Express Visa Facilitation"
        desc = DESCRIPTIONS.get(page, DESCRIPTIONS["index.html"])
        hero = hero_image(html)

        new_head = build_head(page, title, desc, hero)
        html, n = re.subn(r"<head>.*?</head>", lambda _m: new_head, html, count=1, flags=re.S)
        if n != 1:
            print(f"  !! could not locate <head> in {page}")
            continue

        open(page, "w", encoding="utf-8").write(html)
        print(f"  {page:<38} hero={hero or '-'}")

    print(f"\nRewrote {len(pages)} heads. dashboard.html left untouched.")


if __name__ == "__main__":
    main()
