'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const data = require('./events-data.js');
function makeCsv(rows) {
  const cols = Object.keys(rows.reduce((o,row)=>Object.assign(o,row),{}));
  const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
  return cols.join(',')+'\n'+rows.map(row=>cols.map(key=>quote(row[key])).join(',')).join('\n');
}
const base = {name_en:'A collaborator',name_fr:'Un partenaire',name_fa:'همکار',logo_rights_approved:'yes',website_status:'published',review_status:'approved'};
const orgRows = [
  {...base,collaborator_id:'COL-000001',website_url:'https://example.org/',instagram_url:'https://instagram.com/example',facebook_url:'https://facebook.com/example',logo_image:'COL-000001-logo.png'},
  {...base,collaborator_id:'COL-000002',name_en:'Social only',website_url:'',facebook_url:'https://facebook.com/second',social_media_url:'https://social.example.net/profile',logo_image:'COL-000002-logo.svg'},
  {...base,collaborator_id:'COL-000003',website_url:'javascript:alert(1)',instagram_url:'http://instagram.com/unsafe',youtube_url:'https://youtube.com/@valid',logo_image:'COL-000003-logo.png'},
  {...base,collaborator_id:'COL-000004',name_en:'Unpublished',website_status:'private',website_url:'https://private.example.org'},
  {...base,collaborator_id:'COL-000005',website_url:'https://example.org/',instagram_url:'https://example.org/',tiktok_url:'https://tiktok.com/@ok'}
];
const registry = data.fromCollaboratorsCSV(makeCsv(orgRows));
assert.equal(registry.size,4,'private organizations excluded');
assert.deepEqual(registry.get('COL-000001').links.map(x=>x.type),['website','instagram','facebook']);
assert.equal(registry.get('COL-000001').url,'https://example.org/','website is primary link');
assert.equal(registry.get('COL-000002').url,'https://facebook.com/second','social-only organization uses social as primary link');
assert.deepEqual(registry.get('COL-000003').links.map(x=>x.type),['youtube'],'reject javascript and http links');
assert.deepEqual(registry.get('COL-000005').links.map(x=>x.type),['website','tiktok'],'avoid duplicate links');
const event = {id:'EVT-000017',collaboratorRefs:data.parseCollaboratorRefs('COL-000001:co_organizer|COL-000002:financial_support'),partners:[]};
const attached = data.attachCollaborators([event],registry)[0];
assert.equal(attached.partners.length,2);
assert.equal(attached.partners[0].role.fr,'Coorganisateur');
assert.equal(attached.partners[1].role.fa,'حمایت مالی');
assert.equal(attached.partners[1].links[0].type,'facebook');

// Browser-ish integration test: render an actual event detail and confirm
// each partner's name, logo and separate channel links point to the right URL.
class El {
  constructor(tag='div') {this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.style={};this.value='';this.textContent='';this.hidden=false;this.childElementCount=0;}
  append(...nodes){this.children.push(...nodes);this.childElementCount=this.children.length;}
  appendChild(node){this.append(node);return node;}
  replaceChildren(...nodes){this.children=[...nodes];this.childElementCount=this.children.length;}
  addEventListener(){}
  setAttribute(k,v){this.attributes[k]=v;}
  remove(){this.isRemoved=true;}
  querySelectorAll(){return [];}
}
const tabs = ['upcoming','past'].map(v=>{const e=new El('button');e.dataset.eventsTab=v;return e;});
const controls = {
  '#events-list':new El(), '#event-detail':new El(), '#events-filters':new El(),
  '#events-category':new El('select'),'#events-year':new El('select'),
  '#events-count':new El(), '#events-empty':new El()
};
const root = new El('main');
root.dataset={lang:'fr',siteRoot:'../',feedUrl:'../events/events-feed.json'};
root.querySelector=s=>controls[s];
root.querySelectorAll=s=>s==='[data-events-tab]'?tabs:[];
const doc={
  querySelector:s=>s==='[data-didar-events]'?root:null,
  createElement:t=>new El(t),addEventListener(){},title:''
};
const win={DIDAREventsData:data,location:{search:'?event=EVT-000017',pathname:'/events/'},history:{replaceState(){}}};
const response=(v)=>({ok:true,json:async()=>v,text:async()=>v});
const collabCSV=makeCsv(orgRows);
const eventCSV=makeCsv([{event_uid:'EVT-000017',event_year:'2026',event_date:'2026-10-11',status:'completed',website_status:'published',review_status:'approved',title_en:'Dialogue',title_fr:'Dialogue',title_fa:'گفتگو',collaborators:'COL-000001:co_organizer|COL-000002:financial_support'}]);
const fetch=async url=>{
  if(url==='../config/events-source.json')return response({mode:'google_sheets_csv',google_sheets_csv_url:'https://docs.google.com/spreadsheets/d/TEST/export?format=csv'});
  if(url==='../config/collaborators-source.json')return response({mode:'google_sheets_csv',google_sheets_csv_url:'https://docs.google.com/spreadsheets/d/ORG/export?format=csv'});
  if(url.includes('/TEST/export'))return response(eventCSV);
  if(url.includes('/ORG/export'))return response(collabCSV);
  throw Error('Unexpected fetch: '+url);
};
const context={window:win,document:doc,fetch,console,Date,Intl,URL,URLSearchParams,Option:class extends El {constructor(text,value){super('option');this.textContent=text;this.value=value;}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'events.js'),'utf8'),context,{filename:'events.js'});
const visit = (element, cb) => {cb(element);for(const child of element.children||[])visit(child,cb);};
setImmediate(()=>{
  const collaborators=[];visit(controls['#event-detail'],el=>{if(el.className==='event-collaborator')collaborators.push(el);});
  assert.equal(collaborators.length,2,'two collaborator cards render');
  const anchors=(el)=>{const links=[];visit(el,x=>{if(x.tagName==='A')links.push(x);});return links;};
  let found=anchors(collaborators[0]);
  assert(found.some(x=>x.className==='event-collaborator-logo-link' && x.href==='https://example.org/'),'logo opens main website');
  assert(found.some(x=>x.textContent==='Un partenaire' && x.href==='https://example.org/'),'name opens website');
  assert(found.some(x=>x.textContent==='Instagram' && x.href==='https://instagram.com/example'),'instagram listed');
  assert(found.some(x=>x.textContent==='Facebook' && x.href==='https://facebook.com/example'),'facebook listed');
  found=anchors(collaborators[1]);
  assert(found.some(x=>x.className==='event-collaborator-logo-link' && x.href==='https://facebook.com/second'),'social-only logo opens Facebook');
  assert(found.some(x=>x.textContent==='Un partenaire' && x.href==='https://facebook.com/second'),'social-only name opens Facebook');
  assert(found.every(x=>x.rel==='noopener noreferrer'),'external links use safe rel');
  console.log('PASS: collaborator social links, logo/name navigation, multiple roles, HTTPS validation and 2-card DOM rendering');
});
