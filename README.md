# Shiprocket WhatsApp Group Bot

An event-driven operations bot that polls a configured Shiprocket tracking page and posts a WhatsApp group update only when the shipment status or newest activity changes.

## What it does

- Parses current status, AWB, order ID, and tracking-timeline activity from Shiprocket.
- Fingerprints the latest shipment state to prevent duplicate alerts.
- Replies to natural shipment-status questions in a chosen WhatsApp group, with a configurable cooldown.
- Stops cleanly after delivery or another configured terminal status.
- Supports Windows startup and persistent VM deployment with PM2.

Important: the official WhatsApp Business Cloud API does not send messages to groups. This project uses WhatsApp Web automation through `whatsapp-web.js`, which requires scanning a QR code and is not an official WhatsApp group API. Use a dedicated WhatsApp account if possible.

## Setup

1. Install dependencies:

```powershell
npm install
```

If the system `npm` fails on this machine with a stale `C:\Users\dsrajput` path, use the downloaded Node runtime:

```powershell
& 'C:\tmp\node-v22.22.3-win-x64\npm.cmd' install
```

2. Create your config:

```powershell
Copy-Item .env.example .env
```

Set `SHIPROCKET_TRACKING_URL` in `.env` to the tracking URL you want the bot to monitor. The bot intentionally refuses to start without it, so a personal shipment identifier is never baked into source code.

3. Find the WhatsApp group id:

```powershell
npm run groups
```

If regular `npm` has the local `C:\Users\dsrajput` issue, run the script directly:

```powershell
node src/list-groups.js
```

Scan the QR code in WhatsApp, then copy the wanted group id into `.env` as `WHATSAPP_GROUP_ID`.

4. Test one poll:

```powershell
npm run once
```

Direct command:

```powershell
node src/index.js --once
```

Send the current status manually:

```powershell
node src/index.js --send-current
```

By default, the first run records the current shipment state and does not send a group message. Set `SEND_INITIAL_UPDATE=true` if you want the current status posted immediately.

5. Run continuously:

```powershell
npm start
```

Direct command:

```powershell
node src/index.js
```

6. Run automatically when Windows starts:

```powershell
.\scripts\install-startup-shortcut.ps1
Start-Process -WindowStyle Hidden powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ".\scripts\run-bot.ps1"'
```

More details: [docs/windows-startup.md](docs/windows-startup.md).

## Configuration

All configuration is in `.env`.

- `SHIPROCKET_TRACKING_URL`: the Shiprocket tracking URL to poll.
- `POLL_INTERVAL_SECONDS`: how often to check for changes.
- `SEND_INITIAL_UPDATE`: send the current status on first run.
- `STOP_ON_TERMINAL_STATUS`: stop the bot after delivery is complete.
- `TERMINAL_STATUSES`: comma-separated phrases that count as complete delivery.
- `REPLY_TO_GROUP_STATUS_REQUESTS`: reply when someone asks for shipment status in the group.
- `STATUS_REQUEST_COOLDOWN_SECONDS`: minimum seconds between automatic request replies.
- `STATUS_REQUEST_PHRASES`: comma-separated request phrases that trigger an automatic reply.
- `BOT_MODE`: `whatsapp` sends messages, `dry-run` prints them.
- `WHATSAPP_GROUP_ID`: preferred target group id from `npm run groups`.
- `WHATSAPP_GROUP_NAME`: exact group-name fallback if no group id is set.
- `STATE_FILE`: local JSON file used to avoid duplicate messages.
- `WHATSAPP_AUTH_DIR`: local WhatsApp Web session directory.
- `HEADLESS`: set `false` if you want to see the browser window.
- `PUPPETEER_EXECUTABLE_PATH`: optional Chrome/Edge path.

To force the bot to treat the current shipment as new, stop it and delete `data/state.json`.

## Current Parsed Shipment Shape

Shiprocket currently exposes the useful data in the tracking page HTML:

- current status from the `shipment_status` element
- AWB from the hidden `awb` input
- latest timeline rows from `trackingActivities.push(...)`

The bot fingerprints the current status plus newest timeline activity. A new WhatsApp message is sent only when that fingerprint changes.

## Security checks

Install [GitLeaks](https://github.com/gitleaks/gitleaks), then enable the repository's pre-commit secret scan in your clone:

```sh
git config core.hooksPath .githooks
```

The hook scans staged changes. [Security review instructions](docs/security-review.md) cover a full-history GitLeaks scan, a Trivy dependency scan, and a pre-ship AI review prompt. Pull requests also run GitLeaks, Trivy, and CodeQL through GitHub Actions; Dependabot checks npm and workflow dependencies weekly. GitHub Actions runs security checks only and does not host the WhatsApp bot.
