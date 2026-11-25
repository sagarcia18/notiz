# Sets up Notiz on a Windows computer: Git, Node.js, pnpm, packages, .env and database.
# Safe to run again: it skips what is already there and never overwrites .env or data.
# Usually started by setup-notiz.cmd; run directly with:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\setup.ps1
[CmdletBinding()]
param(
    # Used only when the script does not run from inside a checkout.
    [string]$RepoDir = (Join-Path $env:USERPROFILE 'source\repos\notiz'),
    [string]$RepoUrl = 'https://github.com/sagarcia18/notiz.git'
)

$ErrorActionPreference = 'Stop'
$PnpmBin = Join-Path $env:USERPROFILE '.local\bin'
$MinNodeMajor = 22

function Write-Step([string]$Text) {
    Write-Host ''
    Write-Host "==> $Text" -ForegroundColor Cyan
}

function Update-SessionPath {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$PnpmBin;$machine;$user"
}

function Test-Command([string]$Name) {
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-Checked([string]$File, [string[]]$Arguments) {
    # Out-Host keeps tool output on screen and out of function return values.
    & $File @Arguments | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "'$File $($Arguments -join ' ')' failed with exit code $LASTEXITCODE." }
}

function Install-WithWinget([string]$Id, [string]$Label) {
    if (-not (Test-Command 'winget')) {
        throw "$Label is missing and winget is not available. Install 'App Installer' from the Microsoft Store, or install $Label by hand, then run this again."
    }
    Write-Host "Installing $Label with winget (Windows may ask for permission)..."
    Invoke-Checked 'winget' @('install', '--id', $Id, '--exact', '--silent', '--accept-package-agreements', '--accept-source-agreements')
    Update-SessionPath
}

function Get-NodeMajor {
    if (-not (Test-Command 'node')) { return 0 }
    $version = (& node --version).TrimStart('v')
    return [int]($version.Split('.')[0])
}

function Install-Git {
    Write-Step 'Git'
    if (-not (Test-Command 'git')) { Install-WithWinget 'Git.Git' 'Git' }
    if (-not (Test-Command 'git')) { throw 'Git was installed but is not on PATH yet. Close this window and run the setup again.' }
    Write-Host (& git --version)
}

function Install-Node {
    Write-Step 'Node.js'
    if ((Get-NodeMajor) -lt $MinNodeMajor) { Install-WithWinget 'OpenJS.NodeJS.LTS' 'Node.js LTS' }
    $major = Get-NodeMajor
    if ($major -lt $MinNodeMajor) {
        throw "Notiz needs Node.js $MinNodeMajor or newer (found major version $major). Close this window and run the setup again, or update Node.js by hand."
    }
    Write-Host "Node.js $(& node --version)"
}

# pnpm comes from corepack, which installs the exact version pinned in package.json ("packageManager").
function Install-Pnpm {
    Write-Step 'pnpm'
    if (-not (Test-Command 'corepack')) {
        Invoke-Checked 'npm' @('install', '--global', 'corepack@latest')
        Update-SessionPath
    }
    New-Item -ItemType Directory -Force -Path $PnpmBin | Out-Null
    Invoke-Checked 'corepack' @('enable', '--install-directory', $PnpmBin, 'pnpm')

    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if (($userPath -split ';') -notcontains $PnpmBin) {
        [Environment]::SetEnvironmentVariable('Path', "$PnpmBin;$userPath", 'User')
        Write-Host "Added $PnpmBin to your PATH (new terminals pick it up)."
    }
    Update-SessionPath
}

function Get-RepoRoot {
    $here = Split-Path -Parent $PSScriptRoot
    if (Test-Path (Join-Path $here 'pnpm-workspace.yaml')) { return $here }

    Write-Step "Code ($RepoDir)"
    if (Test-Path (Join-Path $RepoDir '.git')) {
        return $RepoDir
    }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $RepoDir) | Out-Null
    Invoke-Checked 'git' @('clone', $RepoUrl, $RepoDir)
    return $RepoDir
}

function Update-Repo([string]$Root) {
    Write-Step 'Newest code'
    $changes = & git -C $Root status --porcelain --untracked-files=no
    if ($changes) {
        Write-Host 'Local changes found; not pulling. Commit or discard them to get the newest code.' -ForegroundColor Yellow
        return
    }
    $branch = (& git -C $Root branch --show-current).Trim()
    Write-Host "Pulling the newest '$branch'..."
    & git -C $Root pull --ff-only
    if ($LASTEXITCODE -ne 0) { Write-Host 'Pull failed (offline or diverged); continuing with the local code.' -ForegroundColor Yellow }
}

function Initialize-Project([string]$Root) {
    Push-Location $Root
    try {
        Write-Step 'Packages (exact versions from pnpm-lock.yaml)'
        $env:COREPACK_ENABLE_DOWNLOAD_PROMPT = '0'
        # The version is pinned in package.json; pnpm's own update hint would only confuse here.
        $env:npm_config_update_notifier = 'false'
        Invoke-Checked 'pnpm' @('install', '--frozen-lockfile')
        Write-Host "pnpm $(& pnpm --version)"

        Write-Step 'Settings'
        if (Test-Path '.env') {
            Write-Host '.env already exists; left as it is.'
        } else {
            Copy-Item '.env.example' '.env'
            Write-Host 'Created .env from .env.example.'
        }

        Write-Step 'Database'
        Invoke-Checked 'pnpm' @('db:migrate')
    } finally {
        Pop-Location
    }
}

Update-SessionPath
Install-Git
Install-Node
Install-Pnpm
$root = Get-RepoRoot
Update-Repo $root
Initialize-Project $root

Write-Step 'Done'
Write-Host "Notiz is ready in $root"
Write-Host "Start it in a new terminal:  cd `"$root`"  then  pnpm dev"
Write-Host 'Phone access (Tailscale, firewall): see "Open Notiz on your phone" in README.md.'
