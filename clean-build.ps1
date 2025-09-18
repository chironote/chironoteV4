Write-Host "Starting ChiroNote Clean Build Process..." -ForegroundColor Green

Write-Host "Deleting build folder..." -ForegroundColor Yellow
if (Test-Path "build") {
    Remove-Item -Recurse -Force build
    Write-Host "Build folder deleted" -ForegroundColor Green
} else {
    Write-Host "Build folder does not exist, skipping" -ForegroundColor Cyan
}

Write-Host "Deleting Android assets..." -ForegroundColor Yellow
if (Test-Path "android\app\src\main\assets") {
    Remove-Item -Recurse -Force android\app\src\main\assets
    Write-Host "Android assets deleted" -ForegroundColor Green
} else {
    Write-Host "Android assets do not exist, skipping" -ForegroundColor Cyan
}

Write-Host "Building React app..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "React build completed" -ForegroundColor Green
} else {
    Write-Host "React build failed" -ForegroundColor Red
    exit 1
}

Write-Host "Syncing to Capacitor..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -eq 0) {
    Write-Host "Capacitor sync completed" -ForegroundColor Green
} else {
    Write-Host "Capacitor sync failed" -ForegroundColor Red
    exit 1
}

Write-Host "Opening Android Studio..." -ForegroundColor Yellow
npx cap open android
if ($LASTEXITCODE -eq 0) {
    Write-Host "Android Studio opened" -ForegroundColor Green
} else {
    Write-Host "Android Studio open command completed with warnings" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Clean build process completed successfully!" -ForegroundColor Green
Write-Host "Project is ready to be built in Android Studio." -ForegroundColor Cyan
Write-Host "Build is ready!" -ForegroundColor Magenta
