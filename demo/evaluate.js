const fs = require('fs');
const path = require('path');
const { classifyEmail } = require('./classifier');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [headers, ...data] = rows;
  return data.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

function evaluate() {
  const dataDir = path.join(__dirname, 'data');
  const emails = JSON.parse(fs.readFileSync(path.join(dataDir, 'sample-emails.json'), 'utf8'));
  const labels = parseCsv(fs.readFileSync(path.join(dataDir, 'sample-email-labels.csv'), 'utf8'));
  const truth = new Map(labels.map((entry) => [entry.id, entry]));

  const results = emails.map((email) => {
    const prediction = classifyEmail(email);
    const expected = truth.get(email.id);
    return {
      id: email.id,
      subject: email.subject || '(no subject)',
      from_name: email.from_name || email.from_email || 'Unknown sender',
      body: email.body || '',
      expected: expected.category,
      predicted: prediction.category,
      correct: expected.category === prediction.category,
      expected_note: expected.note,
      ...prediction,
    };
  });

  const categories = ['bookings', 'repairs', 'billing', 'urgent'];
  const matrix = Object.fromEntries(categories.map((expected) => [expected, Object.fromEntries(categories.map((predicted) => [predicted, 0]))]));
  results.forEach((item) => { matrix[item.expected][item.predicted] += 1; });

  const correct = results.filter((item) => item.correct).length;
  const urgentTruePositive = results.filter((item) => item.expected === 'urgent' && item.predicted === 'urgent').length;
  const urgentExpected = results.filter((item) => item.expected === 'urgent').length;
  const urgentPredicted = results.filter((item) => item.predicted === 'urgent').length;
  const manualReview = results.filter((item) => item.review).length;
  const summary = {
    processed: results.length,
    correct,
    accuracy: correct / results.length,
    urgentRecall: urgentExpected ? urgentTruePositive / urgentExpected : 0,
    urgentPrecision: urgentPredicted ? urgentTruePositive / urgentPredicted : 0,
    urgentTruePositive,
    urgentExpected,
    urgentPredicted,
    manualReview,
    generatedAt: new Date().toISOString(),
  };

  return { summary, matrix, results };
}

function printReport(report) {
  const { summary, matrix, results } = report;
  console.log('Harbor Line Bikes — sample email evaluation');
  console.log(`Processed: ${summary.processed}`);
  console.log(`Agreement with Priya: ${summary.correct}/${summary.processed} (${(summary.accuracy * 100).toFixed(1)}%)`);
  console.log(`Urgent recall: ${summary.urgentTruePositive}/${summary.urgentExpected} (${(summary.urgentRecall * 100).toFixed(1)}%)`);
  console.log(`Urgent precision: ${(summary.urgentPrecision * 100).toFixed(1)}% (${summary.urgentPredicted} predicted urgent)`);
  console.log(`Manual review flags: ${summary.manualReview}`);
  console.log('\nConfusion matrix (rows = Priya, columns = prototype)');
  console.table(matrix);
  const disagreements = results.filter((item) => !item.correct);
  console.log(`\nDisagreements (${disagreements.length})`);
  disagreements.forEach((item) => console.log(`${item.id}: expected ${item.expected}, predicted ${item.predicted} — ${item.subject}`));
}

if (require.main === module) {
  const report = evaluate();
  const outputPath = path.join(__dirname, 'results.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  printReport(report);
  console.log(`\nSaved detailed results to ${outputPath}`);
}

module.exports = { evaluate, parseCsv };
