# Upcoming events: next session rather than recurring duplicates

The Upcoming Events view has one card per published event or recurring series.
For `EVT-000020` (Digital Café / Café numérique / کافه دیجیتال):

- Show **Next session: November 9, 2026** on November 9 before 19:00 Montreal time.
- Show **Next session: November 16, 2026** at or after 19:00 November 9.
- Show **Every Monday** / **Tous les lundis** / **هر دوشنبه**.
- Never create 52 weekly cards.
- Keep the original event ID, posters and collaborator links.

For all other approved and published future records (including status `planned`
and `scheduled`), show their actual event date. Sort all upcoming cards by
next occurrence or event date, whichever applies. A future event can appear
before the next Café session if its date is sooner.

## Google Sheet

Keep the existing row and fields; no extra rows are necessary:

| Column | Value for Café numérique |
|---|---|
| `event_uid` | `EVT-000020` |
| `event_date` | `2026-10-26` |
| `recurrence_frequency` | `weekly` |
| `status` | `scheduled` |
| `website_status` | `published` |
| `review_status` | `approved` |
| `event_end_time` | `19:00` (optional new column) |

`event_end_time` must be a 24-hour local time, `HH:mm`. It is optional and
backwards-compatible. It marks the end of each session; when it is missing,
the next-session date advances at the next local midnight. Site timezone is
America/Toronto, matching Montreal, including daylight saving time.

`recurrence_exclude_dates` can skip holiday Mondays, separated by `|`.
`recurrence_until` can archive an ended series. An event with `website_status`
`private` or `review_status` `needs_review` remains hidden.

The date is recalculated each time the site loads and when a visitor returns
to an open browser tab. Changes in Google Sheets are reflected on the next
page refresh (the site keeps its current published-CSV fetch behavior).
