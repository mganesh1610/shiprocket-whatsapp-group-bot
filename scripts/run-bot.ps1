$ErrorActionPreference = 'Continue'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LogDir = Join-Path $ProjectRoot 'logs'
$LogFile = Join-Path $LogDir 'bot.log'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location $ProjectRoot

while ($true) {
  Add-Content -Path $LogFile -Value ""
  Add-Content -Path $LogFile -Value "[$(Get-Date -Format o)] Starting Shiprocket WhatsApp bot"

  & node .\src\index.js 2>&1 | ForEach-Object {
    Add-Content -Path $LogFile -Encoding UTF8 -Value $_
  }
  $ExitCode = $LASTEXITCODE

  if ($ExitCode -eq 0) {
    Add-Content -Path $LogFile -Value "[$(Get-Date -Format o)] Bot exited cleanly. Not restarting."
    break
  }

  Add-Content -Path $LogFile -Value "[$(Get-Date -Format o)] Bot exited with code $ExitCode. Restarting in 60 seconds."
  Start-Sleep -Seconds 60
}
