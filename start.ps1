# QuickTrip Startup Script
# This script will start both the backend and frontend servers

Write-Host "🚀 Starting QuickTrip Application..." -ForegroundColor Green

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Set-Location "c:\Users\deysa\OneDrive\Desktop\QuickTrip\server"
npm install

# Install frontend dependencies  
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location "c:\Users\deysa\OneDrive\Desktop\QuickTrip\client"
npm install

# Start Backend Server
Write-Host "📡 Starting backend server..." -ForegroundColor Yellow
Set-Location "c:\Users\deysa\OneDrive\Desktop\QuickTrip\server"
Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd 'c:\Users\deysa\OneDrive\Desktop\QuickTrip\server'; node server.js" -WindowStyle Normal

# Wait a bit for backend to start
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test backend connection
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5001" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✅ Backend server is running!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Backend might still be starting... continuing anyway" -ForegroundColor Yellow
}

# Start Frontend Server
Write-Host "🌐 Starting frontend server..." -ForegroundColor Yellow
Set-Location "c:\Users\deysa\OneDrive\Desktop\QuickTrip\client"
Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd 'c:\Users\deysa\OneDrive\Desktop\QuickTrip\client'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "✅ Both servers should be starting now!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:5001" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔍 If you see any errors:" -ForegroundColor Yellow
Write-Host "  1. Make sure both terminal windows are open and running" -ForegroundColor Gray
Write-Host "  2. Check that your Google Maps API key is correct in the .env files" -ForegroundColor Gray
Write-Host "  3. Try refreshing the browser page after a few seconds" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit this script (servers will continue running)..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
