# DIDAR — Clickable hosts and collaborators / Liens des partenaires et hôtes

Changes in this update: the Activities pages (FA/EN/FR) display hosts and collaborators as linked names when a valid HTTP(S) URL is supplied. A name without a URL remains text; the site **never guesses** a partner’s website. Links open in a new tab, with an accessible label. The GitHub Actions/Google Sheets synchronization is preserved.

## In your existing published Google Sheets

Keep the same tabs, same IDs, and existing rows. Add these optional columns to **Sessions**:

- `partner_url`: one common URL used with existing `partner_fa`, `partner_en`, `partner_fr`. Easiest way to activate the AFI name in all languages. **Do not fill a URL unless you have verified it belongs to the organization.**
- `hosts_fa`, `hosts_en`, `hosts_fr`: multiple event hosts, e.g. `Nom de l’organisme :: https://example.org | Autre organisme :: https://example.net`.
- The existing `collaborators_fa`, `collaborators_en`, `collaborators_fr` fields remain supported for multiple partners. Add a website beside **each** name.

In **Programs**, optional `hosts_fa`, `hosts_en`, `hosts_fr` likewise support program-level hosts, and `collaborators_...` fields support program-level partners.

**Important:** Use each row’s real, verified website URL or official organization profile. If an organization is both the host and a collaborator, list it once under the most accurate role to avoid duplicates.

All language columns use `name :: URL | name :: URL`. Keep organizations in the same order across languages; URLs are inherited from the Persian entry when the English/French entries provide only translated names.

Example of a Sessions row:

```text
partner_fa = انجمن نمونه
partner_en = Example Association
partner_fr = Association exemple
partner_url = https://example.org
hosts_fa = میزبان دوم :: https://example.net
hosts_en = Another host :: https://example.net
hosts_fr = Autre organisme hôte :: https://example.net
```

`example.org` and `example.net` are illustrative placeholders, **not real DIDAR partners**.

Once Google Sheets republishes and the DIDAR GitHub sync runs, names with URLs become clickable on all three Activities pages. No code changes are needed for future partners. The existing AFI entry has no verified URL in the supplied data, so the live link will appear only after the corresponding URL is entered in Google Sheets.
