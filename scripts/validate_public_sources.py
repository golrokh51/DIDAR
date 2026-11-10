#!/usr/bin/env python3
"""Fail the deployment if an enabled public CSV link is invalid or the wrong tab.

The events and collaborators pages use browser-side fetching; this script
checks their published CSV source before we deploy. No private credentials used.
"""
import csv
import io
import json
import sys
from pathlib import Path
from urllib.parse import urlparse
from build_activities_feed import http_csv

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [
    ("Events", ROOT / "config/events-source.json", "google_sheets_csv_url",
     {"event_uid", "event_date", "status", "website_status", "review_status"}, True),
    ("Collaborators", ROOT / "config/collaborators-source.json", "google_sheets_csv_url",
     {"collaborator_id", "website_status", "review_status"}, False),
]

def main():
    for label, file, key, required, must_exist in SOURCES:
        if not file.exists():
            if must_exist:
                raise ValueError(f"Missing required config {file}")
            print(f"{label}: not configured, skipping")
            continue
        config = json.loads(file.read_text(encoding="utf-8"))
        if config.get("mode") != "google_sheets_csv":
            print(f"{label}: not in google_sheets_csv mode, skipping")
            continue
        url = (config.get(key) or "").strip()
        if not url:
            if must_exist:
                raise ValueError(f"{label}: missing required published CSV URL")
            print(f"{label}: no published CSV URL yet; event pages continue without rich collaborator registry")
            continue
        csv_text = http_csv(url)
        if csv_text.lstrip().lower().startswith(("<!doctype html", "<html")):
            raise ValueError(f"{label}: URL returned HTML, not CSV. Publish the tab as CSV.")
        reader = csv.DictReader(io.StringIO(csv_text))
        fields = {v.strip() for v in reader.fieldnames or [] if v}
        missing = required - fields
        if missing:
            raise ValueError(f"{label}: wrong published tab or columns; missing {', '.join(sorted(missing))}")
        if label == "Collaborators" and not any(k in fields for k in ("name_en", "name_fr", "name_fa")):
            raise ValueError("Collaborators: add at least one of name_en, name_fr, name_fa")
        rows = list(reader)
        if label == "Events" and not rows:
            raise ValueError("Events: published CSV is empty")
        print(f"{label}: validated {len(rows)} CSV rows and required headers")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"SOURCE VALIDATION ERROR: {exc}",file=sys.stderr)
        sys.exit(1)
