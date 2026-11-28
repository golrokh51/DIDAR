/** DIDAR creator galleries. Public image filenames are supplied by the CSV. */
const ROOT = '/assets/creators/';
const imageCache = new Map();

const localizedLabels = {
  fr: { open: 'Agrandir la photo', close: 'Fermer', previous: 'Photo précédente', next: 'Photo suivante', loading: 'Chargement des photos…' },
  en: { open: 'Enlarge photo', close: 'Close', previous: 'Previous photo', next: 'Next photo', loading: 'Loading photos…' },
  fa: { open: 'بزرگ‌نمایی عکس', close: 'بستن', previous: 'عکس قبلی', next: 'عکس بعدی', loading: 'در حال بارگذاری عکس‌ها…' },
};

function labels() {
  const lang = typeof document === 'undefined' ? 'en' : (document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
  return localizedLabels[lang] || localizedLabels.en;
}

function safeCreatorId(id) {
  const value = String(id ?? '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value)) {
    throw new Error('Invalid creator ID');
  }
  return value;
}

async function imageExists(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('content-type') || '';
    return response.ok && contentType.toLowerCase().startsWith('image/');
  } catch {
    return false;
  }
}

/** Return available public gallery images in the exact order given in the CSV. */
export async function listCreatorImages(creatorId, imageField = '') {
  const id = safeCreatorId(creatorId);
  const entries = String(imageField || '').split('|').map(value => value.trim()).filter(Boolean);
  // Accept only matching creator IDs, resized gallery filenames, and legacy numbered photos.
  // In particular, never expose -org files, profile files, external URLs or traversal paths.
  const valid = entries.filter(name => {
    if (!name.startsWith(`${id}-`)) return false;
    const suffix = name.slice(id.length + 1);
    return /^photo-(?:0[1-9]|[1-9]\d+)\.jpg$/.test(suffix) || /^[1-9]\d*\.(jpeg|jpg|png|webp|avif)$/.test(suffix);
  });
  const urls = [...new Set(valid)].map(name => `${ROOT}${encodeURIComponent(id)}/${encodeURIComponent(name)}`);
  const key = JSON.stringify([id, urls]);
  if (!imageCache.has(key)) {
    imageCache.set(key, Promise.all(urls.map(async url => await imageExists(url) ? url : null))
      .then(results => results.filter(Boolean)));
  }
  return imageCache.get(key);
}

function ensureStyles() {
  if (document.getElementById('didar-creator-gallery-css')) return;
  const style = document.createElement('style');
  style.id = 'didar-creator-gallery-css';
  style.textContent = `
    .didar-creator-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
    .didar-creator-gallery__image { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 10px; display: block; }
    .didar-creator-gallery__button { display: block; width: 100%; padding: 0; border: 0; background: transparent; cursor: zoom-in; }
    .didar-creator-gallery__button:focus-visible { outline: 3px solid var(--orange, #ee9521); outline-offset: 3px; border-radius: 10px; }
    .didar-creator-dialog { border: 0; padding: 0; max-width: min(96vw, 1100px); width: 96vw; border-radius: 12px; background: #072f3a; color: white; }
    .didar-creator-dialog::backdrop { background: rgba(0,0,0,.86); }
    .didar-creator-dialog__inner { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 10px; padding: 45px 12px 16px; }
    .didar-creator-dialog__image { max-width: 100%; max-height: 79vh; width: 100%; object-fit: contain; }
    .didar-creator-dialog__control { background: #fff; color: #07384b; border: 0; border-radius: 100%; width: 40px; height: 40px; font-size: 22px; cursor: pointer; }
    .didar-creator-dialog__close { position: absolute; right: 12px; top: 8px; }
    .didar-creator-dialog__count { text-align: center; font: 14px system-ui,sans-serif; padding-bottom: 12px; }
    @media (max-width: 600px) { .didar-creator-gallery { grid-template-columns: repeat(2, minmax(0,1fr)); } .didar-creator-dialog__inner { gap: 4px; padding-left: 5px; padding-right: 5px; } .didar-creator-dialog__control { width: 32px; height: 32px; } }
  `;
  document.head.appendChild(style);
}

/** Render a lightbox gallery inside a container element already created by the creator page. */
export async function renderCreatorGallery(container, creatorId, imageField, options = {}) {
  if (!(container instanceof HTMLElement)) throw new TypeError('Pass an HTML container element');
  const id = safeCreatorId(creatorId);
  const text = labels();
  container.textContent = text.loading;
  const photos = await listCreatorImages(id, imageField);
  const photoAlt = index => `${options.alt || options.name || id} — ${index + 1}`;
  container.replaceChildren();
  if (!photos.length) return photos;

  ensureStyles();
  container.classList.add('didar-creator-gallery');

  const dialog = document.createElement('dialog');
  dialog.className = 'didar-creator-dialog';
  const inner = document.createElement('div');
  inner.className = 'didar-creator-dialog__inner';
  const previous = document.createElement('button');
  previous.className = 'didar-creator-dialog__control';
  previous.type = 'button';
  previous.textContent = '‹';
  previous.setAttribute('aria-label', text.previous);
  const mainImage = document.createElement('img');
  mainImage.className = 'didar-creator-dialog__image';
  mainImage.alt = '';
  const next = document.createElement('button');
  next.className = 'didar-creator-dialog__control';
  next.type = 'button';
  next.textContent = '›';
  next.setAttribute('aria-label', text.next);
  inner.append(previous, mainImage, next);
  const close = document.createElement('button');
  close.className = 'didar-creator-dialog__control didar-creator-dialog__close';
  close.textContent = '×';
  close.type = 'button';
  close.setAttribute('aria-label', text.close);
  const count = document.createElement('div');
  count.className = 'didar-creator-dialog__count';
  dialog.append(close, inner, count);
  // Keep the dialog owned by its gallery. Removing a filtered card then
  // also removes its dialog, rather than leaking dialogs into document.body.
  container.appendChild(dialog);

  let activeIndex = 0;
  function show(index) {
    activeIndex = (index + photos.length) % photos.length;
    mainImage.src = photos[activeIndex];
    mainImage.alt = photoAlt(activeIndex);
    count.textContent = `${activeIndex + 1} / ${photos.length}`;
  }
  previous.addEventListener('click', () => show(activeIndex - 1));
  next.addEventListener('click', () => show(activeIndex + 1));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(activeIndex - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(activeIndex + 1); }
  });

  photos.forEach((src, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'didar-creator-gallery__button';
    button.setAttribute('aria-label', `${text.open} ${index + 1}`);
    const img = document.createElement('img');
    img.src = src;
    img.alt = photoAlt(index);
    img.loading = 'lazy';
    img.className = 'didar-creator-gallery__image';
    button.appendChild(img);
    button.addEventListener('click', () => { show(index); dialog.showModal(); });
    container.appendChild(button);
  });

  return photos;
}

export function clearCreatorImageCache(creatorId) {
  if (creatorId === undefined) imageCache.clear();
  else {
    const id = safeCreatorId(creatorId);
    for (const key of imageCache.keys()) if (JSON.parse(key)[0] === id) imageCache.delete(key);
  }
}

