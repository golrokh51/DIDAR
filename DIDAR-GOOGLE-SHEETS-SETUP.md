# DIDAR · Google Sheets → Activities website

## Status / وضعیت

The **two distinct published sheet-tab URLs are configured**:

| Sheet | Google worksheet tab ID (`gid`) | Website section |
| --- | --- | --- |
| `Programs` | `1188037358` | برنامه‌های دیدار |
| `Sessions` | `1631456981` | نشست‌ها و فعالیت‌های ثبت‌شده |

These URLs are stored in `config/activities-sheets.json`. Both have `single=true&output=csv`. The data format follows `DIDAR_Trilingual_Activities_Master.xlsx`.

**Important:** The CSV servers were **not reachable from the preparation environment**. The integration passed local tests using the published spreadsheet template's CSV column structure, but you must check your first GitHub Actions run for confirmation that your live CSV is accessible and has the required headers. The website has a safe Persian fallback for each tab if a download fails.

## First-time setup (once)

1. Back up your GitHub repository. Unzip the full updated package and put the **contents** of `DIDAR-main/` at the repository root (do not create a second `DIDAR-main/` folder). Commit all the files, **including the hidden `.github/` folder**. Alternatively, apply the small update-only ZIP at repository root.
2. On GitHub open **Settings → Pages → Build and deployment → Source → GitHub Actions**. (If your repository already uses custom Pages deployment, reconcile the workflows instead of blindly replacing it.)
3. Go to **Actions → Publish DIDAR and sync Google Sheets → Run workflow**. Wait for a successful deployment. If it fails, click the run and inspect the warnings next to **Generate localized activity data from published CSVs**.
4. Open your published site's **`/fa/activities/`** page, refresh, and confirm the `Programs` and `Sessions` from the spreadsheet appear. To confirm the connection truly works, temporarily update a **public, non-sensitive** program description in Google Sheets, run the workflow again, and check that change appears; then restore the description.
5. In future, edit your **online Google Sheets** (not a downloaded Excel `.xlsx` copy) to update the site. Published sheets may need a few minutes to refresh. GitHub Actions checks at **:07, :22, :37, :52 UTC** every hour, but scheduled runs may be delayed. For an immediate manual attempt, use **Run workflow**.

No Google API token is necessary because these CSV tabs were published to the web.

## What is automatic / چه چیزی خودکار است؟

- Edit `Programs` to change general program names, descriptions, topics, audience, or schedule.
- Edit `Sessions` to add **one row per actual occurrence**, with its unique `id`, date, partner, and `program_id` linking back to `Programs.id`. Repeated workshops should reuse the same `program_id` but have different session `id` values.
- A successful Pages deployment regenerates the JSON feed for both tabs, and the Persian Activities page automatically displays the new data. It is **not** a real-time browser connection: updates appear after publication + next successful site build.
- `fa/activities/index.html` currently displays the Persian (`_fa`) content. The build preserves `_en` and `_fr` columns in `translations` for later localized pages; it does not create English/French Activities pages yet.

### Essential spreadsheet column names

`Programs`: `id`, `title_fa`, `description_fa` (and optional multilingual fields such as `subtitle_fa`, `title_en`, `title_fr`, etc.).

`Sessions`: `id`, `program_id`, `date`, `status`, `title_fa` (and optional `partner_fa`, `summary_fa`, `title_en`, `title_fr`, etc.).

Dates must show as `YYYY-MM-DD` in the **published CSV**, e.g. `2026-10-11`. Format Google Sheets' relevant columns as plain text before entering dates if it re-formats them differently. Use `status=completed` for a completed event, or `upcoming` for a future event. Enter `visible=FALSE` if you wish not to display a row in the web page. An invisible row is **not private**: the source Google Sheet and generated JSON feed are publicly accessible.

**Never place private participant details, confidential contact information, or sensitive notes into publicly published tabs.** Keep private tracking in an unpublished separate spreadsheet.

### File map

| File | Purpose |
| --- | --- |
| `config/activities-sheets.json` | Programs and Sessions CSV URLs |
| `scripts/build_activities_feed.py` | Download, validate, transform CSV into trilingual-ready JSON |
| `.github/workflows/deploy-pages.yml` | Run sync and publish GitHub Pages on push, manual run, and schedule |
| `fa/activities/activities-feed.json` | Safe checked-in starting data; overwritten *during deployment* by freshly downloaded content |
| `fa/activities/activities-data.js` | Persian browser fallback if JSON cannot load |
| `fa/activities/index.html` | Persian Activities page; reads generated JSON feed |

### Error handling / مشکلات احتمالی

The builder rejects invalid URLs, wrong tabs/headers, duplicate IDs, or broken dates. It logs a warning and falls back to the *checked-in starter data* for that tab. This prevents the page from going blank, but note that after a previously successful sync, an outage can make data temporarily revert to the starter snapshot. Review GitHub Actions warning logs when that happens.

If the sheet changes but the site does not, check: (1) Did you edit the **online** Google Sheet? (2) Is **Automatically republish when changes are made** enabled in File → Share → Publish to web → Published content & settings? (3) Did the Actions workflow finish successfully? (4) Does the published CSV contain your changed row? (5) Are its header names/ISO dates correct? (6) Did your browser load a cached copy of the page?

GitHub Actions cron jobs may not run precisely on time, and inactive public repositories may have schedules disabled after an extended inactive period. You can always use Run workflow.

### Optional local/offline check

From the site root:

```sh
python3 scripts/build_activities_feed.py --programs-file programs.csv --sessions-file sessions.csv --verify-only
python3 -m http.server 8000
```

Then open `http://localhost:8000/fa/activities/`. Opening the HTML directly as a `file://` page can block JSON `fetch`; use a local server for this test.

## Repeatable sessions and collaborator links (NEW)

**Each program may have any number of dated sessions.** Reuse `Sessions.program_id` (e.g. `dialogue-crisis`) and give each occurrence a unique `Sessions.id`. `status` is independent for each occurrence:

| Value in Sessions.status | Persian badge |
| --- | --- |
| `scheduled` or `upcoming` | برنامه‌ریزی‌شده |
| `completed` | برگزارشده |
| `postponed` | به تعویق افتاده |
| `cancelled` | لغوشده |

### Add three columns to EACH of your existing, live Google Sheets tabs

`collaborators_fa`, `collaborators_en`, `collaborators_fr`

**Do not create a third published tab and do not change the published CSV URLs.** In your existing `Programs` tab, add these headers in empty columns (e.g. `AF:AH` in the original template). In `Sessions`, add the same three headers (e.g. `AH:AJ`). Columns may be placed anywhere: the importer matches column *names*, not positions.

**Cell format** for a list of collaborators, each optionally with a public link:

```
انجمن اول :: https://example.org | انجمن دوم :: https://example.com
```

- Separate collaborators with a vertical bar `|`.
- Separate a collaborator's name from their URL with `::` (two colons).
- Use an `https://` URL. Names without URLs are shown as plain text, not broken links.
- Add **program-level** collaborators under `Programs` only when they collaborated on the overall program; session-specific hosts or collaborators belong in that row of `Sessions` only.
- Existing `partner_fa` continues to display as a name if `collaborators_fa` is empty, preserving older records. You can keep `partner_fa` for reference even when `collaborators_fa` is populated.
- English/French (`collaborators_en` / `_fr`) can remain blank until those translations are ready.
- Never put a made-up website link for an organization; use the URL they provided or a link you verified.

Example, *not an actual scheduled event*:

| id | program_id | date | status | collaborators_fa |
| --- | --- | --- | --- | --- |
| `example-dialogue-2026-11-15` | `dialogue-crisis` | `2026-11-15` | `scheduled` | `نهاد نمونه :: https://example.org` |

The Persian Programs cards now show a collapsible **نشست‌های این برنامه** list containing *both* upcoming/scheduled and completed occurrences, each linked to its detailed session card and showing its own collaborators. Program collaborators (if any) show on the program card; individual collaborators show on the dated event card. Updates appear after Google's public CSV is republished and the next successful GitHub Pages deployment.
