(() => {
  'use strict';
  const csv=window.DIDARPublicCSV;if(!csv)return;
  const localized=(r,k,loc)=>r[k+'_'+loc]||r[k+'_en']||r[k+'_fr']||r[k+'_fa']||'';
  for(const target of document.querySelectorAll('.didar-allies-footer')){
    const root=target.dataset.siteRoot||'./';
    const loc=target.dataset.locale||'en';
    const grid=target.querySelector('.didar-allies-grid');if(!grid)continue;
    (async()=>{
      try{
        const list=(await csv.load(root,'config/recognition-profiles.json','data/recognition-profiles.csv'))
          .filter(r=>r.category==='ally'&&csv.published(r.publish)&&r.name&&r.id)
          .sort((a,b)=>(parseInt(a.sort_order,10)||9999)-(parseInt(b.sort_order,10)||9999));
        const items=list.map(r=>{
          const href=csv.https(r.website_url);
          const element=csv.elt(href?'a':'div','didar-ally-item');
          if(href){element.href=href;element.target='_blank';element.rel='noopener noreferrer';}
          const icon=csv.elt('span','didar-ally-logo');
          const firsts=r.name.trim().split(/\s+/).slice(0,2).map(v=>v[0]||'').join('').toUpperCase();
          const fallback=csv.elt('span','didar-ally-fallback',firsts);
          icon.append(fallback);
          const pic=csv.image(r.image_url,root);
          if(pic){const img=csv.elt('img');img.src=pic;img.alt=localized(r,'image_alt',loc)||r.name;img.loading='lazy';img.onerror=()=>img.remove();icon.append(img);}
          element.append(icon,csv.elt('span','didar-ally-name',r.name));return element;
        });
        grid.replaceChildren(...items);
        target.hidden=items.length===0;
      }catch(err){console.warn('Allies footer CSV not loaded',err);target.hidden=true;}
    })();
  }
})();
