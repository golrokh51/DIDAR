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
        const headings = [...normalized.matchAll(/^###\s+(\d{1,2})\.\s+(.+?)\s*$/gm)];
        if (headings.length !== 10) {
          throw new Error(`Expected 10 numbered Core Values headings in ${source}; found ${headings.length}`);
        }

        const cards = headings.map((heading, i) => {
          const number = Number(heading[1]);
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
          index.textContent = String(number).padStart(2, '0');
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
      // The four original English paragraphs stay visible as fallback.
    }
  }

  document.querySelectorAll('[data-didar-md]').forEach(loadContent);
})();
