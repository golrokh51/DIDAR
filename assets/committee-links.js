/* Links committee pages to Projects, Programs and Sessions by stable IDs from published CSV. */
(() => {
  'use strict';
  const root = document.querySelector('[data-committee-id]');
  if (!root) return;
  const committee = root.dataset.committeeId;
  const mount = document.getElementById('committee-related-content');
  if (!mount) return;
  const section = (heading, entries) => {
    if (!entries.length) return;
    const h = document.createElement('h3'); h.textContent = heading; mount.append(h);
    const ul = document.createElement('ul'); ul.className = 'related-content-list';
    for (const { label, href } of entries) {
      const li = document.createElement('li');
      const a = document.createElement('a'); a.href = href; a.textContent = label;
      li.append(a); ul.append(li);
    }
    mount.append(ul);
  };
  const hasCommittee = (entry) => Array.isArray(entry?.committeeIds) && entry.committeeIds.includes(committee) && entry.visible !== false;
  const localTitle = (entry) => entry?.translations?.en?.title || entry?.title || entry?.id || '';
  const load = async (path, name) => {
    try {
      const response = await fetch(path, {cache:'no-store'});
      if (!response.ok) throw new Error(name + ': ' + response.status);
      return await response.json();
    } catch (error) { console.warn('DIDAR: committee ' + name + ' feed unavailable', error); return null; }
  };
  Promise.all([
    load('/projects/projects-feed.json', 'projects'),
    load('/fa/activities/activities-feed.json', 'activities'),
  ]).then(([projects, activities]) => {
    mount.textContent = "";
    const projectItems = (projects?.projects || []).filter(hasCommittee).map(p => ({label:localTitle(p),href:'/en/projects/#project-' + encodeURIComponent(p.id)}));
    const programItems = (activities?.programs || []).filter(hasCommittee).map(p => ({label:localTitle(p),href:'/en/activities/#program-' + encodeURIComponent(p.id)}));
    const programMap = new Map((activities?.programs || []).map(p=>[p.id,p]));
    const sessionItems = (activities?.sessions || []).filter(s => {
      const assigned = hasCommittee(s);
      const parent = programMap.get(s.programId);
      return s.visible !== false && (assigned || (parent && hasCommittee(parent)));
    }).map(s => ({label:[s.date,localTitle(s)].filter(Boolean).join(' — '),href:'/en/activities/#session-' + encodeURIComponent(s.id)}));
    section('Connected projects', projectItems);
    section('Programs', programItems);
    section('Sessions & events', sessionItems);
    if (!projectItems.length && !programItems.length && !sessionItems.length) {
      const p=document.createElement('p'); p.className='related-content-empty';
      p.textContent = 'No projects or activities have been assigned to this committee in the public data yet.'; mount.append(p);
    }
  });
})();
