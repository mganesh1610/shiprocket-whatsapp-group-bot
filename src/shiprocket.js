const crypto = require('node:crypto');

const DEFAULT_HEADERS = {
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeHtmlEntities(value) {
  if (!value) {
    return '';
  }

  const named = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"'
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, body) => {
    if (body[0] === '#') {
      const isHex = body[1]?.toLowerCase() === 'x';
      const codePoint = Number.parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }

    return named[body.toLowerCase()] || entity;
  });
}

function cleanText(value) {
  return decodeHtmlEntities(value)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAttributes(tag) {
  const attrs = {};
  const attrRegex = /([:\w-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;

  while ((match = attrRegex.exec(tag)) !== null) {
    attrs[match[1].toLowerCase()] = decodeHtmlEntities(
      match[3] ?? match[4] ?? match[5] ?? ''
    );
  }

  return attrs;
}

function findInputValue(html, key) {
  const inputRegex = /<input\b[^>]*>/gi;
  let match;

  while ((match = inputRegex.exec(html)) !== null) {
    const attrs = parseAttributes(match[0]);
    if (attrs.id === key || attrs.name === key) {
      return attrs.value || '';
    }
  }

  return '';
}

function extractElementById(html, id) {
  const idPattern = escapeRegex(id);
  const openTagRegex = new RegExp(
    `<([a-zA-Z][\\w:-]*)\\b(?=[^>]*\\bid\\s*=\\s*["']${idPattern}["'])[^>]*>`,
    'i'
  );
  const openMatch = openTagRegex.exec(html);
  if (!openMatch) {
    return '';
  }

  const tagName = openMatch[1];
  const contentStart = openMatch.index + openMatch[0].length;
  const closeTagRegex = new RegExp(`</${escapeRegex(tagName)}>`, 'ig');
  closeTagRegex.lastIndex = contentStart;
  const closeMatch = closeTagRegex.exec(html);

  if (!closeMatch) {
    return '';
  }

  return html.slice(contentStart, closeMatch.index);
}

function parseJsString(value) {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`);
  } catch {
    return value
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
}

function parseTrackingActivities(html) {
  const activities = [];
  const activityRegex =
    /trackingActivities\.push\(\s*\{\s*date:\s*["']((?:\\.|[^"'])*)["']\s*,\s*activity:\s*["']((?:\\.|[^"'])*)["']\s*\}\s*\)/g;
  let match;

  while ((match = activityRegex.exec(html)) !== null) {
    activities.push({
      date: cleanText(parseJsString(match[1])),
      activity: cleanText(parseJsString(match[2]))
    });
  }

  return activities.sort((a, b) => {
    const aTime = Date.parse(a.date.replace(' ', 'T'));
    const bTime = Date.parse(b.date.replace(' ', 'T'));
    if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
      return 0;
    }
    return bTime - aTime;
  });
}

function fallbackStatus(html) {
  const statusWords = [
    'Out For Delivery',
    'In Transit',
    'Delivered',
    'Picked Successfully',
    'Pickup Scheduled',
    'Pending',
    'Cancelled',
    'Undelivered',
    'RTO Delivered',
    'RTO Initiated'
  ];

  for (const word of statusWords) {
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
    if (regex.test(html)) {
      return word;
    }
  }

  return 'Unknown';
}

function trackingCodeFromUrl(trackingUrl) {
  try {
    const url = new URL(trackingUrl);
    return url.pathname.split('/').filter(Boolean).pop() || '';
  } catch {
    return '';
  }
}

function parseTrackingHtml(html, trackingUrl) {
  const statusText = cleanText(extractElementById(html, 'shipment_status')) || fallbackStatus(html);
  const activities = parseTrackingActivities(html);
  const awb = findInputValue(html, 'awb');
  const orderId = findInputValue(html, 'order_id');
  const trackingCode = trackingCodeFromUrl(trackingUrl);

  return {
    trackingUrl,
    trackingCode,
    awb,
    orderId,
    status: statusText,
    latestActivity: activities[0] || null,
    activities,
    fetchedAt: new Date().toISOString()
  };
}

function shipmentFingerprint(shipment) {
  const payload = {
    status: shipment.status,
    latestActivity: shipment.latestActivity,
    awb: shipment.awb || shipment.trackingCode || ''
  };

  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

async function fetchShipment(trackingUrl) {
  const response = await fetch(trackingUrl, {
    headers: DEFAULT_HEADERS,
    redirect: 'follow'
  });

  if (!response.ok) {
    throw new Error(`Shiprocket returned HTTP ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return parseTrackingHtml(html, trackingUrl);
}

module.exports = {
  fetchShipment,
  parseTrackingHtml,
  shipmentFingerprint
};
