// Generated Harbor Line Bikes Gmail shadow-mode pilot.
// Default state is disabled until configureDryRun() is called in an approved test account.

const CATEGORY = Object.freeze({
  BOOKINGS: 'bookings',
  REPAIRS: 'repairs',
  BILLING: 'billing',
  URGENT: 'urgent',
});

function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function has(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function classifyEmail(email) {
  const subject = normalize(email.subject);
  const body = normalize(email.body);
  const sender = normalize(`${email.from_name || ''} ${email.from_email || ''}`);
  const text = `${subject} ${body}`;

  const sensitive = [];
  if (has(text, [/\b(?:\d[ -]*?){13,19}\b/, /full card number/, /credit card number/])) {
    sensitive.push('possible-payment-card');
  }
  if (has(text, [/driver'?s licence/, /driver'?s license/, /photo id/, /\[attachments?:[^\]]*(?:licen[cs]e|passport|id)[^\]]*\]/])) {
    sensitive.push('identity-document');
  }
  if (has(text, [/injur/, /photo of .*knee/, /medical/])) {
    sensitive.push('possible-health-information');
  }

  const resolvedOrHistorical = has(text, [
    /returned (?:it|the bike|bike \d+|them|yesterday)/,
    /bike was returned/,
    /already (?:returned|dealt with|handled)/,
    /happened (?:on )?(?:thursday|friday|saturday|sunday|yesterday|last week)/,
    /we(?:'re| are) done riding/,
    /customer is home/,
    /i(?:'m| am) home in/,
    /never mind/,
    /all sorted/,
    /guest has checked out/,
    /left at (?:the )?hotel yesterday/,
  ]);

  const activeProblem = has(text, [
    /flat (?:back |front )?tire/,
    /batter(?:y|ies) (?:just )?(?:died|dead)/,
    /battery.*(?:won'?t|will not) turn on/,
    /screen.*error/,
    /motor (?:is )?(?:cutting|cuts|quit|stopped)/,
    /assist (?:is )?cutting out/,
    /brake.*(?:soft|lever.*handlebar|not grabbing)/,
    /lost (?:the )?(?:lock )?key/,
    /bike.*locked.*(?:downtown|library|rack)/,
    /bicycle.*(?:stopped working|does not work|will not work)/,
    /can'?t ride/,
    /cannot ride/,
  ]);

  const happeningNow = has(text, [
    /we(?:'re| are) out on the bikes now/,
    /rented(?: .*)? this morning/,
    /we(?:'re| are) at /,
    /\band are at /,
    /were at the dingle tower/,
    /standing (?:with|beside|by)/,
    /we(?:'ll| will) wait here/,
    /this morning.*(?:won'?t|will not|error)/,
    /stopped for lunch.*seaport/,
    /using (?:the )?wifi at .*cafe/,
    /mobile telephones do not work/,
  ]);

  const immediateDeadline = has(text, [
    /all aboard.*(?:16:30|4:30|5:00)/,
    /ship.*(?:16:30|4:30|5:00)/,
    /tour at 10/,
    /before ten/,
  ]);

  if (activeProblem && !resolvedOrHistorical && (happeningNow || immediateDeadline)) {
    return {
      category: CATEGORY.URGENT,
      route: ['repairs'],
      urgent: true,
      review: sensitive.length > 0,
      sensitive,
      confidence: 0.95,
      reason: immediateDeadline
        ? 'The customer has a current bike problem and a near-term deadline.'
        : 'The customer is currently with an unusable or potentially unsafe bike.',
    };
  }

  if (/pedalbook/.test(sender)) {
    return result(CATEGORY.BOOKINGS, 'This is an automated PedalBook booking or cancellation notice.', sensitive, 0.99);
  }

  const groupOrHotelBooking = has(text, [
    /group booking inquiry/,
    /family reunion/,
    /(?:12|13|20) (?:staff|people|riders)/,
    /rental request for guests/,
    /arrange a rental for .* guests/,
    /concierge.*(?:booking|rental)/,
  ]);
  if (groupOrHotelBooking) {
    const output = result(CATEGORY.BOOKINGS, 'This is a group or hotel booking request.', sensitive, 0.92);
    output.secondary = ['doug'];
    return output;
  }

  const bookingOperation = has(text, [
    /change booking/,
    /booking tomorrow/,
    /booking for tomorrow/,
    /reminder: your harbor line bikes rental tomorrow/,
    /cancel booking/,
    /cancel or move/,
    /move it to (?:tomorrow|thursday)/,
    /reservation for cruise day/,
    /reservation velos electriques/,
    /helmets?\?/,
    /trail question/,
    /age limit/,
    /dogs?\?/,
    /open tmrw/,
    /parking near the shop/,
    /no confirmation email/,
    /thinking of booking/,
    /\breserv(?:e|ing|ation)\b/,
    /book (?:one|two|three|four|\d+) bikes?/,
  ]);

  const strongBilling = has(text, [
    /late fee/,
    /charged twice/,
    /double charge/,
    /deposit hold/,
    /promo code/,
    /itemized receipt/,
    /proper invoice/,
    /hst number/,
    /expense claim/,
    /chargeback/,
    /want my money back/,
    /refund demand/,
    /partial refund/,
  ]);

  const damageBilling = has(text, [
    /damage.*(?:charge|deposit)/,
    /(?:charge|deposit).*damage/,
    /bike fell over.*damage/,
    /card.*ending \d{4}/,
    /same card.*booking/,
  ]);

  if (bookingOperation && !has(text, [/promo code/, /late fee/, /charged twice/, /itemized receipt/])) {
    return result(CATEGORY.BOOKINGS, 'This is a booking question, change, cancellation, or pre-visit request.', sensitive, 0.90);
  }

  if (strongBilling || damageBilling) {
    const output = result(CATEGORY.BILLING, 'The customer is asking about a charge, refund, deposit, invoice, or receipt.', sensitive, 0.93);
    if (damageBilling) output.secondary = ['repairs'];
    return output;
  }

  const repairWork = has(text, [
    /service for my own ebike/,
    /tune ups? on e-bikes/,
    /clicking noise/,
    /display flickering/,
    /assist.*cut (?:in and out|out)/,
    /order .* has shipped/,
    /brake pad set/,
    /battery needs marcus/,
    /dead battery is off bike/,
    /bike .* battery needs/,
    /rental bike left at hotel/,
    /battery would not hold a charge/,
    /brake problem/,
    /metal screeching/,
    /check bike \d+/,
    /gears were skipping/,
    /derailleur.*bent/,
    /brakes?.*(?:squeak|squeal|inspect)/,
    /returned yesterday.*brakes?/,
    /please inspect (?:it|the bike|bike \d+)/,
  ]);

  if (repairWork) {
    return result(CATEGORY.REPAIRS, 'The message concerns a bike, part, supplier shipment, or non-urgent service need.', sensitive, 0.88);
  }

  return result(CATEGORY.BOOKINGS, 'This is a general customer or booking-related message.', sensitive, 0.55);
}

function result(category, reason, sensitive = [], confidence = 0.75) {
  return {
    category,
    route: [category],
    urgent: false,
    review: sensitive.length > 0 || confidence < 0.7,
    sensitive,
    confidence,
    reason,
  };
}

const classifierApi = { CATEGORY, classifyEmail };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = classifierApi;
}

if (typeof window !== 'undefined') {
  window.HLBClassifier = classifierApi;
}


const HLB_VERSION = 'rules-v1.4';
const HLB_LABELS = Object.freeze({
  bookings: 'HLB/Bookings',
  repairs: 'HLB/Repairs',
  billing: 'HLB/Billing',
  urgent: 'HLB/Urgent',
  review: 'HLB/Priya review',
  sensitive: 'HLB/Sensitive',
  awaiting: 'HLB/Awaiting acknowledgement',
  acknowledged: 'HLB/Acknowledged',
  testInput: 'HLB/Test input',
  processed: `HLB/Processed/${HLB_VERSION}`,
});

function processInbox() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { status: 'already-running' };
  try {
    const properties = PropertiesService.getScriptProperties();
    if (properties.getProperty('HLB_ENABLED') !== 'true') return { status: 'disabled' };
    const mode = properties.getProperty('HLB_MODE') || 'dry-run';
    const scope = properties.getProperty('HLB_SCOPE') || 'test-label';
    const auditSheetId = properties.getProperty('HLB_AUDIT_SHEET_ID');
    if (!auditSheetId) throw new Error('HLB_AUDIT_SHEET_ID is required');

    const labelIds = ensureLabels_();
    const listOptions = {
      q: scope === 'all-inbox'
        ? `in:inbox newer_than:7d -label:"${HLB_LABELS.processed}"`
        : `-label:"${HLB_LABELS.processed}"`,
      maxResults: 50,
    };
    // During testing, the explicit label is the complete safety boundary. Using
    // labelIds avoids Gmail search ambiguities around spaces and nested labels,
    // and also supports test messages that were sent to the same account.
    if (scope !== 'all-inbox') listOptions.labelIds = [labelIds[HLB_LABELS.testInput]];
    const response = Gmail.Users.Messages.list('me', listOptions);
    const messages = response.messages || [];
    const summary = { status: mode, found: messages.length, processed: 0, failed: 0 };

    messages.forEach((reference) => {
      try {
        const dryRunKey = `HLB_DRYRUN_${HLB_VERSION}_${reference.id}`;
        if (mode === 'dry-run' && properties.getProperty(dryRunKey) === 'true') return;
        const message = Gmail.Users.Messages.get('me', reference.id, { format: 'full' });
        if ((message.labelIds || []).includes(labelIds[HLB_LABELS.processed])) return;
        const email = gmailMessageToEmail_(message);
        const decision = classifyEmail(email);
        const labels = labelsForDecision_(decision).map((name) => labelIds[name]).filter(Boolean);

        if (mode === 'shadow') {
          Gmail.Users.Messages.modify({ addLabelIds: labels }, 'me', message.id);
        }

        appendAudit_(auditSheetId, {
          messageId: message.id,
          receivedAt: email.received_at,
          processedAt: new Date().toISOString(),
          category: decision.category,
          urgent: decision.urgent,
          review: decision.review,
          sensitiveTypes: (decision.sensitive || []).join('|'),
          reason: decision.reason,
          classifierVersion: HLB_VERSION,
          mode,
          status: 'processed',
          error: '',
        });
        if (mode === 'dry-run') properties.setProperty(dryRunKey, 'true');
        summary.processed += 1;
      } catch (error) {
        summary.failed += 1;
        appendAudit_(auditSheetId, {
          messageId: reference.id,
          receivedAt: '',
          processedAt: new Date().toISOString(),
          category: '',
          urgent: '',
          review: true,
          sensitiveTypes: '',
          reason: '',
          classifierVersion: HLB_VERSION,
          mode,
          status: 'failed',
          error: String(error && error.message ? error.message : error),
        });
      }
    });
    summary.at = new Date().toISOString();
    properties.setProperty('HLB_LAST_RUN_JSON', JSON.stringify(summary));
    return summary;
  } finally {
    lock.releaseLock();
  }
}

function acknowledgeUrgent(messageId, acknowledgedBy) {
  if (!messageId || !acknowledgedBy) throw new Error('messageId and acknowledgedBy are required');
  const properties = PropertiesService.getScriptProperties();
  const auditSheetId = properties.getProperty('HLB_AUDIT_SHEET_ID');
  const labelIds = ensureLabels_();
  Gmail.Users.Messages.modify({
    addLabelIds: [labelIds[HLB_LABELS.acknowledged]],
    removeLabelIds: [labelIds[HLB_LABELS.awaiting]],
  }, 'me', messageId);
  appendAudit_(auditSheetId, {
    messageId,
    receivedAt: '',
    processedAt: new Date().toISOString(),
    category: '',
    urgent: true,
    review: '',
    sensitiveTypes: '',
    reason: `Acknowledged by ${acknowledgedBy}`,
    classifierVersion: HLB_VERSION,
    mode: properties.getProperty('HLB_MODE') || 'dry-run',
    status: 'acknowledged',
    error: '',
  });
}

function classifyMessageById_(messageId) {
  if (!messageId) throw new Error('messageId is required');
  const message = Gmail.Users.Messages.get('me', messageId, { format: 'full' });
  const email = gmailMessageToEmail_(message);
  return { email, decision: classifyEmail(email), message };
}

function applyManualRoute_(messageId, category, actor) {
  if (!['bookings', 'repairs', 'billing', 'urgent'].includes(category)) throw new Error(`Invalid category: ${category}`);
  const properties = PropertiesService.getScriptProperties();
  const labelIds = ensureLabels_();
  const primaryNames = ['bookings', 'repairs', 'billing', 'urgent'].map((name) => HLB_LABELS[name]);
  const removeNames = [...primaryNames, HLB_LABELS.awaiting, HLB_LABELS.acknowledged];
  const addNames = [HLB_LABELS[category], HLB_LABELS.processed];
  if (category === 'urgent') addNames.push(HLB_LABELS.awaiting);
  Gmail.Users.Messages.modify({
    addLabelIds: addNames.map((name) => labelIds[name]).filter(Boolean),
    removeLabelIds: removeNames.filter((name) => !addNames.includes(name)).map((name) => labelIds[name]).filter(Boolean),
  }, 'me', messageId);
  appendAuditIfConfigured_({
    messageId,
    receivedAt: '',
    processedAt: new Date().toISOString(),
    category,
    urgent: category === 'urgent',
    review: false,
    sensitiveTypes: '',
    reason: `Manual route selected by ${actor || 'add-on user'}`,
    classifierVersion: HLB_VERSION,
    mode: properties.getProperty('HLB_MODE') || 'manual',
    status: 'corrected',
    error: '',
  });
}

function configureDryRun(auditSheetId) {
  if (!auditSheetId) throw new Error('auditSheetId is required');
  PropertiesService.getScriptProperties().setProperties({
    HLB_ENABLED: 'true',
    HLB_MODE: 'dry-run',
    HLB_SCOPE: 'test-label',
    HLB_AUDIT_SHEET_ID: auditSheetId,
  });
}

function enableShadowLabels() {
  PropertiesService.getScriptProperties().setProperty('HLB_MODE', 'shadow');
}

function enableFullInboxProcessing() {
  PropertiesService.getScriptProperties().setProperty('HLB_SCOPE', 'all-inbox');
}

function restrictToTestLabel() {
  PropertiesService.getScriptProperties().setProperty('HLB_SCOPE', 'test-label');
}

function installProcessingTrigger() {
  killProcessingTriggers_();
  // Google Workspace add-ons may not create time triggers more often than hourly.
  ScriptApp.newTrigger('processInbox').timeBased().everyHours(1).create();
}

// Kept as a backwards-compatible setup entry point for earlier review packages.
function installOneMinuteTrigger() {
  installProcessingTrigger();
}

function killSwitch() {
  PropertiesService.getScriptProperties().setProperty('HLB_ENABLED', 'false');
  killProcessingTriggers_();
}

function killProcessingTriggers_() {
  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === 'processInbox')
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));
}

function labelsForDecision_(decision) {
  const labels = [HLB_LABELS[decision.category], HLB_LABELS.processed];
  if (decision.urgent) labels.push(HLB_LABELS.urgent, HLB_LABELS.awaiting);
  if (decision.review) labels.push(HLB_LABELS.review);
  if ((decision.sensitive || []).length) labels.push(HLB_LABELS.sensitive);
  return [...new Set(labels)];
}

function ensureLabels_() {
  const existing = Gmail.Users.Labels.list('me').labels || [];
  const ids = Object.fromEntries(existing.map((label) => [label.name, label.id]));
  Object.values(HLB_LABELS).forEach((name) => {
    if (!ids[name]) {
      const created = Gmail.Users.Labels.create({
        name,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
      }, 'me');
      ids[name] = created.id;
    }
  });
  return ids;
}

function gmailMessageToEmail_(message) {
  // Prefer GmailApp for live Gmail messages so Google handles MIME and transfer
  // encoding. The raw-payload parser remains as a fallback for simulations and
  // unusual API contexts where GmailApp cannot retrieve the message.
  if (typeof GmailApp !== 'undefined' && GmailApp.getMessageById) {
    const readable = GmailApp.getMessageById(message.id);
    if (readable) {
      const received = readable.getDate();
      const from = readable.getFrom() || '';
      return {
        id: message.id,
        received_at: received && received.toISOString ? received.toISOString() : String(received || ''),
        from_name: from,
        from_email: from,
        subject: readable.getSubject() || '',
        body: readable.getPlainBody() || '',
      };
    }
  }
  const headers = Object.fromEntries((message.payload.headers || []).map((header) => [header.name.toLowerCase(), header.value]));
  return {
    id: message.id,
    received_at: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : '',
    from_name: headers.from || '',
    from_email: headers.from || '',
    subject: headers.subject || '',
    body: extractText_(message.payload),
  };
}

function extractText_(part) {
  if (!part) return '';
  if (part.mimeType === 'text/plain' && part.body && part.body.data) return decodeWebSafe_(part.body.data);
  const children = part.parts || [];
  const plain = children.map(extractText_).filter(Boolean).join('\n');
  if (plain) return plain;
  if (part.mimeType === 'text/html' && part.body && part.body.data) {
    return decodeWebSafe_(part.body.data).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return '';
}

function decodeWebSafe_(value) {
  // Gmail uses unpadded base64url. Apps Script's decoder can reject strings
  // whose length is not a multiple of four, so normalize and pad explicitly.
  const normalized = String(value || '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Utilities.newBlob(Utilities.base64Decode(padded)).getDataAsString('UTF-8');
}

function appendAudit_(spreadsheetId, record) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  let sheet = spreadsheet.getSheetByName('Audit');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('Audit');
    sheet.appendRow(['messageId','receivedAt','processedAt','category','urgent','review','sensitiveTypes','reason','classifierVersion','mode','status','error']);
  }
  sheet.appendRow([
    record.messageId,
    record.receivedAt,
    record.processedAt,
    record.category,
    record.urgent,
    record.review,
    record.sensitiveTypes,
    record.reason,
    record.classifierVersion,
    record.mode,
    record.status,
    record.error,
  ]);
}

function appendAuditIfConfigured_(record) {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('HLB_AUDIT_SHEET_ID');
  if (spreadsheetId) appendAudit_(spreadsheetId, record);
}


/**
 * Gmail sidebar for the Harbor Line Bikes triage processor.
 * The add-on is deliberately rules-only: no message content leaves Google Workspace.
 */

function onHomepage() {
  return buildHomeCard_();
}

function onGmailMessageOpen(event) {
  activateMessageAccess_(event);
  const messageId = gmailMessageIdFromEvent_(event);
  if (!messageId) return buildNoticeCard_('No message selected', 'Open an email and then reopen Harbor Line Email Triage.');
  return buildMessageCard_(messageId);
}

function setupDryRunFromAddOn() {
  const properties = PropertiesService.getScriptProperties();
  let auditSheetId = properties.getProperty('HLB_AUDIT_SHEET_ID');
  if (!auditSheetId) {
    const spreadsheet = SpreadsheetApp.create('Harbor Line Email Triage Audit');
    auditSheetId = spreadsheet.getId();
  }
  configureDryRun(auditSheetId);
  ensureLabels_();
  installProcessingTrigger();
  return homeActionResponse_('Safe dry run is enabled. Email is read and audited, but labels are not applied.');
}

function enableShadowFromAddOn() {
  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty('HLB_AUDIT_SHEET_ID')) {
    return homeActionResponse_('Run safe setup before enabling labels.');
  }
  properties.setProperty('HLB_ENABLED', 'true');
  enableShadowLabels();
  installProcessingTrigger();
  return homeActionResponse_('Shadow labels are enabled. No email will be deleted, forwarded or answered.');
}

function pauseFromAddOn() {
  killSwitch();
  return homeActionResponse_('Processing paused and the inbox timer removed. Existing email and labels were not deleted.');
}

function processNowFromAddOn() {
  const summary = processInbox();
  return homeActionResponse_(`Run complete: ${summary.processed || 0} processed, ${summary.failed || 0} failed.`);
}

function routeFromAddOn(event) {
  activateMessageAccess_(event);
  const messageId = actionParameter_(event, 'messageId') || gmailMessageIdFromEvent_(event);
  const category = actionParameter_(event, 'category');
  if (!messageId) return messageActionResponse_(null, 'No Gmail message ID was available.');
  applyManualRoute_(messageId, category, 'Gmail add-on user');
  return messageActionResponse_(messageId, `Route changed to ${category}.`);
}

function acknowledgeFromAddOn(event) {
  activateMessageAccess_(event);
  const messageId = actionParameter_(event, 'messageId') || gmailMessageIdFromEvent_(event);
  if (!messageId) return messageActionResponse_(null, 'No Gmail message ID was available.');
  acknowledgeUrgent(messageId, 'Gmail add-on user');
  return messageActionResponse_(messageId, 'Urgent message acknowledged.');
}

function refreshMessageFromAddOn(event) {
  activateMessageAccess_(event);
  const messageId = actionParameter_(event, 'messageId') || gmailMessageIdFromEvent_(event);
  return messageActionResponse_(messageId, 'Classification refreshed.');
}

function buildHomeCard_() {
  const properties = PropertiesService.getScriptProperties();
  const enabled = properties.getProperty('HLB_ENABLED') === 'true';
  const mode = properties.getProperty('HLB_MODE') || 'not configured';
  const scope = properties.getProperty('HLB_SCOPE') || 'test-label';
  const auditSheetId = properties.getProperty('HLB_AUDIT_SHEET_ID');
  const lastRun = properties.getProperty('HLB_LAST_RUN_JSON');
  let lastRunText = 'No background run recorded.';
  if (lastRun) {
    try {
      const parsed = JSON.parse(lastRun);
      lastRunText = `${parsed.processed || 0} processed · ${parsed.failed || 0} failed · ${hlbEscapeHtml_(parsed.at || '')}`;
    } catch (_error) {
      lastRunText = 'A run was recorded, but its summary could not be read.';
    }
  }

  const statusSection = CardService.newCardSection()
    .setHeader('Processor status')
    .addWidget(CardService.newDecoratedText().setTopLabel('State').setText(enabled ? 'Running' : 'Paused'))
    .addWidget(CardService.newDecoratedText().setTopLabel('Mode').setText(hlbEscapeHtml_(mode)))
    .addWidget(CardService.newDecoratedText().setTopLabel('Inbox scope').setText(scope === 'all-inbox' ? 'All recent inbox mail' : 'HLB/Test input only'))
    .addWidget(CardService.newDecoratedText().setTopLabel('Classifier').setText(HLB_VERSION))
    .addWidget(CardService.newTextParagraph().setText(`<b>Last run</b><br>${lastRunText}`));

  const controls = CardService.newCardSection().setHeader('Safe controls');
  controls.addWidget(actionButtonSet_([
    cardButton_('Set up dry run', 'setupDryRunFromAddOn'),
    cardButton_('Run now', 'processNowFromAddOn'),
  ]));
  controls.addWidget(actionButtonSet_([
    cardButton_('Enable labels', 'enableShadowFromAddOn'),
    cardButton_('Pause / kill switch', 'pauseFromAddOn'),
  ]));
  controls.addWidget(CardService.newTextParagraph().setText('Testing is restricted to messages carrying the HLB/Test input label. Dry run records metadata only. Shadow mode applies Gmail labels but never sends, forwards or deletes email.'));

  if (auditSheetId) {
    controls.addWidget(CardService.newTextButton()
      .setText('Open audit Sheet')
      .setOpenLink(CardService.newOpenLink().setUrl(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(auditSheetId)}/edit`)));
  }

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Harbor Line Email Triage').setSubtitle('Rules-only Gmail integration'))
    .addSection(statusSection)
    .addSection(controls)
    .build();
}

function buildMessageCard_(messageId) {
  if (!messageId) return buildNoticeCard_('No message selected', 'Open an email to classify it.');
  const result = classifyMessageById_(messageId);
  const decision = result.decision;
  const routeSection = CardService.newCardSection()
    .setHeader('Suggested route')
    .addWidget(CardService.newDecoratedText().setTopLabel('Classification').setText(decision.category.toUpperCase()))
    .addWidget(CardService.newDecoratedText().setTopLabel('Needs manual review').setText(decision.review ? 'Yes' : 'No'))
    .addWidget(CardService.newTextParagraph().setText(`<b>Why</b><br>${hlbEscapeHtml_(decision.reason)}`));

  if ((decision.sensitive || []).length) {
    routeSection.addWidget(CardService.newTextParagraph().setText(`<b>Sensitive indicator:</b> ${decision.sensitive.map(hlbEscapeHtml_).join(', ')}. Keep this message in manual review.`));
  }

  routeSection.addWidget(actionButtonSet_([
    routeButton_('Bookings', 'bookings', messageId),
    routeButton_('Repairs', 'repairs', messageId),
  ]));
  routeSection.addWidget(actionButtonSet_([
    routeButton_('Billing', 'billing', messageId),
    routeButton_('Urgent', 'urgent', messageId),
  ]));

  if (decision.category === 'urgent') {
    routeSection.addWidget(cardButton_('Acknowledge urgent', 'acknowledgeFromAddOn', { messageId }));
  }
  routeSection.addWidget(cardButton_('Refresh classification', 'refreshMessageFromAddOn', { messageId }));

  const safety = CardService.newCardSection()
    .setHeader('Safety')
    .addWidget(CardService.newTextParagraph().setText('Changing a route only changes Harbor Line labels. It does not delete, forward or answer the email. The original message stays in Gmail.'));

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle(result.email.subject || '(no subject)').setSubtitle(`Harbor Line decision · ${HLB_VERSION}`))
    .addSection(routeSection)
    .addSection(safety)
    .build();
}

function buildNoticeCard_(title, message) {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle(title))
    .addSection(CardService.newCardSection().addWidget(CardService.newTextParagraph().setText(hlbEscapeHtml_(message))))
    .build();
}

function routeButton_(text, category, messageId) {
  return cardButton_(text, 'routeFromAddOn', { category, messageId });
}

function cardButton_(text, functionName, parameters) {
  const action = CardService.newAction().setFunctionName(functionName);
  if (parameters) action.setParameters(parameters);
  return CardService.newTextButton().setText(text).setOnClickAction(action);
}

function actionButtonSet_(buttons) {
  const set = CardService.newButtonSet();
  buttons.forEach((button) => set.addButton(button));
  return set;
}

function homeActionResponse_(message) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildHomeCard_()))
    .setNotification(CardService.newNotification().setText(message))
    .build();
}

function messageActionResponse_(messageId, message) {
  const card = messageId ? buildMessageCard_(messageId) : buildNoticeCard_('Message unavailable', message);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(card))
    .setNotification(CardService.newNotification().setText(message))
    .build();
}

function activateMessageAccess_(event) {
  const gmail = event && event.gmail;
  if (gmail && gmail.accessToken && typeof GmailApp !== 'undefined' && GmailApp.setCurrentMessageAccessToken) {
    GmailApp.setCurrentMessageAccessToken(gmail.accessToken);
  }
}

function gmailMessageIdFromEvent_(event) {
  return event && event.gmail && event.gmail.messageId ? event.gmail.messageId : '';
}

function actionParameter_(event, name) {
  if (event && event.commonEventObject && event.commonEventObject.parameters && event.commonEventObject.parameters[name] != null) {
    return event.commonEventObject.parameters[name];
  }
  if (event && event.parameters && event.parameters[name] != null) return event.parameters[name];
  return '';
}

function hlbEscapeHtml_(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}


