function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsTerminalPhrase(value, terminalStatuses) {
  const normalizedValue = ` ${normalizeText(value)} `;

  return terminalStatuses.some((status) => {
    const normalizedStatus = normalizeText(status);
    if (!normalizedStatus) {
      return false;
    }

    return normalizedValue.includes(` ${normalizedStatus} `);
  });
}

function isTerminalShipment(shipment, terminalStatuses) {
  return (
    containsTerminalPhrase(shipment.status, terminalStatuses) ||
    containsTerminalPhrase(shipment.latestActivity?.activity, terminalStatuses)
  );
}

module.exports = {
  containsTerminalPhrase,
  isTerminalShipment,
  normalizeText
};
