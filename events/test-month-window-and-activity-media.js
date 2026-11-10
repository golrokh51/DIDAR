'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const h=require('./events-data.js');
const projectRoot=path.join(__dirname,'..');
const csv=fs.readFileSync(path.join(projectRoot,'DIDAR_Public_Events.csv'),'utf8');
const parsed=h.fromCSV(csv);
assert.equal(parsed.length,19,'18 historical plus one Café; private Yalda must remain private');
const cafe=parsed.find(e=>e.id==='EVT-000020');
assert(cafe,'Café must exist in completed local CSV');
assert.equal(cafe.recurrence.frequency,'weekly');
assert.equal(cafe.endTime,'19:00');
assert.equal(cafe.posterCollections.all.length,0,'unapproved images must remain hidden');
const approved=csv.replace(/(EVT-000020[^\n]+)/,line=>{
  // Use the CSV object to avoid touching unrelated text; stored event fields include commas and quoted strings.
  return line;
});
function exportedCsvWithApprovedCafe(){
 const {headers,records}=h.parseCSV(csv);
 const row=records.find(x=>x.event_uid==='EVT-000020');
 row.photo_rights_approved='yes';row.photo_consent_approved='no_people';
 const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
 return headers.join(',')+'\n'+records.map(rec=>headers.map(key=>quote(rec[key])).join(',')).join('\n');
}
const approvedCsv=exportedCsvWithApprovedCafe();
const published=h.fromCSV(approvedCsv);
const postCafe=published.find(e=>e.id==='EVT-000020');
assert(postCafe.posterCollections.all.length===2,'two approved Café posters in correct order');
const now='2026-11-09';
const summary=h.summarizeRecurringEvents(published,now,'20:27');
const upcoming=summary.filter(ev=>h.isWithinUpcomingWindow(ev,now,1))
 .sort((a,b)=>(a.nextOccurrence||a.date).localeCompare(b.nextOccurrence||b.date));
assert.deepEqual(upcoming.map(ev=>ev.id),['EVT-000020']);
assert.equal(upcoming[0].nextOccurrence,'2026-11-16');
assert.equal(upcoming.filter(e=>e.id==='EVT-000020').length,1);
const mock={id:'EVT-000099',date:'2026-11-22',status:'scheduled'};
assert(h.isWithinUpcomingWindow({...mock},now,1),'one-off within rolling month');
assert(!h.isWithinUpcomingWindow({...mock,date:'2026-12-10'},now,1),'one-off outside rolling month');

const activityMediaSource=fs.readFileSync(path.join(projectRoot,'assets/activities-event-media.js'),'utf8');
function makeFakeElement(tag){
 return {tagName:tag.toUpperCase(),children:[],attributes:{},dataset:{},
   append(c){this.children.push(c);},
   insertBefore(c){this.children.unshift(c);},
   setAttribute(k,v){this.attributes[k]=v;},
   addEventListener(){},
   querySelector(sel){return sel==='.didar-activity-media-link' ?
     this.children.find(x=>x.className==='didar-activity-media-link')||null:null;},
   remove(){this.removed=true;}
 };
}
async function testLang(lang){
 const prog=makeFakeElement('article');prog.id='program-digital-cafe';
 const sess=makeFakeElement('article');sess.id='session-afi-dialogue-2026-10-11';
 sess.dataset={programId:'dialogue-crisis',eventDate:'2026-10-11'};
 const doc={documentElement:{lang},currentScript:{src:'https://didar-mtl.ca/assets/activities-event-media.js'},
  querySelectorAll(selector){return selector.startsWith('.program-card')?[prog]:[sess];},
  getElementById(){return null;},createElement:makeFakeElement};
 const fakeWindow={document:doc,DIDAREventsData:h, fetch:async (url)=>{
   const isCfg=url.includes('events-source.json');return {
     ok:true,
     json:async()=>({mode:'google_sheets_csv',google_sheets_csv_url:'https://docs.google.com/spreadsheets/d/abc/pub?output=csv'}),
     text:async()=>approvedCsv
   };
 }};
 const ctx={window:fakeWindow,document:doc,URL,Date,console,
  Intl,MutationObserver:class {observe(){}},module:{exports:{}}};
 vm.runInNewContext(activityMediaSource,ctx);
 const api=ctx.module.exports;
 // The script starts once automatically; start again for a testable promise.
 await api.start();
 const progLink=prog.querySelector('.didar-activity-media-link');
 const sessLink=sess.querySelector('.didar-activity-media-link');
 assert(progLink,`${lang} Digital Café program cover`);
 assert(sessLink,`${lang} workshop session cover`);
 assert.match(progLink.children[0].src,/EVT-000020-poster-1\.png/);
 assert.match(sessLink.children[0].src,new RegExp(`EVT-000017-poster-${lang}\\.png`));
 assert.match(progLink.href,/event=EVT-000020/);
 assert.equal(api.eventForSession('digital-cafe','2026-10-11'),null,'do not link unrelated sessions');
 assert.equal(api.eventForSession('digital-cafe','2026-11-16',published,lang)?.id,'EVT-000020','recurring Café session inherits the series poster');
}
Promise.all(['en','fr','fa'].map(testLang)).then(()=>console.log('PASS: one-month Events + all 3 Activities languages link exact approved posters; missing consent blocks images'))
 .catch(e=>{console.error(e);process.exitCode=1;});
