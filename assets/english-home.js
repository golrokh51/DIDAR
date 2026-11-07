// English homepage only. The Charter's native <details> controls also work without JavaScript.
(() => {
  const articles = [...document.querySelectorAll('#charter-articles details.didar-article')];
  const expand = document.getElementById('expand-charter');
  const collapse = document.getElementById('collapse-charter');
  if (!articles.length || !expand || !collapse) return;
  expand.addEventListener('click', () => articles.forEach(item => { item.open = true; }));
  collapse.addEventListener('click', () => articles.forEach(item => { item.open = false; }));
  const openHashTarget = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const target = document.getElementById(id);
    if (target?.matches('details.didar-article')) target.open = true;
  };
  window.addEventListener('hashchange', openHashTarget);
  openHashTarget();
})();
