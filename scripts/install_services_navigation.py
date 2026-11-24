#!/usr/bin/env python3
"""Integrate the trilingual DIDAR Services pages into config/site-settings.json.
Use: python3 scripts/install_services_navigation.py [--dry-run]
Updates only config/site-settings.json and preserves unrelated entries.
"""
from pathlib import Path
from datetime import datetime
import argparse, json, sys

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--dry-run', action='store_true')
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
file=root/'config'/'site-settings.json'
if not file.is_file(): sys.exit('Missing config/site-settings.json — copy the package into DIDAR website root first.')
paths={
    'services': '',
    'services_courses': 'courses/',
    'services_digital_support': 'digital-support/',
    'services_nonprofit_digital': 'nonprofit-digital/',
    'services_community': 'community/',
    'services_workshops': 'workshops/'
}
prefix={'fr':'','en':'en/','fa':'fa/'}
for locale,pref in prefix.items():
    for key,suffix in paths.items():
        p=root/pref/'services'/suffix/'index.html'
        if not p.is_file(): sys.exit(f'Missing page: {p}')
try: cfg=json.loads(file.read_text(encoding='utf-8-sig'))
except (OSError,json.JSONDecodeError) as ex: sys.exit(f'Cannot read configuration: {ex}')
if not isinstance(cfg.get('pages'),dict) or not isinstance(cfg.get('navigation'),dict):
    sys.exit('Expected configuration with pages and navigation sections.')
changes=[]
for key,suffix in paths.items():
    entry=cfg['pages'].setdefault(key,{})
    if not isinstance(entry,dict): sys.exit(f'Invalid route definition for {key}.')
    for lang,pre in prefix.items():
        url=pre+'services/'+suffix
        if entry.get(lang)!=url:
            changes.append(f'{key}.{lang}: {entry.get(lang)!r} -> {url!r}')
            entry[lang]=url
labels={'fr':'Services','en':'Services & Learning','fa':'خدمات و آموزش‌ها'}
for lang,label in labels.items():
    nav=cfg['navigation'].get(lang)
    if not isinstance(nav,list): sys.exit(f'Missing navigation array for {lang}.')
    # Remove misplaced/duplicate Services links, including those inside Community.
    for entry in nav:
        if isinstance(entry,dict) and isinstance(entry.get('children'),list):
            old=len(entry['children'])
            entry['children']=[x for x in entry['children'] if not (isinstance(x,dict) and x.get('page')=='services')]
            if len(entry['children'])!=old: changes.append(f'Removed nested Services from {lang} dropdown')
    existing=[x for x in nav if isinstance(x,dict) and x.get('page')=='services']
    if existing:
        # keep first, update label and eliminate duplicates
        old=existing[0].get('label')
        existing[0]['label']=label
        if old!=label: changes.append(f'Updated {lang} label')
        seen=False
        new=[]
        for item in nav:
            if isinstance(item,dict) and item.get('page')=='services':
                if seen: changes.append(f'Removed duplicate Services in {lang}'); continue
                seen=True
            new.append(item)
        nav[:]=new
        # put after Activities, preserving other items
        item=next(x for x in nav if isinstance(x,dict) and x.get('page')=='services')
        oldindex=nav.index(item)
        nav.remove(item)
    else:
        item={'label':label,'page':'services'}
        oldindex=None
    pos=next((i+1 for i,x in enumerate(nav) if isinstance(x,dict) and x.get('page')=='activities'),len(nav))
    nav.insert(pos,item)
    if oldindex is None or pos!=oldindex: changes.append(f'Placed Services after Activities in {lang}')

if not changes:
    print('Already configured. No changes required.'); sys.exit(0)
print('Planned updates:')
for line in changes: print(' - '+line)
if args.dry_run:
    print('DRY RUN — no files changed.')
    sys.exit(0)
backup=file.with_name('site-settings.json.before-services-'+datetime.now().strftime('%Y%m%d-%H%M%S'))
backup.write_bytes(file.read_bytes())
file.write_text(json.dumps(cfg,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Backup:',backup)
print('Updated:',file)
