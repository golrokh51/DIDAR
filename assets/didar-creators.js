(() => {
  'use strict';
  const container = document.getElementById('didar-creators-grid');
  if (!container) return;
  const filters = document.getElementById('didar-creators-filters');
  const lang = ['fr', 'en', 'fa'].includes(document.documentElement.lang) ? document.documentElement.lang : 'fr';
  const texts = {
    fr: {all:'Tous',visual_art:'Peinture et arts visuels',photography:'Photographie',handmade:'Artisanat et création',creative_business:'Petites entreprises créatives',other:'Autres créations',website:'Site web',instagram:'Instagram',no_result:'Aucun profil dans cette catégorie',load_error:'La galerie est momentanément indisponible. Réessayez plus tard.'},
    en: {all:'All',visual_art:'Painting & visual arts',photography:'Photography',handmade:'Crafts & handmade',creative_business:'Creative small businesses',other:'Other creative work',website:'Website',instagram:'Instagram',no_result:'No profiles in this category yet',load_error:'The gallery is temporarily unavailable. Please try again later.'},
    fa: {all:'همه',visual_art:'نقاشی و هنرهای تجسمی',photography:'عکاسی',handmade:'صنایع‌دستی و آثار دست‌ساز',creative_business:'کسب‌وکارهای کوچک خلاق',other:'دیگر هنرها',website:'وب‌سایت',instagram:'اینستاگرام',no_result:'در این دسته هنوز پروفایلی نیست',load_error:'گالری موقتاً در دسترس نیست. لطفاً بعداً دوباره تلاش کنید.'}
  }[lang];
  const node = (tag, cls, content) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (content !== undefined) n.textContent = String(content);
    return n;
  };
  const localized = x => x && typeof x === 'object' && !Array.isArray(x) ? (x[lang] || x.fr || x.en || x.fa || '') : (x || '');
  const validLink = value => {
    if (typeof value !== 'string' || !value.trim()) return null;
    try { const u = new URL(value); return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : null; }
    catch { return null; }
  };
  const validImage = value => {
    if (typeof value !== 'string') return null;
    // Only local files in dedicated artwork directory; no external tracking images.
    if (!/^assets\/creators\/[a-zA-Z0-9_-]+\.(png|jpe?g|webp)$/i.test(value)) return null;
    return '/' + value;
  };
  const empty = (title, description) => {
    const div = node('div','creator-empty');
    div.append(node('span','creator-empty-icon','✦'),node('h3','',title),node('p','',description));
    return div;
  };
  function makeCard(profile) {
    const art = node('article','creator-card');
    const visual = node('div','creator-image','✦');
    const imageSrc = validImage(profile.image);
    if (imageSrc) {
      const img = document.createElement('img');
      img.src = imageSrc;
      img.alt = localized(profile.image_alt) || String(profile.name || '');
      img.loading = 'lazy'; img.decoding = 'async';
      img.onerror = () => img.remove();
      visual.append(img);
    }
    const body = node('div','creator-card-content');
    const category = texts[profile.category] || texts.other;
    body.append(node('p','creator-category',category), node('h3','',profile.name));
    if (localized(profile.city)) body.append(node('p','creator-location',localized(profile.city)));
    if (localized(profile.bio)) body.append(node('p','creator-description',localized(profile.bio)));
    const links = node('div','creator-links');
    for (const [key, label] of [['instagram',texts.instagram], ['website',texts.website]]) {
      const link = validLink(profile[key]);
      if (!link) continue;
      const a = node('a','',label+' ↗');
      a.href = link; a.rel = 'noopener noreferrer'; a.target = '_blank';
      links.append(a);
    }
    if (links.childElementCount) body.append(links);
    art.append(visual,body);
    return art;
  }
  function render(profiles, category) {
    const selected = category === 'all' ? profiles : profiles.filter(x => x.category === category);
    if (!selected.length) {
      container.replaceChildren(empty(category === 'all' ? container.dataset.emptyTitle : texts.no_result,
        category === 'all' ? container.dataset.emptyDescription : ''));
      return;
    }
    container.replaceChildren(...selected.map(makeCard));
  }
  function buildFilters(profiles) {
    if (!profiles.length || !filters) return;
    const categories = ['all', ...new Set(profiles.map(x => x.category || 'other'))];
    let active = 'all';
    const buttons = categories.map(category => {
      const button = node('button','creator-filter',texts[category] || texts.other);
      button.type = 'button'; button.setAttribute('aria-pressed', String(category === active));
      button.addEventListener('click', () => {
        active = category;
        for (const b of buttons) b.setAttribute('aria-pressed', String(b === button));
        render(profiles, active);
      });
      return button;
    });
    filters.replaceChildren(...buttons);
    render(profiles, active);
  }
  fetch('/data/supported-creators.json', {cache:'no-store'})
    .then(r => { if (!r.ok) throw Error(r.status); return r.json(); })
    .then(rows => {
      if (!Array.isArray(rows)) throw Error('Expected a list');
      const published = rows.filter(x => x && x.published === true && x.consent_confirmed === true
        && typeof x.name === 'string' && x.name.trim() && typeof x.category === 'string');
      buildFilters(published);
      render(published,'all');
    })
    .catch(() => container.replaceChildren(empty(texts.load_error,'')));
})();
