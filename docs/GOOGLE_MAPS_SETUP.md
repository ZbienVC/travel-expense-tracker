# Google Maps API Setup Guide

## Overview

This guide covers setting up Google Maps API for distance calculation and geocoding in the Travel Expense Tracker.

## Prerequisites

- Google Cloud Project (same project as Vision API is fine)
- Billing enabled

## Step 1: Enable Required APIs

### Via Google Cloud Console

1. Go to **APIs & Services** → **Library**
2. Search and enable each:
   - **Distance Matrix API**
   - **Maps JavaScript API** (for frontend)
   - **Geocoding API**

3. Wait 1-2 minutes for activation

## Step 2: Create API Keys

### Create Restricted Key for Backend

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Click the pencil icon to edit the key
4. Set name: `Travel Expense Tracker - Backend`
5. Under **Application restrictions:**
   - Select **IP addresses (IPv4)**
   - Add your server IP(s)
6. Under **API restrictions:**
   - Select **Restrict key**
   - Check these APIs:
     - Distance Matrix API
     - Geocoding API
7. Click **Save**
8. Copy the key

### Create Key for Frontend (Optional, if using JS client)

1. Repeat steps 2-8
2. Set name: `Travel Expense Tracker - Frontend`
3. Under **Application restrictions:**
   - Select **HTTP referrers (web sites)**
   - Add your domain(s): `*.yourdomain.com`, `localhost:3000`
4. Under **API restrictions:**
   - Check Distance Matrix API, Maps JavaScript API

## Step 3: Configure Environment

Update `.env`:

```env
GOOGLE_MAPS_API_KEY="AIzaSy_YOUR_KEY_HERE"
VITE_MAPS_API_KEY="AIzaSy_YOUR_FRONTEND_KEY" # If using frontend maps
GOOGLE_MAPS_RATE_LIMIT_PER_HOUR=25000
```

## Step 4: Test the Setup

### Test Distance Calculation

```bash
# Using curl
curl -X POST http://localhost:3000/api/test/maps/distance \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "New York, NY",
    "destination": "Boston, MA"
  }'
```

### Expected Response

```json
{
  "success": true,
  "distanceMiles": 215.46,
  "distanceKm": 346.84,
  "durationSeconds": 13500,
  "durationMinutes": 225,
  "origin": "New York, NY, USA",
  "destination": "Boston, MA, USA"
}
```

### Test Geocoding

```bash
curl -X POST http://localhost:3000/api/test/maps/geocode \
  -H "Content-Type: application/json" \
  -d '{"address": "1600 Pennsylvania Avenue, Washington, DC"}'
```

### Expected Response

```json
{
  "lat": 38.8951,
  "lng": -77.0369,
  "formattedAddress": "1600 Pennsylvania Avenue NW, Washington, DC 20500, USA"
}
```

## Features Implemented

### Distance Matrix API

**Endpoint:** `/api/distances/calculate`

```typescript
import { calculateDistance } from './services/mapsService';

const result = await calculateDistance(
  'New York, NY',
  'Los Angeles, CA'
);

// Returns:
// {
//   distanceMiles: 2451.5,
//   distanceKm: 3945.2,
//   durationSeconds: 86400,
//   durationMinutes: 1440,
//   ...
// }
```

**Supported input formats:**
- City names: `"New York, NY"`
- Full addresses: `"350 5th Ave, New York, NY 10118"`
- Coordinates: `"40.7128,-74.0060"`
- Airport codes: `"LAX"` (for major airports)

### Geocoding API

**Endpoint:** `/api/maps/geocode`

```typescript
import { geocodeAddress } from './services/mapsService';

const coords = await geocodeAddress('San Francisco, CA');
// Returns: { lat: 37.7749, lng: -122.4194, ... }
```

## Pricing & Quotas

### Cost Structure

| Service | Cost |
|---|---|
| Distance Matrix API | $5 per 1000 requests |
| Geocoding API | $5 per 1000 requests |
| Maps JavaScript API | $7 per 1000 loads |

### Free Tier

- **$200/month free credit** covers:
  - ~40,000 Distance Matrix requests
  - ~40,000 Geocoding requests
  - ~28,000 Maps JS loads

### Example Monthly Costs

| Requests | Cost |
|---|---|
| 10,000 | $50 |
| 25,000 | $125 |
| 50,000 | $250 |

### Default Quotas

- **Requests per second:** 50
- **Requests per day:** Unlimited (billing-based)
- **Elements per request:** Up to 25 origins × 25 destinations

**Increase quotas** at **APIs & Services** → **Quotas**

## Rate Limiting

### App-Level Rate Limiting

```typescript
import { checkRateLimit } from './services/rateLimiter';

const limit = await checkRateLimit('google-maps', userId);
if (!limit.allowed) {
  return res.status(429).json({
    error: 'Rate limit exceeded',
    resetAt: limit.resetAt
  });
}
```

### Recommended Limits

```env
# Default: 25,000 requests/hour (Maps free tier daily)
GOOGLE_MAPS_RATE_LIMIT_PER_HOUR=25000

# Adjust based on your usage
# Conservative: 5000/hour
# Moderate: 10000/hour
# Aggressive: 20000/hour
```

### Cost Control

```typescript
import { isUserWithinCostLimit } from './services/rateLimiter';

// Hard limit: prevent expensive operations
if (!await isUserWithinCostLimit(userId)) {
  return res.status(402).json({
    error: 'Monthly cost limit reached',
    monthlyBudget: '$100'
  });
}
```

## Implementation Examples

### TravelSegment Distance Calculation

```typescript
import { calculateDistance } from '../services/mapsService';

// When creating a travel segment
async function createTravelSegment(tripId: string, segment: any) {
  const distanceResult = await calculateDistance(
    segment.origin,
    segment.destination
  );

  return db.travelSegment.create({
    data: {
      tripId,
      origin: segment.origin,
      destination: segment.destination,
      distanceMiles: distanceResult.distanceMiles,
      type: segment.type, // 'car', 'train', etc.
      date: segment.date,
    },
  });
}
```

### Analytics with Distance Data

```typescript
// Calculate total trip distance
async function getTripStats(tripId: string) {
  const segments = await db.travelSegment.findMany({
    where: { tripId },
  });

  const totalDistance = segments.reduce(
    (sum, s) => sum + (s.distanceMiles || 0),
    0
  );

  return {
    totalDistance,
    averageSegmentLength: totalDistance / segments.length,
    segments,
  };
}
```

## Troubleshooting

### Error: "REQUEST_DENIED"

- Verify API key is correct
- Check Distance Matrix API is enabled
- Confirm key restrictions allow your IP/domain
- Try removing IP restrictions temporarily to test

### Error: "INVALID_REQUEST"

- Verify origin/destination format
- Check for special characters that need URL encoding
- Ensure at least one of: address, coordinates, or place_id is provided

### Error: "ZERO_RESULTS"

- Location doesn't exist or has no route
- Try alternative address format
- Verify spelling of city/street names

### Quota Exceeded

- Check current usage: **APIs & Services** → **Quotas**
- Request limit increase (usually approved within hours)
- Implement caching to reduce duplicate requests

## Best Practices

### 1. Cache Results

```typescript
// Cache geocoding results (addresses rarely change)
const cache = new Map();

async function cachedGeocode(address: string) {
  if (cache.has(address)) return cache.get(address);
  
  const result = await geocodeAddress(address);
  cache.set(address, result);
  return result;
}
```

### 2. Batch Requests

```typescript
// Calculate multiple distances efficiently
const routes = [
  ['NYC', 'Boston'],
  ['LA', 'SF'],
  ['Chicago', 'Detroit']
];

const results = await Promise.all(
  routes.map(([origin, dest]) => calculateDistance(origin, dest))
);
```

### 3. Error Handling with Fallback

```typescript
async function getDistanceWithFallback(origin, destination) {
  try {
    return await calculateDistance(origin, destination);
  } catch (error) {
    // Fallback: estimate using coordinates
    const originCoords = await geocodeAddress(origin);
    const destCoords = await geocodeAddress(destination);
    
    if (originCoords && destCoords) {
      return estimateDistance(originCoords, destCoords);
    }
    
    return null;
  }
}
```

### 4. Monitor Costs

```typescript
// Check monthly spend before expensive operations
async function checkCostBudget(userId: string) {
  const monthlyCost = await getUserMonthlyCost(userId);
  const threshold = MONTHLY_COST_LIMIT * 0.8; // 80% of limit
  
  if (monthlyCost > threshold) {
    logger.warn(`User ${userId} approaching cost limit: $${monthlyCost}`);
  }
}
```

## Sample Test Data

```typescript
// Test coordinates (global)
const testCoordinates = {
  nyc: { lat: 40.7128, lng: -74.0060 },
  sf: { lat: 37.7749, lng: -122.4194 },
  london: { lat: 51.5074, lng: -0.1278 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
};

// Test routes
const testRoutes = [
  { from: 'New York, NY', to: 'Boston, MA' },
  { from: 'Los Angeles, CA', to: 'San Francisco, CA' },
  { from: 'Chicago, IL', to: 'Detroit, MI' },
];
```

## Production Checklist

- [ ] Distance Matrix API enabled
- [ ] Geocoding API enabled
- [ ] Maps JavaScript API enabled (if frontend maps)
- [ ] API keys created with proper restrictions
- [ ] Keys stored in environment variables
- [ ] Rate limiting configured in app
- [ ] Cost monitoring set up
- [ ] Error handling with fallbacks implemented
- [ ] Distance calculation tested with sample routes
- [ ] Geocoding tested with addresses and coordinates
- [ ] CI/CD pipeline includes Maps tests
- [ ] Monitoring/logging configured

## Additional Resources

- [Distance Matrix API Docs](https://developers.google.com/maps/documentation/distance-matrix)
- [Geocoding API Docs](https://developers.google.com/maps/documentation/geocoding)
- [Maps API Pricing](https://developers.google.com/maps/billing-and-pricing)
- [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [API Keys Best Practices](https://cloud.google.com/docs/authentication/api-keys)
