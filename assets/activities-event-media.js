/* DIDAR: show approved event posters/photos on Activities cards.
   Uses the same public Google Sheet as Events. Never reads private data,
   invents media, or bypasses the photo-rights/consent checks in events-data.js. */
(function (global, factory) {
  const api = factory(global);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (global && global.document) api.start();
})(typeof window !== 'undefined' ? window : globalThis, function (global) {
  'use strict';
  const idPattern = /^EVT-\d{6}$/;
  const siteRoot = global.document && global.document.currentScript && global.document.currentScript.src
    ? new URL('../', global.document.currentScript.src) : null;
  const lang = global.document && ['en','fr','fa'].includes(global.document.documentElement.lang)
    ? global.document.documentElement.lang : 'fr';
  let events = [];
  let loaded = false;
  const helpers = global.DIDAREventsData;

  function isoTodayToronto(now = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {year:'numeric',month:'2-digit',day:'2-digit', timeZone:'America/Toronto'})
      .format(now).replaceAll('/', '-');
  }
  function localTimeToronto(now = new Date()) {
    return new Intl.DateTimeFormat('en-GB', {hour:'2-digit',minute:'2-digit',hourCycle:'h23', timeZone:'America/Toronto'}).format(now);
  }
  function visibleImage(ev, language=lang) {
    if (!helpers || !ev) return null;
    const image = helpers.coverForLanguage(ev,language);
    const raw = image && (image.original || image.src);
    if (!raw || !siteRoot) return null;
    const source = helpers.imageSource(raw);
    if (!source) return null;
    return {src: source.drive ? source.src : new URL(source.src,siteRoot).href, image};
  }
  function eventForProgram(programId, items=events, language=lang, today=isoTodayToronto()) {
    if (!programId || !helpers) return null;
    const candidates = items.filter(ev=>ev.programId===programId && visibleImage(ev,language));
    if (!candidates.length) return null;
    const schedule = helpers.summarizeRecurringEvents(candidates,today,localTimeToronto());
    // An ongoing series takes priority; otherwise the nearest future edition,
    // then the latest past edition with an approved image.
    const score = ev => ev.isRecurringSeries && ev.nextOccurrence
      ? [0,ev.nextOccurrence] : (ev.date>=today && ev.status!=='completed'
        ? [1,ev.date] : [2,ev.date]);
    return schedule.sort((a,b)=>{
      const [ar,ad]=score(a),[br,bd]=score(b);
      return ar-br || (ar===2 ? bd.localeCompare(ad) : ad.localeCompare(bd));
    })[0];
  }
  function eventForSession(programId, date, items=events, language=lang) {
    if (!programId || !date) return null;
    return items.find(ev=>ev.programId===programId && ev.date===date && visibleImage(ev,language)) || null;
  }
  function makeLinkedImage(ev) {
    if (!siteRoot || !idPattern.test(ev.id)) return null;
    const entry = visibleImage(ev);
    if (!entry) return null;
    const eventsDir = lang==='fr' ? 'events/' : `${lang}/events/`;
    const link = global.document.createElement('a');
    link.className = 'didar-activity-media-link';
    const url = new URL(eventsDir,siteRoot);
    url.searchParams.set('event',ev.id);
    link.href = url.href;
    link.setAttribute('aria-label',({en:'View event photos',fr:'Voir les photos de l’événement',fa:'مشاهدهٔ تصاویر رویداد'})[lang]);
    const img = global.document.createElement('img');
    img.className='didar-activity-cover';
    img.alt=(ev.title && (ev.title[lang] || ev.title.fr || ev.title.en || ev.title.fa)) || '';
    img.src=entry.src;img.loading='lazy';img.decoding='async';
    img.addEventListener('error',()=>link.remove(),{once:true});
    link.append(img);
    return link;
  }
  function apply() {
    if (!loaded || !global.document) return;
    const programCards=global.document.querySelectorAll('.program-card[id^="program-"]');
    for (const card of programCards) {
      if (card.querySelector('.didar-activity-media-link')) continue;
      const programId=card.id.slice('program-'.length);
      const match=eventForProgram(programId);
      if (!match) continue;
      const node=makeLinkedImage(match);if(node) card.insertBefore(node,card.firstChild);
    }
    const sessionCards=global.document.querySelectorAll('.activity-card[data-program-id][data-event-date]');
    for (const card of sessionCards) {
      if (card.querySelector('.didar-activity-media-link')) continue;
      const match=eventForSession(card.dataset.programId,card.dataset.eventDate);
      if (!match) continue;
      const node=makeLinkedImage(match);if(node) card.insertBefore(node,card.firstChild);
    }
  }
  async function loadPublicEvents(fetcher=global.fetch) {
    if (!siteRoot || !helpers) return [];
    const settingsResult=await fetcher(new URL('config/events-source.json',siteRoot).href,{cache:'no-store'});
    if (!settingsResult.ok) throw new Error(`Events config HTTP ${settingsResult.status}`);
    const settings=await settingsResult.json();
    let publicEvents=[];
    if (settings.mode==='google_sheets_csv') {
      const url=helpers.safeSheetCsvUrl(settings.google_sheets_csv_url);
      if (!url) throw new Error('Invalid public Events CSV URL');
      const response=await fetcher(url,{cache:'no-store'});
      if (!response.ok) throw new Error(`Events CSV HTTP ${response.status}`);
      publicEvents=helpers.fromCSV(await response.text());
    } else {
      const response=await fetcher(new URL('events/events-feed.json',siteRoot).href,{cache:'no-store'});
      if (!response.ok) throw new Error(`Events feed HTTP ${response.status}`);
      const payload=await response.json();
      publicEvents=payload && Array.isArray(payload.events) ? payload.events : [];
    }
    return publicEvents.filter(helpers.isEvent);
  }
  async function start() {
    if (!global.document || !helpers || !siteRoot) return;
    // Activity cards are rendered asynchronously and re-rendered after filters.
    // Observe only card insertions, not our own image insertions.
    const observer = new MutationObserver(records => {
      if (records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1 &&
        ((n.matches && n.matches('.program-card,.activity-card')) ||
         (n.querySelector && n.querySelector('.program-card,.activity-card')))))) apply();
    });
    for (const id of ['programs-grid','activities-container']) {
      const node=global.document.getElementById(id);
      if(node)observer.observe(node,{childList:true,subtree:true});
    }
    try {
      events=await loadPublicEvents();
      loaded=true;
      apply();
    } catch (err) {
      // A media fetch failure must not affect the Activities page.
      console.warn('DIDAR Activities: event images unavailable:',err);
    }
  }
  return {isoTodayToronto,eventForProgram,eventForSession,visibleImage,loadPublicEvents,apply,start};
});
