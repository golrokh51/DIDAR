/* DIDAR trilingual Events front-end. Only the curated public JSON feed is read. */
(() => {
  'use strict';
  const root = document.querySelector('[data-didar-events]');
  if (!root) return;
  const lang = root.dataset.lang || 'fr';
  const siteRoot = root.dataset.siteRoot || '../';
  const feedUrl = root.dataset.feedUrl || `${siteRoot}events/events-feed.json`;
  const configUrl = `${siteRoot}
{
  "mode": "google_sheets_csv",
  "google_sheets_csv_url": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTrNUwAxSxPKZQGLR92tP_BBIybtt7dgb3vrxDdU1fCg75ReanC9HW3gEMv7U5uCGBifDZqscMZ7Uot/pub?gid=168042679&single=true&output=csv"
}
`;
  const helpers = window.DIDAREventsData;
  if (!helpers) { console.error('DIDAR events-data.js must load before events.js'); return; }
  const labels = {
    en: {upcoming:'Upcoming Events', past:'Past Events', all:'All categories', years:'All years',
      category:'Category', year:'Year', details:'View event', back:'← Back to all events',
      emptyUpcoming:'No upcoming events have been published yet.',emptyPast:'The public event archive is being prepared.',
      loadError:'Unable to load the event calendar. Please try again later.',
      eventNotFound:'This event is not available for public viewing.',
      more:'More information', collaborators:'Collaborators', location:'Location',
      photoCredit:'Photo credit', imageError:'Photo unavailable', openPhoto:'Open original on Google Drive', photoAlbum:'View photo album', count:n=>`${n} event${n===1?'':'s'}`},
    fr: {upcoming:'Événements à venir', past:'Événements passés', all:'Toutes les catégories', years:'Toutes les années',
      category:'Catégorie', year:'Année', details:'Voir l’événement', back:'← Retour aux événements',
      emptyUpcoming:'Aucun événement à venir n’est publié pour le moment.',emptyPast:'Les archives publiques des événements sont en préparation.',
      loadError:'Impossible de charger les événements. Veuillez réessayer plus tard.',
      eventNotFound:'Cet événement n’est pas disponible publiquement.',
      more:'Plus d’informations', collaborators:'Organismes collaborateurs', location:'Lieu',
      photoCredit:'Crédit photo', imageError:'Photo indisponible', openPhoto:'Ouvrir la photo sur Google Drive', photoAlbum:'Voir l’album photo', count:n=>`${n} événement${n===1?'':'s'}`},
    fa: {upcoming:'رویدادهای پیش رو', past:'رویدادهای گذشته', all:'همهٔ دسته‌ها', years:'همهٔ سال‌ها',
      category:'دسته‌بندی', year:'سال', details:'مشاهدهٔ رویداد', back:'بازگشت به رویدادها ←',
      emptyUpcoming:'در حال حاضر رویداد آینده‌ای برای نمایش عمومی ثبت نشده است.',emptyPast:'آرشیو عمومی رویدادها در حال آماده‌سازی است.',
      loadError:'بارگیری رویدادها امکان‌پذیر نیست. لطفاً بعداً دوباره تلاش کنید.',
      eventNotFound:'اطلاعات این رویداد برای نمایش عمومی در دسترس نیست.',
      more:'اطلاعات بیشتر', collaborators:'همکاران', location:'محل برگزاری',
      photoCredit:'عکاس', imageError:'تصویر در دسترس نیست', openPhoto:'دیدن تصویر در گوگل درایو', photoAlbum:'مشاهدهٔ آلبوم تصاویر', count:n=>`${n} رویداد`},
  };
  const c = labels[lang] || labels.en;
  const categories = {
    cultural: {en:'Cultural',fr:'Culturel',fa:'فرهنگی'},solidarity:{en:'Solidarity',fr:'Solidarité',fa:'همبستگی'},
    arts:{en:'Arts',fr:'Arts',fa:'هنر'},education:{en:'Education',fr:'Éducation',fa:'آموزشی'},
    cinema:{en:'Cinema',fr:'Cinéma',fa:'سینما'},community:{en:'Community',fr:'Communautaire',fa:'اجتماعی'},
    wellbeing:{en:'Wellbeing',fr:'Bien-être',fa:'بهزیستی'},other:{en:'Other',fr:'Autres',fa:'سایر'}
  };
  const $ = selector => root.querySelector(selector);
  const make = (tag, klass, txt) => {
    const e = document.createElement(tag);
    if (klass) e.className = klass;
    if (txt !== undefined && txt !== null) e.textContent = String(txt);
    return e;
  };
  function tr(value) {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return '';
    return value[lang] || value.fr || value.en || value.fa || '';
  }
  function labelCategory(cat) {
    return (categories[cat] && categories[cat][lang]) || cat || '';
  }
  function formatDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
    const d = new Date(`${iso}T12:00:00Z`);
    const locales = {fa:'fa-IR-u-ca-gregory',en:'en-CA',fr:'fr-CA'};
    return new Intl.DateTimeFormat(locales[lang]||'fr-CA', {year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(d);
  }
  function todayToronto() {
    const parts = new Intl.DateTimeFormat('en-US',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/Toronto'}).formatToParts(new Date());
    const vals = Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return `${vals.year}-${vals.month}-${vals.day}`;
  }
  function isPublicEvent(ev) { return helpers.isEvent(ev); }
  function safeImage(path) { return Boolean(helpers.imageSource(path)); }
  function safeLink(url) {
    try {const u = new URL(url);return u.protocol === 'https:' ? u.href : '';} catch {return '';}
  }
  function categoryFor(ev) {return (ev.category || 'other').toLowerCase();}
  function bucket(ev) {
    if (ev.status === 'completed' && ev.date <= todayToronto()) return 'past';
    if (['planned','upcoming','scheduled'].includes(ev.status) && ev.date >= todayToronto()) return 'upcoming';
    return 'hidden';
  }
  function imageUrl(img) {
    const source = helpers.imageSource(img.original || img.src);
    return !source ? '' : source.drive ? source.src : `${siteRoot}${source.src}`;
  }
  function onPhotoError(img, ev, parent) {
    img.addEventListener('error', () => {
      img.hidden = true;
      parent.append(make('span','event-image-error',c.imageError));
      const source = helpers.imageSource(ev.featuredImage.original || ev.featuredImage.src);
      if (source && source.drive && parent.tagName !== 'A') {
        const a = make('a','event-photo-original',c.openPhoto);
        a.href = source.original; a.target = '_blank'; a.rel = 'noopener noreferrer';
        // Preserve click of the original Drive image: not a fake photo embed.
        parent.append(a);
      }
    }, {once:true});
  }
  function badge(ev) {return make('span','event-category',labelCategory(categoryFor(ev)));}
  const tabs = [...root.querySelectorAll('[data-events-tab]')];
  const list = $('#events-list');
  const detail = $('#event-detail');
  const filters = $('#events-filters');
  const categoryFilter = $('#events-category');
  const yearFilter = $('#events-year');
  const count = $('#events-count');
  const empty = $('#events-empty');
  let all = [], chosen = 'upcoming';

  function createCard(ev) {
    const card = make('article','event-card');
    const link = make('a');link.href = `?event=${encodeURIComponent(ev.id)}`;
    const img = make('img');img.src = imageUrl(ev.featuredImage);img.alt = tr(ev.featuredImage.alt)||tr(ev.title);
    img.loading='lazy';img.decoding='async';link.append(img);onPhotoError(img,ev,link);card.append(link);
    const body=make('div','event-card-body');
    body.append(badge(ev),make('p','event-date',formatDate(ev.date)));
    const h=make('h3');const titleLink=make('a','',tr(ev.title));titleLink.href=link.href;h.append(titleLink);body.append(h);
    const description=tr(ev.summary)||tr(ev.description);
    if(description) body.append(make('p','event-summary',description.length>190?description.slice(0,187)+'…':description));
    if(ev.venue) body.append(make('p','event-muted',ev.venue));
    const go=make('a','event-open',c.details);go.href=link.href;body.append(go);
    card.append(body);return card;
  }
  function fillFilters() {
    const cats=[...new Set(all.map(categoryFor))].sort();
    categoryFilter.replaceChildren();yearFilter.replaceChildren();
    categoryFilter.append(new Option(c.all,''));
    cats.forEach(id=>categoryFilter.append(new Option(labelCategory(id),id)));
    yearFilter.append(new Option(c.years,''));
    [...new Set(all.map(ev=>ev.date.slice(0,4)))].sort().reverse().forEach(y=>yearFilter.append(new Option(y,y)));
  }
  function renderList() {
    detail.hidden=true;list.hidden=false;filters.hidden=false;
    tabs.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.eventsTab===chosen)));
    const items=all.filter(ev=>bucket(ev)===chosen)
      .filter(ev=>!categoryFilter.value||categoryFor(ev)===categoryFilter.value)
      .filter(ev=>!yearFilter.value||ev.date.slice(0,4)===yearFilter.value)
      .sort((a,b)=>chosen==='past'?b.date.localeCompare(a.date):a.date.localeCompare(b.date));
    list.replaceChildren();count.textContent=c.count(items.length);
    empty.hidden=items.length>0;
    empty.textContent=chosen==='past'?c.emptyPast:c.emptyUpcoming;
    if(chosen==='past') {
      const groups = new Map();
      items.forEach(ev=>{const y=ev.date.slice(0,4);if(!groups.has(y))groups.set(y,[]);groups.get(y).push(ev);});
      groups.forEach((group,y)=>{
        list.append(make('h2','events-year',y));const grid=make('div','events-grid');
        group.forEach(ev=>grid.append(createCard(ev)));list.append(grid);
      });
    }else {const grid=make('div','events-grid');items.forEach(ev=>grid.append(createCard(ev)));list.append(grid);}
  }
  function renderDetail(ev) {
    list.hidden=true;filters.hidden=true;detail.hidden=false;detail.replaceChildren();
    const back=make('a','event-back',c.back);back.href=window.location.pathname;
    detail.append(back);
    if(!ev) {detail.append(make('p','events-empty',c.eventNotFound));return;}
    detail.append(badge(ev));
    detail.append(make('h2','',tr(ev.title)));
    const meta=make('div','event-detail-meta');meta.append(make('span','event-date',formatDate(ev.date)));
    if(ev.endDate && ev.endDate!==ev.date) meta.append(make('span','event-muted',formatDate(ev.endDate)));
    if(ev.venue) meta.append(make('span','event-muted',ev.venue));
    detail.append(meta);
    const photo=make('img','event-detail-hero');photo.src=imageUrl(ev.featuredImage);
    photo.alt=tr(ev.featuredImage.alt)||tr(ev.title);detail.append(photo);onPhotoError(photo,ev,detail);
    if(ev.featuredImage.credit) detail.append(make('p','event-caption',`${c.photoCredit}: ${ev.featuredImage.credit}`));
    if(safeLink(ev.galleryUrl)){const album=make('a','event-album-link',c.photoAlbum);album.href=ev.galleryUrl;album.target='_blank';album.rel='noopener noreferrer';detail.append(album);}
    const description=tr(ev.description)||tr(ev.summary);
    if(description) detail.append(make('p','event-detail-description',description));
    if(Array.isArray(ev.images) && ev.images.length>1) {
      const grid=make('div','event-gallery');
      ev.images.slice(1).forEach(item=>{if(!safeImage(item.src))return;
        const fig=make('figure');const img=make('img');img.src=imageUrl(item);img.alt=tr(item.alt)||tr(ev.title);img.loading='lazy';fig.append(img);img.addEventListener('error',()=>{img.hidden=true;fig.append(make('span','event-image-error',c.imageError));},{once:true});
        const caption=tr(item.caption);if(caption)fig.append(make('figcaption','',caption));grid.append(fig);
      });
      if(grid.childElementCount)detail.append(grid);
    }
    const info=make('div','event-info');
    if(Array.isArray(ev.partners) && ev.partners.length){
      const h=make('h3','',c.collaborators);info.append(h);
      const ul=make('ul','event-info-list');ev.partners.forEach(p=>{
        const li=make('li');const text=tr(p.name);
        if(safeLink(p.url)){const a=make('a','',text);a.href=p.url;a.rel='noopener noreferrer';a.target='_blank';li.append(a);}
        else li.textContent=text;ul.append(li);
      });info.append(ul);
    }
    const link=safeLink(ev.link);
    if(link){const a=make('a','',c.more);a.href=link;a.target='_blank';a.rel='noopener noreferrer';info.append(a);}
    detail.append(info);
    document.title = `${tr(ev.title)} | DIDAR`;
  }
  tabs.forEach(button=>button.addEventListener('click',()=>{
    chosen=button.dataset.eventsTab;categoryFilter.value='';yearFilter.value='';
    if(window.location.search) window.history.replaceState({},'',window.location.pathname);
    renderList();
  }));
  categoryFilter.addEventListener('change',renderList);
  yearFilter.addEventListener('change',renderList);
  async function getEvents() {
    // Prefer a public Google Sheets CSV URL, configured once in config/events-source.json.
    // Otherwise use the curated JSON feed built from the private workbook.
    let config = {mode:'local_json'};
    const configResponse = await fetch(configUrl, {cache:'no-store'});
    if (configResponse.ok) config = await configResponse.json();
    if (config.mode === 'google_sheets_csv') {
      const url = helpers.safeSheetCsvUrl(config.google_sheets_csv_url);
      if (!url) throw new Error('Set a published CSV URL (not the Google Sheets edit link) in config/events-source.json');
      const csvResponse = await fetch(url, {cache:'no-store',redirect:'follow'});
      if (!csvResponse.ok) throw new Error(`Public Google Sheets CSV returned HTTP ${csvResponse.status}`);
      const events = helpers.fromCSV(await csvResponse.text());
      return events;
    }
    const response = await fetch(feedUrl, {cache:'no-store'});
    if (!response.ok) throw new Error(`Events JSON returned HTTP ${response.status}`);
    const feed = await response.json();
    if (!feed || feed.schemaVersion !== 1 || !Array.isArray(feed.events)) throw new Error('Unexpected JSON feed schema');
    return feed.events;
  }
  async function init() {
    try {
      all = (await getEvents()).filter(isPublicEvent);
      fillFilters();
      const detailId = new URLSearchParams(window.location.search).get('event');
      if (detailId) renderDetail(all.find(ev=>ev.id===detailId)); else renderList();
    } catch (error) {
      console.error('DIDAR events feed:',error);
      list.replaceChildren();detail.hidden=true;filters.hidden=true;empty.hidden=false;
      empty.textContent=c.loadError;
    }
  }

  init();
})();
