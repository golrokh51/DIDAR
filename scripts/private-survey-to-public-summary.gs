/** DIDAR — PRIVATE Google Forms responses to PUBLIC aggregate-only CSV.
 * Install this script INSIDE THE PRIVATE responses spreadsheet using Extensions > Apps Script.
 * Create an entirely separate, PUBLIC-PUBLISHABLE spreadsheet containing only Summary and
 * (optionally) approved PublicCases sheets. NEVER publish the private responses spreadsheet.
 *
 * After setup, run publishCommunitySummary() once to authorize, then installCommunityTriggers().
 */
const DIDAR_SOURCE_TAB = 'Form Responses 1'; // edit if your PRIVATE response tab has a different name
const DIDAR_PUBLIC_SPREADSHEET_ID = 'PASTE_SEPARATE_PUBLIC_SPREADSHEET_ID_HERE';
const DIDAR_SUMMARY_TAB = 'Summary';

function publishCommunitySummary() {
  const privateBook = SpreadsheetApp.getActiveSpreadsheet();
  if (!privateBook) throw new Error('Run this from the private responses spreadsheet.');
  const sheet = privateBook.getSheetByName(DIDAR_SOURCE_TAB);
  if (!sheet) throw new Error('Check DIDAR_SOURCE_TAB against the private response tab name.');
  if (DIDAR_PUBLIC_SPREADSHEET_ID.indexOf('PASTE_') === 0) throw new Error('Set DIDAR_PUBLIC_SPREADSHEET_ID.');
  if (privateBook.getId() === DIDAR_PUBLIC_SPREADSHEET_ID) {
    throw new Error('Safety block: public output spreadsheet must NOT be the private responses spreadsheet.');
  }
  const data = sheet.getDataRange().getDisplayValues();
  if (!data.length || data[0].length < 29 ||
      !String(data[0][6]).includes('Do you remember what kind of support') ||
      !String(data[0][17]).includes('If someone were in a similar situation') ||
      !String(data[0][26]).includes('Do you agree to DIDAR using')) {
    throw new Error('Survey columns have changed. Review the mapping before publishing anything.');
  }
  const consenting = data.slice(1).filter(row => String(row[26]).includes('Yes, I agree'));
  const metrics = [
    ['received_emotional', 6, 'Listening, encouragement, and emotional support'],
    ['received_connections', 6, 'Connecting me with helpful people or resources'],
    ['need_emotional', 17, 'Social and emotional support'],
    ['need_career', 17, 'Employment and career guidance'],
    ['need_network', 17, 'Networking and mentorship'],
    ['need_immigration', 17, 'Immigration and administrative guidance'],
    ['need_legal', 17, 'Legal information and access to public services']
  ];
  const summary = [['metric','value'],['consenting_responses',consenting.length]];
  metrics.forEach(([name, col, choice]) => {
    summary.push([name, consenting.filter(row => String(row[col] || '').includes(choice)).length]);
  });
  summary.push(['last_updated', Utilities.formatDate(new Date(), 'America/Toronto', 'yyyy-MM-dd')]);
  // Note: No individual row, name, timestamp, story, free text or sensitive response is exported.
  const publicBook = SpreadsheetApp.openById(DIDAR_PUBLIC_SPREADSHEET_ID);
  const output = publicBook.getSheetByName(DIDAR_SUMMARY_TAB) || publicBook.insertSheet(DIDAR_SUMMARY_TAB);
  output.clearContents();
  output.getRange(1, 1, summary.length, 2).setValues(summary);
  SpreadsheetApp.flush();
}

/** Run ONCE from the Apps Script editor after confirming the correct output spreadsheet. */
function installCommunityTriggers() {
  const fn = 'publishCommunitySummary';
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === fn)
    .forEach(t => ScriptApp.deleteTrigger(t));
  const privateBook = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger(fn).forSpreadsheet(privateBook).onFormSubmit().create();
  // If you paste/add a row manually to the private response sheet, update automatically too.
  ScriptApp.newTrigger(fn).forSpreadsheet(privateBook).onEdit().create();
}
