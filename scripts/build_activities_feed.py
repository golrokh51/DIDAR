#!/usr/bin/env python3
"""Build DIDAR's trilingual static activities feed from two public Google Sheets CSV tabs.

No credentials, third-party dependencies, or JavaScript cross-origin requests required.
On a temporary Google failure or incorrect tab URL, preserve checked-in fallback
content for the affected section and print an actionable warning.

To test without internet, use --programs-file and --sessions-file with local CSV files.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "config/activities-sheets.json"
FEED_PATH = ROOT / "fa/activities/activities-feed.json"
LOCALES = ("fa", "en", "fr")
MAX_BYTES = 3_000_000


def warning(message: str) -> None:
    print("::warning::" + message, file=sys.stderr)


def http_csv(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != "docs.google.com":
        raise ValueError("Only publicly published docs.google.com HTTPS CSV links are allowed")
    req = Request(url, headers={"User-Agent": "DIDAR-Activities-Sync/1.0", "Accept": "text/csv,text/plain,*/*"})
    with urlopen(req, timeout=30) as response:
        raw = response.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise ValueError("CSV too large")
    return raw.decode("utf-8-sig")


def rows_from_csv(content: str, required: set[str], source_name: str) -> list[dict[str, str]]:
    if content.lstrip().lower().startswith(("<!doctype html", "<html")):
        raise ValueError(f"{source_name} returned HTML, not a public CSV file")
    reader = csv.DictReader(io.StringIO(content, newline=""))
    fields = set((h or "").strip() for h in (reader.fieldnames or []))
    if not required.issubset(fields):
        raise ValueError(f"{source_name} wrong tab or header: missing {', '.join(sorted(required-fields))}. Found: {', '.join(sorted(fields))}")
    results = []
    ids = set()
    for num, row in enumerate(reader, start=2):
        if num > 2001:
            raise ValueError("Too many rows; limit is 2000")
        if None in row:
            raise ValueError(f"{source_name} row {num} has more cells than header")
        cleaned = {str(k).strip(): (v or "").strip() for k,v in row.items() if k}
        uid = cleaned.get("id", "")
        if not uid:
            if any(cleaned.values()):
                warning(f"Skipping {source_name} row {num} with missing id")
            continue
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,119}", uid):
            raise ValueError(f"{source_name} row {num}: invalid id: {uid[:120]}")
        if uid in ids:
            raise ValueError(f"{source_name} has duplicate id {uid}")
        ids.add(uid)
        results.append(cleaned)
    if not results:
        raise ValueError(f"{source_name} CSV has no data rows; refusing to erase existing entries")
    return results


def get_value(row: dict[str,str], name: str, locale: str) -> str:
    return row.get(f"{name}_{locale}", "")


def split_list(value: str) -> list[str]:
    return [part.strip() for part in value.split("|") if part.strip()]


def parse_collaborators(value: str) -> list[dict[str, str]]:
    """Parse a human-friendly Sheets cell: Name :: https://url | Another :: https://url.

    Each translated column contains names and links; links can be omitted.
    No third published tab is required. Other separators are not inferred.
    """
    collaborators = []
    for item in split_list(value):
        name, sep, url = item.partition("::")
        name = name.strip()
        if not name:
            continue
        candidate = url.strip() if sep else ""
        if candidate and not safe_url(candidate):
            warning(f"Invalid collaborator URL for {name}; showing the name without a link")
        collaborators.append({"name": name, "url": safe_url(candidate)})
    return collaborators


def visible(value: str) -> bool:
    return value.strip().casefold() not in ("false", "no", "0", "hidden", "off")


def safe_url(value: str) -> str:
    if not value:
        return ""
    parsed = urlparse(value)
    return value if parsed.scheme in ("https", "http") and parsed.netloc else ""


def iso_date(value: str) -> str:
    if not value:
        return ""
    # Do not silently make dates up. YYYY-MM-DD is ideal for sorting.
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError(f"Date must use YYYY-MM-DD, got {value!r}")
    from datetime import date
    date.fromisoformat(value)
    return value


def program_from_row(row: dict[str, str]) -> dict:
    fa = "fa"
    result = {
        "id": row["id"],
        "title": get_value(row, "title", fa),
        "subtitle": get_value(row, "subtitle", fa),
        "description": get_value(row, "description", fa),
        "status": get_value(row, "status", fa),
        "startDate": iso_date(row.get("start_date", "")),
        "schedule": get_value(row, "schedule", fa),
        "audience": get_value(row, "audience", fa),
        "languages": [x.strip() for x in re.split("[،|]", get_value(row, "languages", fa)) if x.strip()],
        "topics": split_list(get_value(row, "topics", fa)),
        "collaborators": parse_collaborators(get_value(row, "collaborators", fa)),
        "visible": visible(row.get("visible", "")),
        "sortOrder": int(row.get("sort_order") or "999"),
        "translations": {language: {
            key: get_value(row, key, language)
            for key in ("title", "subtitle", "description", "status", "schedule", "audience", "languages", "topics")
        } | {"collaborators": parse_collaborators(get_value(row, "collaborators", language))}
        for language in LOCALES},
        "translationReview": {language: row.get(f"review_{language}", "") for language in LOCALES},
    }
    if not result["title"]:
        raise ValueError(f"Program {row['id']} is missing title_fa")
    return result


def session_from_row(row: dict[str, str]) -> dict:
    fa = "fa"
    status = row.get("status") or "upcoming"
    if status not in ("upcoming", "scheduled", "completed", "cancelled", "postponed"):
        raise ValueError(f"Session {row['id']}: invalid status {status!r}")
    result = {
        "id": row["id"], "programId": row.get("program_id", ""),
        "date": iso_date(row.get("date", "")), "status": status,
        "title": get_value(row, "title", fa),
        "subtitle": get_value(row, "subtitle", fa),
        "type": row.get("type", "event"),
        "partner": get_value(row, "partner", fa),
        "collaborators": parse_collaborators(get_value(row, "collaborators", fa)) or
            parse_collaborators(get_value(row, "partner", fa)),
        "location": get_value(row, "location", fa),
        "role": get_value(row, "role", fa),
        "summary": get_value(row, "summary", fa),
        "module": get_value(row, "module", fa),
        "participants": row.get("participants", ""),
        "durationMinutes": row.get("duration_minutes", ""),
        "link": safe_url(row.get("link", "")),
        "visible": visible(row.get("visible", "")),
        "tags": [],
        "translations": {language: {
            key: get_value(row, key, language)
            for key in ("title", "subtitle", "partner", "location", "role", "summary", "module")
        } | {"collaborators": parse_collaborators(get_value(row, "collaborators", language)) or
             parse_collaborators(get_value(row, "partner", language))}
        for language in LOCALES},
        "translationReview": {language: row.get(f"review_{language}", "") for language in LOCALES},
    }
    if not result["title"]:
        raise ValueError(f"Session {row['id']} is missing title_fa")
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--programs-file", type=Path)
    parser.add_argument("--sessions-file", type=Path)
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    backup = json.loads(FEED_PATH.read_text(encoding="utf-8"))
    results = {"programs":backup["programs"], "sessions":backup["sessions"]}

    url1, url2 = config["programs_csv_url"], config["sessions_csv_url"]
    same_url = url1 == url2
    if same_url and not args.sessions_file:
        warning("Programs and Sessions URLs are identical. Sessions cannot sync; publish the Sessions tab separately with its gid parameter.")

    for kind in ("programs", "sessions"):
        if kind == "sessions" and same_url and not args.sessions_file:
            print("Sessions: using checked-in fallback until the second tab URL is corrected.")
            continue
        path = args.programs_file if kind == "programs" else args.sessions_file
        url = url1 if kind == "programs" else url2
        try:
            content = path.read_text(encoding="utf-8-sig") if path else http_csv(url)
            mandatory = {"id", "title_fa", "description_fa"} if kind == "programs" else {"id", "program_id", "date", "title_fa", "status"}
            rows = rows_from_csv(content, mandatory, kind.capitalize())
            if kind == "programs":
                results[kind] = [program_from_row(row) for row in rows]
            else:
                results[kind] = [session_from_row(row) for row in rows]
            print(f"{kind.capitalize()}: loaded {len(results[kind])} entries from the published CSV")
        except Exception as exc:
            warning(f"{kind.capitalize()} not updated: {exc}. Using checked-in fallback.")

    if args.verify_only:
        print(json.dumps({k:len(v) for k,v in results.items()},ensure_ascii=False))
        return
    FEED_PATH.write_text(json.dumps(results,ensure_ascii=False,indent=2)+"\n", encoding="utf-8")
    print(f"Wrote {FEED_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
