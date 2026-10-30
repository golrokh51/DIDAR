
document.addEventListener("DOMContentLoaded", () => {
  const brandLink = document.querySelector("a.brand");
  const logo = brandLink?.querySelector("img.brand-logo");
  if (!brandLink || !logo) return;

  const lang = document.documentElement.lang || "fr";
  const labels = lang.startsWith("fa")
    ? ["بزرگ‌نمایی لوگوی دیدار", "بستن"]
    : lang.startsWith("en")
    ? ["Enlarge DIDAR logo", "Close"]
    : ["Agrandir le logo de DIDAR", "Fermer"];

  // Separate the logo button from the homepage link.
  const wrapper = document.createElement("div");
  wrapper.className = "brand";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "didar-logo-trigger";
  trigger.setAttribute("aria-label", labels[0]);
  trigger.setAttribute("aria-haspopup", "dialog");

  brandLink.classList.remove("brand");
  brandLink.classList.add("didar-brand-home");

  brandLink.before(wrapper);
  wrapper.append(trigger, brandLink);
  trigger.append(logo);

  // Create enlarged logo dialog.
  const dialog = document.createElement("dialog");
  dialog.className = "didar-logo-dialog";
  dialog.setAttribute("aria-label", labels[0]);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "didar-logo-close";
  close.textContent = "×";
  close.setAttribute("aria-label", labels[1]);

  const enlarged = document.createElement("img");
  enlarged.src = logo.src;
  enlarged.alt = logo.alt;

  dialog.append(close, enlarged);
  document.body.append(dialog);

  trigger.addEventListener("click", () => dialog.showModal());
  close.addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

