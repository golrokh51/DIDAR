/* DIDAR — language-safe program/session localization.
 * The Sheets feed uses Persian as the canonical content language. When another
 * language has not yet been translated, use its existing curated local copy
 * instead of exposing Persian on the English or French pages.
 * Published spreadsheet translations always take priority over local copy.
 */
(function () {
  "use strict";

  const placeholders = {
    en: { program: "Program details coming soon", session: "Session details coming soon" },
    fr: { program: "Détails du programme à venir", session: "Détails de la séance à venir" }
  };

  function str(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function list(value, splitPattern) {
    if (Array.isArray(value)) return value.map(str).filter(Boolean);
    return str(value).split(splitPattern).map(str).filter(Boolean);
  }

  function collaborators(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && str(item.name)).map(item => ({
      name: str(item.name),
      url: str(item.url)
    }));
  }

  function localize(record, locale, kind, localRecords) {
    if (!record || locale === "fa") return record;
    const local = (Array.isArray(localRecords) ? localRecords : [])
      .find(item => item.id === record.id) || {};
    const fromSheet = record.translations?.[locale] || {};
    const localTranslation = local.translations?.[locale] || {};
    const textFields = kind === "program"
      ? ["title", "subtitle", "description", "status", "schedule", "audience"]
      : ["title", "subtitle", "partner", "location", "role", "summary", "module"];
    const result = { ...record };
    for (const field of textFields) {
      // Never use record[field] as a fallback: the feed's top-level fields are Persian.
      result[field] = str(fromSheet[field]) || str(localTranslation[field]) || str(local[field]) || "";
    }
    if (!result.title) {
      result.title = placeholders[locale]?.[kind] || "Details coming soon";
    }
    if (kind === "program") {
      for (const field of ["languages", "topics"]) {
        const delimiter = field === "languages" ? /[|,،]/ : /\|/;
        result[field] = list(fromSheet[field], delimiter);
        if (!result[field].length) result[field] = list(localTranslation[field], delimiter);
        if (!result[field].length) result[field] = list(local[field], delimiter);
      }
    } else {
      // A session's type, date, program ID and canonical status are language-independent.
      // Do not pass Persian tags through to the English/French interface.
      result.tags = list(local.tags, /\|/);
    }
    result.collaborators = collaborators(fromSheet.collaborators);
    if (!result.collaborators.length) result.collaborators = collaborators(localTranslation.collaborators);
    if (!result.collaborators.length) result.collaborators = collaborators(local.collaborators);
    if (kind === "session" && !result.collaborators.length && result.partner) {
      result.collaborators = [{ name: result.partner, url: "" }];
    }
    // Preserve shared collaborator URLs even when the translated names are
    // supplied by a saved local copy rather than a populated Sheet column.
    const originalPartners = collaborators(record.collaborators);
    result.collaborators = result.collaborators.map((item, index) => ({
      ...item,
      url: item.url || originalPartners[index]?.url || ""
    }));
    return result;
  }

  window.DIDAR_localizeRecord = localize;
})();
