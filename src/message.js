function formatActivity(activity) {
  if (!activity) {
    return 'No timeline activity found yet.';
  }

  return `${activity.date} - ${activity.activity}`;
}

function formatShipmentUpdate(shipment, previousState = null, options = {}) {
  const lines = [];
  lines.push(options.initial ? 'Shipment status snapshot' : 'Shipment update');
  lines.push(`Status: ${shipment.status}`);

  if (shipment.awb) {
    lines.push(`AWB: ${shipment.awb}`);
  } else if (shipment.trackingCode) {
    lines.push(`Tracking: ${shipment.trackingCode}`);
  }

  lines.push(`Latest: ${formatActivity(shipment.latestActivity)}`);

  if (previousState?.shipment?.latestActivity) {
    lines.push(`Previous latest: ${formatActivity(previousState.shipment.latestActivity)}`);
  }

  lines.push(`Track: ${shipment.trackingUrl}`);
  return lines.join('\n');
}

module.exports = {
  formatShipmentUpdate
};
