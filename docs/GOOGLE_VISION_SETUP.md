# Google Vision API Setup Guide

## Overview

This guide walks through setting up the Google Cloud Vision API for receipt OCR processing in the Travel Expense Tracker.

## Prerequisites

- Google Cloud Project (create one at [console.cloud.google.com](https://console.cloud.google.com))
- `gcloud` CLI installed ([Download](https://cloud.google.com/sdk/docs/install))
- Billing enabled on your GCP project

## Step 1: Create a Service Account

### Via Google Cloud Console

1. Navigate to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Enter details:
   - **Service account name:** `travel-expense-tracker-vision`
   - **Service account ID:** Auto-populated
   - **Description:** "OCR processing for receipt extraction"
4. Click **Create and Continue**

### Grant Roles

1. On the "Grant this service account access to project" screen, add these roles:
   - **Vision AI User** - For document/text detection
   - (Optional) **Cloud Logging Log Writer** - For monitoring
2. Click **Continue** then **Done**

## Step 2: Create and Download Service Account Key

1. Click the newly created service account
2. Go to **Keys** tab
3. Click **Add Key** → **Create new key**
4. Choose **JSON** format
5. Click **Create**
6. A JSON file will download automatically

### Store the Key Securely

```bash
# Create a secrets directory (add to .gitignore)
mkdir -p ./secrets
cp ~/Downloads/[service-account-key].json ./secrets/google-vision-key.json

# Set restrictive permissions
chmod 600 ./secrets/google-vision-key.json
```

**⚠️ WARNING:** Never commit this key to git. Add to `.gitignore`:

```
secrets/
.env.local
*.json.local
```

## Step 3: Enable Vision API

1. Go to **APIs & Services** → **Library**
2. Search for "Cloud Vision API"
3. Click on it
4. Click **Enable**

Wait 1-2 minutes for the API to be activated.

## Step 4: Environment Configuration

Update your `.env` file:

```env
GOOGLE_VISION_KEY_PATH="./secrets/google-vision-key.json"
GOOGLE_VISION_PROJECT_ID="your-project-id"
LOG_LEVEL="info"
```

Find your `PROJECT_ID` in:
- GCP Console → Dashboard → Project Info
- Or in the service account JSON file: `"project_id": "your-project-id"`

## Step 5: Test the Setup

### Install Dependencies

```bash
npm install
```

### Run Vision Test Script

```bash
# TypeScript version
npm run dev

# Then in another terminal:
curl -X POST http://localhost:3000/api/test/vision \
  -F "image=@path/to/test-receipt.jpg"
```

### Expected Response

```json
{
  "success": true,
  "text": "RECEIPT\nStarbucks Coffee\n...",
  "confidence": 0.95
}
```

## Authentication Methods

### Method 1: Service Account Key (Recommended for Backend)

```typescript
// Automatic via GOOGLE_APPLICATION_CREDENTIALS env var
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_VISION_KEY_PATH
});
```

### Method 2: ADC (Application Default Credentials)

If running on Google Cloud (Compute Engine, App Engine, Cloud Run):

```bash
# Set up ADC
gcloud auth application-default login
```

The client will automatically use ADC if available.

### Method 3: Explicit Credentials

```typescript
const client = new vision.ImageAnnotatorClient({
  credentials: {
    client_email: process.env.GOOGLE_VISION_EMAIL,
    private_key: process.env.GOOGLE_VISION_PRIVATE_KEY,
    project_id: process.env.GOOGLE_VISION_PROJECT_ID,
  },
});
```

## Troubleshooting

### Error: "PERMISSION_DENIED"

- Verify service account has "Vision AI User" role
- Check that Vision API is enabled
- Confirm correct project ID

### Error: "INVALID_ARGUMENT"

- Image format must be JPEG, PNG, GIF, or WebP
- File size should be < 20MB
- Check image is not corrupted

### Error: "Quota Exceeded"

- Check quota at **APIs & Services** → **Quotas**
- Vision API has limits (see Pricing below)
- Request quota increase if needed

### Connection Timeout

- Verify internet connection
- Check if Google Cloud services are accessible from your network
- Try retries (already built into error handler)

## Pricing & Quotas

### Cost Structure

- **First 1,000 requests/month:** FREE
- **1,001 - 5M requests/month:** $1.50 per 1,000 requests
- **5M+ requests/month:** $1.00 per 1,000 requests

### Example Costs

| Requests/Month | Cost |
|---|---|
| 1,000 | $0 (free tier) |
| 10,000 | $13.50 |
| 100,000 | $150 |
| 1,000,000 | $1,500 |

### Default Quotas

- **Requests per minute:** 600
- **Requests per day:** 1,000,000
- **Concurrent connections:** 100

**Increase quotas** at **APIs & Services** → **Quotas** → Search "Vision API"

## Best Practices

### 1. Image Preprocessing

Before sending to Vision API:

```typescript
// Resize large images to optimize cost
const resizedImage = await optimizeImage(imagePath, {
  maxWidth: 2000,
  maxHeight: 2000,
  quality: 85
});
```

### 2. Batch Processing

```typescript
// Process multiple receipts in one request
const batchResult = await client.batchAnnotateImages({
  requests: [
    { image: { content: image1 } },
    { image: { content: image2 } },
    { image: { content: image3 } },
  ],
});

// Cost: ~$0.0015 per image instead of per request
```

### 3. Cache Results

Store OCR results to avoid re-processing:

```typescript
// Check cache before calling API
const cached = await db.expenses.findOne({ receiptUrl });
if (cached?.ocrData) {
  return cached.ocrData; // No API cost
}
```

### 4. Error Handling

- Implement retry logic (already in `errorHandler.ts`)
- Set fallback to manual entry if OCR fails
- Log all failures for monitoring

### 5. Rate Limiting

The app includes built-in rate limiting:

```typescript
// Enforced per user/hour
const limit = await checkRateLimit('google-vision', userId);
if (!limit.allowed) {
  return res.status(429).json({ error: 'Rate limit exceeded' });
}
```

## Monitoring & Cost Control

### Setup Cost Monitoring

1. **GCP Console Alerts:**
   - Billing → Budgets & alerts
   - Create alert at $50/month threshold

2. **App-Level Monitoring:**
   - View monthly costs: `GET /api/analytics/costs`
   - Hard limit: $100/month (configurable)

### View API Usage

```bash
# Via gcloud
gcloud logging read "resource.type=api" --limit=10 --format=json

# Via Console: Cloud Logging → Logs Explorer
resource.type="api"
resource.labels.service="vision.googleapis.com"
```

## Production Checklist

- [ ] Service account created with minimal required roles
- [ ] Key stored securely in secrets directory
- [ ] `.env` configured with project ID
- [ ] Vision API enabled on GCP project
- [ ] Rate limiting configured in app
- [ ] Error handling and fallback logic in place
- [ ] Cost monitoring set up
- [ ] Tested with sample receipts
- [ ] CI/CD pipeline includes Vision tests
- [ ] Monitoring/logging configured

## Additional Resources

- [Google Vision API Docs](https://cloud.google.com/vision/docs)
- [Service Accounts Guide](https://cloud.google.com/iam/docs/service-accounts)
- [Node.js Vision Client](https://github.com/googleapis/nodejs-vision)
- [OCR Best Practices](https://cloud.google.com/vision/docs/ocr)
