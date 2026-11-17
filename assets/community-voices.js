/* DIDAR Community Voices: public, approved, anonymized accounts only.
   Local source: data/community-cases.csv (currently header-only).
   Optional live source: cases_csv_url in config/community-insights.json.
   Required per-record safety flags: publish=yes and final_text_approved=yes.
   For fr/fa, also require translation_approved_fr/fa=yes and localized text.
   Do not connect this to raw form responses or private spreadsheets. */
(() => {
  'use strict';
  const root = document.getElementById('voices-list');
  const status = document.getElementById('voices-state');
  if (!root || !status) return;

  const lang = ['fr', 'en', 'fa'].includes(document.documentElement.lang)
    ? document.documentElement.lang : 'fr';
  const prefix = root.dataset.pathPrefix || '../';
  const messages = {
    fr: {
      empty: 'Aucun témoignage approuvé n’est publié pour le moment.',
      unavailable: 'Les témoignages sont temporairement indisponibles.'
    },
    en: {
      empty: 'No approved stories have been published yet.',
      unavailable: 'Community stories are temporarily unavailable.'
    },
    fa: {
      empty: 'هنوز روایت تأییدشده‌ای منتشر نشده است.',
      unavailable: 'روایت‌ها در حال حاضر در دسترس نیستند.'
    }
  };

  const isApproved = (v) => ['yes', 'true', '1', 'approved', 'published']
    .includes(String(v || '').trim().toLowerCase());
  const isPublicGoogleCsv = (v) => typeof v === 'string' &&
    /^https:\/\/docs\.google\.com\/spreadsheets\/d\/(?:e\/)?[a-zA-Z0-9_-]+\/(?:pub|export)\?/.test(v) &&
    /(?:\?|&)(?:output|format)=csv(?:&|$)/.test(v);

  function parseCsv(input) {
    const text = String(input || '').replace(/^\uFEFF/, '');
    if (/^\s*<!doctype html|^\s*<html/i.test(text)) throw Error('Expected CSV, received HTML');
    const rows = [];
    let row = [], value = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { value += '"'; i++; }
        else if (c === '"') quoted = false;
        else value += c;
      } else if (c === '"' && value === '') quoted = true;
      else if (c === ',') { row.push(value); value = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(value); value = '';
        if (row.some((x) => x.trim())) rows.push(row);
        row = [];
      } else value += c;
    }
    if (quoted) throw Error('Unclosed CSV quote');
    row.push(value);
    if (row.some((x) => x.trim())) rows.push(row);
    const headers = (rows.shift() || []).map((x) => x.trim().toLowerCase());
    if (!headers.includes('case_id')) throw Error('Missing case_id column');
    return rows.map((values) => Object.fromEntries(headers.map((h, i) => [h, (values[i] || '').trim()])));
  }

  async function fetchCsv(url) {
    const response = await fetch(url, {cache: 'no-store'});
    if (!response.ok) throw Error('HTTP ' + response.status);
    return parseCsv(await response.text());
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function display(rows) {
    const found = new Set();
    let publishedCount = 0;
    root.replaceChildren();
    for (const row of rows) {
      const id = String(row.case_id || '').trim();
      if (!/^CASE-[0-9]{4,6}$/.test(id) || found.has(id)) continue;
      // Fail closed: absent publication, consent or translation approval means do not display.
      if (!isApproved(row.publish) || !isApproved(row.final_text_approved)) continue;
      if (lang !== 'en' && !isApproved(row['translation_approved_' + lang])) continue;
      const title = row['title_' + lang] || '';
      const summary = row['summary_' + lang] || '';
      const category = row['category_' + lang] || '';
      if (!title || !summary || title.length > 130 || summary.length > 1000 || category.length > 90) continue;
      found.add(id);
      publishedCount++;
      const card = el('article', 'voices-card');
      card.append(el('span', 'voices-id', id), el('h3', 'voices-title', title));
      if (category) card.append(el('p', 'voices-category', category));
      card.append(el('p', 'voices-summary', summary));
      root.append(card);
      if (publishedCount >= 100) break;
    }
    status.textContent = publishedCount ? '' : messages[lang].empty;
    status.hidden = publishedCount > 0;
  }

  async function boot() {
    const local = new URL(prefix + 'data/community-cases.csv', document.baseURI).href;
    let live = '';
    try {
      const cfgUrl = new URL(prefix + 'config/community-insights.json', document.baseURI).href;
      const response = await fetch(cfgUrl, {cache: 'no-store'});
      if (response.ok) {
        const config = await response.json();
        if (isPublicGoogleCsv(config.cases_csv_url)) live = config.cases_csv_url;
      }
    } catch (_) { /* Use checked-in public snapshot. */ }
    for (const url of (live ? [live, local] : [local])) {
      try { display(await fetchCsv(url)); return; }
      catch (error) { console.warn('DIDAR Community Voices source unavailable:', error); }
    }
    status.hidden = false;
    status.textContent = messages[lang].unavailable;
  }
  boot();
})();
