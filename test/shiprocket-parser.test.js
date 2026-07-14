const assert = require('node:assert/strict');
const test = require('node:test');

const { parseTrackingHtml, shipmentFingerprint } = require('../src/shiprocket');

test('parses Shiprocket status, AWB, and activities from tracking page HTML', () => {
  const html = `
    <input type="hidden" value='SF2913873994SRF' id="awb" name="awb">
    <input type="hidden" name="order_id" id="order_id" value="1410518859">
    <p class="SFProRegular" id='shipment_status'>
      <!-- undelivered -->
      <span class="status_orange">In Transit</span>
    </p>
    <script>
      var trackingActivities = [];
      trackingActivities.push({ date: "2026-07-02 16:17:51", activity: "Picked Successfully" });
      trackingActivities.push({ date: "2026-07-03 04:03:26", activity: "Item Received at dc at Mumbai DC" });
    </script>
  `;

  const shipment = parseTrackingHtml(
    html,
    'https://shiprocket.co/tracking/SRSP1234567890'
  );

  assert.equal(shipment.status, 'In Transit');
  assert.equal(shipment.awb, 'SF2913873994SRF');
  assert.equal(shipment.orderId, '1410518859');
  assert.equal(shipment.trackingCode, 'SRSP1234567890');
  assert.equal(shipment.latestActivity.date, '2026-07-03 04:03:26');
  assert.equal(shipment.latestActivity.activity, 'Item Received at dc at Mumbai DC');
  assert.match(shipmentFingerprint(shipment), /^[a-f0-9]{64}$/);
});
