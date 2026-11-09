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
console.log('PASS: multilingual shared posters, language-only posters, multiple posters, photo-only fallback, media permissions, recurrence, and publication rules');
