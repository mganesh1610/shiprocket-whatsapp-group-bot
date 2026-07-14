$ErrorActionPreference = 'Stop'

$ShortcutName = 'ShiprocketWhatsAppBot.lnk'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Runner = Join-Path $ProjectRoot 'scripts\run-bot.ps1'
$StartupDir = [Environment]::GetFolderPath('Startup')
$ShortcutPath = Join-Path $StartupDir $ShortcutName
$PowerShellExe = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'

$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $PowerShellExe
$Shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Runner`""
$Shortcut.WorkingDirectory = $ProjectRoot
$Shortcut.Description = 'Starts the Shiprocket WhatsApp shipment bot in the background.'
$Shortcut.Save()

Write-Host "Created startup shortcut: $ShortcutPath"
Write-Host "The bot will start automatically when you log in to Windows."
Write-Host "Start it now with: Start-Process -WindowStyle Hidden powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File `"$Runner`"'"
Write-Host "View logs at: $(Join-Path $ProjectRoot 'logs\bot.log')"
