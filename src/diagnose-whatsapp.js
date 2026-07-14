const { loadConfig } = require('./config');
const { detectBrowserExecutable } = require('./whatsapp');

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return 'unknown time';
  }

  return new Date(timestamp * 1000).toISOString();
}

function compact(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

function ackLabel(ack) {
  const labels = {
    '-1': 'error',
    0: 'pending',
    1: 'server',
    2: 'device',
    3: 'read',
    4: 'played'
  };

  return `${ack ?? 'unknown'} (${labels[ack] || 'unknown'})`;
}

async function main() {
  const { Client, LocalAuth } = require('whatsapp-web.js');
  const qrcode = require('qrcode-terminal');
  const config = loadConfig();
  const executablePath = config.whatsapp.executablePath || detectBrowserExecutable();
  const groupNeedle = config.whatsapp.groupName.toLowerCase();

  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: config.whatsapp.authDir
    }),
    puppeteer: {
      headless: config.whatsapp.headless,
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

  client.on('qr', (qr) => {
    console.log('Scan this QR code with WhatsApp:');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', async () => {
    console.log('WhatsApp client is ready.');
    console.log(`Linked account: ${client.info?.pushname || '(unknown name)'}`);
    console.log(`Linked wid: ${client.info?.wid?._serialized || '(unknown wid)'}`);
    console.log(`Platform: ${client.info?.platform || '(unknown platform)'}`);
    console.log(`Configured group name: ${config.whatsapp.groupName}`);
    console.log(`Configured group id: ${config.whatsapp.groupId || '(not set)'}`);

    const chats = await client.getChats();
    const matchingGroups = chats
      .filter((chat) => chat.isGroup && chat.name.toLowerCase().includes(groupNeedle))
      .sort((a, b) => a.name.localeCompare(b.name));

    console.log(`Matching groups found: ${matchingGroups.length}`);

    for (const chat of matchingGroups) {
      console.log('');
      console.log(`Group: ${chat.name}`);
      console.log(`ID: ${chat.id._serialized}`);
      console.log(`Participants: ${chat.participants?.length ?? 'unknown'}`);
      console.log(`Last message: ${compact(chat.lastMessage?.body) || '(empty)'}`);
      console.log(`Last message from me: ${chat.lastMessage?.fromMe ? 'yes' : 'no'}`);
      console.log(`Last message id: ${chat.lastMessage?.id?._serialized || '(unknown)'}`);
      console.log(`Last message ack: ${ackLabel(chat.lastMessage?.ack)}`);
      console.log(`Last message at: ${formatTimestamp(chat.lastMessage?.timestamp)}`);

      const messages = await chat.fetchMessages({ limit: 8 });
      console.log('Recent messages:');
      for (const message of messages) {
        console.log(
          `- ${formatTimestamp(message.timestamp)} fromMe=${message.fromMe ? 'yes' : 'no'} body=${compact(
            message.body
          ) || '(empty)'} ack=${ackLabel(message.ack)} id=${message.id?._serialized || '(unknown)'}`
        );
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
