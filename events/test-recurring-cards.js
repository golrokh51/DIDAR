'use strict';
// node events/test-recurring-cards.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const d = require('./events-data.js');
function entry(id,date,frequency,status='scheduled',extras={}) {
  return {id,date,endDate:'',status,recurrence:{frequency,until:'',count:0,dates:[],exclusions:[],...extras}};
}
const today='2026-11-09';
const cafe=entry('EVT-000020','2026-10-26','weekly');
const nextWeek={id:'EVT-000030',date:'2026-11-16',status:'planned',recurrence:null};
const oneMonth={id:'EVT-000031',date:'2026-12-16',status:'planned',recurrence:null};
const items=d.summarizeRecurringEvents([cafe,nextWeek,oneMonth],today);
assert.equal(items.length,3, 'one recurring program must remain one card, even across 18 months');
assert.equal(items[0].id, 'EVT-000020', 'stable event ID for public detail pages');
assert.equal(items[0].nextOccurrence,'2026-11-09');
assert.deepEqual(items.map(e=>d.eventBucket(e,today)),['upcoming','upcoming','upcoming']);
const tomorrow=d.summarizeRecurringEvents([cafe],'2026-11-10');
assert.equal(tomorrow[0].nextOccurrence,'2026-11-16');
const excluded=entry('EVT-000201','2026-11-02','weekly','scheduled',{exclusions:['2026-11-09','2026-11-16']});
assert.equal(d.nextSeriesOccurrence(excluded,today),'2026-11-23');
const bounded=entry('EVT-000202','2026-11-02','weekly','scheduled',{until:'2026-11-09'});
assert.equal(d.summarizeRecurringEvents([bounded],'2026-11-10')[0].nextOccurrence,'');
assert.equal(d.eventBucket(d.summarizeRecurringEvents([bounded],'2026-11-10')[0],'2026-11-10'),'past', 'ended series appears once in archive');
const counted=entry('EVT-000203','2026-11-02','weekly','scheduled',{count:2});
assert.equal(d.nextSeriesOccurrence(counted,'2026-11-10'),'');
const biweekly=entry('EVT-000204','2026-10-26','biweekly');
assert.equal(d.nextSeriesOccurrence(biweekly,'2026-11-10'),'2026-11-23');
const monthly=entry('EVT-000205','2026-10-31','monthly');
assert.equal(d.nextSeriesOccurrence(monthly,'2026-11-09'),'2026-11-30');
const dates=entry('EVT-000206','2026-10-26','dates','scheduled',{dates:['2026-11-22','2026-12-15']});
assert.equal(d.nextSeriesOccurrence(dates,'2026-11-09'),'2026-11-22');
const completed=entry('EVT-000207','2026-10-26','weekly','completed');
assert.equal(d.eventBucket(d.summarizeRecurringEvents([completed],today)[0],today),'past');
const multiDay={...entry('EVT-000208','2026-11-02','weekly'),endDate:'2026-11-04'};
assert.equal(d.nextSeriesOccurrence(multiDay,'2026-11-10'),'2026-11-09','ongoing two-day occurrence remains visible');
const realCsv=path.join(__dirname,'../../../DIDAR_events_with_poster_ids.csv');
if (fs.existsSync(realCsv)) {
  const real=d.fromCSV(fs.readFileSync(realCsv,'utf8'));
  assert.equal(real.length,19,'18 historical events plus the one live series');
  const summarized=d.summarizeRecurringEvents(real,today);
  assert.equal(summarized.length,19,'no weekly duplicates');
  assert.equal(summarized.filter(e=>d.eventBucket(e,today)==='upcoming').length,1);
  assert.equal(summarized.filter(e=>d.eventBucket(e,today)==='past').length,18);
  const caffe=summarized.find(e=>e.id==='EVT-000020');
  assert.equal(caffe.nextOccurrence,today);
  assert.equal(caffe.posterCollections.all.length,0,'unapproved posters stay hidden until image rights/consent are completed');
}
console.log('PASS: single card per weekly/biweekly/monthly series; next session, end dates, archive, exclusions, posters, and one-time future events');
