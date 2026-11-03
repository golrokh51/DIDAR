
/* Render DIDAR public reports and community moments from content/public-archive.js.
   Uses textContent, strict local paths and opt-in public records only. */
(() => {
  'use strict';
  const archive=window.DIDAR_PUBLIC_ARCHIVE||{};
  const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};
  const validPath=(v,dir,exts)=>typeof v==='string' &&
    new RegExp('^assets/'+dir+'/[a-zA-Z0-9_./-]+\\.('+exts+')$','i').test(v) &&
    !v.split('/').includes('..') && !v.includes('//');
  const records=(arr)=>Array.isArray(arr)?arr.filter(x=>x && x.published===true && x.title && x.id):[];
  function reportCard(item){
    const card=el('article','archive-item');const body=el('div','archive-item-body');
    body.append(el('p','archive-date',item.date||''),el('h3','',item.title));
    if(item.category) body.append(el('p','',item.category));
    if(item.summary) body.append(el('p','',item.summary));
    if(validPath(item.url,'reports','pdf')){
      const a=el('a','inline-link','View report (PDF) →');a.href='/'+item.url;a.target='_blank';a.rel='noopener noreferrer';body.append(a);
    }
    card.append(body);return card;
  }
  function momentCard(item){
    const card=el('article','archive-item');
    if(item.photoConsent===true && validPath(item.image,'event-photos','jpg|jpeg|png|webp')){
      const img=el('img','archive-photo');img.src='/'+item.image;img.alt=item.imageAlt||'';img.loading='lazy';card.append(img);
    }else card.append(el('div','archive-no-photo','Community memory'));
    const body=el('div','archive-item-body');body.append(el('p','archive-date',[item.date,item.place].filter(Boolean).join(' · ')),el('h3','',item.title));
    if(item.description)body.append(el('p','',item.description));
    card.append(body);return card;
  }
  for(const [key,id,emptyId,fn] of [['reports','reports-list','reports-empty',reportCard],['moments','moments-list','moments-empty',momentCard]]){
    const host=document.getElementById(id);if(!host)continue;
    const arr=records(archive[key]).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    arr.forEach(item=>host.append(fn(item)));
    const empty=document.getElementById(emptyId);if(empty)empty.hidden=arr.length>0;
  }
})();
