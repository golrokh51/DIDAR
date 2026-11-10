/* DIDAR trilingual Events front-end. Only the curated public JSON feed is read. */
(() => {
  'use strict';
  const root = document.querySelector('[data-didar-events]');
  if (!root) return;
  const lang = root.dataset.lang || 'fr';
  const siteRoot = root.dataset.siteRoot || '../';
  const feedUrl = root.dataset.feedUrl || `${siteRoot}events/events-feed.json`;
  const configUrl = `${siteRoot}config/events-source.json`;
  const helpers = window.DIDAREventsData;
  if (!helpers) { console.error('DIDAR events-data.js must load before events.js'); return; }
  const labels = {
    en: {upcoming:'Upcoming Events', past:'Past Events', all:'All categories', years:'All years',
      category:'Category', year:'Year', details:'View event', back:'← Back to all events',
      emptyUpcoming:'No upcoming events have been published yet.',emptyPast:'The public event archive is being prepared.',
      loadError:'Unable to load the event calendar. Please try again later.',
      eventNotFound:'This event is not available for public viewing.',
      more:'More information', collaborators:'Collaborators', location:'Location',
      photoCredit:'Photo credit', imageError:'Photo unavailable', openPhoto:'Open original on Google Drive', photoAlbum:'View photo album', approx:'Approximate date: ',repeatWeekly:'Every week',repeatBiweekly:'Every two weeks',repeatMonthly:'Every month',repeatDates:'Multiple dates',nextSession:'Next session',formerly:'Previously',count:n=>`${n} event${n===1?'':'s'}`},
    fr: {upcoming:'Événements à venir', past:'Événements passés', all:'Toutes les catégories', years:'Toutes les années',
      category:'Catégorie', year:'Année', details:'Voir l’événement', back:'← Retour aux événements',
      emptyUpcoming:'Aucun événement à venir n’est publié pour le moment.',emptyPast:'Les archives publiques des événements sont en préparation.',
      loadError:'Impossible de charger les événements. Veuillez réessayer plus tard.',
      eventNotFound:'Cet événement n’est pas disponible publiquement.',
      more:'Plus d’informations', collaborators:'Organismes collaborateurs', location:'Lieu',
      photoCredit:'Crédit photo', imageError:'Photo indisponible', openPhoto:'Ouvrir la photo sur Google Drive', photoAlbum:'Voir l’album photo', approx:'Date approximative : ',repeatWeekly:'Chaque semaine',repeatBiweekly:'Toutes les deux semaines',repeatMonthly:'Chaque mois',repeatDates:'Plusieurs dates',nextSession:'Prochaine séance',formerly:'Auparavant',count:n=>`${n} événement${n===1?'':'s'}`},
    fa: {upcoming:'رویدادهای پیش رو', past:'رویدادهای گذشته', all:'همهٔ دسته‌ها', years:'همهٔ سال‌ها',
      category:'دسته‌بندی', year:'سال', details:'مشاهدهٔ رویداد', back:'بازگشت به رویدادها ←',
      emptyUpcoming:'در حال حاضر رویداد آینده‌ای برای نمایش عمومی ثبت نشده است.',emptyPast:'آرشیو عمومی رویدادها در حال آماده‌سازی است.',
      loadError:'بارگیری رویدادها امکان‌پذیر نیست. لطفاً بعداً دوباره تلاش کنید.',
      eventNotFound:'اطلاعات این رویداد برای نمایش عمومی در دسترس نیست.',
      more:'اطلاعات بیشتر', collaborators:'همکاران', location:'محل برگزاری',
      photoCredit:'عکاس', imageError:'تصویر در دسترس نیست', openPhoto:'دیدن تصویر در گوگل درایو', photoAlbum:'مشاهدهٔ آلبوم تصاویر', approx:'تاریخ تقریبی: ',repeatWeekly:'هر هفته',repeatBiweekly:'هر دو هفته',repeatMonthly:'هر ماه',repeatDates:'چند تاریخ',nextSession:'جلسهٔ بعدی',formerly:'پیش‌تر',count:n=>`${n} رویداد`},
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
  function displayEventDate(ev) {
    return (['estimated','approximate'].includes(String(ev.datePrecision||'').toLowerCase()) ? c.approx : '') + formatDate(ev.date);
  }
  function todayToronto() {
    const parts = new Intl.DateTimeFormat('en-US',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/Toronto'}).formatToParts(new Date());
    const vals = Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return `${vals.year}-${vals.month}-${vals.day}`;
  }
  function timeToronto() {
    const parts = new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'America/Toronto'}).formatToParts(new Date());
    const vals = Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return `${vals.hour}:${vals.minute}`;
  }
  function isPublicEvent(ev) { return helpers.isEvent(ev); }
  function safeImage(path) { return Boolean(helpers.imageSource(path)); }
  function safeLink(url) {
    try {const u = new URL(url);return u.protocol === 'https:' ? u.href : '';} catch {return '';}
  }
  function categoryFor(ev) {return (ev.category || 'other').toLowerCase();}
  function bucket(ev) { return helpers.eventBucket(ev,todayToronto()); }
  function upcomingInNextMonth(ev) {
    return helpers.isWithinUpcomingWindow(ev,todayToronto(),1);
  }
  function recurrenceLabel(ev) {
    if (!ev.recurrence) return '';
    const frequency = ev.recurrence.frequency;
    const weekday = new Date(`${ev.date}T12:00:00Z`).getUTCDay();
    const days = {
      en:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
      fr:['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'],
      fa:['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه']
    };
    const day = (days[lang] || days.en)[weekday];
    let label = '';
    if (frequency === 'weekly') label = lang==='fr' ? `Tous les ${day}s` :
      lang==='fa' ? `هر ${day}` : `Every ${day}`;
    else if (frequency === 'biweekly') label = lang==='fr' ? `Un ${day} sur deux` :
      lang==='fa' ? `یک ${day} در میان` : `Every other ${day}`;
    else if (frequency === 'monthly') label = c.repeatMonthly;
    else if (frequency === 'dates') label = c.repeatDates;
    if (ev.isRecurringSeries && !ev.nextOccurrence) return `${c.formerly}: ${label}`;
    return label;
  }
  function imageUrl(img) {
    if (!img) return '';
    const source = helpers.imageSource(img.original || img.src);
    return !source ? '' : source.drive ? source.src : `${siteRoot}${source.src}`;
  }
  function eventPoster(ev) { return helpers.posterForLanguage(ev,lang); }
  function allowedMedia(image) { return helpers.mediaAllowedForLanguage(image,lang); }
  function eventCover(ev) { return helpers.coverForLanguage(ev,lang); }
  function onPhotoError(img, image, parent) {
    img.addEventListener('error', () => {
      img.hidden = true;
      parent.append(make('span','event-image-error',c.imageError));
      const source = helpers.imageSource(image.original || image.src);
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
    const eventHref = `?event=${encodeURIComponent(ev.id)}`;
    // No image yet? Render a clean text-only card instead of excluding the event.
    const coverImage = eventCover(ev);
    const cover = imageUrl(coverImage);
    if (cover) {
      if (eventPoster(ev)) card.classList.add('event-card--poster');
      const link = make('a'); link.href = eventHref;
      const img = make('img'); img.src = cover; img.alt = tr(coverImage.alt)||tr(ev.title);
      img.loading='lazy'; img.decoding='async'; link.append(img);
      onPhotoError(img,coverImage,link); card.append(link);
    } else { card.classList.add('event-card--text-only'); }
    const body=make('div','event-card-body');
    body.append(badge(ev));
    // A series has one poster/card and a readable schedule, not a start-date
    // label repeated once per generated occurrence.
    if (ev.isRecurringSeries && ev.nextOccurrence) {
      body.append(make('p','event-date',`${c.nextSession}: ${formatDate(ev.nextOccurrence)}`));
    } else if (!ev.isRecurringSeries) {
      body.append(make('p','event-date',displayEventDate(ev)));
    }
    if (recurrenceLabel(ev)) body.append(make('p','event-repeat',recurrenceLabel(ev)));
    const h=make('h3');const titleLink=make('a','',tr(ev.title));titleLink.href=eventHref;h.append(titleLink);body.append(h);
    const description=tr(ev.summary)||tr(ev.description);
    if(description) body.append(make('p','event-summary',description.length>190?description.slice(0,187)+'…':description));
    if(ev.venue) body.append(make('p','event-muted',ev.venue));
    const go=make('a','event-open',c.details);go.href=eventHref;body.append(go);
    card.append(body);return card;
  }
  function eventSortDate(ev) {
    return chosen === 'upcoming' && ev.isRecurringSeries ? ev.nextOccurrence || ev.date : ev.date;
  }
  function eventYear(ev) { return eventSortDate(ev).slice(0,4); }
  function fillFilters() {
    const visible=all.filter(ev=>bucket(ev)===chosen && (chosen!=='upcoming'||upcomingInNextMonth(ev)));
    const selectedCategory=categoryFilter.value,selectedYear=yearFilter.value;
    const cats=[...new Set(visible.map(categoryFor))].sort();
    categoryFilter.replaceChildren();yearFilter.replaceChildren();
    categoryFilter.append(new Option(c.all,''));
    cats.forEach(id=>categoryFilter.append(new Option(labelCategory(id),id)));
    yearFilter.append(new Option(c.years,''));
    [...new Set(visible.map(eventYear))].sort().reverse().forEach(y=>yearFilter.append(new Option(y,y)));
    if(cats.includes(selectedCategory)) categoryFilter.value=selectedCategory;
    if([...new Set(visible.map(eventYear))].includes(selectedYear)) yearFilter.value=selectedYear;
  }
  function renderList() {
    detail.hidden=true;list.hidden=false;filters.hidden=false;
    tabs.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.eventsTab===chosen)));
    const items=all.filter(ev=>bucket(ev)===chosen && (chosen!=='upcoming'||upcomingInNextMonth(ev)))
      .filter(ev=>!categoryFilter.value||categoryFor(ev)===categoryFilter.value)
      .filter(ev=>!yearFilter.value||eventYear(ev)===yearFilter.value)
      .sort((a,b)=>chosen==='past'?eventSortDate(b).localeCompare(eventSortDate(a)):eventSortDate(a).localeCompare(eventSortDate(b)));
    list.replaceChildren();count.textContent=c.count(items.length);
    empty.hidden=items.length>0;
    empty.textContent=chosen==='past'?c.emptyPast:c.emptyUpcoming;
    if(chosen==='past') {
      const groups = new Map();
      items.forEach(ev=>{const y=eventYear(ev);if(!groups.has(y))groups.set(y,[]);groups.get(y).push(ev);});
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
    const meta=make('div','event-detail-meta');
    if (!ev.isRecurringSeries) meta.append(make('span','event-date',displayEventDate(ev)));
    if (recurrenceLabel(ev)) meta.append(make('span','event-repeat',recurrenceLabel(ev)));
    if (ev.isRecurringSeries && ev.nextOccurrence) meta.append(make('span','event-muted',`${c.nextSession}: ${formatDate(ev.nextOccurrence)}`));
    if(!ev.isRecurringSeries && ev.endDate && ev.endDate!==ev.date) meta.append(make('span','event-muted',formatDate(ev.endDate)));
    if(ev.venue) meta.append(make('span','event-muted',ev.venue));
    detail.append(meta);
    const coverImage = eventCover(ev);
    const photoUrl = imageUrl(coverImage);
    if (photoUrl) {
      const photo=make('img','event-detail-hero');photo.src=photoUrl;
      photo.alt=tr(coverImage.alt)||tr(ev.title);detail.append(photo);onPhotoError(photo,coverImage,detail);
      if(coverImage.credit) detail.append(make('p','event-caption',`${c.photoCredit}: ${coverImage.credit}`));
    }
    if(safeLink(ev.galleryUrl)){const album=make('a','event-album-link',c.photoAlbum);album.href=ev.galleryUrl;album.target='_blank';album.rel='noopener noreferrer';detail.append(album);}
    const description=tr(ev.description)||tr(ev.summary);
    if(description) detail.append(make('p','event-detail-description',description));
    // A poster and photographs are different media: show every gallery photo
    // when a poster is the hero; avoid repeating the hero in photo-only events.
    const posters = ev.posterCollections || {};
    // On the event page show all applicable posters (not other languages),
    // followed by event photos, avoiding duplicate hero images.
    const gallery = [
      ...(posters[lang] || []), ...(posters.all || []),
      ...(Array.isArray(ev.galleryPhotos) ? ev.galleryPhotos :
        (Array.isArray(ev.images) ? ev.images.slice(1) : []))
    ];
    const seen = new Set();
    const coverSource = coverImage && coverImage.src;
    const galleryToShow = gallery.filter(item=>{
      if (!item || !allowedMedia(item) || !safeImage(item.src) || seen.has(item.src)) return false;
      seen.add(item.src);
      return item.src !== coverSource;
    });
    if(galleryToShow.length) {
      const grid=make('div','event-gallery');
      galleryToShow.forEach(item=>{
        const fig=make('figure');const img=make('img');img.src=imageUrl(item);img.alt=tr(item.alt)||tr(ev.title);img.loading='lazy';fig.append(img);
        img.addEventListener('error',()=>{img.hidden=true;fig.append(make('span','event-image-error',c.imageError));},{once:true});
        const caption=tr(item.caption);if(caption)fig.append(make('figcaption','',caption));grid.append(fig);
      });
      detail.append(grid);
    }
    const info=make('div','event-info');

if(Array.isArray(ev.partners) && ev.partners.length){
  const h=make('h3','',c.collaborators);info.append(h);
  const grid=make('div','event-collaborators');
  ev.partners.forEach(p=>{
    const item=make('div','event-collaborator');
    const imgSrc=p.logo ? imageUrl(p.logo) : '';
    if (imgSrc) {
      const logo=make('img','event-collaborator-logo');
      logo.src=imgSrc;logo.alt=tr(p.name);logo.loading='lazy';
      logo.addEventListener('error',()=>logo.remove(),{once:true});
      item.append(logo);
    }
    const body=make('div','event-collaborator-text');
    const name=make('h4');
    const label=tr(p.name);
    const url=safeLink(p.url);
    if(url){const a=make('a','',label);a.href=url;a.rel='noopener noreferrer';a.target='_blank';name.append(a);}
    else name.textContent=label;
    body.append(name);
    const role=tr(p.role);
    if(role) body.append(make('p','event-collaborator-role',role));
    item.append(body);grid.append(item);
  });
  info.append(grid);
}
    const link=safeLink(ev.link);
    if(link){const a=make('a','',c.more);a.href=link;a.target='_blank';a.rel='noopener noreferrer';info.append(a);}
    detail.append(info);
    document.title = `${tr(ev.title)} | DIDAR`;
  }
  tabs.forEach(button=>button.addEventListener('click',()=>{
    chosen=button.dataset.eventsTab;categoryFilter.value='';yearFilter.value='';
    if(window.location.search) window.history.replaceState({},'',window.location.pathname);
    fillFilters(); renderList();
  }));
  categoryFilter.addEventListener('change',renderList);
  yearFilter.addEventListener('change',renderList);
  async function getEvents() {
    // Prefer a public Google Sheets CSV URL, configured once in config/events-source.json.
    // Otherwise use the curated JSON feed built from the private workbook.
    let config = {mode:'google_sheets_csv'};
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

async function withCollaborators(events) {
  // An absent/unconfigured registry must NEVER make events disappear.
  try {
    const cfg=await fetch(`${siteRoot}config/collaborators-source.json`,{cache:'no-store'});
    if(!cfg.ok) return events;
    const settings=await cfg.json();
    if(settings.mode!=='google_sheets_csv' || !settings.google_sheets_csv_url) return events;
    const url=helpers.safeSheetCsvUrl(settings.google_sheets_csv_url);
    if(!url) throw new Error('Invalid published Collaborators CSV URL');
    const response=await fetch(url,{cache:'no-store',redirect:'follow'});
    if(!response.ok) throw new Error(`Collaborators CSV HTTP ${response.status}`);
    return helpers.attachCollaborators(events,helpers.fromCollaboratorsCSV(await response.text()));
  } catch(error) {
    console.warn('DIDAR collaborators unavailable; events remain visible:',error);
    return events;
  }
}
  async function init() {
    try {
      all = helpers.summarizeRecurringEvents((await withCollaborators(await getEvents())).filter(isPublicEvent),todayToronto(),timeToronto());
      console.info(`DIDAR Events: ${all.length} approved events loaded (${all.filter(ev=>bucket(ev)==='past').length} past, ${all.filter(upcomingInNextMonth).length} upcoming within one month).`);
      if (!all.some(ev => ev.id === 'EVT-000020')) console.warn('DIDAR: EVT-000020 Café numérique is missing from the PUBLIC Google Sheets CSV or is not published/approved. Verify the exact published tab and row.');
      // Keep the Upcoming tab selected even when empty; otherwise it hides
      // missing recurring programs behind the Past Events tab.
      fillFilters();
      const detailId = new URLSearchParams(window.location.search).get('event');
      if (detailId) renderDetail(all.find(ev=>ev.id===detailId ||
        (ev.isRecurringSeries && detailId.startsWith(`${ev.id}--`) && /^\d{4}-\d{2}-\d{2}$/.test(detailId.slice(ev.id.length+2))))); else renderList();
    } catch (error) {
      console.error('DIDAR events feed:',error);
      list.replaceChildren();detail.hidden=true;filters.hidden=true;empty.hidden=false;
      empty.textContent=c.loadError;
    }
  }

  // Keep the next session current when a visitor returns to a long-open tab.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !all.length) return;
    const before = all.map(ev=>ev.nextOccurrence||'').join('|');
    all = helpers.summarizeRecurringEvents(all,todayToronto(),timeToronto());
    if (all.map(ev=>ev.nextOccurrence||'').join('|') === before) return;
    const detailId = new URLSearchParams(window.location.search).get('event');
    if (detailId) renderDetail(all.find(ev=>ev.id===detailId));
    else { fillFilters(); renderList(); }
  });
  init();
})();
