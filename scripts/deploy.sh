#!/bin/bash

# Travel Expense Tracker - Deployment Script
# This script automates the deployment process to Railway and Expo

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "${BLUE}▶${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Main script
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Travel Expense Tracker - Production Deployment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

# Check prerequisites
log "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    error "Node.js is not installed"
fi
success "Node.js $(node -v) found"

# Check npm
if ! command -v npm &> /dev/null; then
    error "npm is not installed"
fi
success "npm found"

# Check git
if ! command -v git &> /dev/null; then
    error "git is not installed"
fi
success "git found"

# Ask which deployment
echo -e "\n${BLUE}What would you like to deploy?${NC}"
echo "1. Backend (Railway only)"
echo "2. Frontend (Expo only)"
echo "3. Both (Backend + Frontend)"
read -p "Select [1-3]: " deploy_choice

case $deploy_choice in
    1)
        backend_only=true
        frontend_only=false
        ;;
    2)
        backend_only=false
        frontend_only=true
        ;;
    3)
        backend_only=false
        frontend_only=false
        ;;
    *)
        error "Invalid choice"
        ;;
esac

# Backend Deployment
if [ "$backend_only" = true ] || [ "$frontend_only" = false ]; then
    echo -e "\n${BLUE}════════ BACKEND DEPLOYMENT (RAILWAY) ════════${NC}\n"

    # Check Railway CLI
    if ! command -v railway &> /dev/null; then
        log "Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    success "Railway CLI is available"

    # Check Railway authentication
    log "Checking Railway authentication..."
    if ! railway whoami &> /dev/null; then
        warning "Not authenticated with Railway. Run: railway login"
        read -p "Have you logged in? (y/n): " railway_auth
        if [ "$railway_auth" != "y" ]; then
            error "Please log in to Railway first"
        fi
    fi
    success "Railway authentication OK"

    # Prepare backend
    log "Building backend..."
    npm run build:backend || error "Backend build failed"
    success "Backend built successfully"

    # Create Dockerfile check
    if [ ! -f "Dockerfile" ]; then
        warning "Dockerfile not found. Creating one..."
        cp docs/Dockerfile.template Dockerfile || error "Could not create Dockerfile"
    fi
    success "Dockerfile present"

    # Check railway.json
    if [ ! -f "railway.json" ]; then
        warning "railway.json not found. Creating one..."
        cat > railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "dockerfile",
    "dockerfile": "./Dockerfile"
  }
}
EOF
    fi
    success "railway.json configured"

    # Deploy to Railway
    log "Deploying to Railway..."
    railway up || warning "Railway deployment had issues. Check logs above."
    success "Railway deployment triggered"

    # Get Railway URL
    log "Retrieving deployment URL..."
    railway_domain=$(railway domain)
    if [ -z "$railway_domain" ]; then
        warning "Could not retrieve Railway domain. Check railway.app dashboard."
        railway_url="https://travel-expense-tracker.up.railway.app"
    else
        railway_url="https://$railway_domain"
    fi
    success "Backend URL: $railway_url"
fi

# Frontend Deployment
if [ "$frontend_only" = true ] || [ "$backend_only" = false ]; then
    echo -e "\n${BLUE}════════ FRONTEND DEPLOYMENT (EXPO) ════════${NC}\n"

    # Check EAS CLI
    if ! command -v eas &> /dev/null; then
        log "Installing EAS CLI..."
        npm install -g eas-cli
    fi
    success "EAS CLI is available"

    # Check Expo CLI
    if ! command -v expo &> /dev/null; then
        log "Installing Expo CLI..."
        npm install -g expo-cli
    fi
    success "Expo CLI is available"

    # Check EAS authentication
    log "Checking EAS authentication..."
    if ! eas whoami &> /dev/null; then
        warning "Not authenticated with EAS. Run: eas login"
        read -p "Have you logged in? (y/n): " eas_auth
        if [ "$eas_auth" != "y" ]; then
            error "Please log in to EAS first"
        fi
    fi
    success "EAS authentication OK"

    # Verify app.json
    if [ ! -f "app.json" ]; then
        error "app.json not found"
    fi
    log "Verifying app.json..."
    
    # Get owner from app.json
    expo_owner=$(grep '"owner"' app.json | head -1 | sed 's/.*"owner"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
    if [ -z "$expo_owner" ]; then
        error "Expo owner not configured in app.json"
    fi
    success "Expo owner: $expo_owner"

    # Update API URL
    read -p "Enter Railway backend URL [https://travel-expense-tracker.up.railway.app]: " backend_url
    backend_url=${backend_url:-https://travel-expense-tracker.up.railway.app}
    
    log "Updating API URL in app.json..."
    # Update app.json with backend URL (basic sed)
    sed -i "s|\"apiUrl\"[[:space:]]*:[[:space:]]*\"[^\"]*\"|\"apiUrl\": \"$backend_url\"|g" app.json
    success "API URL updated: $backend_url"

    # Install dependencies
    log "Installing dependencies..."
    npm install || error "npm install failed"
    success "Dependencies installed"

    # Choose deployment method
    echo -e "\n${BLUE}Select deployment method:${NC}"
    echo "1. Publish to Expo Go (fastest, instant access)"
    echo "2. Build APK for Android (takes ~15-30 min)"
    echo "3. Production build (for App Store/Play Store)"
    read -p "Select [1-3]: " expo_choice

    case $expo_choice in
        1)
            log "Publishing to Expo Go..."
            eas publish --release-channel production || error "Expo publish failed"
            success "Published to Expo Go"
            expo_url="https://expo.dev/@$expo_owner/travel-expense-tracker"
            ;;
        2)
            log "Building APK for Android..."
            eas build --platform android --profile development || error "EAS build failed"
            success "Android APK built. Check EAS dashboard for download link"
            expo_url="https://eas.dev/builds"
            ;;
        3)
            log "Creating production build..."
            eas build --platform all --profile production || error "EAS build failed"
            success "Production build created. Ready for App Store/Play Store"
            expo_url="https://eas.dev/builds"
            ;;
        *)
            error "Invalid choice"
            ;;
    esac

    success "Frontend URL: $expo_url"
fi

# Summary
echo -e "\n${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}\n"

echo -e "${BLUE}Deployment Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$backend_only" = true ] || [ "$frontend_only" = false ]; then
    echo -e "${GREEN}Backend (Railway):${NC}"
    echo "  URL: $railway_url"
    echo "  Health: $railway_url/health"
fi

if [ "$frontend_only" = true ] || [ "$backend_only" = false ]; then
    echo -e "${GREEN}Frontend (Expo):${NC}"
    echo "  URL: $expo_url"
    echo "  Owner: $expo_owner"
fi

echo -e "\n${BLUE}Next Steps:${NC}"
echo "1. Test the backend health endpoint"
echo "2. Scan the QR code to open the app"
echo "3. Create a test trip and add expenses"
echo "4. Test receipt scanning and analytics"
echo "5. Check performance in browser/app"

echo -e "\n${BLUE}Documentation:${NC}"
echo "  See PRODUCTION_DEPLOYMENT.md for detailed testing instructions"

echo -e "\n${GREEN}Happy Tracking! 🚀${NC}\n"
