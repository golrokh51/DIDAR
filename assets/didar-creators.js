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
      all: 'Tous', visual_art: 'Peinture et arts visuels', photography: 'Photographie',
      handmade: 'Artisanat et créations faites à la main', textile: 'Arts textiles et mode', creative_business: 'Petites entreprises créatives',
      other: 'Autres créations', website: 'Site web', instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube',
      no_result: 'Aucun profil dans cette catégorie',
      load_error: 'La galerie est momentanément indisponible. Réessayez plus tard.',
      photos: 'Photos'
    },
    en: {
      all: 'All', visual_art: 'Painting & visual arts', photography: 'Photography',
      handmade: 'Handmade crafts & artisan creations', textile: 'Textile arts & fashion', creative_business: 'Creative small businesses',
      other: 'Other creative work', website: 'Website', instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube',
      no_result: 'No profiles in this category yet',
      load_error: 'The gallery is temporarily unavailable. Please try again later.',
      photos: 'Photos'
    },
    fa: {
      all: 'همه', visual_art: 'نقاشی و هنرهای تجسمی', photography: 'عکاسی',
      handmade: 'صنایع‌دستی و آثار دست‌ساز', textile: 'هنرهای نساجی و مد', creative_business: 'کسب‌وکارهای کوچک خلاق',
      other: 'دیگر هنرها', website: 'وب‌سایت', instagram: 'اینستاگرام', facebook: 'فیس‌بوک', youtube: 'یوتیوب',
      no_result: 'در این دسته هنوز پروفایلی نیست',
      load_error: 'گالری موقتاً در دسترس نیست. لطفاً بعداً دوباره تلاش کنید.',
      photos: 'تصاویر'
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
  // Restrict public image paths to the current creator’s resized local files.
  const validCreatorId = value => {
    const id = String(value || '').trim();
    return /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id) ? id : null;
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
    const id = validCreatorId(profile.id);
    let cover = null;
    let galleryFallback = null;
    let coverFailed = false;
    const showCover = (src, alt) => {
      if (!src) return;
      if (!cover) {
        cover = document.createElement('img');
        cover.loading = 'lazy';
        cover.decoding = 'async';
        cover.addEventListener('error', () => {
          coverFailed = true;
          if (galleryFallback && cover.getAttribute('src') !== galleryFallback) {
            showCover(galleryFallback, localized(profile.image_alt) || profile.name);
          } else {
            cover.remove();
          }
        });
      }
      coverFailed = false;
      cover.alt = alt;
      cover.src = src;
      visual.append(cover);
    };
    if (id) {
      const filename = profile.profile_image;
      // Never use a Google Drive URL or an original/private image as a cover.
      if (filename === `${id}-profile.jpg` || filename === `${id}-0.jpeg`) {
        showCover(`/assets/creators/${encodeURIComponent(id)}/${encodeURIComponent(filename)}`, profile.name);
      }
    }

    const body = node('div', 'creator-card-content');
    body.append(node('p', 'creator-category', texts[profile.category] || texts.other),
      node('h3', '', profile.name));
    if (localized(profile.city)) body.append(node('p', 'creator-location', localized(profile.city)));
    if (localized(profile.bio)) body.append(node('p', 'creator-description', localized(profile.bio).replace(/<br\s*\/?\s*>/gi, '\n')));
    const links = node('div', 'creator-links');
    for (const [key, label] of [['instagram', texts.instagram], ['facebook', texts.facebook], ['youtube', texts.youtube], ['website', texts.website]]) {
      const url = validLink(profile[key]);
      if (!url) continue;
      const a = node('a', '', label + ' ↗');
      a.href = url;
      a.rel = 'noopener noreferrer';
      a.target = '_blank';
      links.append(a);
    }
    if (links.childElementCount) body.append(links);

    // Use only gallery filenames explicitly listed in the public CSV, in CSV order.
    if (id && profile.image) {
      const section = node('section', 'creator-gallery-section');
      const title = node('h4', 'creator-gallery-heading', texts.photos);
      const gallery = node('div', 'creator-gallery-container');
      section.append(title, gallery);
      body.append(section);
      import('/assets/didar-creator-gallery.js?v=20261127b')
        .then(({ renderCreatorGallery }) => renderCreatorGallery(gallery, id, profile.image, { name: profile.name, alt: localized(profile.image_alt) }))
        .then(photos => {
          if (!gallery.isConnected) return;
          if (!photos.length) {
            section.remove();
            return;
          }
          title.textContent = `${texts.photos} (${photos.length})`;
          galleryFallback = photos[0];
          if (!cover || coverFailed || !cover.isConnected) {
            showCover(galleryFallback, localized(profile.image_alt) || profile.name);
          }
        })
        .catch(error => {
          section.remove();
          console.warn('DIDAR creator gallery could not load for', id, error);
        });
    }
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
  const categoryValues = new Set(['visual_art', 'photography', 'handmade', 'textile', 'creative_business', 'other']);
  const categoryAliases = new Map([
    ['handmade crafts & artisan creations', 'handmade'],
    ['artisanat et créations faites à la main', 'handmade'],
    ['textile arts & fashion', 'textile'],
    ['arts textiles et mode', 'textile'],
    ['painting & visual arts', 'visual_art'],
    ['peinture et arts visuels', 'visual_art'],
    ['photographie', 'photography'],
    ['crafts & handmade', 'handmade'],
    ['artisanat et création', 'handmade'],
    ['creative small businesses', 'creative_business'],
    ['petites entreprises créatives', 'creative_business'],
    ['other creative work', 'other'],
    ['autres créations', 'other']
  ]);
  function normalizeCategory(value) {
    const parts = String(value || '').normalize('NFC').toLowerCase().split('/').map(x => x.trim());
    for (const part of parts) {
      if (categoryValues.has(part)) return part;
      if (categoryAliases.has(part)) return categoryAliases.get(part);
    }
    return 'other';
  }
  const fromCSV = row => {
    if (!isYes(row.published) || !isYes(row.consent_confirmed)) return null;
    const name = String(row.name || '').trim();
    if (!name) return null;
    const category = normalizeCategory(row.category);
    const orderString = String(row.sort_order || '').trim();
    const order = /^\d+$/.test(orderString) ? Number(orderString) : 999999;
    const field = (base) => ({ fr: row[base + '_fr'] || '', en: row[base + '_en'] || '', fa: row[base + '_fa'] || '' });
    return {
      id: String(row.id || '').trim(),
      name,
      category,
      city: field('city'),
      bio: field('bio'),
      image_alt: field('image_alt'),
      instagram: row.instagram || '', facebook: row.facebook || '', youtube: row.youtube || '',
      website: row.website || '', image: String(row.image || '').trim(),
      profile_image: String(row['profile-image'] || row.profile_image || '').trim(),
      sort_order: order
    };
  };

  if (!csv || typeof csv.parse !== 'function') {
    container.replaceChildren(empty(texts.load_error, ''));
    console.warn('DIDAR creators CSV parser not loaded. Include /assets/didar-public-csv.js first.');
    return;
  }
  fetch('/data/supported-creators.csv', { cache: 'no-store' })
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
