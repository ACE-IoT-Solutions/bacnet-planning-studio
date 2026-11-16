/**
 * @OnlyCurrentDoc
 */

const QUIZ_RESULTS_SHEET_NAME = 'Quiz Results';
const QUIZ_RECEIVER_VERSION = '2026-11-16.2';
const QUIZ_RESULTS_HEADERS = Object.freeze([
  'Submitted At',
  'Session ID',
  'Email',
  'Score',
  'Total',
  'Percentage',
  'Mastered Total',
  'Started At',
  'Completed At',
  'Bank Version',
  'Question IDs',
  'Answers',
  'Incorrect IDs',
  'Source URL',
  'Pipedrive Person ID',
  'Pipedrive Status',
  'Pipedrive Error'
]);

/** Run once from the Apps Script editor while this project is bound to the results spreadsheet. */
function setupQuizResults() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Bind this Apps Script project to the Google Sheet before running setup.');
  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty('SHEET_NAME')) properties.setProperty('SHEET_NAME', QUIZ_RESULTS_SHEET_NAME);
  ensureResultsSheet_(spreadsheet);
  return `Quiz results will be stored in ${spreadsheet.getName()}.`;
}

function doGet() {
  return jsonResponse_({ ok: true, service: 'BACnet Studio quiz results', receiverVersion: QUIZ_RECEIVER_VERSION });
}

function doPost(event) {
  const requestId = Utilities.getUuid();
  let sessionId = '';
  try {
    const rawPayload = event && event.parameter && event.parameter.payload;
    if (!rawPayload || rawPayload.length > 50000) throw new Error('Missing or oversized quiz payload.');
    const payload = JSON.parse(rawPayload);
    sessionId = String(payload.sessionId || '');
    logQuizEvent_('received', { requestId, sessionId, payloadBytes: rawPayload.length });
    validateQuizPayload_(payload);

    const stored = appendQuizResult_(payload);
    if (stored.duplicate) {
      logQuizEvent_('duplicate', { requestId, sessionId, row: stored.row, sheet: stored.sheet.getName() });
      return jsonResponse_({ ok: true, duplicate: true, sessionId: payload.sessionId, requestId });
    }
    logQuizEvent_('stored', { requestId, sessionId, row: stored.row, sheet: stored.sheet.getName() });

    let pipedriveResult;
    try {
      pipedriveResult = syncPipedrive_(payload);
    } catch (error) {
      pipedriveResult = { personId: '', status: 'failed', error: String(error && error.message ? error.message : error) };
      logQuizEvent_('pipedrive_failed', { requestId, sessionId, error: pipedriveResult.error }, 'warning');
    }
    updatePipedriveResult_(stored.sheet, stored.row, pipedriveResult);
    logQuizEvent_('completed', { requestId, sessionId, pipedriveStatus: pipedriveResult.status });

    return jsonResponse_({
      ok: true,
      sessionId: payload.sessionId,
      pipedriveStatus: pipedriveResult.status,
      requestId
    });
  } catch (error) {
    const message = String(error && error.message ? error.message : error);
    logQuizEvent_('failed', { requestId, sessionId, error: message }, 'error');
    return jsonResponse_({ ok: false, error: message, requestId });
  }
}

function logQuizEvent_(eventName, details, level) {
  const entry = JSON.stringify(Object.assign({
    event: `quiz_result_${eventName}`,
    receiverVersion: QUIZ_RECEIVER_VERSION,
    timestamp: new Date().toISOString()
  }, details || {}));
  if (level === 'error') console.error(entry);
  else if (level === 'warning') console.warn(entry);
  else console.log(entry);
}

function validateQuizPayload_(payload) {
  if (!payload || payload.version !== 1) throw new Error('Unsupported quiz result version.');
  if (payload.website) throw new Error('Spam check failed.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email || '')) || payload.email.length > 254) throw new Error('Invalid email address.');
  if (!/^[A-Za-z0-9-]{8,100}$/.test(String(payload.sessionId || ''))) throw new Error('Invalid session ID.');
  if (!Array.isArray(payload.questionIds) || payload.questionIds.length !== 35) throw new Error('A quiz result must contain 35 question IDs.');
  if (!payload.answers || typeof payload.answers !== 'object') throw new Error('Missing quiz answers.');
  if (!Number.isInteger(payload.score) || payload.score < 0 || payload.score > 35) throw new Error('Invalid score.');
  if (payload.total !== 35) throw new Error('Invalid quiz total.');
  if (!payload.completedAt || Number.isNaN(new Date(payload.completedAt).getTime())) throw new Error('Invalid completion time.');
}

function appendQuizResult_(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const spreadsheet = getResultsSpreadsheet_();
    const sheet = ensureResultsSheet_(spreadsheet);
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const existing = sheet.getRange(2, 2, lastRow - 1, 1)
        .createTextFinder(payload.sessionId)
        .matchEntireCell(true)
        .findNext();
      if (existing) return { duplicate: true, sheet, row: existing.getRow() };
    }

    sheet.appendRow([
      new Date(),
      payload.sessionId,
      String(payload.email).toLowerCase(),
      payload.score,
      payload.total,
      payload.percentage,
      payload.masteredTotal,
      payload.startedAt,
      payload.completedAt,
      payload.bankVersion,
      JSON.stringify(payload.questionIds),
      JSON.stringify(payload.answers),
      JSON.stringify(payload.incorrectQuestionIds || []),
      payload.sourceUrl || '',
      '',
      'pending',
      ''
    ]);
    return { duplicate: false, sheet, row: sheet.getLastRow() };
  } finally {
    lock.releaseLock();
  }
}

function getResultsSpreadsheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('The web app must remain bound to the quiz results spreadsheet.');
  return spreadsheet;
}

function ensureResultsSheet_(spreadsheet) {
  const sheetName = PropertiesService.getScriptProperties().getProperty('SHEET_NAME') || QUIZ_RESULTS_SHEET_NAME;
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, QUIZ_RESULTS_HEADERS.length).setValues([QUIZ_RESULTS_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, QUIZ_RESULTS_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function syncPipedrive_(payload) {
  const properties = PropertiesService.getScriptProperties();
  const apiToken = properties.getProperty('PIPEDRIVE_API_TOKEN');
  const companyDomain = normalizePipedriveDomain_(properties.getProperty('PIPEDRIVE_COMPANY_DOMAIN'));
  if (!apiToken || !companyDomain) return { personId: '', status: 'not_configured', error: '' };

  const search = pipedriveRequest_(companyDomain, apiToken, '/api/v2/persons/search', 'get', null, {
    term: payload.email,
    fields: 'email',
    exact_match: 'true',
    limit: '1'
  });
  const firstResult = search.data && search.data.items && search.data.items[0];
  let personId = firstResult && (firstResult.item ? firstResult.item.id : firstResult.id);
  let status = 'matched';

  if (!personId) {
    const created = pipedriveRequest_(companyDomain, apiToken, '/api/v2/persons', 'post', {
      name: payload.email,
      emails: [{ value: payload.email, primary: true, label: 'work' }]
    });
    personId = created.data && created.data.id;
    status = 'created';
  }
  if (!personId) throw new Error('Pipedrive did not return a person ID.');

  const noteContent = [
    '<strong>BACnet Studio competency quiz</strong>',
    `Score: ${Number(payload.score)} / ${Number(payload.total)} (${Number(payload.percentage)}%)`,
    `Completed: ${escapeHtml_(payload.completedAt)}`,
    `Mastered total: ${Number(payload.masteredTotal)}`,
    `Session: ${escapeHtml_(payload.sessionId)}`,
    `Incorrect question IDs: ${escapeHtml_((payload.incorrectQuestionIds || []).join(', ') || 'None')}`
  ].join('<br>');
  pipedriveRequest_(companyDomain, apiToken, '/api/v1/notes', 'post', {
    person_id: Number(personId),
    content: noteContent
  });
  return { personId, status: `${status}_and_noted`, error: '' };
}

function pipedriveRequest_(companyDomain, apiToken, apiPath, method, payload, query) {
  const parameters = Object.assign({}, query || {}, { api_token: apiToken });
  const queryString = Object.keys(parameters)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(parameters[key])}`)
    .join('&');
  const options = {
    method,
    contentType: 'application/json',
    muteHttpExceptions: true
  };
  if (payload) options.payload = JSON.stringify(payload);
  const response = UrlFetchApp.fetch(`https://${companyDomain}.pipedrive.com${apiPath}?${queryString}`, options);
  const statusCode = response.getResponseCode();
  const responseBody = response.getContentText();
  const parsed = responseBody ? JSON.parse(responseBody) : {};
  if (statusCode < 200 || statusCode >= 300 || parsed.success === false) {
    throw new Error(`Pipedrive ${method.toUpperCase()} ${apiPath} failed (${statusCode}): ${responseBody.slice(0, 500)}`);
  }
  return parsed;
}

function normalizePipedriveDomain_(value) {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\.pipedrive\.com.*$/, '')
    .replace(/[^a-zA-Z0-9-]/g, '');
}

function updatePipedriveResult_(sheet, row, result) {
  sheet.getRange(row, 15, 1, 3).setValues([[
    result.personId || '',
    result.status || 'failed',
    result.error || ''
  ]]);
}

function escapeHtml_(value) {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function jsonResponse_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
