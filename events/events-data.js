/* DIDAR public event ingestion helpers. No private master-sheet data is loaded here. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DIDAREventsData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const trim = value => String(value == null ? '' : value).trim();
  const norm = value => trim(value).toLowerCase().replace(/[- ]/g, '_');
  const isApproved = value => ['approved','verified','confirmed','cleared','yes','true','1'].includes(norm(value));
  const isPublic = value => ['public','published'].includes(norm(value));
  const consentApproved = value => isApproved(value) || ['not_applicable','no_people','not_required'].includes(norm(value));
  const validDate = value => {
    const s = trim(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(`${s}T12:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  };
  const validId = id => /^EVT-\d{6}$/.test(trim(id));
  // Optional local end time for the last day of an occurrence (24-hour clock).
  const validLocalTime = time => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(trim(time));
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
    if (/^assets\/(?:event-photos|collaborators)\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|avif|svg)$/i.test(text) &&
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
  // A short media ID resolves to an uploaded file in that event's own asset folder.
  // Example: EVT-000017-poster-fr -> assets/event-photos/EVT-000017/EVT-000017-poster-fr.webp
  // Explicit extensions (.jpg/.png/.webp/.avif) are also accepted.
  function eventImageSource(raw, eventUid) {
    const value = trim(raw);
    // A suffix selects one language; no suffix = shared poster on all pages.
    // Optional 2–3 digit sequence supports multiple posters for an event.
    const pattern = /^(EVT-\d{6})-(?:poster(?:-(?:fr|en|fa))?(?:-\d{1,3})?|photo-\d{1,3})(?:\.(?:webp|png|jpe?g|avif))?$/i;
    const match = value.match(pattern);
    if (match) {
      if (match[1] !== eventUid) return null; // never cross-link another event's images
      const filename = /\.(?:webp|png|jpe?g|avif)$/i.test(value) ? value : `${value}.webp`;
      return imageSource(`assets/event-photos/${eventUid}/${filename}`);
    }
    return imageSource(value); // existing full local paths and Google Drive IDs/URLs
  }
  function posterLocale(raw, defaultLocale='all') {
    // Filename wins over column: EVT-000017-poster-fr is French ONLY, even
    // when someone places it in the legacy generic 'poster_image' column.
    const basename = trim(raw).split(/[\/]/).pop().split('?')[0];
    const localized = basename.match(/^EVT-\d{6}-poster-(en|fr|fa)(?:-\d{1,3})?(?:\.(?:webp|png|jpe?g|avif))?$/i);
    if (localized) return localized[1].toLowerCase();
    if (/^EVT-\d{6}-poster(?:-\d{1,3})?(?:\.(?:webp|png|jpe?g|avif))?$/i.test(basename)) return 'all';
    // Google Drive IDs/URLs lack a filename; use their sheet column.
    return defaultLocale;
  }
  function makePhoto(raw, row) {
    const src = eventImageSource(raw, trim(row.event_uid)); if (!src) return null;
    return {
      src: src.src, original: src.original, drive: src.drive,
      alt: localized('photo_alt',row), caption: {en:'',fr:'',fa:''}, credit: trim(row.photo_credit)
    };
  }

// Collaborator ID references live in the Events sheet, while organizations live
// in a separate published Collaborators tab. Roles belong to the event, not to
// the organization: the same organization may sponsor one event and host another.
const collaboratorRoles = {
  organizer:{en:'Organizer',fr:'Organisateur',fa:'برگزارکننده'},
  co_organizer:{en:'Co-organizer',fr:'Coorganisateur',fa:'برگزارکنندهٔ مشترک'},
  partner:{en:'Collaborator',fr:'Partenaire',fa:'همکار'},
  host:{en:'Host',fr:'Organisme hôte',fa:'میزبان'},
  sponsor:{en:'Sponsor',fr:'Commanditaire',fa:'حامی مالی'},
  financial_support:{en:'Financial support',fr:'Soutien financier',fa:'حمایت مالی'},
  media_partner:{en:'Media partner',fr:'Partenaire médiatique',fa:'همکار رسانه‌ای'},
  community_partner:{en:'Community partner',fr:'Partenaire communautaire',fa:'همکار اجتماعی'},
  facilitator:{en:'Facilitation',fr:'Animation',fa:'تسهیل‌گری'},
  venue_partner:{en:'Venue partner',fr:'Partenaire d’accueil',fa:'همکار میزبانی'},
  technical_support:{en:'Technical support',fr:'Soutien technique',fa:'پشتیبانی فنی'},
  logistics:{en:'Logistics',fr:'Logistique',fa:'پشتیبانی اجرایی'},
  outreach:{en:'Outreach',fr:'Diffusion',fa:'اطلاع‌رسانی'},
  in_kind_support:{en:'In-kind support',fr:'Soutien en nature',fa:'حمایت غیرنقدی'}
};
const collaboratorIdPattern = /^COL-\d{6}$/;
function parseCollaboratorRefs(raw) {
  const refs = new Map();
  for (const token of trim(raw).split('|').map(trim).filter(Boolean).slice(0,40)) {
    const m = token.match(/^(COL-\d{6})(?::([a-z][a-z0-9_]*(?:\+[a-z][a-z0-9_]*)*))?$/i);
    if (!m) {console.warn('DIDAR invalid collaborator reference:', token);continue;}
    const codes = (m[2] || 'partner').toLowerCase().split('+');
    if (!refs.has(m[1])) refs.set(m[1],new Set());
    codes.forEach(code=>{if (collaboratorRoles[code]) refs.get(m[1]).add(code);
      else console.warn('DIDAR unknown collaborator role:', code);});
    if (!refs.get(m[1]).size) refs.get(m[1]).add('partner');
  }
  return [...refs].map(([id,roles])=>({id,roles:[...roles]}));
}
function collaboratorLogoSource(raw,id) {
  const name=trim(raw);
  if (!collaboratorIdPattern.test(id) || !new RegExp(`^${id}-logo\\.(png|jpe?g|webp|avif|svg)$`,'i').test(name)) return null;
  return imageSource(`assets/collaborators/${name}`);
}
function fromCollaboratorsCSV(csvText) {
  const {headers,records}=parseCSV(csvText);
  const required=['collaborator_id','website_status','review_status'];
  const missing=required.filter(name=>!headers.includes(name));
  if(missing.length) throw new Error(`Required collaborator CSV columns missing: ${missing.join(', ')}`);
  const registry=new Map();
  for(const row of records) {
    const id=trim(row.collaborator_id);
    if(!id || !collaboratorIdPattern.test(id) || registry.has(id)) continue;
    if(!isPublic(row.website_status) || !isApproved(row.review_status)) continue;
    const name=localized('name',row);
    if(!name.en && !name.fr && !name.fa) continue;
    const logo=(isApproved(row.logo_rights_approved)) ? collaboratorLogoSource(row.logo_image,id) : null;
    registry.set(id,{id,name,url:secureLink(row.website_url),logo});
  }
  return registry;
}
function attachCollaborators(events, registry) {
  const map=registry instanceof Map ? registry : new Map();
  return events.map(ev=>{
    if(!Array.isArray(ev.collaboratorRefs) || !ev.collaboratorRefs.length) return ev;
    const detailed=ev.collaboratorRefs.map(ref=>{
      const partner=map.get(ref.id);
      if(!partner) return null;
      const roleNames=(ref.roles||['partner']).map(code=>collaboratorRoles[code]).filter(Boolean);
      const role={en:roleNames.map(r=>r.en).join(' · '),fr:roleNames.map(r=>r.fr).join(' · '),fa:roleNames.map(r=>r.fa).join(' · ')};
      return {...partner,role};
    }).filter(Boolean);
    // Preserve legacy name-only partners if the new registry is unavailable.
    return {...ev,partners:detailed.length ? detailed : ev.partners};
  });
}
  // Each row is a single occurrence or a series. Optional scheduling columns may
  // be absent from an existing live Google Sheet without breaking the page.
  function parseRecurrence(row, eventDate, id) {
    const frequency = norm(row.recurrence_frequency || row.repeat_frequency);
    const known = ['weekly','biweekly','monthly'];
    const explicit = [...new Set(trim(row.recurrence_dates).split('|').map(trim).filter(Boolean))]
      .filter(date => validDate(date) && date >= eventDate).sort().slice(0, 200);
    const exclusions = [...new Set(trim(row.recurrence_exclude_dates).split('|').map(trim).filter(validDate))];
    const until = trim(row.recurrence_until);
    if (until && (!validDate(until) || until < eventDate)) {
      console.warn(`DIDAR ${id}: recurrence_until must be YYYY-MM-DD on or after event_date; recurrence disabled.`);
      return null;
    }
    const rawCount = trim(row.recurrence_count);
    const count = /^\d+$/.test(rawCount) ? Number(rawCount) : 0;
    if (rawCount && (!Number.isSafeInteger(count) || count < 1 || count > 3000)) {
      console.warn(`DIDAR ${id}: recurrence_count must be 1–3000; recurrence disabled.`);
      return null;
    }
    if (explicit.length) {
      if (known.includes(frequency)) console.warn(`DIDAR ${id}: recurrence_dates takes precedence over recurrence_frequency.`);
      return {frequency:'dates', dates:explicit, until:'', count:0, exclusions};
    }
    if (!known.includes(frequency)) {
      if (frequency && frequency !== 'none') console.warn(`DIDAR ${id}: unknown recurrence_frequency '${frequency}'.`);
      return null;
    }
    return {frequency, dates:[], until, count, exclusions};
  }
  const isoToMillis = iso => Date.parse(`${iso}T12:00:00Z`);
  function addDays(iso, number) {
    return new Date(isoToMillis(iso) + number * 86400000).toISOString().slice(0,10);
  }
  function addMonthsClamped(iso, number) {
    const [year, month, day] = iso.split('-').map(Number);
    const target = new Date(Date.UTC(year,month-1 + number,1,12));
    const daysInMonth = new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0,12)).getUTCDate();
    target.setUTCDate(Math.min(day, daysInMonth));
    return target.toISOString().slice(0,10);
  }
  function expandRecurrences(events, today, horizonMonths=18) {
    if (!validDate(today)) throw new Error('Invalid current date');
    const horizon = addMonthsClamped(today, horizonMonths);
    const out = [];
    for (const ev of events) {
      const repeat = ev.recurrence;
      if (!repeat) {out.push(ev);continue;}
      const dates = new Set([ev.date]);
      if (repeat.frequency === 'dates') {
        (repeat.dates || []).forEach(d => {if(validDate(d) && d>=ev.date) dates.add(d);});
      } else {
        const end = repeat.until || horizon;
        const count = repeat.count || 3000;
        for (let n=0; n<count && n<3000; n++) {
          const day = repeat.frequency==='monthly' ? addMonthsClamped(ev.date,n) :
            addDays(ev.date,n*(repeat.frequency==='biweekly'?14:7));
          if (day > end) break;
          dates.add(day);
        }
      }
      const exclusions = new Set(repeat.exclusions || []);
      const span = ev.endDate && validDate(ev.endDate) ?
        Math.max(0,Math.round((isoToMillis(ev.endDate)-isoToMillis(ev.date))/86400000)):0;
      [...dates].sort().forEach(day => {
        if (exclusions.has(day)) return;
        out.push({...ev,id:`${ev.id}--${day}`,sourceEventId:ev.id,
          date:day,endDate:addDays(day,span),isRecurringOccurrence:true});
      });
    }
    return out;
  }
  // The public event index is an index of EVENTS, not occurrences. An ongoing
  // weekly series (e.g. Digital Café) gets one card with its next session used
  // only for ordering/eligibility. This does not expand 78 weekly occurrences.
  function nextSeriesOccurrence(ev, today, localTime='') {
    if (!ev || !ev.recurrence || !validDate(ev.date) || !validDate(today)) return '';
    const repeat = ev.recurrence;
    const span = ev.endDate && validDate(ev.endDate) ?
      Math.max(0, Math.round((isoToMillis(ev.endDate) - isoToMillis(ev.date)) / 86400000)) : 0;
    const excluded = new Set(repeat.exclusions || []);
    // If the end time is known, move to the next occurrence as soon as the
    // current session ends, even when that happens on the same calendar day.
    // Without an end time, an occurrence stays upcoming for its entire date.
    const qualifies = day => {
      if (!day || excluded.has(day) || (repeat.until && day > repeat.until)) return false;
      const lastDay = addDays(day, span);
      if (lastDay < today) return false;
      return !(lastDay === today && validLocalTime(ev.endTime) &&
        validLocalTime(localTime) && localTime >= ev.endTime);
    };
    if (repeat.frequency === 'dates') {
      return [...new Set([ev.date, ...(repeat.dates || [])])]
        .filter(validDate).sort().find(qualifies) || '';
    }
    if (!['weekly','biweekly','monthly'].includes(repeat.frequency)) return '';
    const max = Math.min(repeat.count || 3000, 3000);
    const step = repeat.frequency === 'biweekly' ? 14 : 7;
    // Skip old dates without performing hundreds of iterations for long-running
    // weekly events. Count still refers to scheduled instances (including exclusions).
    let start = 0;
    if (repeat.frequency !== 'monthly') {
      const diff = Math.floor((isoToMillis(today) - isoToMillis(ev.date)) / 86400000) - span;
      start = Math.max(0, Math.floor(diff / step));
    }
    for (let n = start; n < max; n++) {
      const day = repeat.frequency === 'monthly' ? addMonthsClamped(ev.date, n) : addDays(ev.date, n * step);
      if (repeat.until && day > repeat.until) break;
      if (qualifies(day)) return day;
    }
    return '';
  }
  function summarizeRecurringEvents(events, today, localTime='') {
    if (!validDate(today)) throw new Error('Invalid current date');
    return events.map(ev => {
      if (!ev.recurrence) return ev;
      const nextOccurrence = ev.status === 'completed' ? '' : nextSeriesOccurrence(ev,today,localTime);
      return {...ev, isRecurringSeries:true, nextOccurrence};
    });
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
      const imagesApproved = isApproved(row.photo_rights_approved) && consentApproved(row.photo_consent_approved);
      let posterImage = null, featuredImage = null;
      const posterImages = {fr:null,en:null,fa:null};
      const posterCollections = {all:[],fr:[],en:[],fa:[]};
      const galleryPhotos = [], seenPhotos = new Set();
      if (imagesApproved) {
        const seenPosters = new Set();
        const fields = [['poster_image','all'],['poster_image_fr','fr'],
          ['poster_image_en','en'],['poster_image_fa','fa']];
        for (const [field, defaultLocale] of fields) {
          for (const entry of trim(row[field]).split('|').map(trim).filter(Boolean).slice(0,24)) {
            const image = makePhoto(entry,row);
            if (!image || seenPosters.has(image.src)) continue;
            seenPosters.add(image.src);
            posterCollections[posterLocale(entry,defaultLocale)].push(image);
          }
        }
        posterImage = posterCollections.all[0] || null;
        for (const language of ['fr','en','fa']) posterImages[language] = posterCollections[language][0] || null;
        // A language-specific poster must NEVER become the universal cover.
        const legacyCover = makePhoto(row.featured_image,row);
        featuredImage = legacyCover && posterLocale(row.featured_image,'all')==='all' ? legacyCover : null;
        const rawGallery = [
          ...trim(row.gallery_image_ids).split('|'),
          ...trim(row.gallery_image_urls).split('|')
        ];
        for (const entry of rawGallery.map(trim).filter(Boolean).slice(0,24)) {
          // A localized poster mistakenly placed in the photo gallery is not
          // universally visible; it belongs to its own language only.
          const image = makePhoto(entry,row);
          if (image && !seenPhotos.has(image.src)) {
            seenPhotos.add(image.src);galleryPhotos.push(image);
          }
        }
        if (!featuredImage) featuredImage = galleryPhotos.find(image =>
          posterLocale(image.src,'all')==='all') || null;
      }
      const images = [featuredImage, ...galleryPhotos].filter((image,index,array)=>
        image && array.findIndex(other=>other && other.src===image.src)===index);
      out.push({
        id, programUid:trim(row.program_uid),programId:trim(row.program_id),
        date:row.event_date,endDate:trim(row.end_date),endTime:validLocalTime(row.event_end_time) ? trim(row.event_end_time) : '',datePrecision:norm(row.date_precision),status,
        category:norm(row.primary_category_id) || 'other',type:trim(row.event_type),
        title,summary:localized('summary',row),description:localized('description',row),
        venue:trim(row.venue_public),venueType:trim(row.venue_type),
        link:secureLink(row.event_url),galleryUrl:secureLink(row.photo_album_url),
        partners:trim(row.partners_public).split('|').map(trim).filter(Boolean).map(name=>({name:{en:name,fr:name,fa:name},url:''})),
        collaboratorRefs:parseCollaboratorRefs(row.collaborators),
        posterImage,posterImages,posterCollections,featuredImage,images,galleryPhotos,
        recurrence:parseRecurrence(row,row.event_date,id)
      });
    }
    return out;
  }
  function mediaAllowedForLanguage(image, lang) {
    if (!image || !['en','fr','fa'].includes(lang)) return false;
    const posterLang = posterLocale(image.src,'all');
    return posterLang === 'all' || posterLang === lang;
  }
  function posterForLanguage(ev, lang) {
    const collections = ev.posterCollections || {};
    const images = ev.posterImages || {};
    const pick = (collections[lang] || [])[0] || images[lang] ||
      (collections.all || [])[0] || ev.posterImage || null;
    return mediaAllowedForLanguage(pick,lang) ? pick : null;
  }
  function coverForLanguage(ev, lang) {
    return posterForLanguage(ev,lang) ||
      (mediaAllowedForLanguage(ev.featuredImage,lang) ? ev.featuredImage : null) ||
      (ev.galleryPhotos || []).find(img=>mediaAllowedForLanguage(img,lang)) || null;
  }
  function eventBucket(ev, today) {
    if (!validDate(today) || !validDate(ev.date)) return 'hidden';
    // Recurring programs are displayed ONCE. Ignore the historical start date
    // while new sessions are scheduled; an ended series is one archived item.
    if (ev.isRecurringSeries) return ev.nextOccurrence ? 'upcoming' : 'past';
    const finalDay = validDate(ev.endDate) && ev.endDate>=ev.date ? ev.endDate : ev.date;
    if (finalDay < today) return 'past';
    if (ev.status === 'completed' && ev.date > today) return 'hidden';
    return 'upcoming';
  }
  // A rolling calendar-month window (inclusive of today and the same date
  // next month). Each recurring series has only one nextOccurrence.
  function isWithinUpcomingWindow(ev, today, windowMonths=1) {
    if (!validDate(today) || !ev || eventBucket(ev,today)!=='upcoming') return false;
    const limit = addMonthsClamped(today,windowMonths);
    const next = ev.isRecurringSeries ? ev.nextOccurrence : (ev.date < today && validDate(ev.endDate) && ev.endDate >= today ? today : ev.date);
    return validDate(next) && next<=limit;
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
  return {parseCSV,fromCSV,imageSource,eventImageSource,posterLocale,
    parseCollaboratorRefs,collaboratorLogoSource,fromCollaboratorsCSV,attachCollaborators,
    mediaAllowedForLanguage,posterForLanguage,coverForLanguage,
    secureLink,validDate,isEvent,safeSheetCsvUrl,parseRecurrence,expandRecurrences,
    nextSeriesOccurrence,summarizeRecurringEvents,eventBucket,isWithinUpcomingWindow};
});
