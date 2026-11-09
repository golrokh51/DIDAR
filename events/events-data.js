/* DIDAR public event ingestion helpers. No private master-sheet data is loaded here. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DIDAREventsData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const trim = value => String(value == null ? '' : value).trim();
  const norm = value => trim(value).toLowerCase().replace(/[- ]/g, '_');
  const isApproved = value => ['approved','verified','confirmed','yes','true','1'].includes(norm(value));
  const isPublic = value => ['public','published'].includes(norm(value));
  const consentApproved = value => isApproved(value) || ['not_applicable','no_people','not_required'].includes(norm(value));
  const validDate = value => {
    const s = trim(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(`${s}T12:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  };
  const validId = id => /^EVT-\d{6}$/.test(trim(id));
  function parseCSV(csvText) {
    // RFC 4180-style parser: quoted commas, escaped quotes and embedded newlines.
    const input = String(csvText || '').replace(/^\uFEFF/, '');
    const rows = []; let row = [], cell = '', quoted = false;
    for (let i = 0; i < input.length; i++) {
      const c = input[i];
      if (c === '"') {
        if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
        else if (!quoted && cell !== '') { cell += c; }
        else quoted = !quoted;
      } else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
      else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && input[i+1] === '\n') i++;
        row.push(cell); cell = '';
        if (row.some(s => trim(s))) rows.push(row);
        row = [];
      } else { cell += c; }
    }
    if (quoted) throw new Error('CSV has an unmatched quote');
    row.push(cell); if (row.some(s => trim(s))) rows.push(row);
    if (rows.length === 0) return { headers: [], records: [] };
    const headers = rows.shift().map(trim);
    if (new Set(headers).size !== headers.length) throw new Error('CSV has duplicate column names');
    return { headers, records: rows.map(values => Object.fromEntries(headers.map((name, j) => [name, trim(values[j])])) ) };
  }
  function imageSource(value) {
    const text = trim(value);
    // Local file path is a useful fallback when Google Drive refuses image embedding.
    if (/^assets\/event-photos\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|avif)$/i.test(text) &&
      !text.includes('..') && !text.includes('//')) return {src:text,original:text,drive:false};
    // File ID copied directly from Drive is also accepted.
    let id = /^[A-Za-z0-9_-]{20,}$/.test(text) ? text : '';
    let resourceKey = '';
    try {
      const url = new URL(text);
      if (url.protocol === 'https:' && url.hostname === 'drive.google.com') {
        resourceKey = url.searchParams.get('resourcekey') || '';
        const match = url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]{20,})(?:\/|$)/);
        if (match) id = match[1];
        else if (['/open','/uc','/thumbnail'].includes(url.pathname)) id = url.searchParams.get('id') || '';
      }
      if (url.protocol === 'https:' && url.hostname === 'lh3.googleusercontent.com') {
        if (/^\/d\/[A-Za-z0-9_-]{20,}(?:\/|$)/.test(url.pathname)) return {src:url.href,original:url.href,drive:true};
      }
    } catch (_) { /* not a URL */ }
    if (id && /^[A-Za-z0-9_-]{20,}$/.test(id)) return {
      src:`https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200${resourceKey ? `&resourcekey=${encodeURIComponent(resourceKey)}` : ''}`,
      original:(resourceKey && text.startsWith('https://drive.google.com/')) ? text : `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`,
      drive:true
    };
    return null;
  }
  function secureLink(value) {
    try {
      const u = new URL(trim(value));
      return u.protocol === 'https:' && !u.username && !u.password ? u.href : '';
    } catch (_) { return ''; }
  }
  const langs = ['en','fr','fa'];
  function localized(prefix, r) {
    const values = Object.fromEntries(langs.map(k=>[k,trim(r[`${prefix}_${k}`])]));
    const fallback = values.fr || values.en || values.fa || '';
    for (const k of langs) values[k] ||= fallback;
    return values;
  }
  function makePhoto(raw, row) {
    const src = imageSource(raw); if (!src) return null;
    return {
      src: src.src, original: src.original, drive: src.drive,
      alt: localized('photo_alt',row), caption: {en:'',fr:'',fa:''}, credit: trim(row.photo_credit)
    };
  }
  // Photos are optional. The event publication decision depends on event approval,
  // not on whether a photograph has been uploaded yet.
  const columns = ['event_uid','event_date','status','website_status','review_status'];
  function fromCSV(csvText) {
    const { headers, records } = parseCSV(csvText);
    const missing = columns.filter(k=>!headers.includes(k));
    if (missing.length) throw new Error(`Required public CSV columns are missing: ${missing.join(', ')}`);
    const out = []; const ids = new Set();
    for (const row of records) {
      const id = trim(row.event_uid);
      if (!id) continue;
      // Duplicates are invalid even when a row is unpublished, because Event ID is permanent.
      if (!validId(id)) {console.warn('DIDAR invalid event ID; skipped:', id); continue;}
      if (ids.has(id)) {console.warn('DIDAR duplicate event ID; skipped:',id);continue;}
      ids.add(id);
      if (!isPublic(row.website_status) || !isApproved(row.review_status)) continue;
      const status = norm(row.status);
      if (!['completed','planned','upcoming','scheduled'].includes(status)) continue;
      if (!validDate(row.event_date)) {console.warn('DIDAR invalid/missing event date:',id);continue;}
      if (row.event_year && trim(row.event_year) !== row.event_date.slice(0,4)) {console.warn('DIDAR conflicting year:',id);continue;}
      if (row.end_date && (!validDate(row.end_date) || row.end_date < row.event_date)) {console.warn('DIDAR invalid event end date:',id);continue;}
      const title = localized('title',row);
      if (!title.en && !title.fr && !title.fa) continue;
      // The event may be published before photography is available.
      // Never display images without both rights and consent approval.
      const images = [];
      const imagesApproved = isApproved(row.photo_rights_approved) && consentApproved(row.photo_consent_approved);
      if (imagesApproved) {
        const featured = makePhoto(row.featured_image,row);
        if (featured) images.push(featured);
        // Optional gallery: Drive URLs separated by |.
        for (const entry of trim(row.gallery_image_urls).split('|').map(trim).filter(Boolean).slice(0,12)) {
          const galleryPhoto = makePhoto(entry,row);
          if (galleryPhoto) images.push(galleryPhoto);
        }
      }
      const photo = images[0] || null;
      out.push({
        id, programUid:trim(row.program_uid),programId:trim(row.program_id),
        date:row.event_date,endDate:trim(row.end_date),datePrecision:norm(row.date_precision),status,
        category:norm(row.primary_category_id) || 'other',type:trim(row.event_type),
        title,summary:localized('summary',row),description:localized('description',row),
        venue:trim(row.venue_public),venueType:trim(row.venue_type),
        link:secureLink(row.event_url),galleryUrl:secureLink(row.photo_album_url),
        partners:trim(row.partners_public).split('|').map(trim).filter(Boolean).map(name=>({name:{en:name,fr:name,fa:name},url:''})),
        featuredImage:photo,images
      });
    }
    return out;
  }
  function isEvent(entry) {
    if (!entry || !validId(entry.id) || !validDate(entry.date)) return false;
    const title = entry.title;
    return typeof title === 'string' ? !!trim(title) :
      !!(title && typeof title === 'object' && ['en','fr','fa'].some(lang => trim(title[lang])));
  }
  function safeSheetCsvUrl(input) {
    try {
      const u = new URL(trim(input));
      if (u.protocol !== 'https:' || u.hostname !== 'docs.google.com' || !u.pathname.startsWith('/spreadsheets/d/')) return '';
      if (u.pathname.endsWith('/pub')) return u.searchParams.get('output') === 'csv' ? u.href : '';
      if (u.pathname.endsWith('/export')) return u.searchParams.get('format') === 'csv' ? u.href : '';
      return '';
    } catch (_) { return ''; }
  }
  return {parseCSV,fromCSV,imageSource,secureLink,validDate,isEvent,safeSheetCsvUrl};
});
