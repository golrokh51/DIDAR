# DIDAR — collaborator websites and social-media links

## What has changed

On each event detail page, each published collaborator appears with its name, approved logo (if provided), per-event role(s), and one separate clickable link for every URL in its collaborator registry record. The name **and logo** link to `website_url` if available, otherwise to the first available social profile. No URL? The collaborator name/role remains text-only. Multiple organizations each have their own links.

This extends the existing public `Collaborators_Public` Google Sheets tab; it does **not** alter the Events Google Sheet source, media paths, activity cards, or recurrence logic.

## 1. Collaborators_Public tab

Keep all existing columns. Optionally add these headers:

`instagram_url`, `facebook_url`, `linkedin_url`, `youtube_url`, `tiktok_url`, `social_media_url`

Keep `website_url` for an organization's main website; leave it blank if there is none. Paste a complete `https://` link in each relevant column. `social_media_url` is a general fallback for platforms not listed. The UI labels channels in English, French and Persian. Empty/invalid links do not show. Duplicate links show only once.

Example:

| collaborator_id | name_en | website_url | instagram_url | facebook_url | logo_image | website_status | review_status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| COL-000001 | Example organization | https://example.org | https://www.instagram.com/example/ | | COL-000001-logo.png | published | approved |
| COL-000002 | Social-only example | | | https://www.facebook.com/example/ | COL-000002-logo.png | published | approved |

Examples are fictitious, not actual DIDAR collaborators. Logo files are stored at `assets/collaborators/COL-000001-logo.png`, etc. `logo_rights_approved=yes` only when you have permission to show that logo.

To use the Google Sheet, `config/collaborators-source.json` must contain the **published CSV URL for the collaborator tab**, not an edit/share URL. **Do not overwrite an existing configured collaborators-source.json.** If it does not exist, copy `config/collaborators-source.example.json` to `config/collaborators-source.json`, add your published CSV URL, and deploy it.

## 2. Events tab

Use the existing `collaborators` column to associate each event with one or more collaborators and event-specific roles:

`COL-000001:co_organizer|COL-000002:financial_support`

Use `+` to give a collaborator two roles:

`COL-000001:host+technical_support`

Keep `partners_public` for the legacy plain-name list, but **names in that old field cannot automatically acquire links**. To show URLs, add the organization to the `Collaborators_Public` registry and reference its ID from `collaborators`.

## 3. When changes appear

Editing collaborator links in Google Sheets requires **no code changes** after the initial patch is deployed and the collaborator CSV feed is configured. Visitors get the new links after refresh, subject to Google Sheets and browser caching. New logo files still need uploading to the repository.

## 4. Deploy

Copy `events/events-data.js`, `events/events.js`, and `events/events.css` into the corresponding folders. Keep your other website files, the existing event sheet URL, and the existing image assets unchanged. Use the optional CSV template to add columns to the published collaborator sheet, without replacing existing rows. Run `node events/test-collaborator-social-links.js` to verify the parser and link logic.
