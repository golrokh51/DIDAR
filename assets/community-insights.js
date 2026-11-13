/* DIDAR public community insights. Consumes ONLY publication-safe CSVs.
   NEVER point this code at the raw Google Forms responses or a private sheet. */
(() => {
  'use strict';
  const section = document.getElementById('community-support-insights');
  if (!section) return;
  const summaryRoot = document.getElementById('community-summary');
  const caseRoot = document.getElementById('community-case-list');
  const caseEmpty = document.getElementById('community-case-empty');
  const warning = document.getElementById('community-insights-warning');
  const loading = document.getElementById('community-insights-loading');
  const count = document.getElementById('community-consent-count');
  const lastUpdated = document.getElementById('community-insights-updated');
  const received = document.getElementById('community-received-list');
  const needs = document.getElementById('community-needs-list');
  const sourceLabel = document.getElementById('community-cases-source');

  const metrics = {
    received: [
      ['received_emotional', 'Listening, encouragement and emotional support'],
      ['received_connections', 'Connections with useful people or resources']
    ],
    needs: [
      ['need_emotional', 'Social and emotional support'],
      ['need_career', 'Employment and career guidance'],
      ['need_network', 'Networking and mentorship'],
      ['need_immigration', 'Immigration and administrative guidance'],
      ['need_legal', 'Legal information and public services']
    ]
  };

  const el = (tag, cls, value) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  const urlOf = (path) => new URL(path, document.baseURI).href;
  const allowedPublicGoogleCsv = (v) => typeof v === 'string' &&
    /^https:\/\/docs\.google\.com\/spreadsheets\/d\/(?:e\/)?[a-zA-Z0-9_-]+\/(?:pub|export)\?/.test(v) &&
    /(?:\?|&)(?:output|format)=csv(?:&|$)/.test(v);
  const setWarning = (message) => {
    if (!warning) return;
    warning.textContent = message;
    warning.hidden = false;
  };

  // RFC-4180-aware CSV parser, including escaped quotes and multiline fields.
  function parseCSV(text) {
    text = String(text).replace(/^\uFEFF/, '');
    if (/^\s*<!doctype html|^\s*<html/i.test(text)) throw Error('CSV URL returned HTML');
    const rows = []; let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') {cell += '"'; i++;}
        else if (c === '"') quoted = false;
        else cell += c;
      } else if (c === '"' && cell.length === 0) quoted = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\r' || c === '\n') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (quoted) throw Error('Malformed CSV quotes');
    if (row.length || cell) { row.push(cell); rows.push(row); }
    if (!rows.length) return [];
    const headers = rows.shift().map((s) => s.trim().toLowerCase());
    return rows.filter((r) => r.some((v) => v.trim())).map((r) => Object.fromEntries(
      headers.map((h, i) => [h, (r[i] || '').trim()])
    ));
  }
  async function readText(url) {
    const response = await fetch(url, {cache: 'no-store'});
    if (!response.ok) throw Error('HTTP ' + response.status);
    return response.text();
  }
  async function getConfig() {
    try {
      const response = await fetch(urlOf(section.dataset.configUrl), {cache: 'no-store'});
      return response.ok ? await response.json() : {};
    } catch (_) { return {}; }
  }
  async function publicCSV(configured, fallback) {
    if (allowedPublicGoogleCsv(configured)) {
      try {return {rows: parseCSV(await readText(configured)), fallback: false};}
      catch (error) {
        console.warn('DIDAR public CSV unavailable; using checked-in snapshot.', error);
        setWarning('The live public feed is temporarily unavailable. Showing the last saved snapshot.');
      }
    }
    return {rows: parseCSV(await readText(urlOf(fallback))), fallback: true};
  }
  function parseSummary(rows) {
    const required = ['consenting_responses', 'received_emotional', 'received_connections',
      'need_emotional', 'need_career', 'need_network', 'need_immigration', 'need_legal'];
    const m = new Map(rows.map((r) => [r.metric, r.value]));
    if (!required.every((k) => m.has(k))) throw Error('Public summary CSV is missing required metrics');
    const n = Number(m.get('consenting_responses'));
    if (!Number.isSafeInteger(n) || n < 0 || n > 1000000) throw Error('Invalid response count');
    const values = {consenting_responses: n};
    for (const k of required.slice(1)) {
      const value = Number(m.get(k));
      if (!Number.isSafeInteger(value) || value < 0 || value > n) throw Error('Invalid metric: ' + k);
      values[k] = value;
    }
    const date = String(m.get('last_updated') || '');
    values.last_updated = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
    return values;
  }
  function metricRows(target, entries, data) {
    if (!target) return;
    target.replaceChildren();
    for (const [key, label] of entries) {
      const value = data[key], total = data.consenting_responses;
      const row = el('li', 'insight-bar-row');
      const labels = el('div', 'insight-bar-labels');
      labels.append(el('span', '', label), el('strong', '', value >= 3 ? `${value} of ${total}` : 'Not shown'));
      row.append(labels);
      if (value >= 3 && total > 0) {
        const track = el('div', 'insight-bar-track');
        const fill = el('span', 'insight-bar-fill');
        fill.style.width = `${Math.round((value / total) * 100)}%`;
        track.append(fill); row.append(track);
      }
      target.append(row);
    }
  }
  function showSummary(data) {
    count.textContent = String(data.consenting_responses);
    metricRows(received, metrics.received, data);
    metricRows(needs, metrics.needs, data);
    lastUpdated.textContent = data.last_updated ? `Last aggregated: ${data.last_updated}` : '';
    summaryRoot.hidden = false;
  }
  function approvedCaseRecords(rows) {
    // All records in a PUBLIC CSV must already have final-text approval.
    const result = []; const ids = new Set();
    for (const row of rows) {
      const id = (row.case_id || '').trim();
      const title = (row.title_en || '').trim();
      const summary = (row.summary_en || '').trim();
      const category = (row.category_en || '').trim();
      if (!/^CASE-[0-9]{4,6}$/.test(id) || ids.has(id) || !title || !summary) continue;
      if (title.length > 130 || summary.length > 1000 || category.length > 90) continue;
      ids.add(id);
      result.push({id, title, summary, category});
    }
    return result.slice(0, 100);
  }
  function showCases(rows) {
    const entries = approvedCaseRecords(rows);
    caseRoot.replaceChildren();
    for (const data of entries) {
      const article = el('article', 'community-case-card');
      article.append(el('span', 'community-case-id', data.id), el('h4', '', data.title));
      if (data.category) article.append(el('p', 'community-case-category', data.category));
      article.append(el('p', 'community-case-summary', data.summary));
      caseRoot.append(article);
    }
    caseEmpty.hidden = entries.length > 0;
    sourceLabel.textContent = entries.length ? `${entries.length} approved account${entries.length === 1 ? '' : 's'} published` : '';
  }
  async function boot() {
    const config = await getConfig();
    const jobs = await Promise.allSettled([
      publicCSV(config.summary_csv_url, section.dataset.summaryFallback),
      publicCSV(config.cases_csv_url, section.dataset.casesFallback)
    ]);
    if (jobs[0].status === 'fulfilled') {
      try { showSummary(parseSummary(jobs[0].value.rows)); }
      catch (error) { console.warn(error); setWarning('The public summary is temporarily unavailable.'); }
    } else setWarning('The public summary is temporarily unavailable.');
    if (jobs[1].status === 'fulfilled') showCases(jobs[1].value.rows);
    else { caseEmpty.hidden = false; sourceLabel.textContent = ''; }
    if (loading) loading.hidden = true;
  }
  boot();
})();
