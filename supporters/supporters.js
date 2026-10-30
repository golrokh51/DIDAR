/* DIDAR supporters profiles. All data stays in supporters-data.js. */
(() => {
  'use strict';
  const site = document.querySelector('[data-supporter-locale]');
  if (!site) return;
  const locale = site.dataset.supporterLocale || 'fr';
  const data = Array.isArray(window.DIDAR_SUPPORTERS) ? window.DIDAR_SUPPORTERS : [];
  const labels = {
    fr:{all:'Toutes les contributions',arts:'Arts & création',services:'Services & compétences',financial:'Dons & soutien matériel',link:'Découvrir',none:'Aucune fiche dans cette catégorie pour le moment.',new:'Les portraits de nos partenaires paraîtront ici, avec leur accord.'},
    en:{all:'All contributors',arts:'Arts & creativity',services:'Services & skills',financial:'Financial & material support',link:'Explore their work',none:'No profiles in this category yet.',new:'Profiles of our supporters will appear here with their permission.'},
    fa:{all:'همه همراهان',arts:'هنر و خلاقیت',services:'خدمات و مهارت‌ها',financial:'حمایت مالی و امکانات',link:'دیدن نمونه‌کارها',none:'هنوز نمایه‌ای در این بخش منتشر نشده است.',new:'با اجازهٔ همراهان، معرفی آن‌ها در این بخش منتشر خواهد شد.'}
  }[locale];
  const grid = document.getElementById('supporters-grid');
  const toolbar = document.getElementById('supporter-filters');
  const empty = document.getElementById('supporters-empty');
  const emptyText = document.getElementById('supporters-empty-text');
  if (!grid || !toolbar || !empty) return;
  const rootPath = site.dataset.assetsPrefix || '../';
  const available = data.filter(p=>p && p.publishedWithConsent === true && typeof p.name === 'string' && p.name.trim());
  const getLocalized = value => (typeof value === 'string' ? value : (value && (value[locale] || value.fr || value.en || value.fa)) || '');
  const assetUrl = p => {
    if (!p || typeof p !== 'string' || p.includes('..') || /^(?:javascript|data|blob):/i.test(p)) return '';
    if (/^https:\/\//i.test(p)) return p;
    if (p.startsWith('/') || /^[a-z]+:/i.test(p)) return '';
    return rootPath + p;
  };
  const portfolioUrl = value => {
    try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; }
  };
  const el = (tag, cls, txt) => {
    const node = document.createElement(tag);
    if (cls) node.className=cls;
    if (txt !== undefined) node.textContent=txt;
    return node;
  };
  const addPicture = (container, url, cls, alt) => {
    if (!url) return;
    const img = el('img',cls);img.src=url;img.alt=alt || '';img.loading='lazy';
    img.addEventListener('error',()=>img.remove());container.append(img);
  };
  const createCard = person => {
    const card=el('article','supporter-card');
    const visual=el('div','supporter-visual');
    const symbol=el('span','symbol','✦'); symbol.setAttribute('aria-hidden','true');visual.append(symbol);
    addPicture(visual,assetUrl(person.image),'work-image',getLocalized(person.alt) || '');
    addPicture(visual,assetUrl(person.avatar),'supporter-avatar','');
    const body=el('div','supporter-body');
    const name=el('h3','',person.name);body.append(name);
    if(getLocalized(person.role)) body.append(el('p','supporter-role',getLocalized(person.role)));
    if(getLocalized(person.bio)) body.append(el('p','supporter-bio',getLocalized(person.bio)));
    const tags=el('div','supporter-tags');
    (Array.isArray(person.contributions) ? person.contributions : []).forEach(type=>{
      if(labels[type]) tags.append(el('span','supporter-tag',labels[type]));
    });
    if (tags.children.length) body.append(tags);
    const href=portfolioUrl(person.link);
    if(href){
      const links=el('div','supporter-links');
      const a=el('a','supporter-link',getLocalized(person.linkLabel)||labels.link);
      a.href=href;a.target='_blank';a.rel='noopener noreferrer';links.append(a);body.append(links);
    }
    card.append(visual,body);return card;
  };
  let active='all';
  function render(){
    grid.replaceChildren();
    const visible=available.filter(p=>active==='all'||(Array.isArray(p.contributions)&&p.contributions.includes(active)));
    visible.forEach(p=>grid.append(createCard(p)));
    empty.hidden=visible.length>0;
    emptyText.textContent=available.length ? labels.none : labels.new;
    [...toolbar.querySelectorAll('button')].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===active)));
  }
  [['all',labels.all],['arts',labels.arts],['services',labels.services],['financial',labels.financial]].forEach(([type,label])=>{
    const b=el('button','supporter-filter',label);b.type='button';b.dataset.filter=type;
    b.addEventListener('click',()=>{active=type;render();});toolbar.append(b);
  });
  render();
})();
