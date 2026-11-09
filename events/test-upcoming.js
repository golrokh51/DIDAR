'use strict';
// node events/test-upcoming.js
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const d=require('./events-data.js');
const base={status:'scheduled',website_status:'published',review_status:'approved',event_year:'2026',title_en:'Test'};
const rows=[
  {...base,event_uid:'EVT-000020',event_date:'2026-10-26',title_en:'Digital Café',recurrence_frequency:'weekly',event_end_time:'19:00'},
  {...base,event_uid:'EVT-000030',event_date:'2026-11-12',title_en:'Workshop Thursday'},
  {...base,event_uid:'EVT-000031',event_date:'2026-12-16',status:'planned',title_en:'Workshop December'},
  {...base,event_uid:'EVT-000032',event_date:'2026-11-10',website_status:'private',title_en:'Private'},
  {...base,event_uid:'EVT-000033',event_date:'2026-11-11',review_status:'needs_review',title_en:'Not approved'},
  {...base,event_uid:'EVT-000034',event_date:'2026-11-08',status:'completed',title_en:'Previous event'},
];
const fields=Object.keys(rows.reduce((a,v)=>Object.assign(a,v),{}));
const q=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const csv=[fields.join(','),...rows.map(r=>fields.map(k=>q(r[k])).join(','))].join('\n');
const parsed=d.fromCSV(csv);
assert.equal(parsed.length,4,'unpublished/unapproved records stay hidden');
function schedule(day,time) {
  const summary=d.summarizeRecurringEvents(parsed,day,time);
  return summary.filter(e=>d.eventBucket(e,day)==='upcoming')
    .sort((a,b)=>(a.isRecurringSeries?a.nextOccurrence:a.date).localeCompare(b.isRecurringSeries?b.nextOccurrence:b.date));
}
const before=schedule('2026-11-09','18:59');
assert.deepEqual(before.map(e=>e.id),['EVT-000020','EVT-000030','EVT-000031']);
assert.equal(before[0].nextOccurrence,'2026-11-09');
const after=schedule('2026-11-09','19:00');
assert.deepEqual(after.map(e=>e.id),['EVT-000030','EVT-000020','EVT-000031'], 'next Digital Café is November 16, after Thursday event');
assert.equal(after[1].nextOccurrence,'2026-11-16');
assert.equal(after.filter(e=>e.id==='EVT-000020').length,1,'weekly Café appears once');
assert.equal(schedule('2026-11-16','18:59').find(e=>e.id==='EVT-000020').nextOccurrence,'2026-11-16');
assert.equal(schedule('2026-11-16','19:00').find(e=>e.id==='EVT-000020').nextOccurrence,'2026-11-23');
const noEnd={...parsed[0],endTime:''};
assert.equal(d.nextSeriesOccurrence(noEnd,'2026-11-09','23:59'),'2026-11-09','no guessed end time');
const finite={...parsed[0],recurrence:{...parsed[0].recurrence,until:'2026-11-09'}};
assert.equal(d.nextSeriesOccurrence(finite,'2026-11-09','19:00'),'','ended recurring series should archive');
const frontend=fs.readFileSync(path.join(__dirname,'events.js'),'utf8');
assert.ok(frontend.includes('`${c.nextSession}: ${formatDate(ev.nextOccurrence)}`'), 'upcoming card must show next session date');
assert.ok(frontend.includes('summarizeRecurringEvents((await withCollaborators(await getEvents())).filter(isPublicEvent),todayToronto(),timeToronto())'), 'use local Toronto time');
console.log('PASS: one Café card, next session rolls forward at 19:00 Toronto time, chronological order includes other scheduled events; unpublished entries stay hidden');
