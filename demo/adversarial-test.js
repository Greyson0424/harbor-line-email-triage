const assert = require('node:assert/strict');
const { classifyEmail } = require('./classifier');

const cases = [
  {
    name: 'PedalBook broken-link wording is not a breakdown',
    email: { from_name: 'PedalBook', subject: 'New booking', body: 'If this link is broken, copy and paste it.' },
    category: 'bookings',
    urgent: false,
  },
  {
    name: 'Loud historical complaint is billing, not urgent',
    email: { subject: 'URGENT!!!', body: 'The bike stopped on Sunday and was already returned. I want my money back.' },
    category: 'billing',
    urgent: false,
  },
  {
    name: 'Polite cruise passenger with deadline is urgent',
    email: { subject: 'Bicycle', body: 'Our bicycle stopped working. We are using wifi at a cafe and our ship leaves at 4:30.' },
    category: 'urgent',
    urgent: true,
  },
  {
    name: 'Returned brake issue is repairs, not urgent',
    email: { subject: 'Brake problem', body: 'We returned the bike yesterday. The brake problem should be checked before the next rider.' },
    category: 'repairs',
    urgent: false,
  },
  {
    name: 'Current soft brake is urgent',
    email: { subject: 'Brake feels soft', body: 'We are at the waterfront and the front brake is soft and not grabbing.' },
    category: 'urgent',
    urgent: true,
  },
  {
    name: 'Unknown request falls back to manual review',
    email: { subject: 'Sunglasses', body: 'I left my sunglasses in the basket. Have they been found?' },
    category: 'bookings',
    urgent: false,
    review: true,
  },
  {
    name: 'Payment-card content is sensitive',
    email: { subject: 'Damage charge', body: 'Please use my credit card number 4111 1111 1111 1111 for the damage charge.' },
    category: 'billing',
    urgent: false,
    sensitive: 'possible-payment-card',
  },
  {
    name: 'Omitted repeated pronoun still indicates a current breakdown',
    email: { subject: 'flat tire', body: 'We rented this morning and are at Point Pleasant Park. We cannot ride it.' },
    category: 'urgent',
    urgent: true,
  },
  {
    name: 'Live-test reservation wording is a confident booking',
    email: { subject: 'Saturday morning', body: 'Hi, could I reserve two bikes this Saturday at 10 AM for three hours?' },
    category: 'bookings',
    urgent: false,
    review: false,
  },
  {
    name: 'Live-test returned squeaking brake is a repair',
    email: { subject: 'Bike 14', body: 'Bike 14 was returned yesterday and the brakes are squeaking. Please inspect it before the next rental.' },
    category: 'repairs',
    urgent: false,
    review: false,
  },
];

for (const testCase of cases) {
  const result = classifyEmail(testCase.email);
  assert.equal(result.category, testCase.category, testCase.name);
  assert.equal(result.urgent, testCase.urgent, testCase.name);
  if ('review' in testCase) assert.equal(result.review, testCase.review, testCase.name);
  if (testCase.sensitive) assert.ok(result.sensitive.includes(testCase.sensitive), testCase.name);
}

console.log(`Adversarial regression tests passed: ${cases.length} contextual cases.`);
