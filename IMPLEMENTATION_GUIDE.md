# Phase 2 Implementation Guide

## Overview

This guide details how to implement Phase 2 features using the infrastructure setup.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/Vite)                    │
│  - Trip Dashboard                                           │
│  - Receipt Upload                                           │
│  - Analytics Visualization                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                    HTTP/REST
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Backend (Express.js)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Endpoints                                       │   │
│  │  - POST /api/trips                                   │   │
│  │  - GET /api/trips/:id                                │   │
│  │  - POST /api/expenses                                │   │
│  │  - POST /api/receipts/process (Vision API)          │   │
│  │  - POST /api/distances (Maps API)                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Services                                            │   │
│  │  - visionService (OCR)                               │   │
│  │  - mapsService (Distance Calculation)                │   │
│  │  - rateLimiter (Usage Tracking & Cost Control)       │   │
│  │  - errorHandler (Retry Logic & Circuit Breaker)      │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                   Prisma ORM
                         │
┌────────────────────────▼────────────────────────────────────┐
│                PostgreSQL Database                          │
│  - Users        - Trips          - Expenses                │
│  - TravelSegments  - AnalyticsCache  - APIRateLimit        │
└─────────────────────────────────────────────────────────────┘

                    External APIs
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    ┌───▼──┐        ┌───▼──┐        ┌───▼────────┐
    │Vision│        │ Maps │        │ Storage    │
    │ API  │        │ API  │        │(S3/Cloud)  │
    └──────┘        └──────┘        └────────────┘
```

## 1. Trip Management Endpoints

### Create Trip

```typescript
// POST /api/trips
// src/server/routes/trips.ts

import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { userId, name, startDate, endDate, destination } = req.body;

    // Validate input
    if (!userId || !name || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create trip
    const trip = await prisma.trip.create({
      data: {
        userId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        destination,
      },
    });

    // Initialize analytics cache
    await prisma.analyticsCache.create({
      data: {
        tripId: trip.id,
        totalExpenses: 0,
        expensesByCategory: {},
        averageDailySpend: 0,
        currencyBreakdown: {},
      },
    });

    res.json(trip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### Get Trip with Analytics

```typescript
// GET /api/trips/:id
router.get('/:id', async (req, res) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        expenses: true,
        segments: true,
        analyticsCache: true,
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    res.json(trip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 2. Expense Management Endpoints

### Create Expense

```typescript
// POST /api/expenses
import { checkRateLimit } from '../services/rateLimiter';

router.post('/', async (req, res) => {
  try {
    const { userId, tripId, amount, currency, category, description, date } =
      req.body;

    // Check rate limits (optional, just for tracking)
    const limit = await checkRateLimit('google-vision', userId);
    if (!limit.allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    const expense = await prisma.expense.create({
      data: {
        userId,
        tripId,
        amount: Math.round(amount * 100) / 100, // Store as float
        currency: currency || 'USD',
        category,
        description,
        date: new Date(date),
      },
    });

    // Invalidate analytics cache
    if (tripId) {
      await invalidateAnalyticsCache(tripId);
    }

    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function invalidateAnalyticsCache(tripId: string) {
  // Delete cache so it gets recalculated
  await prisma.analyticsCache.update({
    where: { tripId },
    data: {
      lastUpdated: new Date(0), // Mark as stale
    },
  });
}
```

### Attach Receipt to Expense

```typescript
// PATCH /api/expenses/:id/receipt
import { extractReceiptData } from '../services/visionService';

router.patch('/:id/receipt', async (req, res) => {
  try {
    const { receiptUrl } = req.body;

    if (!receiptUrl) {
      return res.status(400).json({ error: 'Receipt URL required' });
    }

    // Download image from receiptUrl
    // Process with Vision API
    const ocrResult = await extractReceiptData(receiptUrl);

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        receiptUrl,
        ocrData: ocrResult.success ? ocrResult.data.rawText : null,
      },
    });

    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 3. Receipt OCR Integration

### Process Receipt Upload

```typescript
// POST /api/receipts/process
import multer from 'multer';
import { extractReceiptData } from '../services/visionService';
import { handleOCRFailure } from '../middleware/errorHandler';

const upload = multer({ storage: multer.memoryStorage() });

router.post('/process', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId } = req.body;

    // Check rate limits
    const limit = await checkRateLimit('google-vision', userId);
    if (!limit.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        resetAt: limit.resetAt,
      });
    }

    // Save file temporarily
    const tempPath = `/tmp/receipt-${Date.now()}.jpg`;
    fs.writeFileSync(tempPath, req.file.buffer);

    try {
      // Extract data from receipt
      const result = await extractReceiptData(tempPath);

      if (!result.success) {
        // Fallback to manual entry
        const fallback = handleOCRFailure(
          new Error(result.error),
          'manual_entry'
        );
        return res.status(202).json(fallback);
      }

      res.json({
        success: true,
        data: result.data,
      });
    } finally {
      // Clean up temp file
      fs.unlinkSync(tempPath);
    }
  } catch (error) {
    const fallback = handleOCRFailure(error, 'manual_entry');
    res.status(400).json(fallback);
  }
});
```

## 4. Distance Tracking

### Add Travel Segment

```typescript
// POST /api/trips/:tripId/segments
import { calculateDistance } from '../services/mapsService';

router.post('/:tripId/segments', async (req, res) => {
  try {
    const { type, origin, destination, date } = req.body;

    // Calculate distance if ground transport
    let distanceMiles = null;
    if (type === 'car' || type === 'train' || type === 'bus') {
      const distResult = await calculateDistance(origin, destination);
      if (distResult.success) {
        distanceMiles = distResult.distanceMiles;
      }
    }

    const segment = await prisma.travelSegment.create({
      data: {
        tripId: req.params.tripId,
        type,
        origin,
        destination,
        distanceMiles,
        date: new Date(date),
      },
    });

    // Invalidate analytics
    await invalidateAnalyticsCache(req.params.tripId);

    res.json(segment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 5. Analytics Calculation

### Calculate Trip Analytics

```typescript
// GET /api/trips/:tripId/analytics
async function calculateTripAnalytics(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { expenses: true, segments: true },
  });

  if (!trip) return null;

  // Total expenses
  const totalExpenses = trip.expenses.reduce((sum, e) => sum + e.amount, 0);

  // By category
  const expensesByCategory = {};
  trip.expenses.forEach((e) => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e
      .amount;
  });

  // By currency
  const currencyBreakdown = {};
  trip.expenses.forEach((e) => {
    currencyBreakdown[e.currency] = (currencyBreakdown[e.currency] || 0) + e
      .amount;
  });

  // Daily average
  const dayCount =
    Math.ceil(
      (trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) || 1;
  const averageDailySpend = totalExpenses / dayCount;

  // Distance
  const totalDistance = trip.segments.reduce(
    (sum, s) => sum + (s.distanceMiles || 0),
    0
  );

  return {
    totalExpenses,
    expensesByCategory,
    currencyBreakdown,
    averageDailySpend,
    totalDistance,
    dayCount,
  };
}

router.get('/:tripId/analytics', async (req, res) => {
  try {
    const analytics = await calculateTripAnalytics(req.params.tripId);

    if (!analytics) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Update cache
    await prisma.analyticsCache.update({
      where: { tripId: req.params.tripId },
      data: {
        ...analytics,
        lastUpdated: new Date(),
      },
    });

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 6. Error Handling in Endpoints

### With Retry Logic

```typescript
import { withRetry } from '../middleware/errorHandler';

router.post('/process-batch', async (req, res) => {
  try {
    const { expenseIds } = req.body;

    const results = await Promise.all(
      expenseIds.map((id) =>
        withRetry(
          () => processExpenseWithVision(id),
          { maxAttempts: 3 }
        )
      )
    );

    res.json({ processed: results.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function processExpenseWithVision(expenseId: string) {
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  // ... process with vision
}
```

## 7. Testing Your Endpoints

### Integration Test Example

```typescript
// src/server/__tests__/trips.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import app from '../index';

const prisma = new PrismaClient();

describe('Trip Endpoints', () => {
  beforeEach(async () => {
    // Clear database
    await prisma.expense.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.user.deleteMany();
  });

  it('should create a trip', async () => {
    // Create user
    const user = await prisma.user.create({
      data: { email: 'test@example.com', name: 'Test User' },
    });

    // Create trip
    const res = await request(app)
      .post('/api/trips')
      .send({
        userId: user.id,
        name: 'Europe Trip',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        destination: 'Europe',
      });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Europe Trip');
  });

  it('should get trip with analytics', async () => {
    // Create trip with expenses
    const trip = await prisma.trip.create({
      data: {
        userId: 'user-1',
        name: 'Test Trip',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-30'),
        expenses: {
          create: [
            {
              userId: 'user-1',
              amount: 100,
              category: 'food',
              description: 'Lunch',
              date: new Date('2026-06-05'),
            },
          ],
        },
      },
      include: { expenses: true },
    });

    const res = await request(app).get(`/api/trips/${trip.id}`);

    expect(res.status).toBe(200);
    expect(res.body.expenses).toHaveLength(1);
  });
});
```

## 8. Database Workflow

### Typical Flow

```
1. User creates trip
   → Create Trip record
   → Create empty AnalyticsCache

2. User adds expense
   → Create Expense record
   → Invalidate analytics cache (set lastUpdated = 0)
   
3. User uploads receipt
   → Process with Vision API
   → Update Expense with OCR data
   → Invalidate cache

4. User views analytics
   → Check if cache is valid (fresh)
   → If stale: recalculate from expenses/segments
   → Update cache
   → Return analytics
```

## 9. Frontend Integration

### Upload Receipt (Example)

```typescript
// React component
async function UploadReceipt({ expenseId }: { expenseId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [ocrData, setOcrData] = useState<any>(null);

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('receipt', file);
    formData.append('userId', 'current-user-id');

    try {
      setLoading(true);
      const res = await fetch('/api/receipts/process', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (result.success) {
        setOcrData(result.data);
        // Show extracted data to user
      } else {
        // Fallback to manual entry
        setOcrData(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleUpload} disabled={loading}>
        {loading ? 'Processing...' : 'Upload Receipt'}
      </button>

      {ocrData && <pre>{JSON.stringify(ocrData, null, 2)}</pre>}
    </div>
  );
}
```

## Development Checklist

- [ ] Implement trip CRUD endpoints
- [ ] Implement expense CRUD endpoints
- [ ] Integrate Vision API for receipts
- [ ] Integrate Maps API for distances
- [ ] Implement analytics calculation
- [ ] Add rate limiting middleware
- [ ] Write integration tests
- [ ] Test error handling and retry logic
- [ ] Test with sample data
- [ ] Deploy and monitor

## Next Steps

1. **Start with Trip & Expense CRUD** - Foundation for all features
2. **Integrate Vision API** - Test with sample receipts
3. **Integrate Maps API** - Test with sample routes
4. **Build Analytics** - Calculate and cache trip metrics
5. **Frontend UI** - Build React components
6. **Testing & QA** - Comprehensive testing
7. **Deployment** - Deploy to staging/production

See individual documentation files for API-specific details.
