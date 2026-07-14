# Run automatically on Windows startup

This setup runs the bot automatically when you log in to Windows. It keeps running in the background, checks Shiprocket on the configured interval, sends WhatsApp only when the shipment changes, and stops after delivery is completed.

## One-time setup

Open PowerShell in the project folder:

```powershell
cd "C:\Users\gmarimu1\Documents\Whatsapp bot"
.\scripts\install-startup-shortcut.ps1
```

Start it immediately without rebooting:

```powershell
Start-Process -WindowStyle Hidden powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ".\scripts\run-bot.ps1"'
```

Check whether it is installed:

```powershell
Test-Path "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\ShiprocketWhatsAppBot.lnk"
```

View logs:

```powershell
Get-Content .\logs\bot.log -Tail 80
```

## Stop or remove

Stop the running task:

```powershell
Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
  Where-Object { $_.CommandLine -like '*Whatsapp bot*src*index.js*' } |
  Invoke-CimMethod -MethodName Terminate
```

Remove the auto-start shortcut:

```powershell
.\scripts\remove-startup-shortcut.ps1
```

## Delivery stop behavior

The bot exits cleanly when the shipment status or latest activity contains one of:

```env
TERMINAL_STATUSES=delivered,delivery completed,rto delivered
```

You can change that in `.env`.

## WhatsApp login

Before relying on background startup, run this once in a normal terminal:

```powershell
node src/index.js
```

Scan the WhatsApp QR code if it appears. After WhatsApp is linked, stop the terminal with `Ctrl+C`, then use the scheduled task.

The login session is saved in `.wwebjs_auth`. Do not delete that folder unless you want to scan the QR again.
