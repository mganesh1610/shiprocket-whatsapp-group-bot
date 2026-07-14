$ErrorActionPreference = 'Stop'

$TaskName = 'ShiprocketWhatsAppBot'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Runner = Join-Path $ProjectRoot 'scripts\run-bot.ps1'
$PowerShellExe = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
$UserId = "$env:USERDOMAIN\$env:USERNAME"

$Action = New-ScheduledTaskAction `
  -Execute $PowerShellExe `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Runner`"" `
  -WorkingDirectory $ProjectRoot

$Trigger = New-ScheduledTaskTrigger -AtLogOn

$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew

$Principal = New-ScheduledTaskPrincipal `
  -UserId $UserId `
  -LogonType Interactive `
  -RunLevel Limited

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Settings $Settings `
  -Principal $Principal `
  -Force | Out-Null

Write-Host "Registered task: $TaskName"
Write-Host "It will run when $UserId logs in."
Write-Host "Start it now with: Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "View logs at: $(Join-Path $ProjectRoot 'logs\bot.log')"
