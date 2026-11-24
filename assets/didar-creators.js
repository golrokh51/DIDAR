/* DIDAR public creators gallery — one CSV source for FR / EN / FA.
 * Edit data/supported-creators.csv, never the gallery HTML.
 * CSV reader is provided by assets/didar-public-csv.js, already loaded by gallery pages.
 */
(() => {
  'use strict';
  const container = document.getElementById('didar-creators-grid');
  if (!container) return;
  const filters = document.getElementById('didar-creators-filters');
  const lang = ['fr', 'en', 'fa'].includes(document.documentElement.lang)
    ? document.documentElement.lang : 'fr';
  const csv = window.DIDARPublicCSV;
  const texts = {
    fr: {
      all:'Tous', visual_art:'Peinture et arts visuels', photography:'Photographie',
      handmade:'Artisanat et création', creative_business:'Petites entreprises créatives',
      other:'Autres créations', website:'Site web', instagram:'Instagram',
      no_result:'Aucun profil dans cette catégorie',
      load_error:'La galerie est momentanément indisponible. Réessayez plus tard.'
    },
    en: {
      all:'All', visual_art:'Painting & visual arts', photography:'Photography',
      handmade:'Crafts & handmade', creative_business:'Creative small businesses',
      other:'Other creative work', website:'Website', instagram:'Instagram',
      no_result:'No profiles in this category yet',
      load_error:'The gallery is temporarily unavailable. Please try again later.'
    },
    fa: {
      all:'همه', visual_art:'نقاشی و هنرهای تجسمی', photography:'عکاسی',
      handmade:'صنایع‌دستی و آثار دست‌ساز', creative_business:'کسب‌وکارهای کوچک خلاق',
      other:'دیگر هنرها', website:'وب‌سایت', instagram:'اینستاگرام',
      no_result:'در این دسته هنوز پروفایلی نیست',
      load_error:'گالری موقتاً در دسترس نیست. لطفاً بعداً دوباره تلاش کنید.'
    }
  }[lang];

  const node = (tag, cls, content) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (content !== undefined) n.textContent = String(content);
    return n;
  };
  const localized = x => x && typeof x === 'object' && !Array.isArray(x)
    ? (x[lang] || x.fr || x.en || x.fa || '') : (x || '');
  const validLink = value => {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const u = new URL(value);
      // Public card links must be HTTPS with no URL-embedded credentials.
      return u.protocol === 'https:' && !u.username && !u.password ? u.href : null;
    } catch { return null; }
  };
  const validImage = value => {
    if (typeof value !== 'string') return null;
    // Allow only local image files in the creators folder.
    if (!/^assets\/creators\/[a-zA-Z0-9_-]+\.(png|jpe?g|webp)$/i.test(value)) return null;
    return '/' + value;
  };
  const empty = (title, description) => {
    const div = node('div', 'creator-empty');
    div.append(node('span', 'creator-empty-icon', '✦'),
      node('h3', '', title), node('p', '', description));
    return div;
  };

  function makeCard(profile) {
    const art = node('article', 'creator-card');
    const visual = node('div', 'creator-image', '✦');
    const imageSrc = validImage(profile.image);
    if (imageSrc) {
      const img = document.createElement('img');
      img.src = imageSrc;
      img.alt = localized(profile.image_alt) || profile.name;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.onerror = () => img.remove();
      visual.append(img);
    }
    const body = node('div', 'creator-card-content');
    body.append(node('p', 'creator-category', texts[profile.category] || texts.other),
      node('h3', '', profile.name));
    if (localized(profile.city)) body.append(node('p', 'creator-location', localized(profile.city)));
    if (localized(profile.bio)) body.append(node('p', 'creator-description', localized(profile.bio)));
    const links = node('div', 'creator-links');
    for (const [key, label] of [['instagram', texts.instagram], ['website', texts.website]]) {
      const url = validLink(profile[key]);
      if (!url) continue;
      const a = node('a', '', label + ' ↗');
      a.href = url;
      a.rel = 'noopener noreferrer';
      a.target = '_blank';
      links.append(a);
    }
    if (links.childElementCount) body.append(links);
    art.append(visual, body);
    return art;
  }

  function render(profiles, category) {
    const selected = category === 'all' ? profiles
      : profiles.filter(x => x.category === category);
    if (!selected.length) {
      container.replaceChildren(empty(
        category === 'all' ? (container.dataset.emptyTitle || texts.no_result) : texts.no_result,
        category === 'all' ? (container.dataset.emptyDescription || '') : ''
      ));
      return;
    }
    container.replaceChildren(...selected.map(makeCard));
  }

  function buildFilters(profiles) {
    if (!filters) return;
    filters.replaceChildren();
    if (!profiles.length) return;
    const categories = ['all', ...new Set(profiles.map(x => x.category))];
    let active = 'all';
    const buttons = categories.map(category => {
      const button = node('button', 'creator-filter', texts[category] || texts.other);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(category === active));
      button.addEventListener('click', () => {
        active = category;
        for (const b of buttons) b.setAttribute('aria-pressed', String(b === button));
        render(profiles, active);
      });
      return button;
    });
    filters.replaceChildren(...buttons);
  }

  const isYes = v => ['yes', 'true', '1', 'oui'].includes(String(v || '').trim().toLowerCase());
  const categoryValues = new Set(['visual_art', 'photography', 'handmade', 'creative_business', 'other']);
  const fromCSV = row => {
    if (!isYes(row.published) || !isYes(row.consent_confirmed)) return null;
    const name = String(row.name || '').trim();
    if (!name) return null;
    const category = String(row.category || '').trim().toLowerCase();
    const orderString = String(row.sort_order || '').trim();
    const order = /^\d+$/.test(orderString) ? Number(orderString) : 999999;
    const field = (base) => ({fr: row[base + '_fr'] || '', en: row[base + '_en'] || '', fa: row[base + '_fa'] || ''});
    return {
      id: String(row.id || '').trim(),
      name,
      category: categoryValues.has(category) ? category : 'other',
      city: field('city'),
      bio: field('bio'),
      image_alt: field('image_alt'),
      instagram: row.instagram || '', website: row.website || '', image: row.image || '',
      sort_order: order
    };
  };

  if (!csv || typeof csv.parse !== 'function') {
    container.replaceChildren(empty(texts.load_error, ''));
    console.warn('DIDAR creators CSV parser not loaded. Include /assets/didar-public-csv.js first.');
    return;
  }
  fetch('/data/supported-creators.csv', {cache: 'no-store'})
    .then(response => {
      if (!response.ok) throw Error('Creators CSV HTTP ' + response.status);
      return response.text();
    })
    .then(content => csv.parse(content))
    .then(rows => {
      if (!Array.isArray(rows)) throw Error('Expected CSV rows');
      const seen = new Set();
      const profiles = rows.map(fromCSV).filter(profile => {
        if (!profile) return false;
        // Avoid duplicate profiles if a creator accidentally appears twice.
        if (profile.id) {
          if (seen.has(profile.id)) return false;
          seen.add(profile.id);
        }
        return true;
      }).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, lang));
      buildFilters(profiles);
      render(profiles, 'all');
    })
    .catch(error => {
      console.warn('DIDAR creators CSV could not be loaded:', error);
      container.replaceChildren(empty(texts.load_error, ''));
    });
})();
