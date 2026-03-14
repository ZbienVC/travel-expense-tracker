# ⚡ Quick Start - Deploy in 30 Minutes

**Time to Deploy:** 30 minutes  
**Difficulty:** Easy  
**Status:** All files ready ✅

---

## 🎯 The Plan

```
Step 1: Deploy Backend (Railway) ................... 15 minutes
Step 2: Deploy Frontend (Expo) ..................... 10 minutes
Step 3: Test Everything ........................... 5 minutes
TOTAL ..................... 30 minutes ✅
```

---

## 📋 Prerequisites (Check These First)

- [ ] GitHub account (already connected)
- [ ] Google Cloud credentials (Vision & Maps API keys)
- [ ] 30 minutes of free time
- [ ] Internet connection

**Don't have credentials?** See `docs/GOOGLE_VISION_SETUP.md` and `docs/GOOGLE_MAPS_SETUP.md`

---

## 🚀 DEPLOY BACKEND (Railway) - 15 min

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Click **Sign Up** with GitHub
3. Authorize Railway to access your GitHub

### Step 2: Create New Project
1. Click **New Project**
2. Select **Deploy from GitHub**
3. Find and select: `ZbienVC/travel-expense-tracker`
4. Wait for Railway to connect (1-2 min)

### Step 3: Add PostgreSQL Database
1. Click **Create New Service**
2. Select **PostgreSQL**
3. Railway creates database automatically
4. Copy the `DATABASE_URL` from Variables

### Step 4: Add Environment Variables

In Railway dashboard, go to **Variables** and add:

```env
# Copy-paste these:
NODE_ENV=production
PORT=3000
API_URL=https://travel-expense-tracker.up.railway.app
LOG_LEVEL=info

# From GCP Console:
GOOGLE_VISION_KEY=YOUR_VISION_KEY_HERE
GOOGLE_VISION_PROJECT_ID=YOUR_PROJECT_ID
GOOGLE_MAPS_API_KEY=YOUR_MAPS_KEY_HERE

# From Railway (auto-generated):
DATABASE_URL=postgresql://...
```

### Step 5: Deploy
1. Click **Deploy** button
2. Watch the logs (should take 3-5 minutes)
3. See ✅ when deployment succeeds

### Step 6: Get Your URL
1. Go to **Settings** tab
2. Under **Domains**, you'll see your live URL:
   ```
   https://travel-expense-tracker.up.railway.app
   ```

### ✅ Verify It Works
```bash
curl https://travel-expense-tracker.up.railway.app/health
```

Should return: `{"status":"ok","timestamp":"..."}`

---

## 📱 DEPLOY FRONTEND (Expo) - 10 min

### Step 1: Create Expo Account
1. Go to https://expo.dev
2. Click **Sign Up**
3. Create account with email or GitHub

### Step 2: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 3: Login to EAS
```bash
eas login
```

Enter your Expo credentials

### Step 4: Update Backend URL (Important!)

Edit `app.json` and update the backend URL:

```json
"extra": {
  "apiUrl": "https://travel-expense-tracker.up.railway.app"
}
```

Save the file.

### Step 5: Publish to Expo Go (Fastest!)

```bash
cd travel-expense-tracker
eas publish --release-channel production
```

This takes 2-3 minutes.

**OR** Build APK (if you want Android app file):
```bash
eas build --platform android --profile development
```

This takes 15-30 minutes, but gives you downloadable APK.

### Step 6: Get Your Live Link
After publish completes, you'll see:
```
✅ Published to Expo Go
Live URL: https://expo.dev/@zach/travel-expense-tracker
```

---

## 🧪 TEST IT - 5 min

### Test 1: Backend Health (1 min)
```bash
curl https://travel-expense-tracker.up.railway.app/health

# Should show:
# {"status":"ok","timestamp":"2026-03-14T..."}
```

### Test 2: Mobile App (4 min)

**On your phone:**

1. Install **Expo Go** app (App Store or Google Play)
2. Open Expo Go
3. Scan this QR code:
   ```
   https://expo.dev/@zach/travel-expense-tracker
   (Or use the QR from the Expo dashboard)
   ```
4. App loads instantly! 🎉

### Test 3: Create a Test Trip (in the app)

1. Tap "Trips"
2. Tap "Add Trip"
3. Enter:
   - Name: "Test Trip"
   - Destination: "NYC"
   - Dates: Any dates
4. Tap Save
5. See it in the list ✅

### Test 4: Add Expense

1. Select your trip
2. Tap "Add Expense"
3. Enter amount, category, date
4. Tap Save
5. See it listed ✅

---

## 🎉 You're Done!

### What You Have Now

```
✅ Live Backend API
   https://travel-expense-tracker.up.railway.app

✅ Live Mobile App
   https://expo.dev/@zach/travel-expense-tracker

✅ Fully Functional System
   - Create trips
   - Add expenses
   - Scan receipts
   - View analytics
   - Track distances
```

---

## 📊 Live URLs to Share

### With Your Team
```
🔗 Backend API:
https://travel-expense-tracker.up.railway.app

📱 Mobile App:
https://expo.dev/@zach/travel-expense-tracker

Test it in Expo Go app by scanning the QR code!
```

### API Endpoints (for developers)
```
GET    https://travel-expense-tracker.up.railway.app/api/trips
POST   https://travel-expense-tracker.up.railway.app/api/trips
GET    https://travel-expense-tracker.up.railway.app/api/expenses
POST   https://travel-expense-tracker.up.railway.app/api/expenses
POST   https://travel-expense-tracker.up.railway.app/api/expenses/scan
GET    https://travel-expense-tracker.up.railway.app/api/analytics/trip/:id
```

---

## ❌ Trouble?

### Backend won't deploy
```
→ Check environment variables in Railway Variables
→ Ensure all required vars are set (DATABASE_URL, GOOGLE_*, etc.)
→ Check build logs for errors
```

### App won't connect to backend
```
→ Verify API_URL in app.json matches Railway URL
→ Make sure backend is running (check /health)
→ Check that Railway database is connected
```

### App crashes on startup
```
→ Check Expo Build logs
→ Ensure all npm dependencies are installed
→ Try building again: eas build --platform android --profile development
```

### Receipt scanner doesn't work
```
→ Verify GOOGLE_VISION_KEY is correct
→ Check GCP project has Vision API enabled
→ Ensure image quality is good (clear receipt)
```

---

## 📚 Need More Help?

| Issue | Guide |
|-------|-------|
| Deployment steps | `PRODUCTION_DEPLOYMENT.md` |
| Railway setup | `docs/DATABASE_SETUP.md` |
| Google APIs | `docs/GOOGLE_VISION_SETUP.md` + `docs/GOOGLE_MAPS_SETUP.md` |
| Testing | `PRODUCTION_DEPLOYMENT.md` → Testing Instructions |
| Troubleshooting | `DEPLOYMENT_READY.md` → Troubleshooting section |

---

## ⏱️ Timeline

```
Now    ─→ Create Railway account (2 min)
       ─→ Add PostgreSQL (1 min)
       ─→ Set env variables (2 min)
       ─→ Deploy (5 min)
T+10   ─→ Backend ready ✅

       ─→ Create Expo account (2 min)
       ─→ Run eas publish (3 min)
T+20   ─→ Frontend ready ✅

       ─→ Test backend health (1 min)
       ─→ Scan QR and test app (4 min)
T+30   ─→ DONE! 🎉
```

---

## 🎯 Success Checklist

- [ ] Railway account created
- [ ] PostgreSQL database added
- [ ] Environment variables set
- [ ] Backend deployed and health check passes
- [ ] Expo account created
- [ ] EAS CLI installed
- [ ] app.json updated with Railway URL
- [ ] Frontend published to Expo
- [ ] Mobile app works (can create trip)
- [ ] URLs shared with team

---

## 🚀 Next Steps (After Deployment)

1. **Monitor Performance**
   - Railway: Dashboard → Logs
   - Expo: Dashboard → App analytics

2. **Gather Feedback**
   - Share links with testers
   - Collect feedback on features

3. **Plan Updates**
   - Write down bugs found
   - List feature requests
   - Plan Phase 3 improvements

4. **Make It Official**
   - Document the deployment
   - Set up monitoring/alerts
   - Plan maintenance schedule

---

## 💡 Pro Tips

1. **Save these URLs:**
   ```
   Backend: https://travel-expense-tracker.up.railway.app
   Mobile: https://expo.dev/@zach/travel-expense-tracker
   ```

2. **Auto-updates:** Push code to GitHub → Backend auto-updates (5 min)

3. **Share QR code:** More scannable than long URLs!

4. **Monitor logs:**
   - Railway: Check logs for backend errors
   - Expo: Check app logs for crashes

5. **Fast iteration:** Make a change → git push → auto-deploys!

---

## 📞 Support

- **Issues?** Check logs first!
  - Railway: Dashboard → Logs tab
  - Expo: Dashboard → App name → Logs
  
- **Stuck?** Read the detailed guides:
  - `PRODUCTION_DEPLOYMENT.md` (comprehensive)
  - `DEPLOYMENT_READY.md` (reference)
  - `docs/` folder (specific topics)

---

## 🎉 Ready?

```
You have:
✅ Code deployed
✅ Backend running
✅ Frontend live
✅ Mobile app working
✅ Database connected
✅ APIs responding

Status: READY FOR PRODUCTION ✅

LET'S GO! 🚀
```

---

**Time to Deploy:** 30 minutes ⏱️  
**Difficulty:** Easy 😊  
**Readiness:** 100% ✅

**Ready to ship! Let's do this! 🚀**
