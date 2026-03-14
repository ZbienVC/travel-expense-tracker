# Travel Expense Tracker - Windows Deployment Script
# PowerShell version for Windows users

param(
    [ValidateSet("Backend", "Frontend", "Both")]
    [string]$DeployTarget = "Both"
)

# Color functions
function Write-Log {
    param([string]$Message, [ValidateSet("Info", "Success", "Warning", "Error")]$Level = "Info")
    $colors = @{
        "Info"    = "Cyan"
        "Success" = "Green"
        "Warning" = "Yellow"
        "Error"   = "Red"
    }
    Write-Host $Message -ForegroundColor $colors[$Level]
}

# Header
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Travel Expense Tracker - Production Deployment" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check Prerequisites
Write-Log "Checking prerequisites..." "Info"

# Check Node.js
try {
    $nodeVersion = node -v
    Write-Log "Node.js $nodeVersion found" "Success"
} catch {
    Write-Log "Node.js is not installed" "Error"
    exit 1
}

# Check npm
try {
    $npmVersion = npm -v
    Write-Log "npm $npmVersion found" "Success"
} catch {
    Write-Log "npm is not installed" "Error"
    exit 1
}

# Check git
try {
    $gitVersion = git --version
    Write-Log "$gitVersion found" "Success"
} catch {
    Write-Log "git is not installed" "Error"
    exit 1
}

# Backend Deployment
if ($DeployTarget -eq "Backend" -or $DeployTarget -eq "Both") {
    Write-Host ""
    Write-Host "════════ BACKEND DEPLOYMENT (RAILWAY) ════════" -ForegroundColor Cyan
    Write-Host ""

    # Check Railway CLI
    try {
        $null = railway whoami
        Write-Log "Railway CLI is authenticated" "Success"
    } catch {
        Write-Log "Railway CLI not found or not authenticated" "Warning"
        Write-Log "Please install: npm install -g @railway/cli" "Info"
        Write-Log "Then login: railway login" "Info"
        $continue = Read-Host "Continue? (y/n)"
        if ($continue -ne "y") { exit 1 }
    }

    # Build backend
    Write-Log "Building backend..." "Info"
    npm run build:backend
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Backend build failed" "Error"
        exit 1
    }
    Write-Log "Backend built successfully" "Success"

    # Check Dockerfile
    if (-not (Test-Path "Dockerfile")) {
        Write-Log "Creating Dockerfile..." "Warning"
        # Create a basic Dockerfile
        @"
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src ./src
COPY prisma ./prisma
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
COPY --from=builder /app/dist ./dist
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "dist/server/index.js"]
"@ | Out-File -Encoding UTF8 Dockerfile
        Write-Log "Dockerfile created" "Success"
    }

    # Check railway.json
    if (-not (Test-Path "railway.json")) {
        Write-Log "Creating railway.json..." "Warning"
        $railwayJson = @{
            "`$schema" = "https://railway.app/railway.schema.json"
            "build" = @{
                "builder" = "dockerfile"
                "dockerfile" = "./Dockerfile"
            }
        } | ConvertTo-Json
        $railwayJson | Out-File -Encoding UTF8 railway.json
        Write-Log "railway.json created" "Success"
    }

    Write-Log "Backend deployment prepared" "Success"
    Write-Log "Next: Go to https://railway.app to connect GitHub and deploy" "Info"
    Write-Host ""
}

# Frontend Deployment
if ($DeployTarget -eq "Frontend" -or $DeployTarget -eq "Both") {
    Write-Host ""
    Write-Host "════════ FRONTEND DEPLOYMENT (EXPO) ════════" -ForegroundColor Cyan
    Write-Host ""

    # Check EAS CLI
    try {
        $null = eas whoami
        Write-Log "EAS CLI is authenticated" "Success"
    } catch {
        Write-Log "EAS CLI not found or not authenticated" "Warning"
        Write-Log "Please install: npm install -g eas-cli" "Info"
        Write-Log "Then login: eas login" "Info"
        $continue = Read-Host "Continue? (y/n)"
        if ($continue -ne "y") { exit 1 }
    }

    # Check app.json
    if (-not (Test-Path "app.json")) {
        Write-Log "app.json not found" "Error"
        exit 1
    }

    # Read app.json
    $appJson = Get-Content app.json | ConvertFrom-Json
    $expoOwner = $appJson.expo.owner

    Write-Log "Expo owner: $expoOwner" "Success"

    # Update API URL
    $backendUrl = Read-Host "Enter Railway backend URL [https://travel-expense-tracker.up.railway.app]"
    if ([string]::IsNullOrWhiteSpace($backendUrl)) {
        $backendUrl = "https://travel-expense-tracker.up.railway.app"
    }

    Write-Log "Updating app.json with backend URL: $backendUrl" "Info"
    $appJson.expo.extra.apiUrl = $backendUrl
    $appJson | ConvertTo-Json -Depth 10 | Out-File -Encoding UTF8 app.json
    Write-Log "app.json updated" "Success"

    # Install dependencies
    Write-Log "Installing dependencies..." "Info"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Log "npm install failed" "Error"
        exit 1
    }
    Write-Log "Dependencies installed" "Success"

    # Choose deployment method
    Write-Host ""
    Write-Host "Select deployment method:" -ForegroundColor Cyan
    Write-Host "1. Publish to Expo Go (fastest, instant access)"
    Write-Host "2. Build APK for Android (takes ~15-30 min)"
    Write-Host "3. Production build (for App Store/Play Store)"
    $choice = Read-Host "Select [1-3]"

    switch ($choice) {
        "1" {
            Write-Log "Publishing to Expo Go..." "Info"
            eas publish --release-channel production
            if ($LASTEXITCODE -ne 0) {
                Write-Log "Expo publish failed" "Error"
                exit 1
            }
            $expoUrl = "https://expo.dev/@$expoOwner/travel-expense-tracker"
            Write-Log "Published to Expo Go" "Success"
        }
        "2" {
            Write-Log "Building APK for Android..." "Info"
            eas build --platform android --profile development
            if ($LASTEXITCODE -ne 0) {
                Write-Log "EAS build failed" "Error"
                exit 1
            }
            $expoUrl = "https://eas.dev/builds"
            Write-Log "Android APK built" "Success"
        }
        "3" {
            Write-Log "Creating production build..." "Info"
            eas build --platform all --profile production
            if ($LASTEXITCODE -ne 0) {
                Write-Log "EAS build failed" "Error"
                exit 1
            }
            $expoUrl = "https://eas.dev/builds"
            Write-Log "Production build created" "Success"
        }
        default {
            Write-Log "Invalid choice" "Error"
            exit 1
        }
    }

    Write-Log "Frontend URL: $expoUrl" "Success"
}

# Summary
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

Write-Log "Deployment Summary:" "Info"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ($DeployTarget -eq "Backend" -or $DeployTarget -eq "Both") {
    Write-Host "Backend (Railway):" -ForegroundColor Green
    Write-Host "  Dashboard: https://railway.app"
    Write-Host "  Health: https://travel-expense-tracker.up.railway.app/health"
}

if ($DeployTarget -eq "Frontend" -or $DeployTarget -eq "Both") {
    Write-Host "Frontend (Expo):" -ForegroundColor Green
    Write-Host "  URL: $expoUrl"
    Write-Host "  Owner: $expoOwner"
}

Write-Host ""
Write-Log "Next Steps:" "Info"
Write-Host "1. Test the backend health endpoint"
Write-Host "2. Scan the QR code to open the app"
Write-Host "3. Create a test trip and add expenses"
Write-Host "4. Test receipt scanning and analytics"
Write-Host "5. Check performance in browser/app"

Write-Host ""
Write-Log "Documentation:" "Info"
Write-Host "  See PRODUCTION_DEPLOYMENT.md for detailed testing instructions"

Write-Host ""
Write-Log "Happy Tracking! 🚀" "Success"
Write-Host ""
