# DIDAR · French / English website update

This ZIP applies the finalized Persian-site structure to the Québec French and English versions while keeping the finalized Persian wording and layouts intact. Only the FR/EN language-switch links on the two Persian Projects/Activities pages were updated.

- French homepage: `/index.html`; story: `/story/`; projects: `/projects/`; activities: `/activities/`.
- English homepage: `/en/`; story: `/en/story/`; projects: `/en/projects/`; activities: `/en/activities/`.
- Both activity pages read `/fa/activities/activities-feed.json`, generated on GitHub Actions from the **same** Programs and Sessions Google Sheets. Language-specific values come from `translations.fr` and `translations.en`.
- If Google Sheets is temporarily inaccessible, the committed localized feed and local fallback records are used.
- `assets/localized-experience.css` provides the shared new layout and accessible mobile menu.
- The **Persian written content and layout remain unchanged**; only the shared feed has had its existing EN/FR fallback text populated from the previously completed CSVs.
- Dates/locations/partner URLs were not invented. The 11 October AFI event is completed; Digital Café starts 26 October 2026.

## Deployment
Unzip **UpdateOnly** into the DIDAR GitHub repo root (not a new subfolder). Keep `.github` intact. Commit, then run the existing Pages deployment workflow. Confirm the website's Pages source is GitHub Actions.

## Updating
Edit the existing online Google Sheets: Programs and Sessions. Publish the two worksheet CSV tabs and keep automatic republishing enabled. The same two published sheet URLs in `config/activities-sheets.json` are used.

## Translation editorial note
Translations are culturally adapted, not word-for-word. Check your preferred terminology and mark translations Approved in Google Sheets after review. When new rows are added without EN/FR fields, the page preserves the row and temporarily falls back to the Persian field instead of silently hiding the event.
