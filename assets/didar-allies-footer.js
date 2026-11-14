/* DIDAR shared header and footer. Edit config/site-settings.json for DIDAR identity,
   shared navigation and legal footer; edit public recognition CSV for ally logos/links.
   Every page loads this one script; no per-page footer HTML maintenance is needed. */
(() => {
  'use strict';
  const current = document.currentScript;
  const rootURL = new URL('../', current ? current.src : document.baseURI);
  const root = rootURL.href;
  const lang = ['en', 'fr', 'fa'].includes(document.documentElement.lang) ? document.documentElement.lang : 'en';
  const csv = window.DIDARPublicCSV;
  const localText = (value) => typeof value === 'object' && value !== null
    ? (value[lang] || value.en || value.fr || value.fa || '')
    : (value || '');
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };
  const safePath = (value) => typeof value === 'string'
    && !value.startsWith('/') && !value.includes('..') && !value.includes('\\')
    && !/^[a-z]+:/i.test(value) && !value.startsWith('//') ? value : '';
  const siteURL = (path) => new URL(safePath(path), rootURL).href;
  const normalize = (value) => String(value || '').replace(/(^\/+)|(\/+?$)/g, '').replace(/(?:^|\/)index\.html$/i,'').replace(/\/+$/,'');
  function currentPath() {
    const basePath = rootURL.pathname;
    const actual = window.location.pathname;
    if (!actual.startsWith(basePath)) return '';
    return normalize(decodeURI(actual.slice(basePath.length)));
  }
  function pageFor(path, cfg) {
    const relative = normalize(path);
    for (const [key, variants] of Object.entries(cfg.pages || {})) {
      for (const val of Object.values(variants)) {
        if (normalize(String(val).split('#')[0]) === relative) return key;
      }
    }
    if (relative.startsWith('en/committees/')) return 'committees';
    return null;
  }
  function routeFor(key, lng, cfg) {
    const value = cfg.pages?.[key]?.[lng];
    return typeof value === 'string' ? value : cfg.languages?.[lng]?.home || '';
  }
  function buildLink(item, cfg, key) {
    const dest = routeFor(item.page, lang, cfg);
    const a = el('a', '', item.label);
    a.href = siteURL(dest);
    if (item.page === key && item.page !== 'contact') a.setAttribute('aria-current', 'page');
    return a;
  }
  function renderNavigation(cfg) {
    const header = document.querySelector('header.site-header');
    if (!header) return;
    const key = pageFor(currentPath(), cfg);
    const brand = header.querySelector('.brand');
    if (brand) {
      brand.href = siteURL(cfg.languages?.[lang]?.home || '');
      brand.setAttribute('aria-label', lang === 'fa' ? 'صفحهٔ اصلی دیدار' : lang === 'fr' ? 'Accueil de DIDAR' : 'DIDAR homepage');
      const picture = brand.querySelector('img.brand-logo');
      const logo = safePath(cfg.organization?.logo);
      if (picture && logo) {
        const logoPath = siteURL(logo);
        if (picture.src !== logoPath) picture.src = logoPath;
        picture.alt = localText(cfg.organization.logo_alt) || 'DIDAR';
      }
      const brandName = brand.querySelector('strong');
      if (brandName && cfg.organization?.name) brandName.textContent = cfg.organization.name;
    }
    const languageBar = header.querySelector('nav.languages');
    if (languageBar) {
      languageBar.setAttribute('aria-label', cfg.languages?.[lang]?.switch_label || 'Languages');
      const buttons = [];
      for (const lng of ['fr','en','fa']) {
        const target = lng === lang ? null : routeFor(key, lng, cfg);
        const a = el('a', '', cfg.languages?.[lng]?.label || lng.toUpperCase());
        a.href = lng === lang ? window.location.href : siteURL(target);
        if (lng === lang) a.setAttribute('aria-current','page');
        buttons.push(a);
      }
      languageBar.replaceChildren(...buttons);
    }
    const sections = cfg.navigation?.[lang] || [];
    const desktop = header.querySelector('nav.main-nav');
    if (desktop) {
      const nodes = [];
      for (const item of sections) {
        if (item.children) {
          const details = el('details','nav-dropdown');
          const summary = el('summary','', item.label+' ');
          const chevron = el('span','', '⌄');
          chevron.setAttribute('aria-hidden','true');
          summary.append(chevron);
          const links = el('div','nav-dropdown-menu');
          links.append(...item.children.map(child => buildLink(child,cfg,key)));
          details.append(summary, links);
          nodes.push(details);
        } else {
          nodes.push(buildLink(item,cfg,key));
        }
      }
      desktop.setAttribute('aria-label',cfg.languages?.[lang]?.nav_label || 'Main navigation');
      desktop.replaceChildren(...nodes);
    }
    const mobileDetails = header.querySelector('details.mobile-navigation');
    if (mobileDetails) {
      const summary = mobileDetails.querySelector('summary');
      if (summary) summary.textContent=cfg.languages?.[lang]?.menu || '☰ Menu';
      const mobile = mobileDetails.querySelector('nav');
      if (mobile) {
        mobile.setAttribute('aria-label',cfg.languages?.[lang]?.mobile_label || 'Mobile navigation');
        const nodes = [];
        for (const item of sections) {
          if (item.children) {
            nodes.push(el('span','mobile-nav-heading',item.label));
            nodes.push(...item.children.map(child=>buildLink(child,cfg,key)));
          } else nodes.push(buildLink(item,cfg,key));
        }
        mobile.replaceChildren(...nodes);
      }
    }
  }
  // Every page carries only <footer id="didar-site-footer"><span id="year" hidden></span></footer>.
  // The entire visible footer is generated here from one JSON file and one public CSV.
  function renderFooter(cfg) {
    const footer=document.getElementById('didar-site-footer') || document.querySelector('footer');
    if (!footer) return null;
    const org=cfg.organization || {};
    const title=localText(cfg.footer?.allies_title) || 'Community allies';
    const allies=el('section','didar-allies-footer');
    allies.setAttribute('aria-label',title);
    allies.hidden=true;
    const outer=el('div','container');
    outer.append(el('h2','didar-allies-title',title));
    const grid=el('div','didar-allies-grid');
    outer.append(grid);
    allies.append(outer);
    const legal=el('div','container footer-wrap');
    const year=new Date().getFullYear();
    const legalName=org.legal_name || org.name || 'DIDAR';
    legal.append(
      el('p','',`© ${year} ${legalName}. ${localText(org.copyright)}`),
      el('p','',localText(org.incorporation)),
      el('p','',`NEQ: ${org.neq || ''}`),
      el('p','',localText(org.location))
    );
    footer.replaceChildren(allies,legal);
    footer.removeAttribute('data-didar-loading');
    return allies;
  }
  async function renderAllies(target) {
    if (!target) return;
    const grid=target.querySelector('.didar-allies-grid');
    if (!grid || !csv) return;
    try {
      const rows=(await csv.load(root,'config/recognition-profiles.json','data/recognition-profiles.csv'))
        .filter(row=>row.category==='ally' && csv.published(row.publish) && row.name && row.id)
        .sort((a,b)=>(parseInt(a.sort_order,10)||9999)-(parseInt(b.sort_order,10)||9999));
      const entries=rows.map(row=>{
        const href=csv.https(row.website_url);
        const item=el(href?'a':'div','didar-ally-item');
        if(href){ item.href=href; item.target='_blank'; item.rel='noopener noreferrer'; }
        const frame=el('span','didar-ally-logo');
        const initials=row.name.trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
        frame.append(el('span','didar-ally-fallback',initials));
        const imageURL=csv.image(row.image_url,root);
        if(imageURL){
          const img=el('img');
          img.src=imageURL;img.alt=row['image_alt_'+lang]||row.image_alt_en||row.name;
          img.loading='lazy';img.decoding='async';
          img.onerror=()=>img.remove();
          frame.append(img);
        }
        const copy=el('span','didar-ally-copy');
        copy.append(el('span','didar-ally-name',row.name));
        // Translated ally/initiative subtitle lives in the same public CSV as the logo.
        const subtitle=String(row['role_'+lang] || row.role_en || row.role_fr || row.role_fa || '').trim();
        if(subtitle) copy.append(el('span','didar-ally-subtitle',subtitle));
        item.append(frame,copy);
        return item;
      });
      grid.replaceChildren(...entries);
      target.hidden=!entries.length;
    } catch(error) {
      console.warn('DIDAR ally records unavailable',error);
      target.hidden=true;
    }
  }
  // Always give the footer meaningful visible content before network requests.
  // A missing config or temporary CSV error must never leave the footer blank.
  function showFallbackFooter() {
    const footer = document.getElementById('didar-site-footer') || document.querySelector('footer');
    if (!footer) return;
    const languageText = {
      en: ['All rights reserved.', 'Nonprofit organization incorporated in Québec', 'Montréal · Québec'],
      fr: ['Tous droits réservés.', 'Organisme sans but lucratif constitué au Québec', 'Montréal · Québec'],
      fa: ['تمامی حقوق محفوظ است.', 'سازمان غیرانتفاعی ثبت‌شده در کبک', 'مونترآل · کبک']
    };
    const parts = languageText[lang] || languageText.en;
    const legal = el('div', 'container footer-wrap');
    legal.append(
      el('p', '', `© ${new Date().getFullYear()} Centre culturel et éducatif DIDAR. ${parts[0]}`),
      el('p', '', parts[1]),
      el('p', '', 'NEQ: 1182753112'),
      el('p', '', parts[2])
    );
    footer.replaceChildren(legal);
    footer.hidden = false;
  }

  async function loadSiteShell(){
    showFallbackFooter();
    try {
      const response=await fetch(siteURL('config/site-settings.json'), {cache:'no-store'});
      if(!response.ok)throw new Error('Site settings HTTP '+response.status);
      const cfg=await response.json();
      if(!cfg?.organization || !cfg?.navigation || !cfg?.pages)throw new Error('Invalid site configuration');
      // Footer rendering should never depend on the header or navigation succeeding.
      const allies=renderFooter(cfg);
      try { renderNavigation(cfg); }
      catch (error) { console.warn('DIDAR central navigation unavailable', error); }
      await renderAllies(allies);
    } catch(error) {
      console.warn('DIDAR central shell unavailable; legal footer fallback displayed',error);
    }
  }
  loadSiteShell();
})();
