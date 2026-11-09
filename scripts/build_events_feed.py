#!/usr/bin/env python3
"""Build DIDAR's public trilingual event feed from approved relational records.

Run one of:
  python3 scripts/build_events_feed.py --workbook /path/to/DIDAR_Master.xlsx
  python3 scripts/build_events_feed.py --csv /path/to/public-events.csv
  python3 scripts/build_events_feed.py --csv-url https://docs.google.com/...

Requires Python 3.10+ and the standard library only.
Only explicitly approved events are published. Photos are optional and displayed only when approved.
Private people/contact/finance tables are never exported.
"""
from __future__ import annotations

import argparse
import csv
from datetime import date, datetime, timezone
import io
import json
from pathlib import Path, PurePosixPath
import re
import sys
from urllib.parse import urlparse, parse_qs
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / 'events/events-feed.json'
S = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
APPROVED = {'approved', 'verified', 'confirmed', 'cleared', 'yes', 'true', '1'}
PUBLIC_STATUSES = {'published', 'public'}
TRUE = {'yes', 'true', '1', 'approved', 'published'}
NO_PEOPLE = {'not_applicable', 'not applicable', 'no_people', 'no people', 'not_required'}
VALID_STATUS = {'completed', 'planned', 'upcoming', 'scheduled'}
VALID_LOCALES = ('fa', 'en', 'fr')


def val(value):
    return str(value if value is not None else '').strip()


def norm(value):
    return val(value).lower().replace('-', '_').replace(' ', '_')


def is_true(value):
    return norm(value) in TRUE


def warn(message):
    print('WARNING:', message, file=sys.stderr)


def read_workbook(filename: Path) -> dict[str, list[dict[str, str]]]:
    """Minimal read-only OOXML reader; does not modify the Excel workbook."""
    out = {}
    with ZipFile(filename) as z:
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            strings = [''.join(n.text or '' for n in si.iter(S + 't')) for si in tree]
        root = ET.fromstring(z.read('xl/workbook.xml'))
        rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        targets = {node.get('Id'): node.get('Target') for node in rels}
        for sheet in root.find(S + 'sheets'):
            name = sheet.get('name', '')
            if name not in {'Events','Programs','Event Content','Event Media','Organizations','Event Organizations','Venues'}:
                continue
            target = targets.get(sheet.get(R + 'id'))
            if not target:
                continue
            path = target.lstrip('/') if target.startswith('/') else ('xl/' + target if not target.startswith('xl/') else target)
            xml = ET.fromstring(z.read(path))
            records = []
            headers = {}
            for row in xml.findall('.//' + S + 'sheetData/' + S + 'row'):
                cells = {}
                for cell in row.findall(S + 'c'):
                    ref = cell.get('r', ''); col = re.match('[A-Z]+', ref)
                    if not col:
                        continue
                    key = col.group(0)
                    v = cell.find(S + 'v')
                    inline = cell.find(S + 'is')
                    value = v.text if v is not None and v.text is not None else ''
                    if cell.get('t') == 's' and value:
                        value = strings[int(value)]
                    elif inline is not None:
                        value = ''.join(n.text or '' for n in inline.iter(S + 't'))
                    cells[key] = val(value)
                if not headers:
                    headers = {key: value for key, value in cells.items() if value}
                    continue
                if not any(cells.values()):
                    continue
                record = {h: cells.get(key, '') for key, h in headers.items()}
                records.append(record)
            out[name] = records
    if 'Events' not in out:
        raise ValueError('Workbook must contain an Events worksheet')
    return out


def valid_date(value, identity, required=True):
    value = val(value)
    if not value:
        if required:
            warn(f'{identity}: missing event_date')
        return ''
    try:
        parsed = date.fromisoformat(value)
        if parsed.isoformat() != value:
            raise ValueError()
        return value
    except ValueError:
        warn(f'{identity}: invalid ISO date {value!r}; required format YYYY-MM-DD')
        return ''


def public_url(value):
    parsed = urlparse(val(value))
    return val(value) if parsed.scheme == 'https' and parsed.netloc and not parsed.username else ''


def safe_photo_path(value):
    value = val(value).replace('\\', '/')
    if not value or value.startswith('/') or '?' in value or '#' in value:
        return ''
    path = PurePosixPath(value)
    if path.parts[:2] != ('assets', 'event-photos') or any(x in ('..', '.') for x in value.split('/')):
        return ''
    if path.suffix.lower() not in ('.jpg','.jpeg','.png','.webp','.avif'):
        return ''
    if not (ROOT / value).is_file():
        return ''
    return value


def safe_photo(value):
    """Permit a repository image or a public Google Drive *link* / Drive file ID.

    We deliberately don't request a Google Drive API token. Viewer access must
    be set to 'Anyone with the link' and embedding can fail depending on Google.
    """
    local = safe_photo_path(value)
    if local:
        return local
    value = val(value)
    if re.fullmatch(r'[A-Za-z0-9_-]{20,}', value):
        return f'https://drive.google.com/file/d/{value}/view'
    url = urlparse(value)
    if url.scheme != 'https' or url.hostname != 'drive.google.com' or url.username:
        return ''
    if re.fullmatch(r'/file/d/[A-Za-z0-9_-]{20,}(?:/view)?/?', url.path):
        return value
    if url.path in ('/open','/uc','/thumbnail') and re.fullmatch(r'[A-Za-z0-9_-]{20,}',parse_qs(url.query).get('id',[''])[0]):
        return value
    return ''


def localized_names(prefix, row, extra_fallback=''):
    return {code: val(row.get(f'{prefix}_{code}')) or extra_fallback for code in VALID_LOCALES}


def safe_media(event_id, media_rows):
    approved = []
    for row in media_rows:
        if val(row.get('event_uid')) != event_id:
            continue
        if not (is_true(row.get('website_approved')) and norm(row.get('rights_status')) in APPROVED
                and norm(row.get('people_consent_status')) in (APPROVED | NO_PEOPLE)):
            continue
        photo = safe_photo(row.get('url_or_drive_id'))
        if not photo:
            warn(f'{event_id}: approved image {row.get("media_uid", "")} missing or not a supported Google Drive/local image')
            continue
        approved.append({
            'src': photo,
            'alt': {code: val(row.get(f'alt_{code}')) or val(row.get(f'caption_{code}')) for code in VALID_LOCALES},
            'caption': localized_names('caption', row),
            'credit': val(row.get('credit')),
            '_featured': is_true(row.get('featured')),
        })
    approved.sort(key=lambda i: not i['_featured'])
    for item in approved:
        item.pop('_featured')
    return approved


def compose_from_workbook(data):
    programs = {r.get('program_uid'): r for r in data.get('Programs', [])}
    venues = {r.get('venue_uid'): r for r in data.get('Venues', [])}
    orgs = {r.get('organization_uid'): r for r in data.get('Organizations', [])}
    all_media = data.get('Event Media', [])
    contents = data.get('Event Content', [])
    event_orgs = data.get('Event Organizations', [])
    result = []
    ids = set()
    for row in data['Events']:
        uid = val(row.get('event_uid'))
        if not re.fullmatch(r'EVT-\d{6}', uid):
            warn(f'Skipping invalid event UID {uid!r}')
            continue
        if uid in ids:
            raise ValueError(f'Duplicate event UID: {uid}')
        ids.add(uid)
        if norm(row.get('website_status')) not in PUBLIC_STATUSES or norm(row.get('review_status')) not in APPROVED:
            continue
        status = norm(row.get('status'))
        if status not in VALID_STATUS:
            warn(f'{uid}: status {status!r} is not publishable (cancelled/postponed require separate handling)')
            continue
        event_date = valid_date(row.get('event_date'), uid)
        if not event_date:
            continue
        event_year = val(row.get('event_year'))
        if event_year and event_year != event_date[:4]:
            warn(f'{uid}: event_year conflicts with event_date; event excluded')
            continue
        program = programs.get(val(row.get('program_uid')))
        if row.get('program_uid') and not program:
            warn(f'{uid}: program_uid does not exist; excluded')
            continue
        images = safe_media(uid, all_media)  # Optional: a record can be published without photos.
        names = localized_names('title', row)
        if not any(names.values()):
            warn(f'{uid}: missing event titles')
            continue
        fallback = next((names[lang] for lang in ('fr', 'en', 'fa') if names[lang]), uid)
        names = {lang: names[lang] or fallback for lang in VALID_LOCALES}
        summary = {lang: '' for lang in VALID_LOCALES}
        description = {lang: '' for lang in VALID_LOCALES}
        for record in contents:
            if val(record.get('event_uid')) != uid or norm(record.get('review_status')) not in APPROVED:
                continue
            lang = val(record.get('language_code'))
            if lang in VALID_LOCALES:
                summary[lang] = val(record.get('summary'))
                description[lang] = val(record.get('description'))
        partners = []
        for record in event_orgs:
            if val(record.get('event_uid')) != uid:
                continue
            if norm(record.get('credit_permission')) not in APPROVED or norm(record.get('review_status')) not in APPROVED:
                continue
            org = orgs.get(val(record.get('organization_uid')))
            if org:
                partners.append({'name': localized_names('name', org), 'url': public_url(org.get('website_url'))})
        venue = venues.get(val(row.get('venue_id')))
        public_place = val(venue.get('name_public')) if venue else ''
        result.append({
            'id': uid, 'programUid': val(row.get('program_uid')),
            'programId': val(program.get('program_id')) if program else '',
            'date': event_date, 'datePrecision': norm(row.get('date_precision')),
            'endDate': valid_date(row.get('end_date'), uid, False),
            'status': status,
            'category': val(row.get('primary_category_id')),
            'type': val(row.get('event_type')),
            'title': names, 'summary': summary, 'description': description,
            'venue': public_place, 'venueType': val(row.get('venue_type')),
            'link': public_url(row.get('event_url')),
            'partners': partners,
            'featuredImage': images[0] if images else None, 'images': images,
        })
    return result


def compose_from_public_csv(rows):
    result = []
    ids = set()
    for row in rows:
        uid = val(row.get('event_uid'))
        if not uid:
            continue
        if not re.fullmatch(r'EVT-\d{6}', uid) or uid in ids:
            raise ValueError(f'Invalid/duplicate event UID in CSV: {uid}')
        ids.add(uid)
        if norm(row.get('website_status')) not in PUBLIC_STATUSES or norm(row.get('review_status')) not in APPROVED:
            continue
        status = norm(row.get('status'))
        event_date = valid_date(row.get('event_date'), uid)
        if status not in VALID_STATUS or not event_date:
            warn(f'{uid}: status/date not publishable')
            continue
        event_year = val(row.get('event_year'))
        if event_year and event_year != event_date[:4]:
            warn(f'{uid}: year conflict, skipping')
            continue
        # Images are optional, and must never be displayed without the required approvals.
        photo_approved = (is_true(row.get('photo_rights_approved')) and
                norm(row.get('photo_consent_approved')) in (TRUE | NO_PEOPLE))
        image_path = safe_photo(row.get('featured_image')) if photo_approved else ''
        title = localized_names('title', row)
        fallback = next((title[lang] for lang in ('fr','en','fa') if title[lang]), '')
        if not fallback:
            warn(f'{uid}: missing titles')
            continue
        photo = ({
            'src': image_path,
            'alt': localized_names('photo_alt', row),
            'caption': {lang: '' for lang in VALID_LOCALES},
            'credit': val(row.get('photo_credit')),
        } if image_path else None)
        result.append({
            'id':uid, 'programUid':val(row.get('program_uid')),
            'programId':val(row.get('program_id')),
            'date':event_date, 'datePrecision': norm(row.get('date_precision')),
            'endDate':valid_date(row.get('end_date'), uid, False),
            'status':status, 'category':val(row.get('primary_category_id')),
            'type':val(row.get('event_type')),
            'title':{lang:title[lang] or fallback for lang in VALID_LOCALES},
            'summary':localized_names('summary',row),
            'description':localized_names('description',row),
            'venue':val(row.get('venue_public')), 'venueType':val(row.get('venue_type')),
            'link':public_url(row.get('event_url')),
            'partners':[], 'featuredImage':photo, 'images':[photo] if photo else [],
        })
    return result


def load_csv(text):
    reader = csv.DictReader(io.StringIO(text, newline=''))
    required = {'event_uid','event_date','status','website_status','review_status'}
    cols = set(reader.fieldnames or [])
    if not required.issubset(cols):
        raise ValueError(f'Public CSV missing required columns: {sorted(required - cols)}')
    return [{str(k).strip(): val(v) for k,v in row.items() if k is not None} for row in reader]


def get_csv_url(url):
    parsed = urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname != 'docs.google.com':
        raise ValueError('For safety, Google Sheets URL must be HTTPS docs.google.com public CSV export')
    with urlopen(Request(url, headers={'User-Agent':'DIDAR-Public-Events/1.0'}), timeout=25) as response:
        body = response.read(2_000_001)
        if len(body) > 2_000_000:
            raise ValueError('Public CSV too large')
        return body.decode('utf-8-sig')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    choices = parser.add_mutually_exclusive_group(required=True)
    choices.add_argument('--workbook', type=Path, help='Private local DIDAR Excel workbook: do NOT commit this workbook to GitHub')
    choices.add_argument('--csv', type=Path, help='Reviewed public-only CSV exported from Google Sheets')
    choices.add_argument('--csv-url', help='Public-only Google Sheets CSV export HTTPS URL')
    parser.add_argument('--out', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--allow-empty', action='store_true', help='Intentionally remove all currently published events')
    args = parser.parse_args()
    if args.workbook:
        events = compose_from_workbook(read_workbook(args.workbook))
    else:
        csv_text = args.csv.read_text(encoding='utf-8-sig') if args.csv else get_csv_url(args.csv_url)
        events = compose_from_public_csv(load_csv(csv_text))
    events.sort(key=lambda event: (event['date'], event['id']))
    if not events and not args.allow_empty:
        raise SystemExit('No publicly approved events. Existing feed left unchanged. Use --allow-empty only to clear it deliberately.')
    payload = {
        'schemaVersion': 1,
        'generatedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'events': events,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    temp = args.out.with_suffix('.json.tmp')
    temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temp.replace(args.out)
    print(f'Wrote {len(events)} publicly approved events to {args.out}')


if __name__ == '__main__':
    main()
