Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  FripeStore POS - Electron Build Script   " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$root = "C:\Users\7ALAZOUN\Desktop\fripestorekef"
$eApp = "$root\electron-app"
$frDir = "$root\local\fr"

# STEP 1: Frontend
$frontendBuilt = Test-Path "$eApp\frontend\out\index.html"
if ($frontendBuilt) {
    Write-Host "`n[1/4] Frontend already built, skipping." -ForegroundColor Green
} else {
    Write-Host "`n[1/4] Building Next.js frontend..." -ForegroundColor Yellow
    Set-Location $frDir
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed!" }
    if (Test-Path "$eApp\frontend") { Remove-Item -Recurse -Force "$eApp\frontend" }
    New-Item -ItemType Directory -Force "$eApp\frontend\out" | Out-Null
    robocopy "$frDir\out" "$eApp\frontend\out" /E /NFL /NJH /NJS | Out-Null
    Write-Host "[1/4] Frontend done." -ForegroundColor Green
}

# STEP 2: Backend dependencies (system Node.js, no ABI issues)
Write-Host "`n[2/4] Installing backend dependencies..." -ForegroundColor Yellow
Set-Location "$eApp\backend"
npm install --production
if ($LASTEXITCODE -ne 0) { throw "Backend npm install failed!" }
Write-Host "[2/4] Backend dependencies done." -ForegroundColor Green

# STEP 3: Portable Node.js
Write-Host "`n[3/4] Setting up portable Node.js..." -ForegroundColor Yellow
$nodeDir = "$eApp\resources\node"
$nodeExe = "$nodeDir\node.exe"
if (!(Test-Path $nodeExe)) {
    New-Item -ItemType Directory -Force $nodeDir | Out-Null
    $url = "https://nodejs.org/dist/v22.11.0/win-x64/node.exe"
    Write-Host "Downloading node.exe..." -ForegroundColor Gray
    Invoke-WebRequest -Uri $url -OutFile $nodeExe -UseBasicParsing
}
Write-Host "[3/4] node.exe ready." -ForegroundColor Green

# STEP 4: Electron install + build installer
Write-Host "`n[4/4] Building Windows installer..." -ForegroundColor Yellow
Set-Location $eApp

# Generate icon
node icon-gen.js

# Wait a moment for async icon generation
Start-Sleep -Seconds 3

npm install
if ($LASTEXITCODE -ne 0) { throw "Electron npm install failed!" }

npx electron-builder --win
if ($LASTEXITCODE -ne 0) { throw "electron-builder failed!" }

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "  BUILD COMPLETE!" -ForegroundColor Green
Write-Host "  Installer is in: $eApp\dist\" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

Start-Process explorer.exe "$eApp\dist"
