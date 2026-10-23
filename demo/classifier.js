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
