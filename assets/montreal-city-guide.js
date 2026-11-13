(() => {
  'use strict';
  const body=document.body,locale=body.dataset.cityLocale||'en',root=body.dataset.assetsPrefix||'../';
  const util=window.DIDARPublicCSV;
  if(!util)return;
  const strs={
    en:{all:'All',arts:'Arts & exhibitions',culture:'Culture',music:'Music & performance',literature:'Books & literature',community:'Community',workshop:'Workshops',other:'Other',details:'Read more',visit:'Official event details',map:'Location',host:'Organized by',empty:'No upcoming events are listed yet. Check back for new cultural discoveries.',error:'The event feed is temporarily unavailable.',events:'upcoming events',date:'Date to be confirmed'},
    fr:{all:'Tout',arts:'Arts et expositions',culture:'Culture',music:'Musique et scène',literature:'Livres et littérature',community:'Communauté',workshop:'Ateliers',other:'Autres',details:'En savoir plus',visit:'Détails officiels',map:'Lieu',host:'Organisé par',empty:'Aucun événement à venir pour le moment. Revenez découvrir de nouvelles activités.',error:'Le calendrier est temporairement inaccessible.',events:'événements à venir',date:'Date à confirmer'},
    fa:{all:'همه',arts:'هنر و نمایشگاه',culture:'فرهنگ',music:'موسیقی و اجرا',literature:'کتاب و ادبیات',community:'اجتماعی',workshop:'کارگاه‌ها',other:'دیگر',details:'اطلاعات بیشتر',visit:'اطلاعات رسمی رویداد',map:'مکان',host:'برگزارکننده',empty:'فعلاً رویدادی برای نمایش ثبت نشده است. به‌زودی دوباره سر بزنید.',error:'دریافت اطلاعات رویدادها فعلاً ممکن نیست.',events:'رویداد آینده',date:'تاریخ در دست بررسی'}
  }[locale]||{};
  const filter=document.getElementById('city-filters');const grid=document.getElementById('city-posts');const message=document.getElementById('city-empty');const count=document.getElementById('city-count');
  if(!filter||!grid||!message)return;
  const txt=(r,k)=>r[k+'_'+locale]||r[k+'_en']||r[k+'_fr']||r[k+'_fa']||'';
  const categories=['all','arts','culture','music','literature','community','workshop','other'];let data=[],active='all';
  const format=(date,time)=>{try{
    const d=new Date(date+'T12:00:00');if(isNaN(d))return strs.date;
    let s=new Intl.DateTimeFormat(locale==='fa'?'fa-IR-u-ca-gregory':locale==='fr'?'fr-CA':'en-CA',{day:'numeric',month:'long',year:'numeric'}).format(d);
    if(time)s+=' · '+time;return s;
  }catch{return date;}};
  function card(row){
    const article=util.elt('article','city-post');
    const pic=util.image(row.image_url,root);
    if(util.published(row.featured)&&pic)article.classList.add('city-post-featured');
    if(pic){const figure=util.elt('div','city-post-picture');const im=util.elt('img');im.src=pic;im.alt=txt(row,'image_alt')||'';im.loading='lazy';im.onerror=()=>figure.remove();figure.append(im);article.append(figure);}
    const content=util.elt('div','city-post-content');
    const line=util.elt('div','city-post-meta');line.append(util.elt('span','city-date',format(row.start_date,row.start_time)));
    const cat=strs[row.category]||strs.other;line.append(util.elt('span','city-category',cat));content.append(line);
    const title=util.elt('h2','',txt(row,'title'));content.append(title);
    if(txt(row,'excerpt'))content.append(util.elt('p','city-excerpt',txt(row,'excerpt')));
    const loc=[row.venue,row.neighborhood].filter(Boolean).join(' · ');
    if(loc)content.append(util.elt('p','city-venue','📍 '+loc));
    if(row.organizer)content.append(util.elt('p','city-organizer',strs.host+': '+row.organizer));
    const details=txt(row,'body');
    if(details){const d=util.elt('details','city-details');const s=util.elt('summary','',strs.details);d.append(s);d.append(util.elt('p','',details));content.append(d);}
    const links=util.elt('div','city-post-links');
    const source=util.https(row.event_url);if(source){const a=util.elt('a','button primary city-link',strs.visit);a.href=source;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}
    const map=util.https(row.location_url);if(map){const a=util.elt('a','city-location-link',strs.map);a.href=map;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}
    if(links.children.length)content.append(links);article.append(content);return article;
  }
  function draw(){
    const rows=data.filter(r=>active==='all'||r.category===active);
    grid.replaceChildren(...rows.map(card));message.hidden=rows.length!==0;message.textContent=strs.empty;
    count.textContent=rows.length+' '+strs.events;
    Array.from(filter.querySelectorAll('button')).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.type===active)));
  }
  for(const cat of categories){const button=util.elt('button','city-chip',strs[cat]);button.type='button';button.dataset.type=cat;button.setAttribute('aria-pressed',String(cat==='all'));
    button.addEventListener('click',()=>{active=cat;draw();});filter.append(button);}
  async function init(){
    try{
      const raw=await util.load(root,'config/montreal-city-events.json','data/montreal-city-events.csv');
      // Events are dated in Montreal local time; compare to local calendar day, not UTC.
      const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      const iso=/^\d{4}-\d{2}-\d{2}$/;
      data=raw.filter(r=>util.published(r.publish)&&iso.test(r.start_date)&&r.start_date>='2000-01-01'&&
        (r.end_date&&iso.test(r.end_date)?r.end_date:r.start_date)>=today && txt(r,'title') && util.https(r.event_url) && ['arts','culture','music','literature','community','workshop','other'].includes(r.category));
      data.sort((a,b)=>(a.start_date+a.start_time).localeCompare(b.start_date+b.start_time));draw();
    }catch(e){console.error('DIDAR city events feed failed',e);message.hidden=false;message.textContent=strs.error;count.textContent='';}
  }
  init();
})();
