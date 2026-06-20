# AnimeSphere Android Release Build Script
$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Starting AnimeSphere Android Release Build  " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Compile the frontend production bundle
Write-Host "`n[1/4] Compiling Frontend..." -ForegroundColor Yellow
Push-Location frontend
try {
    npm run build
} finally {
    Pop-Location
}

# 2. Configure Android NDK Environment
Write-Host "`n[2/4] Configuring Android NDK Toolchain..." -ForegroundColor Yellow
$ndkDir = "C:\Users\dEN5\AppData\Local\Android\Sdk\ndk\27.1.12297006"
$ndkBin = "$ndkDir\toolchains\llvm\prebuilt\windows-x86_64\bin"
$wryKotlinDir = "C:\projects\animesphere\gen\android\app\src\main\kotlin\com\example\animesphere"

if (-not (Test-Path $ndkDir)) {
    Write-Error "Android NDK not found at: $ndkDir"
}

New-Item -ItemType Directory -Path $wryKotlinDir -Force | Out-Null

# Inject NDK compilers into PATH and set compilation target variables
$env:PATH = "$ndkBin;" + $env:PATH
$env:CC_aarch64_linux_android = "aarch64-linux-android21-clang.cmd"
$env:CXX_aarch64_linux_android = "aarch64-linux-android21-clang++.cmd"
$env:AR_aarch64_linux_android = "llvm-ar.exe"
$env:CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER = "aarch64-linux-android21-clang.cmd"
$env:PROTOC = "c:\projects\animesphere\bin\protoc\bin\protoc.exe"
$env:WRY_ANDROID_PACKAGE = "com.example.animesphere"
$env:WRY_ANDROID_LIBRARY = "animesphere"
$env:WRY_ANDROID_KOTLIN_FILES_OUT_DIR = $wryKotlinDir

Write-Host " -> NDK Path: $ndkBin" -ForegroundColor Gray
Write-Host " -> Compiler: aarch64-linux-android21-clang" -ForegroundColor Gray
Write-Host " -> Wry Kotlin: $wryKotlinDir" -ForegroundColor Gray

# 3. Cross-compile the Rust backend in release mode for Android
Write-Host "`n[3/4] Compiling Rust Backend for Android (aarch64)..." -ForegroundColor Yellow
cargo build --target aarch64-linux-android --release

# 4. Create structured distribution folder
Write-Host "`n[4/4] Creating dist_android structure..." -ForegroundColor Yellow
$distDir = "dist_android"
if (Test-Path $distDir) {
    Remove-Item -Path $distDir -Recurse -Force
}

# Create Android jniLibs and assets structure
$jniLibsDir = "$distDir\jniLibs\arm64-v8a"
$assetsDir = "$distDir\assets"
New-Item -ItemType Directory -Path $jniLibsDir | Out-Null
New-Item -ItemType Directory -Path $assetsDir | Out-Null

# Copy compiled shared library (.so)
$soSource = "target\aarch64-linux-android\release\libanimesphere.so"
if (Test-Path $soSource) {
    Copy-Item -Path $soSource -Destination "$jniLibsDir\libanimesphere.so" -Force
    Write-Host " -> Copied libanimesphere.so" -ForegroundColor Gray
} else {
    Write-Error "Could not find compiled library at: $soSource"
}

# Copy shaders directory
Copy-Item -Path "shaders" -Destination "$assetsDir\shaders" -Recurse -Force
Write-Host " -> Copied shaders directory" -ForegroundColor Gray

# Copy frontend distribution assets
Copy-Item -Path "frontend\dist\index.html" -Destination "$assetsDir\index.html" -Force
Write-Host " -> Copied frontend HTML assets" -ForegroundColor Gray

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host " Release Library Build Completed!" -ForegroundColor Green
Write-Host "  -> Output Folder:   c:\projects\animesphere\dist_android" -ForegroundColor Green
Write-Host "  -> Native Library:  $jniLibsDir\libanimesphere.so" -ForegroundColor Green
Write-Host "  -> Assets Directory: $assetsDir" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

Write-Host "`nNext Steps to build APK:" -ForegroundColor Cyan
Write-Host " 1. Move the 'dist_android/jniLibs' and 'dist_android/assets' folders into your Android project template."
Write-Host " 2. Ensure your Android gradle file is configured to load 'libanimesphere.so'."
Write-Host " 3. Compile the APK using your gradle wrapper: ./gradlew assembleRelease"
