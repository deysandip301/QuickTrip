# QuickTrip GitHub Setup Script
# This script will help you push your project to GitHub

Write-Host "🚀 QuickTrip GitHub Setup" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""

# Check if Git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git is not installed. Please install Git from https://git-scm.com/" -ForegroundColor Red
    Write-Host "   Download and install Git, then run this script again." -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "✅ Git is installed" -ForegroundColor Green

# Navigate to project directory
Set-Location "c:\Users\deysa\OneDrive\Desktop\QuickTrip"

Write-Host "📁 Current directory: $(Get-Location)" -ForegroundColor Cyan

# Initialize Git repository if not already done
if (-not (Test-Path ".git")) {
    Write-Host "🔧 Initializing Git repository..." -ForegroundColor Yellow
    git init
} else {
    Write-Host "✅ Git repository already initialized" -ForegroundColor Green
}

# Check Git configuration
$gitUser = git config --global user.name
$gitEmail = git config --global user.email

if (-not $gitUser -or -not $gitEmail) {
    Write-Host ""
    Write-Host "⚙️  Git configuration needed:" -ForegroundColor Yellow
    
    if (-not $gitUser) {
        $userName = Read-Host "Enter your GitHub username"
        git config --global user.name $userName
    }
    
    if (-not $gitEmail) {
        $userEmail = Read-Host "Enter your GitHub email"
        git config --global user.email $userEmail
    }
    
    Write-Host "✅ Git configuration complete" -ForegroundColor Green
} else {
    Write-Host "✅ Git is configured for: $gitUser ($gitEmail)" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔒 Checking security..." -ForegroundColor Yellow

# Check if .env files are properly ignored
if (Test-Path "server\.env") {
    Write-Host "⚠️  Found server\.env file - this will be ignored by Git (good!)" -ForegroundColor Yellow
}

if (Test-Path "client\.env") {
    Write-Host "⚠️  Found client\.env file - this will be ignored by Git (good!)" -ForegroundColor Yellow
}

# Show what will be committed
Write-Host ""
Write-Host "📋 Files to be committed:" -ForegroundColor Cyan
git add .
git status --porcelain

Write-Host ""
Write-Host "🔍 IMPORTANT: Check the above list!" -ForegroundColor Red
Write-Host "   Make sure NO .env files are listed (they contain your API keys)" -ForegroundColor Red
Write-Host "   If you see .env files, press Ctrl+C to stop this script" -ForegroundColor Red
Write-Host ""

$continue = Read-Host "Continue with commit? (y/N)"
if ($continue -ne "y" -and $continue -ne "Y") {
    Write-Host "❌ Aborted by user" -ForegroundColor Red
    exit 1
}

# Commit changes
Write-Host ""
Write-Host "💾 Committing changes..." -ForegroundColor Yellow
git commit -m "Initial commit: QuickTrip city guide application

Features:
- Interactive map with route visualization
- Smart location selection (GPS + manual input)
- Personalized recommendations
- Time and budget optimization
- Mobile-responsive design
- Secure API key management"

Write-Host "✅ Changes committed locally" -ForegroundColor Green

Write-Host ""
Write-Host "🌐 GitHub Repository Setup" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps to create your GitHub repository:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to https://github.com/new" -ForegroundColor White
Write-Host "2. Repository name: QuickTrip" -ForegroundColor White
Write-Host "3. Description: Intelligent city guide for planning optimal journeys" -ForegroundColor White
Write-Host "4. Set to Public (or Private if you prefer)" -ForegroundColor White
Write-Host "5. Do NOT initialize with README, .gitignore, or license (we already have these)" -ForegroundColor White
Write-Host "6. Click 'Create repository'" -ForegroundColor White
Write-Host ""

$githubUsername = Read-Host "Enter your GitHub username"
$repoUrl = "https://github.com/$githubUsername/QuickTrip.git"

Write-Host ""
Write-Host "🔗 Setting up remote repository..." -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin $repoUrl

Write-Host ""
Write-Host "📤 Ready to push to GitHub!" -ForegroundColor Green
Write-Host "Repository URL: $repoUrl" -ForegroundColor Cyan
Write-Host ""

$push = Read-Host "Push to GitHub now? (y/N)"
if ($push -eq "y" -or $push -eq "Y") {
    Write-Host ""
    Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Yellow
    
    try {
        git branch -M main
        git push -u origin main
        Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 Your QuickTrip project is now on GitHub!" -ForegroundColor Green
        Write-Host "   Visit: https://github.com/$githubUsername/QuickTrip" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Push failed. You may need to authenticate with GitHub." -ForegroundColor Red
        Write-Host "   Try running: git push -u origin main" -ForegroundColor Yellow
        Write-Host "   Or set up GitHub CLI: https://cli.github.com/" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "📝 Manual push commands:" -ForegroundColor Yellow
    Write-Host "   git branch -M main" -ForegroundColor White
    Write-Host "   git push -u origin main" -ForegroundColor White
}

Write-Host ""
Write-Host "🔑 Don't forget to:" -ForegroundColor Yellow
Write-Host "   1. Keep your .env files private (never commit them)" -ForegroundColor White
Write-Host "   2. Share .env.example files with collaborators" -ForegroundColor White
Write-Host "   3. Monitor your Google Maps API usage" -ForegroundColor White
Write-Host "   4. Set up repository secrets for production deployment" -ForegroundColor White
Write-Host ""

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
