param(
  [int]$Port = 4173
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptDir

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  Write-Error "npx not found. Please install Node.js or add it to PATH."
  exit 1
}

$serverCmd = "cd `"$scriptDir`"; npx http-server -p $Port"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $serverCmd

Start-Sleep -Milliseconds 500
Start-Process "http://localhost:$Port/converter.html"
Write-Host "Serving converter at http://localhost:$Port/converter.html"

Pop-Location

