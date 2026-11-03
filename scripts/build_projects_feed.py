#!/usr/bin/env python3
"""Build three localized DIDAR Project pages + a shared feed from published Projects CSV.

Projects CSV can be a third published tab of the same Google Sheet used for Programs
and Sessions. When not configured or temporarily unavailable, retain existing files.
"""
from __future__ import annotations
import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

from build_activities_feed import http_csv, rows_from_csv, split_list, visible, warning

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config/projects-sheet.json"
PROJECT_FEED = ROOT / "projects/projects-feed.json"
ACTIVITIES = ROOT / "fa/activities/activities-feed.json"
LOCALES = {"fr": ROOT / "projects/projects-data.js", "en": ROOT / "en/projects/projects-data.js", "fa": ROOT / "fa/projects/projects-data.js"}
ALLOWED_STATUS = {"active", "development", "collaboration", "completed"}

def link_or_blank(raw):
    raw = (raw or "").strip()
    parsed = urlparse(raw)
    if raw.startswith("/") and not raw.startswith("//"):
        return raw
    if parsed.scheme == "https" and parsed.netloc:
        return raw
    return ""

def build(rows):
    programs = json.loads(ACTIVITIES.read_text(encoding="utf-8")).get("programs", [])
    prog_map = {x["id"]:x for x in programs}
    out = []
    localized = {loc: [] for loc in LOCALES}
    for row in rows:
        pid = row['id']
        statuses = split_list(row.get('status', ''))
        if not statuses:
            statuses = ['development']
        if any(st not in ALLOWED_STATUS for st in statuses):
            raise ValueError(f"Project {pid} invalid status; use active, development, collaboration, completed")
        if not any(row.get(f'title_{locale}') for locale in LOCALES):
            raise ValueError(f"Project {pid} needs at least one title translation")
        related = split_list(row.get('related_program_ids', ''))
        for program_id in related:
            if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,119}',program_id):
                raise ValueError(f'Project {pid} has invalid related program ID')
        rec = {
          'id': pid, 'status': statuses, 'visible': visible(row.get('visible', '')),
          'sortOrder': int(row.get('sort_order') or '999'),
          'committeeIds':split_list(row.get('committee_ids','')),
          'relatedProgramIds': related,
          'link':link_or_blank(row.get('link_url','')),
          'translations':{locale:{
            'title':row.get(f'title_{locale}', '').strip(),
            'subtitle':row.get(f'subtitle_{locale}', '').strip(),
            'summary':row.get(f'summary_{locale}', '').strip(),
            'tags':split_list(row.get(f'tags_{locale}',''))
          } for locale in LOCALES}
        }
        if not rec['visible']:
            continue
        out.append(rec)
        for locale in LOCALES:
            t=rec['translations'][locale]
            if not t['title']:
                t=rec['translations']['fa'] if rec['translations']['fa']['title'] else (rec['translations']['fr'] if rec['translations']['fr']['title'] else rec['translations']['en'])
            rel=[]
            for key in related:
                program=prog_map.get(key)
                if program:
                    tr=program.get('translations', {}).get(locale, {})
                    title=tr.get('title') or program.get('title') or key
                else:
                    title=key
                rel.append({'id':key,'title':title})
            localized[locale].append({
              'id':pid,'title':t['title'],'subtitle':t['subtitle'],'summary':t['summary'],
              'status':statuses,'tags':t['tags'],'relatedPrograms':rel,'committeeIds':rec['committeeIds'],'link':rec['link']
            })
    out.sort(key=lambda p:(p['sortOrder'],p['id']))
    for locale in LOCALES:
        localized[locale].sort(key=lambda p:next((x['sortOrder'] for x in out if x['id']==p['id']),999))
    if not out:
        raise ValueError('No public projects in CSV; refusing to remove current listings')
    return out,localized

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--projects-file',type=Path)
    ap.add_argument('--verify-only',action='store_true')
    args=ap.parse_args()
    conf=json.loads(CONFIG.read_text(encoding='utf-8'))
    url=conf.get('projects_csv_url', '').strip()
    if not url and not args.projects_file:
        print('Projects: CSV URL not configured; preserving existing FR, EN, FA project listings.')
        return
    try:
        content=args.projects_file.read_text(encoding='utf-8-sig') if args.projects_file else http_csv(url)
        rows=rows_from_csv(content,{'id','title_en','title_fr','title_fa','status'},'Projects')
        projects,localized=build(rows)
        if args.verify_only:
            print(f'Projects: validated {len(projects)} visible records')
            return
        PROJECT_FEED.write_text(json.dumps({'projects':projects},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        for locale,path in LOCALES.items():
            path.write_text('const PROJECTS = '+json.dumps(localized[locale],ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
        print(f'Projects: synced {len(projects)} entries for FR/EN/FA and committees')
    except Exception as exc:
        warning(f'Projects not updated: {exc}. Preserving checked-in project files.')
        if args.projects_file or args.verify_only:
            sys.exit(1)

if __name__=='__main__':
    main()
