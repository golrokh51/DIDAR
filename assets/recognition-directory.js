(() => {
  'use strict';
  const body=document.body; const locale=body.dataset.supporterLocale||'en';
  const prefix=body.dataset.assetsPrefix||'../';const util=window.DIDARPublicCSV;
  const labels={
    en:{business:'Businesses & professionals',artist:'Independent artists',ally:'Allies & community partners',none:'Profiles will appear here once details and publication permission are confirmed.',link:'Visit website',instagram:'Instagram',youtube:'Watch video',error:'Profiles could not be loaded. Please try again later.'},
    fr:{business:'Entreprises et professionnels',artist:'Artistes indépendants',ally:'Alliés et organismes partenaires',none:'Les profils seront publiés après validation des informations et de l’autorisation.',link:'Visiter le site',instagram:'Instagram',youtube:'Voir la vidéo',error:'Impossible de charger les profils. Veuillez réessayer plus tard.'},
    fa:{business:'کسب‌وکارها و متخصصان',artist:'هنرمندان مستقل',ally:'همراهان و سازمان‌های همکار',none:'پس از تأیید اطلاعات و اجازهٔ انتشار، نمایه‌ها در این بخش نمایش داده می‌شوند.',link:'وب‌سایت',instagram:'اینستاگرام',youtube:'تماشای ویدئو',error:'بارگذاری اطلاعات ممکن نشد؛ لطفاً بعداً دوباره تلاش کنید.'}
  }[locale]||{};
  if(!util)return;
  const localized=(record,key)=>record[key+'_'+locale]||record[key+'_fr']||record[key+'_en']||record[key+'_fa']||'';
  const groups=['business','artist','ally'];
  function card(item){
    const article=util.elt('article','supporter-card directory-card');
    const img=util.image(item.image_url,prefix);
    const visual=util.elt('div','supporter-visual directory-visual');
    if(img){const image=util.elt('img','work-image');image.src=img;image.alt=localized(item,'image_alt')||'';image.loading='lazy';image.onerror=()=>image.remove();visual.append(image);}
    else visual.append(util.elt('span','directory-placeholder',item.category==='ally'?'🤝':item.category==='artist'?'🎨':'🏬'));
    article.append(visual);
    const b=util.elt('div','supporter-body');b.append(util.elt('h3','',item.name));
    const role=localized(item,'role');if(role)b.append(util.elt('p','supporter-role',role));
    const desc=localized(item,'description');if(desc)b.append(util.elt('p','supporter-bio',desc));
    const links=util.elt('div','supporter-links directory-links');
    [[item.website_url,labels.link],[item.instagram_url,labels.instagram],[item.youtube_url,labels.youtube]].forEach(([raw,text])=>{
      const href=util.https(raw);if(!href)return;const a=util.elt('a','supporter-link',text);a.href=href;a.target='_blank';a.rel='noopener noreferrer';links.append(a);
    });
    if(links.children.length)b.append(links);article.append(b);return article;
  }
  async function init(){
    try{
      const raw=await util.load(prefix,'config/recognition-profiles.json','data/recognition-profiles.csv');
      const records=raw.filter(r=>util.published(r.publish)&&groups.includes(r.category)&&r.name&&r.id)
        .sort((a,b)=>(parseInt(a.sort_order)||9999)-(parseInt(b.sort_order)||9999));
      for(const kind of groups){
        const grid=document.getElementById('recognition-'+kind+'-grid');const empty=document.getElementById('recognition-'+kind+'-empty');
        if(!grid)continue;
        const items=records.filter(r=>r.category===kind);grid.replaceChildren(...items.map(card));
        empty.textContent=labels.none;empty.hidden=items.length!==0;
      }
    }catch(e){
      console.error('DIDAR supporter CSV loading failed',e);
      for(const kind of groups){const n=document.getElementById('recognition-'+kind+'-empty');if(n)n.textContent=labels.error;}
    }
  }
  init();
})();
