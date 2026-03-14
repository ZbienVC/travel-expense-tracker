# Travel Expense Tracker - Production Deployment Guide

**Status:** Ready for Production Deployment  
**Last Updated:** March 14, 2026  
**Version:** 0.1.0

---

## 📋 Overview

This guide walks you through deploying:
1. **Backend** → Railway (Node.js/Express server)
2. **Frontend** → Expo (React Native mobile app)

### Quick Summary

| Component | Platform | URL Pattern | QR Code |
|-----------|----------|-------------|---------|
| Backend API | Railway | `https://travel-expense-tracker.up.railway.app` | N/A |
| Mobile App | Expo | `https://expo.dev/@zach/travel-expense` | ✓ Generated after publish |

---

## 🚀 Part 1: Backend Deployment to Railway

### Prerequisites

- Railway account (free tier available at https://railway.app)
- GitHub account with access to ZbienVC/travel-expense-tracker
- Environment variables ready:
  - `DATABASE_URL` - PostgreSQL connection string
  - `GOOGLE_VISION_KEY` - JSON key file contents
  - `GOOGLE_VISION_PROJECT_ID` - GCP project ID
  - `GOOGLE_MAPS_API_KEY` - Maps API key

### Step 1: Create Railway Project

1. Go to https://railway.app and sign up/login
2. Click **New Project**
3. Select **Deploy from GitHub**
4. Authorize Railway to access your GitHub account
5. Select `ZbienVC/travel-expense-tracker` repository

### Step 2: Configure Environment Variables

In Railway dashboard, go to **Variables**:

```bash
NODE_ENV=production
PORT=3000
API_URL=https://travel-expense-tracker.up.railway.app
LOG_LEVEL=info

# Database (Railway PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/travel_expense_tracker

# Google Vision
GOOGLE_VISION_KEY_PATH=./secrets/google-vision-key.json
GOOGLE_VISION_PROJECT_ID=your-gcp-project-id
GOOGLE_VISION_RATE_LIMIT_PER_HOUR=1000

# Google Maps
GOOGLE_MAPS_API_KEY=AIzaSy_YOUR_KEY_HERE
GOOGLE_MAPS_RATE_LIMIT_PER_HOUR=25000

# Optional
JWT_SECRET=your-secret-key-here
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### Step 3: Add PostgreSQL Database

1. In Railway dashboard, click **Create New Service**
2. Select **PostgreSQL**
3. Railway will auto-generate `DATABASE_URL`
4. This URL will be available in **Variables**

### Step 4: Handle Google Vision Key

Since Railway doesn't support JSON files directly:

**Option A: Use Base64 Encoding (Recommended)**

```bash
# On your local machine
cat secrets/google-vision-key.json | base64

# Add to Railway Variables as:
GOOGLE_VISION_KEY_BASE64=<base64-encoded-key>
```

Then update `visionService.ts`:

```typescript
const keyContent = process.env.GOOGLE_VISION_KEY_BASE64 
  ? Buffer.from(process.env.GOOGLE_VISION_KEY_BASE64, 'base64').toString()
  : fs.readFileSync(process.env.GOOGLE_VISION_KEY_PATH || '', 'utf-8');

const credentials = JSON.parse(keyContent);
```

**Option B: Use inline credentials**

Add individual GCP service account variables and construct the JSON in code.

### Step 5: Deploy

1. Railway automatically deploys when you push to GitHub
2. Or manually trigger: Click **Deploy** in Railway dashboard
3. Watch deployment logs: **Deployments** → **View Logs**

### Step 6: Get Production URL

After deployment succeeds:

```bash
# Navigate to Settings → Domains
# Your production URL will be:
https://travel-expense-tracker.up.railway.app

# Test health endpoint:
curl https://travel-expense-tracker.up.railway.app/health

# Expected response:
{"status":"ok","timestamp":"2026-03-14T22:42:00.000Z"}
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check logs for missing env vars or build errors |
| Runtime error | Verify DATABASE_URL is correct and db is seeded |
| Cold start delays | Normal for Railway free tier, upgrade for faster boots |
| API errors | Check GOOGLE_VISION_KEY and GOOGLE_MAPS_API_KEY |

---

## 📱 Part 2: Frontend Deployment to Expo

### Prerequisites

- Expo account (free at https://expo.dev)
- Expo CLI installed:
  ```bash
  npm install -g eas-cli expo-cli
  ```
- EAS Build account configured (same as Expo account)

### Step 1: Create Expo Account & Project

```bash
# Login to Expo
eas login

# Initialize EAS project (if not already done)
cd travel-expense-tracker
eas init

# This creates/updates eas.json and app.json
```

### Step 2: Configure app.json

The app.json is already configured with:

```json
{
  "expo": {
    "name": "Travel Expense Tracker",
    "slug": "travel-expense-tracker",
    "owner": "zach",
    "extra": {
      "apiUrl": "https://travel-expense-tracker.up.railway.app"
    }
  }
}
```

Update `"owner"` to your Expo username if different.

### Step 3: Install Dependencies for Mobile

```bash
# Add React Native dependencies for mobile
npm install expo expo-constants expo-device
npm install expo-camera  # For receipt scanning
npm install react-native react-native-web
```

### Step 4: Build & Publish

**Option A: Build APK for Android Testing (Recommended for Quick Testing)**

```bash
# Create development build for Android
eas build --platform android --profile development

# After build completes (~15-30 min), you get:
# - Download link for APK
# - QR code for direct installation
# - Build ID for future reference
```

**Option B: Publish to Expo Go (Fastest)**

```bash
# Publish directly to Expo Go (no build needed)
expo publish --release-channel production

# Access at:
# https://expo.dev/@zach/travel-expense-tracker

# Scan QR code in Expo Go app for instant access
```

**Option C: Production Build**

```bash
# Create production builds for App Store and Google Play
eas build --platform all --profile production

# After completion:
# - Submit to stores with eas submit
# OR
# - Distribute via TestFlight and Google Play Console
```

### Step 5: Generate QR Code

After publish/build, Expo provides a QR code:

```bash
# View your app details
eas app:view

# QR code will be displayed for:
# - https://expo.dev/@zach/travel-expense-tracker (Expo Go)
# - QR code for APK installation (if built)
```

**Manual QR Generation:**

```bash
# Install qrcode package
npm install qrcode

# Use in Node script to generate QR for testing
npx qrcode "https://expo.dev/@zach/travel-expense-tracker" -o qr-code.png
```

### Step 6: Configure API Endpoint

Update the backend URL in the app:

**Option A: Environment Variable (Recommended)**

```bash
# Update app.json:
{
  "extra": {
    "apiUrl": "https://travel-expense-tracker.up.railway.app"
  }
}

# Then publish:
eas publish
```

**Option B: Runtime Update**

In `src/mobile/App.tsx`:

```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL 
  || 'https://travel-expense-tracker.up.railway.app';
```

### Step 7: Test on Mobile

**Using Expo Go App (Easiest):**

1. Install Expo Go from App Store / Google Play
2. Scan the QR code from:
   ```
   https://expo.dev/@zach/travel-expense-tracker
   ```
3. App loads instantly on your phone

**Using APK (Built APK):**

1. Download APK from EAS Build
2. Install on Android device
3. Open app and test features

---

## ✅ Deployment Checklist

### Backend (Railway)

- [ ] Railway account created
- [ ] GitHub repo connected
- [ ] PostgreSQL database provisioned
- [ ] Environment variables configured
- [ ] Build succeeds without errors
- [ ] Health endpoint responds: `GET /health` → `200 OK`
- [ ] Database migrations applied
- [ ] Production URL documented: `https://travel-expense-tracker.up.railway.app`

### Frontend (Expo)

- [ ] Expo account created
- [ ] EAS CLI installed and logged in
- [ ] app.json configured with correct owner and API URL
- [ ] Build succeeds
- [ ] Published to Expo or APK built
- [ ] QR code generated and tested
- [ ] App connects to Railway backend
- [ ] All features work on mobile:
  - [ ] Trip creation
  - [ ] Expense logging
  - [ ] Receipt scanning
  - [ ] Distance tracking
  - [ ] Analytics viewing

---

## 📲 Testing Instructions

### Pre-Testing Requirements

1. **Backend is running:** https://travel-expense-tracker.up.railway.app/health returns 200
2. **Mobile app is installed** via Expo Go or APK
3. **Network access:** Both backend and app can reach each other

### Testing Workflow

#### 1. Create a Trip

```
1. Open app → Trips section
2. Click "Create New Trip"
3. Enter:
   - Trip Name: "Test Trip"
   - Destination: "New York"
   - Start Date: Today
   - End Date: Today + 1 week
4. Submit
Expected: Trip appears in list
```

#### 2. Add an Expense

```
1. Select your trip
2. Click "Add Expense"
3. Enter:
   - Amount: 50.00
   - Category: Food
   - Merchant: Restaurant Name
   - Date: Today
4. Submit
Expected: Expense is saved and appears in trip details
```

#### 3. Test Receipt Scanner

```
1. In Expense form, click "Scan Receipt"
2. Upload an image of a receipt
3. OCR extracts data:
   - Merchant name
   - Amount
   - Date
Expected: Form auto-fills with extracted data. Edit and submit.
```

#### 4. Add Distance/Segment

```
1. Go to Distance Tracker
2. Add segment:
   - Type: Flight
   - Origin: NYC
   - Destination: LA
   - Distance: 2500 miles
3. Submit
Expected: Segment saved, cost per mile calculated
```

#### 5. View Analytics

```
1. Go to Analytics Dashboard
2. See:
   - Total expenses
   - Category breakdown pie chart
   - Daily spending trend
   - Cost per day
   - Cost per mile
Expected: Charts render with correct data
```

### Performance Metrics

After testing, check:

- **App Load Time:** < 3 seconds (Expo Go), < 1 second (APK)
- **API Response Time:** < 500ms for most endpoints
- **OCR Processing:** < 2 seconds per receipt
- **Chart Rendering:** < 500ms for analytics dashboard

---

## 🔄 Continuous Updates

### After Initial Deployment

**To deploy new code:**

**Backend Changes:**

```bash
# Changes in src/server/
git add .
git commit -m "Backend: [description]"
git push origin main

# Railway auto-deploys. Monitor at:
# https://railway.app/project/[project-id]/logs
```

**Frontend Changes:**

```bash
# Changes in src/mobile/ or app.json
git add .
git commit -m "Mobile: [description]"
eas publish --release-channel production

# Expo app auto-updates. Check at:
# https://expo.dev/@zach/travel-expense-tracker
```

**Database Migrations:**

```bash
# Make schema changes
npx prisma migrate dev --name "description"

# Railway automatically runs migrations on deploy
# via Dockerfile: `npx prisma migrate deploy`
```

### Monitoring & Debugging

**Backend Logs:**

```bash
# View Railway logs
eas logs --service backend

# Or via Railway dashboard → Logs tab
```

**Frontend Crash Logs:**

```bash
# Access Expo dashboard
https://expo.dev/projects

# View app logs and crash reports
```

**Database Access:**

```bash
# Connect directly to Railway PostgreSQL
psql $DATABASE_URL

# Or use Prisma Studio
npx prisma studio
```

---

## 📊 Deployment Architecture

```
┌─────────────────────────────────────────────┐
│         Expo (Mobile Frontend)              │
│   https://expo.dev/@zach/...                │
│   - React Native UI                         │
│   - QR code for Expo Go                     │
└──────────────────┬──────────────────────────┘
                   │ HTTPS
                   ▼
┌─────────────────────────────────────────────┐
│      Railway (Backend API)                  │
│   https://travel-expense-tracker.up.railway │
│   - Express.js server                       │
│   - Node.js runtime                         │
│   - Docker containerized                    │
└──────────────────┬──────────────────────────┘
                   │ TCP/3000
                   ▼
┌─────────────────────────────────────────────┐
│   PostgreSQL Database (Railway)             │
│   - Prisma ORM                              │
│   - Migrations auto-applied                 │
└─────────────────────────────────────────────┘
```

---

## 🆘 Troubleshooting

### Backend Won't Deploy

```bash
# Check logs
eas logs

# Common issues:
# 1. Missing env vars → Add to Railway Variables
# 2. Build timeout → Check npm install size
# 3. Port conflict → Ensure PORT is 3000
```

### App Can't Connect to Backend

```bash
# Check CORS in backend
# src/server/index.ts line 20: app.use(cors())

# Verify API URL in app.json
# Should be production Railway URL, not localhost

# Test endpoint manually
curl https://travel-expense-tracker.up.railway.app/health
```

### OCR Returns Empty Text

```bash
# Check Google Vision API:
# 1. Service account has Vision API enabled
# 2. Credentials are valid
# 3. Image quality is sufficient

# Check receipt image:
# - Clear text
# - Good lighting
# - Orientation is correct
```

### Database Connection Error

```bash
# Check DATABASE_URL format
# Should be: postgresql://user:pass@host:port/dbname

# Verify credentials in Railway Variables
# Ensure PostgreSQL service is running

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

---

## 📞 Support & Next Steps

### After Deployment

1. **Share mobile app link:**
   ```
   https://expo.dev/@zach/travel-expense-tracker
   ```

2. **Share backend API base URL:**
   ```
   https://travel-expense-tracker.up.railway.app
   ```

3. **Collect feedback** on features and UX

4. **Monitor performance** via:
   - Railway dashboard (backend metrics)
   - Expo dashboard (app usage)
   - Database logs (query performance)

### Future Improvements

- [ ] Real-time expense sync
- [ ] Offline mode with local caching
- [ ] Push notifications
- [ ] User authentication
- [ ] Photo gallery integration
- [ ] Export to PDF/CSV
- [ ] Shared trips and expense splitting
- [ ] AI-powered budget recommendations

---

**Deployment Version:** 1.0  
**Last Updated:** 2026-03-14  
**Maintained By:** Zach  
**Repository:** https://github.com/ZbienVC/travel-expense-tracker
