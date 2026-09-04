Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  AEVE - Logiciel Point de vente Intelligent " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Auto-elevate to Administrator to fix electron-builder symlink errors
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Requesting Administrator privileges (required for winCodeSign extraction)..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -NoProfile -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

$ErrorActionPreference = "Stop"
$root = "C:\Users\7ALAZOUN\Desktop\fripestorekef"
$eApp = "$root\electron-app"
$frDir = "$root\local\fr"

# STEP 1: Frontend
$frontendBuilt = Test-Path "$eApp\frontend\out\index.html"
if ($frontendBuilt) {
    Write-Host "`n[1/5] Frontend already built, skipping." -ForegroundColor Green
} else {
    Write-Host "`n[1/5] Building Next.js frontend..." -ForegroundColor Yellow
    Set-Location $frDir
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed!" }
    if (Test-Path "$eApp\frontend") { Remove-Item -Recurse -Force "$eApp\frontend" }
    New-Item -ItemType Directory -Force "$eApp\frontend\out" | Out-Null
    robocopy "$frDir\out" "$eApp\frontend\out" /E /NFL /NJH /NJS | Out-Null
    Write-Host "[1/5] Frontend done." -ForegroundColor Green
}

# STEP 2: Copy backend files
Write-Host "`n[2/5] Setting up backend files..." -ForegroundColor Yellow
$backDir = "$root\local\back"
if (Test-Path "$eApp\backend") { Remove-Item -Recurse -Force "$eApp\backend" }
New-Item -ItemType Directory -Force "$eApp\backend" | Out-Null
Get-ChildItem -Path $backDir -Exclude node_modules, logs, database, uploads, .env, package-lock.json, *.pdf, *.png, check_*.js, count_*.js, debug_*.js, deviceInfo.js, generate.js, generate_barcodes.js, migrate_*.js, restore_*.js, qrcode.js | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination "$eApp\backend" -Recurse -Force
}
Write-Host "[2/5] Backend files copied." -ForegroundColor Green

# STEP 2.5: Obfuscate backend source code
Write-Host "`n[2.5/5] Obfuscating backend source code..." -ForegroundColor Yellow
Set-Location $root

# Install javascript-obfuscator temporarily if not present
if (!(Test-Path "$root\node_modules\javascript-obfuscator")) {
    Write-Host "  Installing javascript-obfuscator..." -ForegroundColor Gray
    npm install --save-dev javascript-obfuscator --prefix "$root"
    if ($LASTEXITCODE -ne 0) { throw "Failed to install javascript-obfuscator!" }
}

node "$root\obfuscate.js" "$eApp\backend"
if ($LASTEXITCODE -ne 0) { throw "Obfuscation failed!" }
Write-Host "[2.5/5] Backend obfuscated successfully." -ForegroundColor Green

# Install backend production dependencies (after obfuscation)
Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
Set-Location "$eApp\backend"
npm install --production
if ($LASTEXITCODE -ne 0) { throw "Backend npm install failed!" }
Write-Host "[2/5] Backend dependencies done." -ForegroundColor Green

# STEP 3: Portable Node.js
Write-Host "`n[3/5] Setting up portable Node.js..." -ForegroundColor Yellow
$nodeDir = "$eApp\resources\node"
$nodeExe = "$nodeDir\node.exe"
if (!(Test-Path $nodeExe)) {
    New-Item -ItemType Directory -Force $nodeDir | Out-Null
    $url = "https://nodejs.org/dist/v22.11.0/win-x64/node.exe"
    Write-Host "Downloading node.exe..." -ForegroundColor Gray
    Invoke-WebRequest -Uri $url -OutFile $nodeExe -UseBasicParsing
}
Write-Host "[3/5] node.exe ready." -ForegroundColor Green

# STEP 4: Electron install + build installer
Write-Host "`n[4/5] Building Windows installer..." -ForegroundColor Yellow
Set-Location $eApp

# Generate icon (async — wait for it to finish)
Write-Host "Generating app icon..." -ForegroundColor Gray
node icon-gen.js
Start-Sleep -Seconds 5

npm install
if ($LASTEXITCODE -ne 0) { throw "Electron npm install failed!" }

# Disable code signing to avoid symlink privilege errors on Windows (no cert needed)
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
$env:WIN_CSC_LINK = ""
$env:CSC_LINK = ""

npx electron-builder --win
if ($LASTEXITCODE -ne 0) { throw "electron-builder failed!" }

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "  BUILD COMPLETE!" -ForegroundColor Green
Write-Host "  Installer is in: $eApp\dist\" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

Start-Process explorer.exe "$eApp\dist"
