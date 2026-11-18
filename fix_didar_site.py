#!/usr/bin/env python3
"""Repair DIDAR Persian homepage and shared navigation, without overwriting unrelated content.

Usage (macOS/Linux, in the GitHub Pages repository root):
    python3 fix_didar_site.py --dry-run
    python3 fix_didar_site.py
Or:
    python3 fix_didar_site.py /path/to/DIDAR

Only standard Python 3 libraries are required. Does not publish or git commit.
"""
import argparse
import base64
import datetime
import json
import os
from pathlib import Path
import re
import shutil
import sys
import zlib

VERSION = 'didar-home-menu-20261118-a'
NAV_MARKER = '/* DIDAR-NAV-REPAIR-20261118:'
HOMEPAGE_ENCODED = (
    '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'
)
NAV_CSS = '\n/* DIDAR-NAV-REPAIR-20261118: keep dropdown contents inside the menu. */\n:is(html[lang="fa"], html[lang="fr"], html[lang="en"])\n  .site-header details.nav-dropdown:not([open]) > .nav-dropdown-menu {\n  display: none !important;\n}\n:is(html[lang="fa"], html[lang="fr"], html[lang="en"])\n  .site-header details.nav-dropdown[open] > .nav-dropdown-menu {\n  display: grid !important;\n  position: absolute !important;\n  top: calc(100% + 8px);\n  inset-inline-end: 0;\n  z-index: 120;\n  min-width: 225px;\n  gap: 3px;\n  padding: 10px;\n  border: 1px solid #dce5e4;\n  border-radius: 12px;\n  background: #fff;\n  box-shadow: 0 12px 30px rgba(3, 56, 75, .16);\n}\n@media (min-width: 1101px) {\n  .site-header nav.main-nav {\n    flex-wrap: nowrap !important;\n    align-items: center;\n    column-gap: clamp(8px, 1vw, 15px);\n  }\n  .site-header nav.main-nav > a,\n  .site-header nav.main-nav > details > summary { white-space: nowrap; }\n}\n/* Use the mobile menu before the desktop links become too crowded. */\n@media (min-width: 921px) and (max-width: 1100px) {\n  .site-header nav.main-nav { display: none !important; }\n  .site-header details.mobile-navigation { display: block !important; position: relative; }\n  .site-header .nav-area { flex-direction: row; align-items: center; }\n  .site-header details.mobile-navigation[open] > nav {\n    position: absolute;\n    display: grid;\n    top: calc(100% + 8px);\n    inset-inline-end: 0;\n    z-index: 120;\n    min-width: 230px;\n    max-width: min(90vw, 340px);\n    max-height: 65vh;\n    overflow-y: auto;\n    padding: 10px;\n    background: #fff;\n    border: 1px solid #dce5e4;\n    border-radius: 12px;\n    box-shadow: 0 12px 30px rgba(3, 56, 75, .16);\n  }\n}\n'


def actual_root(location):
    root = location.expanduser().resolve()
    if (root / 'fa' / 'index.html').is_file():
        return root
    if (root / 'DIDAR' / 'fa' / 'index.html').is_file():
        return root / 'DIDAR'
    raise ValueError('Cannot find fa/index.html. Run inside the DIDAR website folder or pass its path.')


def has_page_footer(html):
    return bool(re.search(r"""id\s*=\s*['"]didar-site-footer['"]""", html, flags=re.I))


def normalized_html(html, name, root):
    """Ensure all pages load correctly versioned shared CSS/JS with valid relative paths."""
    path = root / name
    rel = lambda filename: Path(os.path.relpath(root / filename, start=path.parent)).as_posix()
    main_css = rel('styles.css') + '?v=' + VERSION
    footer_css = rel('assets/didar-allies-footer.css') + '?v=' + VERSION
    footer_js = rel('assets/didar-allies-footer.js') + '?v=' + VERSION

    # Idempotency: don't move tags around again if this page is already patched.
    if (footer_css in html and footer_js in html and main_css in html
            and html.count('didar-allies-footer.css') == 1
            and html.count('didar-allies-footer.js') == 1):
        return html

    # Link tags are replaced only when they target the two central stylesheets.
    def stylesheet_update(match):
        tag = match.group(0)
        href_match = re.search(r"""\bhref\s*=\s*(['"])([^'"]+)\1""", tag, re.I)
        if not href_match:
            return tag
        href = href_match.group(2).split('?', 1)[0].split('#', 1)[0]
        if href.endswith('/styles.css') or href == 'styles.css':
            return tag[:href_match.start(2)] + main_css + tag[href_match.end(2):]
        return tag
    html = re.sub(r'<link\b[^>]*>', stylesheet_update, html, flags=re.I)

    # Eliminate duplicate footer stylesheet tags and add exactly one valid reference.
    html = re.sub(r'<link\b(?=[^>]*\bhref\s*=\s*["\'][^"\']*didar-allies-footer\.css(?:\?[^"\']*)?["\'])[^>]*>\s*', '', html, flags=re.I)
    if not re.search(r'</head\s*>', html, flags=re.I):
        raise ValueError('Missing </head> in '+name)
    html = re.sub(r'</head\s*>', f'  <link rel="stylesheet" href="{footer_css}" />\n</head>', html, count=1, flags=re.I)

    # Footer script: one per page, using a versioned, correctly relative URL.
    html = re.sub(r'<script\b(?=[^>]*\bsrc\s*=\s*["\'][^"\']*didar-allies-footer\.js(?:\?[^"\']*)?["\'])[^>]*>\s*</script>\s*', '', html, flags=re.I)
    if not re.search(r'</body\s*>', html, flags=re.I):
        raise ValueError('Missing </body> in '+name)
    html = re.sub(r'</body\s*>', f'  <script defer src="{footer_js}"></script>\n</body>', html, count=1, flags=re.I)
    return html


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('website_folder', nargs='?', default='.', help='DIDAR root or its parent folder')
    ap.add_argument('--dry-run', action='store_true', help='Show changes but do not write')
    args = ap.parse_args()
    root = actual_root(Path(args.website_folder))
    required = [
        'index.html', 'styles.css', 'persian-enhancements.css',
        'fa/index.html', 'fa/recognition/index.html',
        'assets/didar-allies-footer.css', 'assets/didar-allies-footer.js',
        'assets/localized-experience.css', 'assets/localized-home.css',
        'assets/content-loader.js', 'config/site-settings.json',
        'content/fa/mission.md', 'content/fa/vision.md',
        'content/fa/values.md', 'content/fa/charter.md',
    ]
    missing = [item for item in required if not (root / item).is_file()]
    if missing:
        raise ValueError('Missing files; nothing changed: '+', '.join(missing))
    print('Website root:', root)
    cfg_path = root / 'config/site-settings.json'
    cfg = json.loads(cfg_path.read_text(encoding='utf-8-sig'))
    if not isinstance(cfg.get('pages'), dict):
        raise ValueError('Invalid site-settings.json: missing pages object')
    supporters = {'fr':'recognition/', 'en':'en/recognition/', 'fa':'fa/recognition/'}
    if not isinstance(cfg['pages'].get('supporters',{}), dict):
        raise ValueError('Invalid site-settings.json: supporters is not an object')

    homepage_path = root / 'fa/index.html'
    homepage = homepage_path.read_text(encoding='utf-8-sig')
    if '<html' not in homepage.lower():
        raise ValueError('fa/index.html is not HTML')
    correct_home = zlib.decompress(base64.b64decode(HOMEPAGE_ENCODED)).decode('utf-8')
    about_ready = all(token in homepage for token in ('id="about"', 'id="mission"', 'id="vision"', 'id="values"', 'id="charter"', 'id="contact"'))
    recognition_copy = ('id="business-directory"' in homepage or 'id="recognition-title"' in homepage or 'کسب‌وکارهایی که تأثیر مثبت می‌گذارند' in homepage)
    if recognition_copy:
        print('Confirmed: fa/index.html contains Recognition content. Restoring About DIDAR.')
        homepage = correct_home
    elif about_ready:
        print('Persian homepage already contains the About sections; preserving its content.')
    else:
        raise ValueError('fa/index.html is neither the known Recognition mix-up nor a complete About page. No files changed.')

    changes = {}
    if homepage != homepage_path.read_text(encoding='utf-8-sig'):
        changes['fa/index.html'] = homepage

    # Central routes: no change when already correct.
    if cfg['pages'].get('supporters') != supporters:
        cfg['pages']['supporters'] = supporters
        changes['config/site-settings.json'] = json.dumps(cfg, ensure_ascii=False, indent=2)+'\n'

    for filename in ('styles.css', 'assets/didar-allies-footer.css'):
        text = (root / filename).read_text(encoding='utf-8-sig')
        if NAV_MARKER not in text:
            changes[filename] = text.rstrip()+'\n\n'+NAV_CSS.strip()+'\n'

    # Shared script injects cache-busted CSS; refreshing its own URL across pages
    # causes browsers to execute the current version, not a stale unversioned copy.
    shared = root / 'assets/didar-allies-footer.js'
    js = shared.read_text(encoding='utf-8-sig')
    if 'didar-footer-critical-style' not in js or 'frame.style.cssText' not in js:
        raise ValueError('The shared footer JavaScript lacks the expected 58px safeguards. No changes made.')
    new_js = re.sub(r'(didar-allies-footer\.css\?v=)[^"\']+', r'\g<1>'+VERSION, js)
    if new_js != js:
        changes['assets/didar-allies-footer.js'] = new_js

    # All site pages that use the shared footer: fix stylesheet paths, deduplicate,
    # and force a fresh shared JS so a stale GitHub Pages browser cache cannot win.
    pages = [root/'index.html'] + list((root/'en').rglob('index.html')) + list((root/'fa').rglob('index.html'))
    for folder in ('story','projects','activities','events','city-guide','team','recognition','community-voices','supporters'):
        page = root/folder/'index.html'
        if page.is_file(): pages.append(page)
    for page in sorted(set(pages)):
        name = page.relative_to(root).as_posix()
        html = changes.get(name, page.read_text(encoding='utf-8-sig'))
        if not has_page_footer(html):
            continue  # Leave intentional redirects and standalone documents alone.
        fixed = normalized_html(html, name, root)
        if fixed != page.read_text(encoding='utf-8-sig'):
            changes[name] = fixed

    if not changes:
        print('No changes needed. All target fixes are present.')
        return 0
    print(('WOULD UPDATE' if args.dry_run else 'UPDATING') + ' '+str(len(changes))+' file(s):')
    for name in sorted(changes): print(' -',name)
    if args.dry_run:
        print('Dry run only; nothing was written.')
        return 0

    # Keep changed original files outside the public site/repository folder.
    stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
    backup = root.parent / f'{root.name}-before-fix-{stamp}'
    if backup.exists(): raise ValueError('Backup folder already exists: '+str(backup))
    for name in changes:
        dest = backup / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(root/name, dest)
    for name, data in changes.items():
        target = root/name
        target.write_text(data, encoding='utf-8')

    # Assert we fixed the real content, not only the title tag.
    final = (root/'fa/index.html').read_text(encoding='utf-8')
    assert '<h1 id="about-title">ما که هستیم؟</h1>' in final
    assert 'https://didar-mtl.ca/fa/' in final
    assert 'id="business-directory"' not in final
    assert all((root/'config/site-settings.json').is_file() for _ in [1])
    print('\nVerified: Persian homepage contains About DIDAR; Recognition remains at /fa/recognition/.')
    print('Backups saved OUTSIDE the repository:', backup)
    print('Next: git status, git add -A, git commit -m "Fix Persian homepage and menus", git push')
    print('Then verify your GitHub Pages deployment and reload https://didar-mtl.ca/fa/')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print('ERROR:',error, file=sys.stderr)
        sys.exit(1)
