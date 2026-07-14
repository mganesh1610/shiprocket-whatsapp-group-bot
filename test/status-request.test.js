const assert = require('node:assert/strict');
const test = require('node:test');

const { shouldReplyToStatusRequest } = require('../src/statusRequest');

const phrases = [
  'current status',
  'shipment status',
  'delivery status',
  'package status',
  'status update',
  'track package'
];

test('matches group shipment status requests', () => {
  assert.equal(shouldReplyToStatusRequest('Can you send current status?', phrases), true);
  assert.equal(shouldReplyToStatusRequest("what's the current status?", phrases), true);
  assert.equal(shouldReplyToStatusRequest('whats the current stauts', phrases), true);
  assert.equal(shouldReplyToStatusRequest('latest package status?', phrases), true);
  assert.equal(shouldReplyToStatusRequest('shipment status please', phrases), true);
  assert.equal(shouldReplyToStatusRequest('Any delivery status update?', phrases), true);
  assert.equal(shouldReplyToStatusRequest('track package', phrases), true);
});

test('does not match unrelated group chatter', () => {
  assert.equal(shouldReplyToStatusRequest('hello everyone', phrases), false);
  assert.equal(shouldReplyToStatusRequest('status meeting is tomorrow', phrases), false);
  assert.equal(shouldReplyToStatusRequest('', phrases), false);
});
