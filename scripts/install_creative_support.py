#!/usr/bin/env python3
"""Add DIDAR creative support and featured creatives to the existing shared navigation.
Usage: python3 scripts/install_creative_support.py [--dry-run]
Safe to rerun; only edits config/site-settings.json and backs it up first.
"""
from pathlib import Path
from datetime import datetime
import argparse,json,sys
ap=argparse.ArgumentParser(description=__doc__)
ap.add_argument('--dry-run',action='store_true')
args=ap.parse_args()
root=Path(__file__).resolve().parent.parent
path=root/'config/site-settings.json'
if not path.is_file(): sys.exit('Missing config/site-settings.json; run from the DIDAR website root.')
try: cfg=json.loads(path.read_text(encoding='utf-8-sig'))
except (OSError,json.JSONDecodeError) as exc: sys.exit(f'Invalid site-settings.json: {exc}')
if not isinstance(cfg.get('navigation'),dict) or not isinstance(cfg.get('pages'),dict):
 sys.exit('Expected navigation and pages sections.')
labels={
 'fr':('Talents et initiatives','Services'),
 'en':('Featured creatives','Services & Learning'),
 'fa':('هنرمندان و کسب‌وکارهای خلاق','خدمات و آموزش‌ها')
}
changes=[]
for lng,pref in [('fr',''),('en','en/'),('fa','fa/')]:
 for key,url in [('creators',f'{pref}creators/'),('services_creative_support',f'{pref}services/creative-support/')]:
  if not (root/url/'index.html').is_file(): sys.exit(f'Missing required page: {url}index.html')
  entry=cfg['pages'].setdefault(key,{})
  if entry.get(lng)!=url:
   changes.append(f'{key}.{lng} => {url}')
   entry[lng]=url
 nav=cfg['navigation'].get(lng)
 if not isinstance(nav,list): sys.exit(f'No navigation list for {lng}')
 community=next((item for item in nav if isinstance(item,dict) and isinstance(item.get('children'),list) and
                 any(child.get('page') in ('team','voices','supporters') for child in item['children'] if isinstance(child,dict))),None)
 if community is None:sys.exit(f'Cannot find community dropdown for {lng}; no changes made')
 # Make this item appear only once in the Community dropdown.
 for item in nav:
  if isinstance(item,dict) and isinstance(item.get('children'),list):
   item['children'][:]=[child for child in item['children'] if not (isinstance(child,dict) and child.get('page')=='creators')]
 nav[:]=[item for item in nav if not (isinstance(item,dict) and item.get('page')=='creators')]
 children=community['children']
 pos=next((i+1 for i,ch in enumerate(children) if ch.get('page')=='voices'),len(children))
 children.insert(pos,{'label':labels[lng][0],'page':'creators'})
 changes.append(f'{lng}: Community dropdown => {labels[lng][0]}')
 # Keep main Services item if already configured, do not modify unrelated navigation.
 if not any(isinstance(item,dict) and item.get('page')=='services' for item in nav):
  if 'services' not in cfg['pages'] or lng not in cfg['pages']['services']:
   sys.exit(f'Services route for {lng} missing; install Services first')
  pos=next((i+1 for i,x in enumerate(nav) if isinstance(x,dict) and x.get('page')=='activities'),len(nav))
  nav.insert(pos,{'label':labels[lng][1],'page':'services'})
  changes.append(f'{lng}: Added missing Services entry')
# Do not write unless values differ. A rerun should be a no-op.
new=json.dumps(cfg,ensure_ascii=False,indent=2)+'\n'
old=path.read_text(encoding='utf-8-sig')
if json.loads(old)==cfg:
 print('Already configured, no changes needed.')
 sys.exit(0)
print('Planned changes:')
for c in changes:print(' -',c)
if args.dry_run:
 print('DRY RUN - nothing changed')
 sys.exit(0)
backup=path.with_name('site-settings.json.before-creative-'+datetime.now().strftime('%Y%m%d-%H%M%S'))
backup.write_bytes(path.read_bytes())
path.write_text(new,encoding='utf-8')
print('Saved backup:',backup)
print('Updated:',path)
