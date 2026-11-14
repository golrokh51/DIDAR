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
