# Run the bot for free when your PC is off

A bot cannot run after your own computer is shut down. It must run on another always-on machine.

For this WhatsApp group bot, the practical free option is an Always Free VM such as Oracle Cloud Free Tier. Free app hosts that sleep are a poor fit because WhatsApp Web needs a persistent login session in `.wwebjs_auth`.

## Recommended free setup

Use an Oracle Cloud Always Free Ubuntu VM.

High-level steps:

1. Create an Always Free Ubuntu VM.
2. SSH into the VM.
3. Install Node.js, npm, Chromium, and PM2.
4. Copy this project to the VM.
5. Create `.env`.
6. Start the bot with PM2.
7. Scan the WhatsApp QR once.

## VM commands

Run these on the Ubuntu VM:

```bash
sudo apt update
sudo apt install -y git curl unzip chromium
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

If `chromium` is not available on your VM image, install Chrome instead:

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install -y ./google-chrome-stable_current_amd64.deb
```

## Copy and configure the bot

After the project is on the VM:

```bash
cd ~/Whatsapp-bot
npm install
cp .env.example .env
nano .env
```

Set these values:

```env
BOT_MODE=whatsapp
WHATSAPP_GROUP_NAME=YOUR_WHATSAPP_GROUP_NAME
HEADLESS=true
```

Using `WHATSAPP_GROUP_ID` is more reliable than group name. To get it:

```bash
node src/list-groups.js
```

Scan the QR code, copy the group id, then put it in `.env`.

## Run forever

Start the bot:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

`pm2 startup` prints one extra command. Run that printed command exactly once.

Useful checks:

```bash
pm2 status
pm2 logs shiprocket-whatsapp-bot
```

## Important notes

- Keep `.wwebjs_auth` on the VM. If you delete it, you must scan the WhatsApp QR again.
- Keep `data/state.json` on the VM. It prevents duplicate shipment messages.
- If WhatsApp logs out the session, rerun `pm2 logs shiprocket-whatsapp-bot` and scan the new QR.
- Do not use GitHub Actions for this bot. It is temporary, not always-on, and does not preserve a reliable WhatsApp Web browser session.
