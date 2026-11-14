(() => {
  'use strict';
  const body=document.body;
  const locale=body.dataset.supporterLocale||'en';
  const prefix=body.dataset.assetsPrefix||'../';
  const util=window.DIDARPublicCSV;
  if(!util)return;
  const labels={
    en:{empty:'No local business profiles are available yet.',error:'The directory could not be loaded. Please try again later.',link:'Website',instagram:'Instagram',youtube:'Video',search:'Search local supporters'},
    fr:{empty:'Aucun profil de soutien local n’est disponible pour le moment.',error:'Impossible de charger le répertoire pour le moment.',link:'Site web',instagram:'Instagram',youtube:'Vidéo',search:'Rechercher parmi les soutiens locaux'},
    fa:{empty:'در حال حاضر نمایه‌ای از حامیان محلی برای نمایش وجود ندارد.',error:'بارگذاری فهرست ممکن نشد. لطفاً بعداً تلاش کنید.',link:'وب‌سایت',instagram:'اینستاگرام',youtube:'ویدئو',search:'جست‌وجوی حامیان محلی'}
  }[locale]||{};
  const localized=(r,k)=>r[k+'_'+locale]||r[k+'_en']||r[k+'_fr']||r[k+'_fa']||'';
  const grid=document.getElementById('business-directory-grid');
  const empty=document.getElementById('business-directory-empty');
  const input=document.getElementById('business-directory-search');
  if(!grid||!empty)return;
  let items=[];
  function makeCard(r){
    const article=util.elt('article','supporter-card directory-card business-directory-card');
    const visual=util.elt('div','supporter-visual directory-visual');
    const image=util.image(r.image_url,prefix);
    const fallback=util.elt('span','directory-placeholder',r.name.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase());
    visual.append(fallback);
    if(image){const img=util.elt('img','work-image');img.alt=localized(r,'image_alt')||r.name;img.src=image;img.loading='lazy';img.onerror=()=>img.remove();visual.append(img);}
    const main=util.elt('div','supporter-body');main.append(util.elt('h3','',r.name));
    const role=localized(r,'role');if(role)main.append(util.elt('p','supporter-role',role));
    const description=localized(r,'description');if(description)main.append(util.elt('p','supporter-bio',description));
    const links=util.elt('div','supporter-links directory-links');
    for(const [raw,label] of [[r.website_url,labels.link],[r.instagram_url,labels.instagram],[r.youtube_url,labels.youtube]]){
      const url=util.https(raw);if(!url)continue;
      const a=util.elt('a','supporter-link',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';links.append(a);
    }
    if(links.childElementCount)main.append(links);
    article.append(visual,main);return article;
  }
  function paint(){
    const q=(input?.value||'').trim().toLocaleLowerCase();
    const shown=items.filter(r=>[r.name,localized(r,'role'),localized(r,'description')].join(' ').toLocaleLowerCase().includes(q));
    grid.replaceChildren(...shown.map(makeCard));empty.textContent=labels.empty;empty.hidden=shown.length>0;
  }
  if(input)input.addEventListener('input',paint);
  (async()=>{
    try{
      items=(await util.load(prefix,'config/recognition-profiles.json','data/recognition-profiles.csv'))
        .filter(r=>util.published(r.publish)&&r.category==='business'&&r.id&&r.name)
        .sort((a,b)=>(parseInt(a.sort_order,10)||9999)-(parseInt(b.sort_order,10)||9999));
      paint();
    }catch(e){console.warn('DIDAR public business directory unavailable',e);empty.textContent=labels.error;}
  })();
})();
