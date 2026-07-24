#Requires -Version 5.1
<#
.SYNOPSIS
  Read-only checks for Floatem Windows development prerequisites.

.DESCRIPTION
  Does not install software or change execution policy. Run from repo root:
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\setup-dev.ps1

  Administrator rights are NOT required for this script. If a check needs elevation,
  the message says so explicitly.
#>

$ErrorActionPreference = "Continue"
$script:DevCheckFailed = $false

function Write-Ok($msg) { Write-Host "[ok] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[warn] $msg" -ForegroundColor Yellow }
function Write-Fail($msg) {
    Write-Host "[fail] $msg" -ForegroundColor Red
    $script:DevCheckFailed = $true
}

Write-Host "Floatem Windows dev prerequisite check" -ForegroundColor Cyan
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Write-Host "Repo root (resolved): $repoRoot`n"

$csprojPath = Join-Path $repoRoot "apps\windows-host\Floatem.Windows.csproj"
$rootPkg = Join-Path $repoRoot "package.json"
$workspaceFile = Join-Path $repoRoot "pnpm-workspace.yaml"
if (-not (Test-Path -LiteralPath $csprojPath)) {
    Write-Fail "Expected Windows host project not found: $csprojPath  (run this script from the repo, or fix your checkout path)"
}
else {
    Write-Ok "Windows host project found"
}
if (-not (Test-Path -LiteralPath $rootPkg)) {
    Write-Fail "Root package.json missing — are you in the Floatem repository root?"
}
else {
    Write-Ok "Root package.json found"
}
if (-not (Test-Path -LiteralPath $workspaceFile)) {
    Write-Warn "pnpm-workspace.yaml not found — unusual for this repo"
}
Write-Host ""

# Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeV = node --version 2>$null
    Write-Ok "Node.js $nodeV"
}
else {
    Write-Fail "Node.js not found. Install Node 20 or 22 LTS from https://nodejs.org/"
}

# pnpm (pnpm.cmd avoids ExecutionPolicy issues with pnpm.ps1)
$pnpmCmd = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
$pnpmPs1 = Get-Command pnpm -ErrorAction SilentlyContinue
if ($pnpmCmd) {
    try {
        $pv = & pnpm.cmd --version 2>$null
        Write-Ok "pnpm $pv (pnpm.cmd on PATH)"
    }
    catch { Write-Warn "pnpm.cmd exists but --version failed." }
}
elseif ($pnpmPs1) {
    try {
        $pv = & pnpm --version 2>$null
        Write-Ok "pnpm $pv"
    }
    catch {
        Write-Warn "pnpm found but failed to run. If ExecutionPolicy blocks pnpm.ps1, use pnpm.cmd or: Set-ExecutionPolicy RemoteSigned -Scope CurrentUser"
    }
}
else {
    Write-Fail "pnpm not on PATH. Install: npm install -g pnpm  (see docs/windows-dev-setup.md)"
}

# Git
if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Ok (git --version 2>$null)
}
else {
    Write-Fail "Git not found. Install from https://git-scm.com/download/win"
}

# .NET SDK 8
if (Get-Command dotnet -ErrorAction SilentlyContinue) {
    $sdks = dotnet --list-sdks 2>$null
    $defaultSdk = dotnet --version 2>$null
    if ($sdks -match "\b8\.") {
        Write-Ok ".NET SDK 8.x listed (default SDK version: $defaultSdk)"
    }
    elseif ($defaultSdk -match "^8\.") {
        Write-Ok ".NET default SDK $defaultSdk (8.x)"
    }
    elseif ($sdks) {
        Write-Fail ".NET SDK present but no 8.x SDK. Install .NET 8 SDK: https://dotnet.microsoft.com/download/dotnet/8.0"
    }
    else {
        Write-Fail "Could not confirm .NET 8 SDK (try 'dotnet --list-sdks'). Install: https://dotnet.microsoft.com/download/dotnet/8.0"
    }
}
else {
    Write-Fail "dotnet CLI not found. Install .NET 8 SDK from https://dotnet.microsoft.com/download/dotnet/8.0"
}

# WebView2 Evergreen (folder presence heuristic)
$webviewPath = "${env:ProgramFiles(x86)}\Microsoft\EdgeWebView\Application"
if (Test-Path -LiteralPath $webviewPath) {
    Write-Ok "WebView2 Runtime folder present: $webviewPath"
}
else {
    Write-Warn "WebView2 Evergreen folder not found under Program Files (x86). If the app fails at WebView init, install: https://developer.microsoft.com/microsoft-edge/webview2/"
}

# Optional: Rust / Tauri (should NOT be required)
$cargo = Get-Command cargo -ErrorAction SilentlyContinue
if ($cargo) {
    Write-Warn "Rust (cargo) is on PATH — Floatem no longer uses a Tauri/Rust host; you do not need cargo for this repo."
}

Write-Host ""
if ($script:DevCheckFailed) {
    Write-Host "Some required tools are missing. Fix the [fail] lines above, then run: pnpm install" -ForegroundColor Red
    exit 1
}

Write-Host "Core checks passed. Next: pnpm install ; pnpm windows:run  (or see docs/windows-dev-setup.md for Vite + host debugging)" -ForegroundColor Green
exit 0
