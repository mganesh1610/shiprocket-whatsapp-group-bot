const assert = require('node:assert/strict');
const test = require('node:test');

const { containsTerminalPhrase, isTerminalShipment } = require('../src/terminalStatus');

test('detects delivered terminal shipment states', () => {
  const terminalStatuses = ['delivered', 'delivery completed', 'rto delivered'];

  assert.equal(containsTerminalPhrase('Delivered', terminalStatuses), true);
  assert.equal(containsTerminalPhrase('Delivery completed successfully', terminalStatuses), true);
  assert.equal(
    isTerminalShipment(
      {
        status: 'In Transit',
        latestActivity: { activity: 'Item Delivered at doorstep' }
      },
      terminalStatuses
    ),
    true
  );
});

test('does not treat undelivered as delivered', () => {
  const terminalStatuses = ['delivered', 'delivery completed', 'rto delivered'];

  assert.equal(containsTerminalPhrase('Undelivered', terminalStatuses), false);
  assert.equal(
    isTerminalShipment(
      {
        status: 'Undelivered',
        latestActivity: { activity: 'Delivery attempt failed' }
      },
      terminalStatuses
    ),
    false
  );
});
