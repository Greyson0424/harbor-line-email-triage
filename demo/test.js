const assert = require('assert');
const { evaluate, parseCsv } = require('./evaluate');

const parsed = parseCsv('id,category,note\r\nE01,bookings,"hello, world"\r\n');
assert.deepStrictEqual(parsed, [{ id: 'E01', category: 'bookings', note: 'hello, world' }]);

const report = evaluate();
assert.strictEqual(report.summary.processed, 50, 'All 50 sample emails must be processed');
assert.strictEqual(report.results.length, 50, 'A result is required for every sample email');
assert.strictEqual(report.summary.urgentExpected, 6, 'Priya labelled six samples urgent');
assert.strictEqual(Object.values(report.matrix).flatMap(Object.values).reduce((sum, value) => sum + value, 0), 50);
assert.ok(report.results.every((item) => item.reason && item.predicted), 'Every prediction must have a category and reason');

console.log('All demo tests passed.');
