const { loadConfig } = require('./config');
const { detectBrowserExecutable } = require('./whatsapp');

async function main() {
  const { Client, LocalAuth } = require('whatsapp-web.js');
  const qrcode = require('qrcode-terminal');
  const config = loadConfig();
  const executablePath = config.whatsapp.executablePath || detectBrowserExecutable();

  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: config.whatsapp.authDir
    }),
    puppeteer: {
      headless: config.whatsapp.headless,
      executablePath: executablePath || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', (qr) => {
    console.log('Scan this QR code with WhatsApp:');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', async () => {
    const chats = await client.getChats();
    const groups = chats
      .filter((chat) => chat.isGroup)
      .sort((a, b) => a.name.localeCompare(b.name));

    if (groups.length === 0) {
      console.log('No WhatsApp groups found for this account.');
    } else {
      console.log('WhatsApp groups:');
      for (const group of groups) {
        console.log(`${group.id._serialized}\t${group.name}`);
      }
    }

    await client.destroy();
  });

  await client.initialize();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
