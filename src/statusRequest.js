function normalizeRequestText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shouldReplyToStatusRequest(text, phrases) {
  const normalized = normalizeRequestText(text);
  const normalizedText = ` ${normalized} `;
  const tokens = normalized.split(' ').filter(Boolean);
  const hasStatusWord = tokens.includes('status') || tokens.includes('stauts') || tokens.includes('statsu');
  const hasRequestWord = [
    'what',
    'whats',
    'what is',
    'current',
    'now',
    'latest',
    'update',
    'track',
    'where',
    'delivery',
    'shipment',
    'package'
  ].some((word) => normalizedText.includes(` ${word} `));

  if (hasStatusWord && hasRequestWord) {
    return true;
  }

  return phrases.some((phrase) => {
    const normalizedPhrase = normalizeRequestText(phrase);
    return normalizedPhrase && normalizedText.includes(` ${normalizedPhrase} `);
  });
}

module.exports = {
  normalizeRequestText,
  shouldReplyToStatusRequest
};
