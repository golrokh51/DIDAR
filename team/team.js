/* DIDAR Team: read the published Google Sheets CSV directly on page load.
   If unavailable, use the checked-in team-feed.json backup. */
(()=>{
 'use strict';
 const host=document.body;
 const locale=host.dataset.teamLocale||'fr';
 const configUrl=host.dataset.teamConfig;
 const backupUrl=host.dataset.teamFeed;
 const assets=host.dataset.assetsPrefix||'../';
 const grid=document.getElementById('team-grid');
 const empty=document.getElementById('team-empty');
 const emptyText=document.getElementById('team-empty-text');
 if(!grid||!empty)return;
 const messages={
  fr:{none:'Les membres de l’équipe seront présentés ici avec leur accord.',error:'Les profils ne sont pas disponibles pour le moment.'},
  en:{none:'Team members will appear here once they approve their profiles.',error:'Team profiles are temporarily unavailable.'},
  fa:{none:'معرفی اعضای تیم پس از تأیید خودشان در این صفحه منتشر می‌شود.',error:'در حال حاضر امکان نمایش معرفی اعضای تیم وجود ندارد.'}
 }[locale]||{};
 const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
 const yes=value=>['true','yes','1','oui','بله'].includes(String(value||'').trim().toLowerCase());
 const pictureUrl=value=>typeof value==='string'&&/^assets\/team\/[\w.\/-]+$/i.test(value)&&!value.includes('..')?assets+value:'';
 const googleCsvUrl=url=>typeof url==='string'&&/^https:\/\/docs\.google\.com\/spreadsheets\/d\/(?:e\/)?[^/]+\/(?:pub|export)\?/.test(url)&&/\b(?:output|format)=csv\b/.test(url);

 // Standard CSV parser with escaped quotes, commas, and multiline descriptions.
 function csvRows(src){
  const result=[];let row=[],cell='',quoted=false;
  for(let i=0;i<src.length;i++){
   const c=src[i];
   if(quoted){if(c==='"'&&src[i+1]==='"'){cell+='"';i++;}else if(c==='"'){quoted=false;}else cell+=c;}
   else if(c==='"'){quoted=true;}
   else if(c===','){row.push(cell);cell='';}
   else if(c==='\n'||c==='\r'){
    if(c==='\r'&&src[i+1]==='\n')i++;
    row.push(cell);if(row.some(x=>x.trim()))result.push(row);row=[];cell='';
   }else cell+=c;
  }
  if(quoted)throw Error('Invalid CSV (unclosed quote)');
  if(cell!==''||row.length){row.push(cell);if(row.some(x=>x.trim()))result.push(row);}
  return result;
 }
 function csvMembers(text){
  const rows=csvRows(text.replace(/^\ufeff/,''));
  const header=(rows.shift()||[]).map(x=>x.trim());
  const required=['id','name','bio_fr','bio_en','bio_fa','avatar','visible','consent','sort_order'];
  if(required.some(x=>!header.includes(x)))throw Error('Team CSV headers do not match the template');
  const seen=new Set();const people=[];
  for(const cells of rows){
   const field=key=>String(cells[header.indexOf(key)]||'').trim();
   const id=field('id');
   if(!id||seen.has(id))continue;seen.add(id);
   if(!yes(field('visible'))||!yes(field('consent'))||!field('name'))continue;
   const bio={fr:field('bio_fr'),en:field('bio_en'),fa:field('bio_fa')};
   if(!Object.values(bio).some(Boolean))continue;
   people.push({id,name:field('name'),avatar:field('avatar'),bio,visible:true,consent:true,
    sort_order:Number.isFinite(Number(field('sort_order')))&&field('sort_order')!==''?Number(field('sort_order')):999});
  }
  return people.sort((a,b)=>a.sort_order-b.sort_order||a.name.localeCompare(b.name));
 }
 function card(person){
  const article=el('article','team-card');const visual=el('div','team-card-visual');
  const monogram=el('div','team-monogram',Array.from(person.name.trim())[0]||'✦');
  monogram.setAttribute('aria-hidden','true');visual.append(monogram);
  const picture=pictureUrl(person.avatar);
  if(picture){
   const img=el('img','team-avatar');img.alt='';img.loading='eager';img.decoding='async';
   img.addEventListener('load',()=>monogram.replaceWith(img));
   img.src=picture;
  }
  const body=el('div','team-card-body');body.append(el('h2','',person.name));
  const bios=person.bio||{};
  const language=bios[locale]?locale:bios.fr?'fr':bios.en?'en':'fa';
  const bio=String(bios[language]||'').trim();
  if(bio){const p=el('p','',bio);p.lang=language;body.append(p);}
  article.append(visual,body);return article;
 }
 function show(people,message){
  grid.replaceChildren();
  people.filter(p=>p&&p.visible===true&&p.consent===true&&typeof p.name==='string'&&p.name.trim())
    .forEach(p=>grid.append(card(p)));
  empty.hidden=grid.children.length>0;emptyText.textContent=message;
 }
 async function fetchText(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.text();}
 async function init(){
  let published=false;
  try{
   const config=JSON.parse(await fetchText(configUrl));
   const csvUrl=(config.team_csv_url||'').trim();
   if(csvUrl){
    published=true;
    if(!googleCsvUrl(csvUrl))throw Error('Invalid published Team CSV link');
    try{show(csvMembers(await fetchText(csvUrl)),messages.none);return;}
    catch(e){console.warn('DIDAR Team public CSV unavailable, using backup feed:',e.message);}
   }
  }catch(e){console.warn('DIDAR Team config unavailable:',e.message);}
  try{
   const backup=JSON.parse(await fetchText(backupUrl));
   const members=Array.isArray(backup.members)?backup.members:[];
   show(members,published&&!members.length?messages.error:messages.none);
  }catch(e){console.warn('DIDAR Team backup unavailable:',e.message);show([],messages.error);}
 }
 init();
})();
