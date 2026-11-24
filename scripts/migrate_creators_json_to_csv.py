#!/usr/bin/env python3
"""Migrate old DIDAR supported-creators JSON profiles to public CSV, without losing existing CSV rows."""
from pathlib import Path
import argparse, csv, json, datetime, shutil
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--dry-run',action='store_true',help='Preview without modifying CSV')
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
source=root/'data'/'supported-creators.json'
target=root/'data'/'supported-creators.csv'
if not source.exists(): parser.error(f'No old file found: {source}')
old=json.loads(source.read_text(encoding='utf-8-sig'))
if not isinstance(old,list):parser.error('Old JSON must contain a list of creators')
with target.open(newline='',encoding='utf-8-sig') as f:
 r=csv.DictReader(f);fields=r.fieldnames or [];existing=list(r)
if not fields:parser.error('CSV file has no header')
ids={str(row.get('id','')).strip() for row in existing if str(row.get('id','')).strip()}
def local(value,lang):
 if isinstance(value,dict):return str(value.get(lang,'') or '')
 return str(value or '')
added=[]
for item in old:
 if not isinstance(item,dict):continue
 # Do not copy profiles without confirmed public-publication consent to a PUBLIC CSV.
 if item.get('consent_confirmed') is not True:continue
 ident=str(item.get('id','')).strip()
 if not ident or ident in ids:continue
 bio=item.get('bio');city=item.get('city');alt=item.get('image_alt')
 row={'id':ident,'published':'yes' if item.get('published') is True else 'no',
      'consent_confirmed':'yes' if item.get('consent_confirmed') is True else 'no',
      'name':str(item.get('name','') or ''),'category':str(item.get('category','other') or 'other'),
      'instagram':str(item.get('instagram','') or ''),'website':str(item.get('website','') or ''),
      'image':str(item.get('image','') or ''),'sort_order':str(item.get('sort_order','') or '')}
 for language in ('fr','en','fa'):
  row['city_'+language]=local(city,language)
  row['bio_'+language]=local(bio,language)
  row['image_alt_'+language]=local(alt,language)
 added.append({key:row.get(key,'') for key in fields});ids.add(ident)
print('Existing CSV rows:',len(existing),'New records to migrate:',len(added))
if args.dry_run or not added:
 print('No changes written.' if args.dry_run else 'Nothing to migrate.')
 raise SystemExit(0)
backup=target.with_name(target.name+'.bak-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
shutil.copyfile(target,backup)
with target.open('w',newline='',encoding='utf-8-sig') as f:
 writer=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore',lineterminator='\n')
 writer.writeheader();writer.writerows(existing+added)
print('Updated',target,'Backup',backup)
