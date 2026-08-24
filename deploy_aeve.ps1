# AEVE Production Deployment Script
# This script syncs updates from 'local/back' to 'AEVE/back', secures them, and applies obfuscation.

$localBack = "c:\Users\User\Desktop\fripestore\local\back"
$aeveBackAbs = "c:\Users\User\Desktop\fripestore\AEVE\back"
$localFrontendOut = "c:\Users\User\Desktop\fripestore\local\fr\out"
$aeveFrontendOut = "c:\Users\User\Desktop\fripestore\AEVE\fr\out"
$obfDir = Join-Path $aeveBackAbs "obf"

Write-Host "==============================" -ForegroundColor Cyan
Write-Host "🚀 Starting AEVE Deployment" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# 1. Sync from local to AEVE (excluding node_modules and data)
Write-Host "📡 Syncing source files..." -ForegroundColor Yellow
# robocopy $localBack $aeveBackAbs /E /XF .env package-lock.json /XD node_modules logs uploads database /R:3 /W:5 /V /L /LOG:robocopy_log.txt
# robocopy $localBack $aeveBackAbs /E /XF .env package-lock.json /XD node_modules logs uploads database /R:3 /W:5
Get-ChildItem -Path $localBack -Exclude .env, package-lock.json, node_modules, logs, uploads, database | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $aeveBackAbs -Recurse -Force
}

# 1.5. Sync Static Frontend from local to AEVE
Write-Host "🎨 Syncing frontend assets..." -ForegroundColor Yellow
if (Test-Path $localFrontendOut) {
    if (-not (Test-Path $aeveFrontendOut)) { New-Item -ItemType Directory -Force -Path $aeveFrontendOut | Out-Null }
    Get-ChildItem -Path $localFrontendOut | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $aeveFrontendOut -Recurse -Force
    }
} else {
    Write-Host "⚠️ Warning: local/fr/out not found. Skipping frontend sync." -ForegroundColor Red
}

# 2. Secure and Prepare for Production
Write-Host "🔐 Securing production secrets..." -ForegroundColor Yellow
$secretsPath = Join-Path $aeveBackAbs "container\config\secrets.js"
$envPath = Join-Path $localBack ".env"

if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    foreach ($line in $envContent) {
        if ($line -match "ADMIN_SECRET_CODE=(.*)") {
            $secretCode = $matches[1].Trim('"')
            $jsContent = "// AEVE Production Secrets`nmodule.exports = { ADMIN_SECRET_CODE: `"$secretCode`" };"
            $configDir = Split-Path $secretsPath
            if (-not (Test-Path $configDir)) { New-Item -ItemType Directory -Force -Path $configDir | Out-Null }
            Set-Content -Path $secretsPath -Value $jsContent -Encoding UTF8
            break
        }
    }
}

# Update references to remove .env dependency
$deviceCheckPath = Join-Path $aeveBackAbs "container\Routes\deviceCheck.js"
if (Test-Path $deviceCheckPath) {
    Write-Host "🔗 Patching deviceCheck.js..." -ForegroundColor Gray
    $content = Get-Content $deviceCheckPath
    $content = $content -replace 'require\("dotenv"\)\.config\(\);', 'const secrets = require("../config/secrets");'
    $content = $content -replace 'process\.env\.ADMIN_SECRET_CODE', 'secrets.ADMIN_SECRET_CODE'
    $content | Set-Content $deviceCheckPath
}

$jwtPath = Join-Path $aeveBackAbs "container\utils\jwt.js"
if (Test-Path $jwtPath) {
    Write-Host "🔗 Patching jwt.js..." -ForegroundColor Gray
    $content = Get-Content $jwtPath
    $content = $content -replace 'require\("dotenv"\)\.config\(\);', ''
    $content | Set-Content $jwtPath
}

# 3. Bulk Obfuscation
Write-Host "🛡️ Applying backend obfuscation..." -ForegroundColor Yellow
if (Test-Path $obfDir) { Remove-Item -Recurse -Force $obfDir -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Force -Path $obfDir | Out-Null

# Run obfuscator on the entire directory at once (it's faster and more reliable)
# We exclude Models to prevent mangling of Sequelize property mappings
# Run obfuscator - disable string encoding (none) to eliminate CPU startup lag
# The code logic, variables, and arrays remain scrambled, but load instantly
npx --yes javascript-obfuscator $aeveBackAbs --output $obfDir `
    --string-array false `
    --compact true `
    --self-defending false `
    --identifier-names-generator mangled `
    --exclude "node_modules,obf,logs,uploads,database,container/Models" | Out-Null

# 4. Swap and Cleanup
Write-Host "🧹 Finalizing distribution package..." -ForegroundColor Yellow
if (Test-Path $obfDir) {
    # Move obfuscated files back to root
    Get-ChildItem -Path $obfDir | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $aeveBackAbs -Recurse -Force
        Remove-Item -Path $_.FullName -Recurse -Force
    }
    
    # Clean up any residual .tmp files/folders created by obfuscator
    Get-ChildItem -Path $aeveBackAbs -Filter "*.tmp" -Recurse | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force $obfDir -ErrorAction SilentlyContinue
}

# 5. Restore clean Models (obfuscator mangles Sequelize field names regardless of --exclude)
# We copy the unobfuscated Models back from local so property mappings work correctly.
Write-Host "🔄 Restoring original Sequelize Models..." -ForegroundColor Yellow
$localModels = Join-Path $localBack "container\Models"
$aeveModels = Join-Path $aeveBackAbs "container\Models"
if (Test-Path $localModels) {
    Copy-Item -Path "$localModels\*" -Destination $aeveModels -Recurse -Force
    Write-Host "   ✅ Models restored from local source." -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Local Models folder not found - skipping." -ForegroundColor Red
}

# 6. Restore template.controller.js (it handles deletion_secret_code which the obfuscator mangles)
Write-Host "🔄 Restoring template controller (contains security fields)..." -ForegroundColor Yellow
$localTemplateCtrl = Join-Path $localBack "container\Controllers\template.controller.js"
$aeveTemplateCtrl = Join-Path $aeveBackAbs "container\Controllers\template.controller.js"
if (Test-Path $localTemplateCtrl) {
    Copy-Item -Path $localTemplateCtrl -Destination $aeveTemplateCtrl -Force
    Write-Host "   ✅ template.controller.js restored from local source." -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Local template.controller.js not found - skipping." -ForegroundColor Red
}

# 6.5. Restore clean entry point index.js (prevents JIT compilation stall at startup)
Write-Host "🔄 Restoring original server entrypoint index.js..." -ForegroundColor Yellow
$localEntry = Join-Path $localBack "index.js"
$aeveEntry = Join-Path $aeveBackAbs "index.js"
if (Test-Path $localEntry) {
    Copy-Item -Path $localEntry -Destination $aeveEntry -Force
    Write-Host "   ✅ index.js restored from local source." -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Local index.js not found - skipping." -ForegroundColor Red
}

# 7. Restore entire container/ from clean local source (prevents double-obfuscation on repeat deploys)
Write-Host "🔄 Restoring all container folders from clean local source..." -ForegroundColor Yellow
$subFolders = @("Controllers", "Routes", "utils", "middlewares", "services", "migrations", "types")
foreach ($folder in $subFolders) {
    $src = Join-Path $localBack "container\$folder"
    $dest = Join-Path $aeveBackAbs "container\$folder"
    if (Test-Path $src) {
        Copy-Item -Path "$src\*" -Destination $dest -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   ✅ container/$folder restored." -ForegroundColor Green
    }
}

# Restore db.js only (do NOT overwrite secrets.js)
$localDbConfig = Join-Path $localBack "container\config\db.js"
$aeveDbConfig = Join-Path $aeveBackAbs "container\config\db.js"
if (Test-Path $localDbConfig) {
    Copy-Item -Path $localDbConfig -Destination $aeveDbConfig -Force
    Write-Host "   ✅ container/config/db.js restored." -ForegroundColor Green
}

# Restore database init scripts
foreach ($file in @("init.js", "schema.sql")) {
    $src = Join-Path $localBack "container\database\$file"
    $dest = Join-Path $aeveBackAbs "container\database\$file"
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $dest -Force
        Write-Host "   ✅ container/database/$file restored." -ForegroundColor Green
    }
}

Write-Host "==============================" -ForegroundColor Green
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
