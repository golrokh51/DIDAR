

(() => {
  "use strict";

  const language = ["en", "fr", "fa"].includes(document.documentElement.lang)
    ? document.documentElement.lang
    : "fr";

  async function loadContent(element) {
    const name = element.dataset.didarMd;
    const layout = element.dataset.didarLayout || "columns";

    if (!/^[a-z0-9-]+$/.test(name || "")) return;

    try {
      const response = await fetch(
        `/content/${language}/${name}.md`,
        { cache: "no-cache" }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const markdown = await response.text();

      const fragment = DOMPurify.sanitize(
        marked.parse(markdown),
        { RETURN_DOM_FRAGMENT: true }
      );

      // MODE 1: Full article (Charter)
      if (layout === "article") {
        // Avoid repeating the page title already in HTML
        if (
          element.dataset.didarSkipTitle === "true" &&
          fragment.firstElementChild?.matches("h1, h2")
        ) {
          fragment.firstElementChild.remove();
        }

        if (!fragment.children.length) {
          throw new Error("Empty article");
        }

        element.replaceChildren(fragment);
        return;
      }

      // MODE 2: Two columns (Mission and Vision)
      if (layout === "columns") {
        const paragraphs = [...fragment.querySelectorAll("p")];

        const columns = element.querySelectorAll(
          ":scope > .didar-narrative-col"
        );

        if (columns.length !== 2 || paragraphs.length < 2) {
          throw new Error("Unexpected two-column layout");
        }

        const midpoint = Math.ceil(paragraphs.length / 2);

        columns[0].replaceChildren(
          ...paragraphs.slice(0, midpoint)
        );

        columns[1].replaceChildren(
          ...paragraphs.slice(midpoint)
        );

        return;
      }

      throw new Error(`Unknown layout: ${layout}`);

    } catch (error) {
      console.error(`Cannot load ${name}:`, error);
      // Keep the existing HTML as fallback
    }
  }

  document.querySelectorAll("[data-didar-md]")
    .forEach(loadContent);
})();
