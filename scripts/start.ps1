# Starts Notiz (API + web app) and opens it in the browser.
# With Tailscale running, the web app listens on this computer's Tailscale address,
# so the phone can open the same URL; without it, Notiz stays on this computer.
# Usually started by start-notiz.cmd. Close the window or press Ctrl+C to stop Notiz.
[CmdletBinding()]
param(
    # Dev server with live reload instead of the built app (slower on the phone).
    [switch]$Dev,
    # Ignore Tailscale and listen on this computer only.
    [switch]$Local
)

$ErrorActionPreference = 'Stop'
# Keeps the window open on errors, so a double-click user can read them.
trap {
    Write-Host ''
    Write-Host "Notiz could not start: $_" -ForegroundColor Red
    Read-Host 'Press Enter to close'
    exit 1
}
$Root = Split-Path -Parent $PSScriptRoot
$WebPort = 5173

function Write-Step([string]$Text) {
    Write-Host ''
    Write-Host "==> $Text" -ForegroundColor Cyan
}

function Test-Command([string]$Name) {
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

# This computer's Tailscale IPv4 address, or $null when Tailscale is missing, stopped or logged out.
function Get-TailscaleIp {
    if (-not (Test-Command 'tailscale')) { return $null }
    $ip = & tailscale ip -4 2>$null | Select-Object -First 1
    if ($LASTEXITCODE -ne 0 -or -not $ip) { return $null }
    return $ip.Trim()
}

function Test-Healthy([string]$BaseUrl) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing "$BaseUrl/api/health" -TimeoutSec 2
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

$env:Path = "$env:USERPROFILE\.local\bin;$env:Path"
if (-not (Test-Command 'pnpm')) { throw 'pnpm is missing. Run setup-notiz.cmd first.' }
if (-not (Test-Path (Join-Path $Root 'node_modules'))) { throw 'Packages are missing. Run setup-notiz.cmd first.' }

Write-Step 'Tailscale'
$ip = $null
if (-not $Local) { $ip = Get-TailscaleIp }
if ($ip) {
    Write-Host "Listening on the Tailscale address $ip (phone and this computer)."
    # Without admin rights the firewall rules cannot be read, so this is only a hint.
    Write-Host "If the phone cannot connect, allow port $WebPort in the firewall (README: Open Notiz on your phone)." -ForegroundColor DarkGray
    $url = "http://${ip}:$WebPort"
} else {
    if (-not $Local) { Write-Host 'Tailscale is not running or not logged in; Notiz stays on this computer.' -ForegroundColor Yellow }
    $url = "http://localhost:$WebPort"
}
# Overrides WEB_HOST from .env for this run only; empty means this computer only.
$env:WEB_HOST = if ($ip) { $ip } else { '' }

if (Test-Healthy $url) {
    Write-Step 'Notiz is already running'
    Write-Host "Opening $url"
    Start-Process $url
    exit 0
}

# Opens the browser as soon as the API answers through the web server.
$opener = Start-Job -ArgumentList $url -ScriptBlock {
    param([string]$Url)
    for ($i = 0; $i -lt 120; $i++) {
        try {
            if ((Invoke-WebRequest -UseBasicParsing "$Url/api/health" -TimeoutSec 2).StatusCode -eq 200) {
                Start-Process $Url
                return
            }
        } catch {
            # Not up yet (connection refused or proxy error); try again.
        }
        Start-Sleep -Seconds 1
    }
}

Write-Step "Starting Notiz ($(if ($Dev) { 'dev server' } else { 'built app' }))"
Write-Host "The browser opens $url when it is ready. Phone: the same URL. Stop with Ctrl+C or by closing this window."
Push-Location $Root
try {
    if ($Dev) { & pnpm dev } else { & pnpm serve }
} finally {
    Pop-Location
    Stop-Job $opener -ErrorAction SilentlyContinue
    Remove-Job $opener -Force -ErrorAction SilentlyContinue
}
