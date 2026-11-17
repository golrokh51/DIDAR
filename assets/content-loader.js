/* DIDAR shared Markdown content loader.
   The two-column layout deliberately has no CDN/library dependency:
   Mission and Vision are plain Markdown paragraphs. For complete articles,
   Marked and DOMPurify remain necessary, and existing HTML is the fallback. */
(() => {
  'use strict';

  const language = ['en', 'fr', 'fa'].includes(document.documentElement.lang)
    ? document.documentElement.lang
    : 'fr';

  const paragraphBlocks = (markdown) => markdown
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n[\t ]*\r?\n/)
    .map(part => part.trim())
    .filter(part => part && !/^#{1,6}[\t ]+/.test(part))
    .map(part => part.replace(/[\t ]*\r?\n[\t ]*/g, ' '));

  const localizedNumber = value => Number(String(value).replace(/[۰-۹٠-٩]/g, digit => {
    const western = '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit);
    return western >= 0 ? western : '٠١٢٣٤٥٦٧٨٩'.indexOf(digit);
  }));
  const displayNumber = number => {
    const padded = String(number).padStart(2, '0');
    return language === 'fa' ? padded.replace(/[0-9]/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]) : padded;
  };

  async function loadContent(element) {
    const name = element.dataset.didarMd;
    const layout = element.dataset.didarLayout || 'columns';
    if (!/^[a-z0-9-]+$/.test(name || '')) return;

    const source = `/content/${language}/${name}.md`;
    try {
      const response = await fetch(source, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${source}`);
      const markdown = await response.text();

      if (layout === 'columns') {
        const textBlocks = paragraphBlocks(markdown);
        const columns = element.querySelectorAll(':scope > .didar-narrative-col');
        if (columns.length !== 2 || textBlocks.length < 2) {
          throw new Error(`Expected two columns and at least two paragraphs in ${source}`);
        }
        const paragraphs = textBlocks.map(text => {
          const p = document.createElement('p');
          p.textContent = text; // Safe: editorial content is text, not executable HTML.
          return p;
        });
        const halfway = Math.ceil(paragraphs.length / 2);
        columns[0].replaceChildren(...paragraphs.slice(0, halfway));
        columns[1].replaceChildren(...paragraphs.slice(halfway));
        return;
      }

      // MODE 3: Numbered Core Values cards (no external library required)
      if (layout === 'cards') {
        if (!element.classList.contains('didar-values-grid')) {
          throw new Error('Core Values needs the didar-values-grid container');
        }

        // Each value begins with: ### 1. Value title
        const normalized = markdown.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
        const headings = [...normalized.matchAll(/^###\s+([0-9۰-۹٠-٩]{1,2})\.\s+(.+?)\s*$/gm)];
        if (headings.length !== 10) {
          throw new Error(`Expected 10 numbered Core Values headings in ${source}; found ${headings.length}`);
        }

        const cards = headings.map((heading, i) => {
          const number = localizedNumber(heading[1]);
          if (number !== i + 1) {
            throw new Error(`Core Values must be numbered 1 to 10 in ${source}`);
          }
          const titleText = heading[2].trim();
          const start = heading.index + heading[0].length;
          const end = headings[i + 1]?.index ?? normalized.length;
          const paragraphs = paragraphBlocks(normalized.slice(start, end));
          if (!titleText || !paragraphs.length) {
            throw new Error(`Missing title or text for Core Value ${number}`);
          }

          const article = document.createElement('article');
          article.className = 'didar-value-card';
          article.id = `value-${number}`;
          article.setAttribute('aria-labelledby', `value-${number}-title`);

          const top = document.createElement('div');
          top.className = 'didar-value-top';
          const index = document.createElement('span');
          index.className = 'didar-value-number';
          index.setAttribute('aria-hidden', 'true');
          index.textContent = displayNumber(number);
          const title = document.createElement('h3');
          title.id = `value-${number}-title`;
          title.textContent = titleText;
          top.append(index, title);

          const copy = document.createElement('div');
          copy.className = 'didar-value-copy';
          for (const text of paragraphs) {
            const p = document.createElement('p');
            p.textContent = text; // Never treat editorial Markdown as executable HTML.
            copy.append(p);
          }
          article.append(top, copy);
          return article;
        });

        // Update only when all ten values have been validated.
        element.replaceChildren(...cards);
        return;
      }

      // MODE 4: Charter text is read exclusively from the local Markdown file.
      // Generate the accordion dynamically; do not require 11 hard-coded articles.
      if (layout === 'charter') {
        const normalized = markdown.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
        const section = element.closest('section#charter');
        const preambleContainer = section?.querySelector('#charter-preamble');
        const shared = section?.querySelector('#shared-commitment');
        if (!section || !preambleContainer || !shared ||
            !element.classList.contains('didar-article-list')) {
          throw new Error('Missing Charter containers');
        }

        const localText = {
          en: { preamble: 'Preamble', article: 'Article', commitment: 'Our Shared Commitment',
                promise: 'Our guiding promise' },
          fr: { preamble: 'Préambule', article: 'Article', commitment: 'Notre engagement commun',
                promise: 'Notre engagement' },
          fa: { preamble: 'مقدمه', article: 'ماده', commitment: 'تعهد مشترک ما',
                promise: 'تعهد ما' }
        }[language];

        const headings = [...normalized.matchAll(/^###\s+(.+?)\s*$/gm)];
        const digitValue = str => Number(str.replace(/[۰-۹]/g, ch => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch)))
                                            .replace(/[٠-٩]/g, ch => String('٠١٢٣٤٥٦٧٨٩'.indexOf(ch))));
        const articleMatch = heading =>
          heading.match(/^(?:Article|ماده(?:ٔ|‌ی|ی)?)\s+([0-9۰-۹٠-٩]{1,2})\s*[—–-]\s*(.+)$/iu);
        const isPreamble = s => /^(?:Preamble|Préambule|مقدمه)$/iu.test(s);
        const isCommitment = s => /^(?:Our Shared Commitment|Notre engagement commun|تعهد مشترک ما)$/iu.test(s);

        if (headings.length < 12 || !isPreamble(headings[0][1])) {
          throw new Error(`Charter needs a preamble and eleven article headings in ${source}`);
        }
        const bodyOf = i => paragraphBlocks(normalized.slice(
          headings[i].index + headings[i][0].length,
          headings[i + 1]?.index ?? normalized.length
        ));
        const preamble = bodyOf(0);
        if (!preamble.length) throw new Error('Empty Charter preamble');
        const createParagraph = text => {
          const p = document.createElement('p');
          const bold = text.match(/^\*\*([\s\S]+)\*\*$/);
          if (bold) {
            const strong = document.createElement('strong');
            strong.textContent = bold[1];
            p.append(strong);
          } else {
            p.textContent = text;
          }
          return p;
        };

        const articles = [];
        for (let i = 1; i <= 11; i++) {
          const heading = headings[i];
          const match = heading && articleMatch(heading[1]);
          if (!match || digitValue(match[1]) !== i || !bodyOf(i).length) {
            throw new Error(`Missing or invalid Charter Article ${i} in ${source}`);
          }
          const item = document.createElement('details');
          item.className = 'didar-article';
          item.id = `article-${i}`;
          if (i === 1) item.open = true;
          const summary = document.createElement('summary');
          const index = document.createElement('span');
          index.className = 'didar-article-index';
          index.textContent = `${localText.article} ${displayNumber(i)}`;
          const title = document.createElement('h3');
          title.className = 'didar-article-name';
          title.textContent = match[2].trim();
          const toggle = document.createElement('span');
          toggle.className = 'didar-article-toggle';
          toggle.setAttribute('aria-hidden', 'true');
          summary.append(index, title, toggle);
          const copy = document.createElement('div');
          copy.className = 'didar-article-copy';
          copy.append(...bodyOf(i).map(createParagraph));
          item.append(summary, copy);
          articles.push(item);
        }

        let commitment = null;
        if (headings.length === 13 && isCommitment(headings[12][1])) {
          commitment = bodyOf(12);
          if (!commitment.length) throw new Error('Empty Charter shared commitment');
        } else if (headings.length !== 12) {
          throw new Error('Unexpected Charter sections');
        }

        const h3 = document.createElement('h3');
        h3.textContent = localText.preamble;
        preambleContainer.replaceChildren(h3, ...preamble.map(createParagraph));
        element.replaceChildren(...articles);
        if (commitment) {
          const eyebrow = document.createElement('p');
          eyebrow.className = 'eyebrow';
          eyebrow.textContent = localText.promise;
          const heading = document.createElement('h3');
          heading.textContent = localText.commitment;
          shared.replaceChildren(eyebrow, heading, ...commitment.map(createParagraph));
          shared.hidden = false;
          shared.style.display = '';
        } else {
          shared.replaceChildren();
          shared.hidden = true;
          shared.style.display = 'none';
        }
        return;
      }

      if (layout === 'article') {
        if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
          throw new Error('Article rendering needs Marked and DOMPurify');
        }
        const fragment = DOMPurify.sanitize(marked.parse(markdown), {
          RETURN_DOM_FRAGMENT: true
        });
        if (element.dataset.didarSkipTitle === 'true' &&
            fragment.firstElementChild?.matches('h1, h2')) {
          fragment.firstElementChild.remove();
        }
        if (!fragment.children.length) throw new Error(`Empty article: ${source}`);
        element.replaceChildren(fragment);
        return;
      }

      throw new Error(`Unknown content layout: ${layout}`);
    } catch (error) {
      console.error('DIDAR content not loaded:', error);
      // Replace an unresolved loading status with a localized, readable error.
      const status = element.querySelector('[role="status"]');
      if (status) {
        status.textContent = language === 'fr' ? 'Contenu temporairement indisponible.'
          : language === 'fa' ? 'محتوا موقتاً در دسترس نیست.'
          : 'Content temporarily unavailable.';
      }
    }
  }

  document.querySelectorAll('[data-didar-md]').forEach(loadContent);

  // Event handlers query the current articles, which arrive asynchronously.
  const setCharterExpanded = open => {
    document.querySelectorAll('#charter-articles > details.didar-article')
      .forEach(item => { item.open = open; });
  };
  document.getElementById('expand-charter')?.addEventListener('click', () => setCharterExpanded(true));
  document.getElementById('collapse-charter')?.addEventListener('click', () => setCharterExpanded(false));
})();
