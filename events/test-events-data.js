'use strict';
const assert = require('node:assert/strict');
const d = require('./events-data.js');
const photo1='https://drive.google.com/file/d/12345678901234567890/view';
const photo2='https://drive.google.com/file/d/ABCDEFGHIJabcdefghij/view';
const photo3='https://drive.google.com/file/d/XYZXYZXYZXYZXYZXYZXYZXYZ/view';
const base={status:'planned',website_status:'published',review_status:'approved',
  event_year:'2026',title_en:'Test',event_date:'2026-11-05'};
const rows=[
  {...base,event_uid:'EVT-000100',poster_image:photo1,gallery_image_urls:`${photo2}|${photo3}`,photo_rights_approved:'yes',photo_consent_approved:'no_people',recurrence_frequency:'weekly',recurrence_until:'2026-11-26'},
  {...base,event_uid:'EVT-000101',gallery_image_urls:`${photo2}|${photo3}`,photo_rights_approved:'yes',photo_consent_approved:'no_people',recurrence_dates:'2026-12-12|2027-01-22'},
  {...base,event_uid:'EVT-000102',poster_image:photo1,photo_rights_approved:'',photo_consent_approved:'yes'},
  {...base,event_uid:'EVT-000103',website_status:'private'},
  {...base,event_uid:'EVT-000104',recurrence_frequency:'biweekly',recurrence_count:'3',recurrence_exclude_dates:'2026-11-19'},
  {...base,event_uid:'EVT-000105',poster_image_fr:'EVT-000105-poster-fr',poster_image_fa:'EVT-000105-poster-fa.jpg',gallery_image_ids:'EVT-000105-photo-01|EVT-000105-photo-02',photo_rights_approved:'yes',photo_consent_approved:'no_people'},
  {...base,event_uid:'EVT-000106',poster_image_fr:'EVT-000666-poster-fr',gallery_image_ids:'EVT-000106-photo-01',photo_rights_approved:'yes',photo_consent_approved:'yes'},
  {...base,event_uid:'EVT-000107',poster_image:'EVT-000107-poster',poster_image_fr:'EVT-000107-poster-fr|EVT-000107-poster-fr-02',photo_rights_approved:'yes',photo_consent_approved:'no_people'},
  {...base,event_uid:'EVT-000108',poster_image:'EVT-000108-poster-fa',gallery_image_ids:'EVT-000108-photo-01',photo_rights_approved:'yes',photo_consent_approved:'yes'},
  {...base,event_uid:'EVT-000109',poster_image_fr:'EVT-000109-poster-fr',photo_rights_approved:'yes',photo_consent_approved:'no_people'},
  {...base,event_uid:'EVT-000110',poster_image_en:'EVT-000110-poster',photo_rights_approved:'yes',photo_consent_approved:'no_people'},
  {...base,event_uid:'EVT-000020',event_date:'2026-10-26',event_year:'2026',status:'scheduled', poster_image:'EVT-000020-poster-1.png|EVT-000020-poster-2.png', photo_rights_approved:'yes',photo_consent_approved:'yes',recurrence_frequency:'weekly'},
];
const fields = Object.keys(rows.reduce((acc,r)=>Object.assign(acc,r),{}));
const escape = v=>`"${String(v??'').replaceAll('"','""')}"`;
const csv = [fields.join(','),...rows.map(r=>fields.map(k=>escape(r[k])).join(','))].join('\r\n');
const events=d.fromCSV(csv);
assert.equal(events.length,11,'private rows should be excluded');
const cafe = events.find(e=>e.id==='EVT-000020');
assert.equal(cafe.posterCollections.all.length,2,'single-digit numbered shared posters supported');
assert.equal(d.posterForLanguage(cafe,'en').src,'assets/event-photos/EVT-000020/EVT-000020-poster-1.png');
assert.equal(d.posterForLanguage(cafe,'fr').src,'assets/event-photos/EVT-000020/EVT-000020-poster-1.png');
assert.equal(d.posterForLanguage(cafe,'fa').src,'assets/event-photos/EVT-000020/EVT-000020-poster-1.png');
assert.ok(events[0].posterImage,'generic Drive poster parsed');
assert.equal(events[0].images.length,2,'gallery photos retained separately from poster');
assert.equal(events[1].posterImage,null);
assert.equal(events[1].featuredImage.src,d.imageSource(photo2).src,'photo-only uses first photo as cover');
assert.equal(events[2].featuredImage,null,'photos remain hidden without approvals');
assert.equal(events[3].recurrence.frequency,'biweekly');
assert.equal(events[4].posterImages.fr.src,'assets/event-photos/EVT-000105/EVT-000105-poster-fr.webp');
assert.equal(events[4].posterImages.fa.src,'assets/event-photos/EVT-000105/EVT-000105-poster-fa.jpg');
assert.equal(events[4].galleryPhotos.length,2);
assert.equal(events[4].galleryPhotos[0].src,'assets/event-photos/EVT-000105/EVT-000105-photo-01.webp');
assert.equal(events[5].posterImage,null,'foreign event ID cannot be used as poster');
assert.equal(events[5].featuredImage.src,'assets/event-photos/EVT-000106/EVT-000106-photo-01.webp');
assert.equal(d.posterForLanguage(events[4],'fr').src,'assets/event-photos/EVT-000105/EVT-000105-poster-fr.webp');
assert.equal(d.posterForLanguage(events[4],'en'),null,'one-language poster must never fall back to another language');
assert.equal(d.coverForLanguage(events[4],'en').src,'assets/event-photos/EVT-000105/EVT-000105-photo-01.webp','use photos in languages without a poster');
assert.equal(d.posterForLanguage(events[6],'fr').src,'assets/event-photos/EVT-000107/EVT-000107-poster-fr.webp','prefer French-specific over multilingual');
assert.equal(d.posterForLanguage(events[6],'en').src,'assets/event-photos/EVT-000107/EVT-000107-poster.webp','English uses generic multilingual');
assert.equal(d.posterForLanguage(events[6],'fa').src,'assets/event-photos/EVT-000107/EVT-000107-poster.webp','Persian uses generic multilingual');
assert.equal(events[6].posterCollections.fr.length,2,'multiple French posters can be listed with pipes');
assert.equal(events[6].posterCollections.all.length,1);
assert.equal(d.posterForLanguage(events[7],'fa').src,'assets/event-photos/EVT-000108/EVT-000108-poster-fa.webp','language suffix controls even in generic column');
assert.equal(d.posterForLanguage(events[7],'fr'),null,'never reinterpret -fa as universal');
assert.equal(d.coverForLanguage(events[7],'fr').src,'assets/event-photos/EVT-000108/EVT-000108-photo-01.webp');
assert.equal(d.posterForLanguage(events[8],'en'),null,'only-French poster has no English fallback');
assert.equal(d.coverForLanguage(events[8],'en'),null,'only-French poster with no photos renders text-only');
assert.equal(d.posterForLanguage(events[9],'fr').src,'assets/event-photos/EVT-000110/EVT-000110-poster.webp','no-suffix poster acts as universal even in language-specific column');
assert.equal(d.posterLocale('EVT-000110-poster-01.webp'),'all');
assert.equal(d.posterLocale('EVT-000110-poster-en-02.webp'),'en');
assert.equal(d.posterLocale('EVT-000020-poster-1.png'),'all');
assert.equal(d.posterLocale('EVT-000020-poster-2.png'),'all');
const expanded=d.expandRecurrences(events,'2026-11-08');
const select=id=>expanded.filter(e=>e.sourceEventId===id);
assert.deepEqual(select('EVT-000100').map(e=>e.date),['2026-11-05','2026-11-12','2026-11-19','2026-11-26']);
assert.deepEqual(select('EVT-000101').map(e=>e.date),['2026-11-05','2026-12-12','2027-01-22']);
assert.deepEqual(select('EVT-000104').map(e=>e.date),['2026-11-05','2026-12-03']);
assert.equal(d.eventBucket(select('EVT-000100')[0],'2026-11-08'),'past');
assert.equal(d.eventBucket(select('EVT-000100')[1],'2026-11-08'),'upcoming');
assert.equal(d.eventBucket({date:'2026-11-06',endDate:'2026-11-10',status:'planned'},'2026-11-08'),'upcoming');
assert.equal(d.eventBucket({date:'2026-11-05',status:'planned'},'2026-11-08'),'past');
assert.equal(d.eventBucket({date:'2026-11-21',status:'completed'},'2026-11-08'),'hidden');
const month=d.expandRecurrences([{id:'EVT-000105',date:'2027-01-31',status:'planned',recurrence:{frequency:'monthly',count:3,until:'',dates:[],exclusions:[]}}],'2027-02-01');
assert.deepEqual(month.map(e=>e.date),['2027-01-31','2027-02-28','2027-03-31']);
const weekly=d.expandRecurrences([{id:'EVT-000106',date:'2026-11-08',status:'planned',recurrence:{frequency:'weekly',count:0,until:'',dates:[],exclusions:[]}}],'2026-11-08');
assert.equal(weekly.at(-1).date,'2028-05-07','open-ended series shows next 18 months');
assert.ok(weekly.length>75);

// New public collaborator registry (one organization per row, per-event roles).
const partnerRows=[
  {collaborator_id:'COL-000001',name_en:'Organization One',name_fr:'Organisme Un',name_fa:'سازمان یک',website_url:'https://example.org',logo_image:'COL-000001-logo.png',logo_rights_approved:'yes',website_status:'published',review_status:'approved'},
  {collaborator_id:'COL-000002',name_en:'Organization Two',name_fr:'Organisme Deux',name_fa:'سازمان دو',website_url:'https://second.example.org',logo_image:'COL-000002-logo.svg',logo_rights_approved:'yes',website_status:'published',review_status:'approved'},
  {collaborator_id:'COL-000003',name_en:'Private org',website_url:'https://private.example.org',logo_image:'COL-000003-logo.png',logo_rights_approved:'yes',website_status:'private',review_status:'approved'},
  {collaborator_id:'COL-000004',name_en:'Logo not approved',website_url:'http://example.org',logo_image:'COL-000004-logo.png',logo_rights_approved:'',website_status:'published',review_status:'approved'},
  {collaborator_id:'COL-000005',name_en:'Cross linked logo',logo_image:'COL-000001-logo.png',logo_rights_approved:'yes',website_status:'published',review_status:'approved'}
];
const partnerCols=Object.keys(partnerRows.reduce((r,v)=>Object.assign(r,v),{}));
const partnerCsv=[partnerCols.join(','),...partnerRows.map(r=>partnerCols.map(k=>escape(r[k])).join(','))].join('\r\n');
const registry=d.fromCollaboratorsCSV(partnerCsv);
assert.equal(registry.size,4,'private collaborators must be excluded');
assert.equal(registry.get('COL-000001').logo.src,'assets/collaborators/COL-000001-logo.png');
assert.equal(registry.get('COL-000002').logo.src,'assets/collaborators/COL-000002-logo.svg');
assert.equal(registry.get('COL-000004').logo,null,'unapproved logos hidden without hiding names');
assert.equal(registry.get('COL-000004').url,'','http links must not be clickable');
assert.equal(registry.get('COL-000005').logo,null,'cannot use another collaborator ID as logo');
assert.equal(d.collaboratorLogoSource('../COL-000001-logo.png','COL-000001'),null,'path traversal rejected');
assert.equal(d.collaboratorLogoSource('COL-000001-logo.png','COL-000002'),null,'logo cannot cross organizations');
assert.deepEqual(d.parseCollaboratorRefs('COL-000001:co_organizer+technical_support|COL-000002:financial_support|COL-000001:host'),[
  {id:'COL-000001',roles:['co_organizer','technical_support','host']},
  {id:'COL-000002',roles:['financial_support']}
]);
const withLegacy={id:'EVT-000017',partners:[{name:{en:'Legacy partner'}}],collaboratorRefs:d.parseCollaboratorRefs('COL-000001:co_organizer|COL-000002:financial_support')};
const merged=d.attachCollaborators([withLegacy],registry)[0];
assert.equal(merged.partners.length,2);
assert.equal(merged.partners[0].role.en,'Co-organizer');
assert.equal(merged.partners[0].role.fr,'Coorganisateur');
assert.equal(merged.partners[0].role.fa,'برگزارکنندهٔ مشترک');
assert.equal(merged.partners[1].role.fr,'Soutien financier');
const unconfigured=d.attachCollaborators([withLegacy],new Map())[0];
assert.equal(unconfigured.partners[0].name.en,'Legacy partner','fallback to legacy names when collaborator sheet absent');
const evWithRefs=d.fromCSV(csv.replace('"EVT-000100"','"EVT-000100"')); // unaffected original CSV
assert.equal(evWithRefs.length,events.length,'existing events remain unchanged');
const evRow={...base,event_uid:'EVT-000200',collaborators:'COL-000001:host|COL-000002:media_partner'};
const fields2=Object.keys(evRow);
const refCsv=[fields2.join(','),fields2.map(k=>escape(evRow[k])).join(',')].join('\r\n');
const parsedEvent=d.fromCSV(refCsv);
assert.equal(parsedEvent[0].collaboratorRefs.length,2);
assert.equal(d.attachCollaborators(parsedEvent,registry)[0].partners[1].role.en,'Media partner');
const recurring=d.expandRecurrences(d.attachCollaborators(parsedEvent,registry),'2026-11-08');
assert.equal(recurring[0].partners.length,2,'collaborators survive event expansion');

console.log('PASS: events, posters, recurrence, multilingual collaborator logos, approved registry, links and roles');
