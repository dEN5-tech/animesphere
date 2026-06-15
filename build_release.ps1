# AnimeSphere Portable Release Build Script
$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Starting AnimeSphere Portable Release Build " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Compile the frontend production bundle
Write-Host "`n[1/5] Compiling Frontend..." -ForegroundColor Yellow
Push-Location frontend
try {
    npm run build
} finally {
    Pop-Location
}

# 2. Compile the Rust backend in release mode
Write-Host "`n[2/5] Compiling Rust Backend in Release Mode..." -ForegroundColor Yellow
$env:PROTOC = "c:\projects\animesphere\bin\protoc\bin\protoc.exe"
cargo build --release

# 3. Create clean portable distribution folder
Write-Host "`n[3/5] Creating dist_portable directory..." -ForegroundColor Yellow
$portableDir = "dist_portable"
if (Test-Path $portableDir) {
    Remove-Item -Path $portableDir -Recurse -Force
}
New-Item -ItemType Directory -Path $portableDir | Out-Null

# 4. Copy required executable, DLL, and shaders
Write-Host "`n[4/5] Copying release files..." -ForegroundColor Yellow

# Copy executable
Copy-Item -Path "target\release\animesphere.exe" -Destination "$portableDir\animesphere.exe" -Force
Write-Host " -> Copied animesphere.exe" -ForegroundColor Gray

# Copy libmpv-2.dll
Copy-Item -Path "bin\mpv-sdk\libmpv-2.dll" -Destination "$portableDir\libmpv-2.dll" -Force
Write-Host " -> Copied libmpv-2.dll" -ForegroundColor Gray

# Copy shaders directory
Copy-Item -Path "shaders" -Destination "$portableDir\shaders" -Recurse -Force
Write-Host " -> Copied shaders directory" -ForegroundColor Gray

# 5. Compress the portable folder into a ZIP package
Write-Host "`n[5/5] Compressing files into a portable ZIP package..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
$zipFile = "animesphere_portable.zip"
if (Test-Path $zipFile) {
    Remove-Item -Path $zipFile -Force
}
Compress-Archive -Path "$portableDir\*" -DestinationPath $zipFile -Force

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host " Release Build Created Successfully!" -ForegroundColor Green
Write-Host "  -> Portable Folder:  c:\projects\animesphere\dist_portable" -ForegroundColor Green
Write-Host "  -> Portable Zip:     c:\projects\animesphere\animesphere_portable.zip" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Output directory listing for validation
Write-Host "`nContents of dist_portable:" -ForegroundColor Cyan
Get-ChildItem -Path $portableDir
