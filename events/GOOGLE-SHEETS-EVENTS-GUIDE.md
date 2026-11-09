# DIDAR — automated events, posters, photos and repeated activities

The public event pages (`/events/`, `/en/events/`, `/fa/events/`) keep using the **existing published Google Sheets CSV** from `config/events-source.json`. No deployment or manual JSON rebuild is needed when you add or edit a row. Updates are visible on the next page load/refresh, subject to Google's published-CSV cache.

**Keep your existing Google Sheets URL and your existing columns.** Add these six **optional column headers** in the first row of the **published public-events tab** (leave them blank for older events):

```
poster_image
recurrence_frequency
recurrence_until
recurrence_count
recurrence_dates
recurrence_exclude_dates
```

The existing `featured_image`, `gallery_image_urls` and `photo_album_url` columns continue to work.

## 1. One-off event: with a poster, photos, or neither

- `poster_image`: a **publicly shared** Google Drive image link/file ID (or `assets/event-photos/...jpg` uploaded with the site). A portrait poster is displayed uncropped.
- `featured_image` (existing): legacy image; used as the cover if `poster_image` is blank. Leave blank for new records when using the more explicit `poster_image` column.
- `gallery_image_urls`: one or more publicly shared Drive image links/file IDs, **separated with `|`** (a pipe character), e.g. `https://drive.google.com/file/d/FILE_ID_1/view|https://drive.google.com/file/d/FILE_ID_2/view` (replace placeholders with real files). Supports up to 24 images.
- `photo_album_url`: optional `https://...` link to a public album.
- **Poster + gallery:** the poster is the event cover and main image, with the photos in the gallery below.
- **Photos only:** the first gallery photo becomes the event cover; remaining photos appear in the gallery.
- **No images:** a text-only event card remains visible.

All media are shown **only if** both `photo_rights_approved=yes` and `photo_consent_approved=yes` (or `no_people`, `not_applicable`, `not_required` for an image with no people / where consent is not required). Images must be publicly accessible to viewers. A Google Drive image might not permit hotlinking; in that case the page provides a link to open the original.

## 2. Café numérique — every week

Create **one row** for the weekly series:

| Column | Example |
|---|---|
| `event_uid` | `EVT-900001` (illustration only — use a real unused ID) |
| `program_id` | `cafe-numerique` |
| `event_date` | `2026-11-12` (first session; sets the weekday) |
| `status` | `scheduled` |
| `website_status` | `published` |
| `review_status` | `approved` |
| `recurrence_frequency` | `weekly` |
| `recurrence_until` | `2027-06-30` (optional) |
| `recurrence_count` | blank (optional; if filled, includes the first date) |
| `recurrence_exclude_dates` | `2026-12-24|2026-12-31` (optional, for holidays) |

- `weekly` repeats every seven days. `biweekly` repeats every 14 days. `monthly` repeats on the same day of the month (the last day of shorter months if needed, e.g., Jan 31 → Feb 28).
- Set either `recurrence_until` or `recurrence_count` if the series has a defined end. If both are blank, the site automatically shows occurrences through a rolling **18-month future horizon**; as time passes, newly upcoming occurrences are generated on page load.
- Excluded dates are not shown. To **stop** a series, fill `recurrence_until` with its last date (or unpublish the row). If an ongoing series has future dates, keep `status=scheduled` or `planned`, not `completed`.
- Each occurrence has its own date and clickable event details, even though it comes from one row. Photos and descriptions are shared by the series; for individual photos/posters per session, use separate rows (see below).

## 3. گفتگو در بحران — repeated but not necessarily every week

**Option A, recommended for separate editions**: make a new row for each edition, with a unique `event_uid`, new `event_date`, and the **same** `program_id` (`dialogue-crisis`). Each edition can have its own poster, photographs, titles, and summary. The website will display each one automatically when approved.

**Option B, same poster and details across several irregular dates**: make one row with the first date in `event_date` and write other dates in `recurrence_dates` separated by `|`, for example:

```
2026-12-06|2027-01-17|2027-02-14
```

This generates one visible occurrence per date, using shared content. Do **not** simultaneously use `recurrence_frequency`: the explicit dates take precedence. `recurrence_exclude_dates` can omit a specific date from a series.

## 4. Upcoming and past events move automatically

- Events with today/future dates (or multi-day events that have not ended) go to **Upcoming**.
- After the end date has passed, they appear under **Past Events**, automatically on the next page load. You do not need to manually change a past row's status to `completed` for the archive grouping.
- `website_status=private` or `review_status=needs_review` keeps an event hidden. `cancelled` / `postponed` statuses are not published by this version of the website.
- Keep `event_year` consistent with the row's *first* `event_date`, if you use that column. The site automatically calculates future occurrence years.
- IDs must be unique, using `EVT-` followed by 6 digits. The generated detail-page IDs are automatically unique for each repeated date.

## 5. Maintain public/private separation

The website reads the **published public tab only**, not the original private sheet. Never publish a master sheet containing personal information. Only add event records and image links that are approved for public display. The website does not access your Google Drive account; image links must be shared for viewing.

### Verify an update

1. Add a new test event in the **public events** sheet, with a unique `event_uid`, `event_date`, a title, `status=scheduled`, `website_status=published`, and `review_status=approved`.
2. Refresh `/events/` or `/en/events/` and look in the expected tab; Google may take some time to update its published CSV cache.
3. Add a poster or gallery link and media approval fields, refresh again.
4. For a weekly series, check several future dates and then move the date filter to view next year's occurrences.

### Local sanity tests (optional)

```bash
node events/test-events-data.js
python3 scripts/build_events_feed.py --csv DIDAR_Public_Events.csv --out /tmp/didar-check.json
```

The Python command is an optional local checker/backup feed builder; **it is not necessary for the live Google Sheets mode**.
