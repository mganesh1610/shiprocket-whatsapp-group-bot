const fs = require('node:fs');
const path = require('node:path');

function loadDotEnv(filePath = path.resolve(process.cwd(), '.env')) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function boolFromEnv(name, defaultValue) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'y', 'on'].includes(raw.toLowerCase());
}

function intFromEnv(name, defaultValue) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function listFromEnv(name, defaultValue) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function loadConfig() {
  loadDotEnv();

  const trackingUrl = String(process.env.SHIPROCKET_TRACKING_URL || '').trim();
  const pollIntervalSeconds = intFromEnv('POLL_INTERVAL_SECONDS', 15 * 60);
  const mode = (process.env.BOT_MODE || 'dry-run').toLowerCase();

  if (!trackingUrl) {
    throw new Error('Set SHIPROCKET_TRACKING_URL in .env before starting the bot.');
  }

  try {
    new URL(trackingUrl);
  } catch {
    throw new Error('SHIPROCKET_TRACKING_URL must be a valid URL.');
  }

  if (!['dry-run', 'whatsapp'].includes(mode)) {
    throw new Error('BOT_MODE must be either "dry-run" or "whatsapp".');
  }

  return {
    trackingUrl,
    pollIntervalMs: pollIntervalSeconds * 1000,
    sendInitialUpdate: boolFromEnv('SEND_INITIAL_UPDATE', false),
    stopOnTerminalStatus: boolFromEnv('STOP_ON_TERMINAL_STATUS', true),
    terminalStatuses: listFromEnv('TERMINAL_STATUSES', [
      'delivered',
      'delivery completed',
      'rto delivered'
    ]),
    replyToGroupStatusRequests: boolFromEnv('REPLY_TO_GROUP_STATUS_REQUESTS', true),
    statusRequestCooldownMs: intFromEnv('STATUS_REQUEST_COOLDOWN_SECONDS', 90) * 1000,
    statusRequestPhrases: listFromEnv('STATUS_REQUEST_PHRASES', [
      'current status',
      'shipment status',
      'delivery status',
      'package status',
      'status update',
      'track package',
      'track shipment',
      'where is the package',
      'where is my package',
      'where is shipment',
      'where is the shipment'
    ]),
    mode,
    stateFile: path.resolve(process.cwd(), process.env.STATE_FILE || 'data/state.json'),
    whatsapp: {
      groupId: process.env.WHATSAPP_GROUP_ID || '',
      groupName: process.env.WHATSAPP_GROUP_NAME || '',
      authDir: path.resolve(process.cwd(), process.env.WHATSAPP_AUTH_DIR || '.wwebjs_auth'),
      headless: boolFromEnv('HEADLESS', true),
      readyTimeoutMs: intFromEnv('WHATSAPP_READY_TIMEOUT_SECONDS', 5 * 60) * 1000,
      sendAckTimeoutMs: intFromEnv('WHATSAPP_SEND_ACK_TIMEOUT_SECONDS', 90) * 1000,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || ''
    }
  };
}

module.exports = {
  loadConfig,
  loadDotEnv
};
