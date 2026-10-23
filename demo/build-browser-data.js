const fs = require('fs');
const path = require('path');
const { parseCsv } = require('./evaluate');

const dataDir = path.join(__dirname, 'data');
const emails = JSON.parse(fs.readFileSync(path.join(dataDir, 'sample-emails.json'), 'utf8'));
const labels = parseCsv(fs.readFileSync(path.join(dataDir, 'sample-email-labels.csv'), 'utf8'));
const output = `window.HLB_SAMPLE_DATA = ${JSON.stringify({ emails, labels })};\n`;

fs.writeFileSync(path.join(__dirname, 'browser-data.js'), output);
console.log(`Built browser data for ${emails.length} sample emails.`);
