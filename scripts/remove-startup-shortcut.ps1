$ErrorActionPreference = 'Stop'

$ShortcutPath = Join-Path ([Environment]::GetFolderPath('Startup')) 'ShiprocketWhatsAppBot.lnk'

if (Test-Path $ShortcutPath) {
  Remove-Item -LiteralPath $ShortcutPath
  Write-Host "Removed startup shortcut: $ShortcutPath"
} else {
  Write-Host "Startup shortcut not found: $ShortcutPath"
}
