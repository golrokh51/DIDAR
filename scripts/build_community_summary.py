#!/usr/bin/env python3
"""Privately aggregate DIDAR's bilingual 29-column questionnaire into safe summary CSV.

Works with a PRIVATE Google Forms TSV or CSV export; never commit or upload the raw input.
Example: python3 scripts/build_community_summary.py --input '/private/survey.tsv'
"""
import argparse
import csv
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / 'data/community-summary.csv'
CHOICES = [
    ('received_emotional', 6, 'Listening, encouragement, and emotional support'),
    ('received_connections', 6, 'Connecting me with helpful people or resources'),
    ('need_emotional', 17, 'Social and emotional support'),
    ('need_career', 17, 'Employment and career guidance'),
    ('need_network', 17, 'Networking and mentorship'),
    ('need_immigration', 17, 'Immigration and administrative guidance'),
    ('need_legal', 17, 'Legal information and access to public services'),
]


def aggregate(input_path):
    text = input_path.read_text(encoding='utf-8-sig')
    dialect = csv.excel_tab if text.splitlines()[0].count('\t') > text.splitlines()[0].count(',') else csv.excel
    rows = list(csv.reader(text.splitlines(keepends=True), dialect=dialect))
    if not rows or len(rows[0]) < 29:
        raise ValueError('The source does not match the 29-column bilingual survey')
    header = rows[0]
    for idx, title in [(6, 'Do you remember what kind of support'),
                       (17, 'If someone were in a similar situation'),
                       (26, 'Do you agree to DIDAR using')]:
        if title not in header[idx]:
            raise ValueError('Survey headers changed; check the source column mapping')
    allowed = [r for r in rows[1:] if len(r) >= 29 and 'Yes, I agree' in r[26]]
    public = [['metric','value'],['consenting_responses',len(allowed)]]
    for metric, idx, choice in CHOICES:
        public.append([metric,sum(choice in r[idx] for r in allowed)])
    public.append(['last_updated',datetime.now(timezone.utc).strftime('%Y-%m-%d')])
    return public


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',required=True,type=Path,help='PRIVATE CSV/TSV export; never commit this file')
    parser.add_argument('--output',type=Path,default=DEFAULT_OUTPUT,help='Output contains aggregates ONLY')
    args=parser.parse_args()
    if args.input.resolve()==args.output.resolve():
        parser.error('Input and output must be different files')
    public = aggregate(args.input)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    with args.output.open('w',encoding='utf-8',newline='') as f:
        csv.writer(f).writerows(public)
    print(f'Wrote {len(public)-1} aggregate metrics from {public[1][1]} consenting responses; no individual records published.')


if __name__=='__main__':
    main()
