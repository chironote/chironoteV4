# ChiroNote Clean Build Script
# Run with: .\clean-build.ps1

Write-Host "🧹 Starting ChiroNote Clean Build Process..." -ForegroundColor Green

# Step 1: Delete build folder
Write-Host "📁 Deleting build folder..." -ForegroundColor Yellow
if (Test-Path "build") {
    Remove-Item -Recurse -Force build
    Write-Host "✅ Build folder deleted" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Build folder doesn't exist, skipping" -ForegroundColor Cyan
}

# Step 2: Delete Android assets
Write-Host "📱 Deleting Android assets..." -ForegroundColor Yellow
if (Test-Path "android\app\src\main\assets") {
    Remove-Item -Recurse -Force android\app\src\main\assets
    Write-Host "✅ Android assets deleted" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Android assets don't exist, skipping" -ForegroundColor Cyan
}

# Step 3: Fresh React build
Write-Host "⚛️  Building React app..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ React build completed" -ForegroundColor Green
} else {
    Write-Host "❌ React build failed" -ForegroundColor Red
    exit 1
}

# Step 4: Sync to Capacitor
Write-Host "🔄 Syncing to Capacitor..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Capacitor sync completed" -ForegroundColor Green
} else {
    Write-Host "❌ Capacitor sync failed" -ForegroundColor Red
    exit 1
}

# Step 5: Build Android app
Write-Host "🤖 Building Android app..." -ForegroundColor Yellow
npx cap build android
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Android build completed" -ForegroundColor Green
} else {
    Write-Host "❌ Android build failed" -ForegroundColor Red
    exit 1
}

# Step 6: Open Android Studio
Write-Host "🚀 Opening Android Studio..." -ForegroundColor Yellow
npx cap open android
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Android Studio opened" -ForegroundColor Green
} else {
    Write-Host "⚠️  Android Studio open command completed with warnings" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Clean build process completed successfully!" -ForegroundColor Green
Write-Host "📱 APK will be at: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Cyan
Write-Host "☕ Enjoy your coffee! The build is ready." -ForegroundColor Magenta
