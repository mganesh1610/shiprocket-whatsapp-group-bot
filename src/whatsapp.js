const fs = require('node:fs');

function detectBrowserExecutable() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium'
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || '';
}

class DryRunNotifier {
  async start() {
    console.log('[dry-run] WhatsApp delivery is disabled.');
  }

  async onStatusRequest() {}

  async send(message) {
    console.log('[dry-run] Message that would be sent:');
    console.log(message);
  }

  async stop() {}
}

class WhatsappGroupNotifier {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.chat = null;
  }

  async start() {
    const { Client, LocalAuth } = require('whatsapp-web.js');
    const qrcode = require('qrcode-terminal');
    const executablePath = this.config.executablePath || detectBrowserExecutable();

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: this.config.authDir
      }),
      puppeteer: {
        headless: this.config.headless,
        executablePath: executablePath || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-gpu'
        ]
      }
    });

    this.client.on('qr', (qr) => {
      console.log('Scan this QR code with WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('authenticated', () => {
      console.log('WhatsApp authenticated.');
    });

    this.client.on('ready', () => {
      console.log('WhatsApp client is ready.');
    });

    this.client.on('auth_failure', (message) => {
      console.error('WhatsApp authentication failed:', message);
    });

    await new Promise((resolve, reject) => {
      let settled = false;
      const settle = (callback, value) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        callback(value);
      };
      const timeout = setTimeout(() => {
        this.stop().catch(() => {});
        settle(
          reject,
          new Error(
            `Timed out waiting ${Math.round(
              this.config.readyTimeoutMs / 1000
            )} seconds for WhatsApp client to become ready.`
          )
        );
      }, this.config.readyTimeoutMs);

      this.client.once('ready', () => {
        settle(resolve);
      });

      this.client.once('auth_failure', (message) => {
        settle(reject, new Error(`WhatsApp authentication failed: ${message}`));
      });

      this.client.initialize().catch((error) => {
        settle(reject, error);
      });
    });
  }

  async resolveChat() {
    if (this.chat) {
      return this.chat;
    }

    if (this.config.groupId) {
      this.chat = await this.client.getChatById(this.config.groupId);
      if (!this.chat.isGroup) {
        throw new Error(`WHATSAPP_GROUP_ID ${this.config.groupId} is not a group chat.`);
      }
      return this.chat;
    }

    if (!this.config.groupName) {
      throw new Error('Set WHATSAPP_GROUP_ID or WHATSAPP_GROUP_NAME in .env.');
    }

    const chats = await this.client.getChats();
    this.chat = chats.find((chat) => chat.isGroup && chat.name === this.config.groupName);
    if (!this.chat) {
      throw new Error(`Could not find WhatsApp group named "${this.config.groupName}".`);
    }

    return this.chat;
  }

  waitForAck(sentMessage) {
    if (sentMessage.ack >= 1) {
      return Promise.resolve(sentMessage.ack);
    }

    const messageId = sentMessage.id?._serialized;
    if (!messageId) {
      return Promise.resolve(sentMessage.ack);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.client.off('message_ack', onAck);
        reject(
          new Error(
            `WhatsApp message stayed pending for ${Math.round(
              this.config.sendAckTimeoutMs / 1000
            )} seconds. Message id: ${messageId}`
          )
        );
      }, this.config.sendAckTimeoutMs);

      const onAck = (message, ack) => {
        if (message.id?._serialized !== messageId) {
          return;
        }

        if (ack >= 1) {
          clearTimeout(timeout);
          this.client.off('message_ack', onAck);
          resolve(ack);
        }

        if (ack === -1) {
          clearTimeout(timeout);
          this.client.off('message_ack', onAck);
          reject(new Error(`WhatsApp reported send failure for message id: ${messageId}`));
        }
      };

      this.client.on('message_ack', onAck);
    });
  }

  async onStatusRequest(handler, options = {}) {
    const chat = await this.resolveChat();
    const targetChatId = chat.id._serialized;
    let lastReplyAt = 0;

    this.client.on('message', async (message) => {
      if (message.from !== targetChatId || message.fromMe) {
        return;
      }

      const text = String(message.body || '').trim();
      if (!text || !options.matches?.(text)) {
        return;
      }

      const now = Date.now();
      if (now - lastReplyAt < options.cooldownMs) {
        console.log(`Ignored status request due to cooldown. Text="${text}".`);
        return;
      }

      lastReplyAt = now;
      console.log(`Received status request in ${chat.name}: "${text}"`);

      try {
        await handler({ message, chat, text });
      } catch (error) {
        console.error('Failed to reply to group status request:', error.message);
      }
    });

    console.log(
      `Listening for shipment status requests in ${chat.name || targetChatId}.`
    );
  }

  async send(message) {
    const chat = await this.resolveChat();
    const sentMessage = await chat.sendMessage(message);
    const ack = await this.waitForAck(sentMessage);
    console.log(`Sent WhatsApp update to ${chat.name || chat.id._serialized}. Ack=${ack}.`);
  }

  async stop() {
    if (this.client) {
      await this.client.destroy();
    }
  }
}

function createNotifier(config) {
  if (config.mode === 'dry-run') {
    return new DryRunNotifier();
  }

  return new WhatsappGroupNotifier(config.whatsapp);
}

module.exports = {
  createNotifier,
  detectBrowserExecutable
};
