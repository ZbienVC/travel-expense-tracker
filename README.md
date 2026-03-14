# Travel Expense Tracker 🌍💰

AI-powered travel expense tracking with receipt OCR, trip analytics, and multi-currency support.

## Features

- **Receipt OCR** - Automatic expense extraction from receipt images using Google Vision API
- **Distance Tracking** - Calculate trip distances using Google Maps API
- **Trip Analytics** - Spending breakdown by category, currency, and daily average
- **Multi-Currency** - Track expenses in different currencies with conversion tracking
- **Rate Limiting** - Built-in API rate limiting and cost control
- **Database Migrations** - Type-safe schema with Prisma ORM
- **CI/CD Pipeline** - Automated testing and deployment checks

## Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL 14+
- **ORM:** Prisma 6.0
- **APIs:** Google Vision, Google Maps
- **Rate Limiting:** rate-limiter-flexible
- **Logging:** Pino

### Frontend
- **Build:** Vite 5.0
- **Type Safety:** TypeScript

### DevOps
- **CI/CD:** GitHub Actions
- **Linting:** ESLint
- **Testing:** Vitest

## Quick Start

### 1. Clone & Setup

```bash
git clone <repo>
cd travel-expense-tracker
npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb travel_expense_tracker

# Run migrations
npm run db:migrate
```

### 3. Google APIs Setup

See detailed guides:
- [Google Vision API Setup](./docs/GOOGLE_VISION_SETUP.md)
- [Google Maps API Setup](./docs/GOOGLE_MAPS_SETUP.md)

Quick summary:
```bash
# Place your Google Vision key here
cp ~/path/to/key.json ./secrets/google-vision-key.json

# Create .env
cat > .env << EOF
DATABASE_URL="postgresql://postgres@localhost/travel_expense_tracker"
GOOGLE_VISION_KEY_PATH="./secrets/google-vision-key.json"
GOOGLE_VISION_PROJECT_ID="your-project-id"
GOOGLE_MAPS_API_KEY="your-api-key"
EOF
```

### 4. Start Development

```bash
npm run dev

# Open:
# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
# Studio:   npm run db:studio
```

### 5. Test Setup

```bash
# Run all tests
npm test

# Backend tests with coverage
npm run test:backend -- --coverage

# Watch mode
npm run test:backend -- --watch
```

## Project Structure

```
travel-expense-tracker/
├── src/
│   ├── server/
│   │   ├── services/
│   │   │   ├── visionService.ts      # Google Vision OCR wrapper
│   │   │   ├── mapsService.ts        # Google Maps distance calculation
│   │   │   └── rateLimiter.ts        # Rate limiting & cost control
│   │   ├── middleware/
│   │   │   └── errorHandler.ts       # Error handling, retry logic, circuit breaker
│   │   ├── logger.ts
│   │   └── index.ts
│   └── client/
│       └── ...
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── migrations/
│       └── 001_initial_schema/
├── docs/
│   ├── GOOGLE_VISION_SETUP.md
│   ├── GOOGLE_MAPS_SETUP.md
│   ├── DATABASE_SETUP.md
│   └── CI_CD_DEPLOYMENT.md
├── .github/workflows/
│   └── ci.yml                        # GitHub Actions pipeline
├── .env.example
└── README.md
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update with your values:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/travel_expense_tracker"

# Google APIs
GOOGLE_VISION_KEY_PATH="./secrets/google-vision-key.json"
GOOGLE_VISION_PROJECT_ID="your-gcp-project-id"
GOOGLE_MAPS_API_KEY="your-api-key"

# Server
PORT=3000
NODE_ENV="development"

# Rate Limiting
GOOGLE_VISION_RATE_LIMIT_PER_HOUR=1000
GOOGLE_MAPS_RATE_LIMIT_PER_HOUR=25000
COST_LIMIT_MONTHLY_USD=100

# Optional
LOG_LEVEL="info"
```

### Google Service Account Key

**NEVER commit your keys to git!**

```bash
# Add to .gitignore (already done)
secrets/
.env.local

# Store key securely
mkdir -p secrets
cp ~/Downloads/google-vision-key.json secrets/
chmod 600 secrets/google-vision-key.json
```

## API Endpoints

### Vision API (OCR)

```bash
# Extract text from receipt
POST /api/receipts/process
Content-Type: multipart/form-data
file: <image>

# Response
{
  "success": true,
  "text": "RECEIPT\nStarbucks...",
  "confidence": 0.95
}
```

### Maps API

```bash
# Calculate distance
POST /api/distances/calculate
{
  "origin": "New York, NY",
  "destination": "Boston, MA"
}

# Response
{
  "success": true,
  "distanceMiles": 215.46,
  "distanceKm": 346.84,
  "durationMinutes": 225
}
```

### Expenses

```bash
# Create expense
POST /api/expenses
{
  "tripId": "trip-id",
  "amount": 45.50,
  "currency": "USD",
  "category": "food",
  "description": "Lunch",
  "date": "2026-03-14"
}

# Get trip expenses
GET /api/trips/:tripId/expenses

# Update expense
PATCH /api/expenses/:id
{
  "description": "Updated description"
}
```

### Analytics

```bash
# Get trip analytics
GET /api/trips/:tripId/analytics

# Response
{
  "totalExpenses": 2500,
  "expensesByCategory": {
    "food": 500,
    "accommodation": 1200,
    "transport": 800
  },
  "averageDailySpend": 83.33,
  "currencyBreakdown": {
    "USD": 2000,
    "EUR": 500
  }
}
```

## Database Schema

### Key Tables

- **User** - Application users
- **Trip** - Travel trips with dates and destinations
- **TravelSegment** - Travel segments (flights, drives, etc.)
- **Expense** - Individual expenses with OCR data
- **AnalyticsCache** - Pre-computed analytics for performance
- **APIRateLimit** - API usage tracking for cost control

See [Database Setup](./docs/DATABASE_SETUP.md) for details.

## Testing

### Unit Tests

```bash
npm run test:backend
```

### Integration Tests

Tests use a separate PostgreSQL database (`travel_expense_tracker_test`).

### Test Database Setup

```bash
createdb travel_expense_tracker_test
```

Tests automatically:
1. Run migrations
2. Execute test suite
3. Clean up after

## Error Handling

The app includes comprehensive error handling:

### Retry Logic

Automatic retry with exponential backoff for:
- Network timeouts (408)
- Rate limits (429)
- Server errors (500, 502, 503, 504)

```typescript
import { withRetry } from './middleware/errorHandler';

const result = await withRetry(
  () => callGoogleAPI(),
  { maxAttempts: 3, initialDelayMs: 1000 }
);
```

### Circuit Breaker

Prevents cascading failures:

```typescript
const breaker = new CircuitBreaker(
  5,      // Fail after 5 errors
  60000   // Reset after 1 minute
);

await breaker.call(() => callFlakeyAPI());
```

### OCR Fallback

If receipt OCR fails:

```typescript
// Fallback to manual entry
const result = handleOCRFailure(error, 'manual_entry');
// Returns: { requiresManualEntry: true, message: "..." }
```

## Rate Limiting & Cost Control

### Per-Hour Limits

- **Google Vision:** 1,000 requests/hour (default)
- **Google Maps:** 25,000 requests/hour (default)

### Monthly Cost Control

```typescript
const monthlyCost = await getUserMonthlyCost(userId);
if (monthlyCost > MONTHLY_COST_LIMIT) {
  // Prevent expensive operations
  return res.status(402).json({ error: 'Budget exceeded' });
}
```

Configure limits in `.env`:

```env
GOOGLE_VISION_RATE_LIMIT_PER_HOUR=1000
GOOGLE_MAPS_RATE_LIMIT_PER_HOUR=25000
COST_LIMIT_MONTHLY_USD=100
```

## CI/CD Pipeline

GitHub Actions automatically:
- Lints code (ESLint)
- Type checks (TypeScript)
- Runs tests (Vitest)
- Validates database migrations
- Builds frontend
- Security scans (npm audit)

See [CI/CD Deployment](./docs/CI_CD_DEPLOYMENT.md) for details.

### Status Badge

Add to your README:

```markdown
[![CI/CD Pipeline](https://github.com/yourusername/travel-expense-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/travel-expense-tracker/actions)
```

## Deployment

### Local Deployment

```bash
npm run build
npm run start
# Open http://localhost:3000
```

### Heroku Deployment

```bash
heroku create your-app-name
heroku config:set DATABASE_URL="postgresql://..."
heroku config:set GOOGLE_MAPS_API_KEY="..."
git push heroku main
heroku run npm run db:migrate
```

### Vercel Deployment (Frontend)

```bash
npm i -g vercel
vercel --prod
```

See [CI/CD Deployment](./docs/CI_CD_DEPLOYMENT.md) for more options.

## Troubleshooting

### Database Connection Error

```bash
# Verify PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Check DATABASE_URL
echo $DATABASE_URL

# Reset database
npm run db:migrate
```

### Vision API Error "PERMISSION_DENIED"

- Verify service account has "Vision AI User" role
- Check API is enabled in GCP Console
- Confirm key file path is correct

See [Google Vision Setup](./docs/GOOGLE_VISION_SETUP.md#troubleshooting)

### Maps API Error "REQUEST_DENIED"

- Verify API key is correct
- Check Distance Matrix API is enabled
- Confirm IP restrictions allow your server

See [Google Maps Setup](./docs/GOOGLE_MAPS_SETUP.md#troubleshooting)

### Tests Failing

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Run tests
npm test
```

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/add-receipt-upload
```

### 2. Make Changes

```bash
npm run dev
# Make your changes
npm run lint
npm test
```

### 3. Create Pull Request

- All CI checks pass ✅
- Code review approved
- Merge to develop

### 4. Merge to Main for Release

- CI checks pass ✅
- Deploy to production
- Tag release: `git tag v0.1.0`

## Performance Optimization

### Database Queries

Always use `include` to prevent N+1 queries:

```typescript
// ✅ Good
const trip = await prisma.trip.findUnique({
  where: { id },
  include: { expenses: true, segments: true }
});

// ❌ Bad
const trip = await prisma.trip.findUnique({ where: { id } });
const expenses = await prisma.expense.findMany({ where: { tripId } });
```

### Caching

Pre-computed analytics are cached:

```typescript
// Check cache first
const cache = await db.analyticsCache.findUnique({ where: { tripId } });
if (cache && cache.lastUpdated > oneDayAgo) {
  return cache;
}
```

## Contributing

1. Fork repository
2. Create feature branch: `git checkout -b feature/name`
3. Commit changes: `git commit -am "Add feature"`
4. Push to branch: `git push origin feature/name`
5. Open Pull Request

### Code Style

- Use TypeScript
- Follow ESLint rules: `npm run lint`
- Write tests for new features
- Update docs as needed

## Costs Estimate

### Monthly Cost (Per User)

| Usage | Vision | Maps | Total |
|---|---|---|---|
| Low (100K ops) | $150 | $50 | $200 |
| Medium (500K ops) | $750 | $250 | $1,000 |
| High (1M ops) | $1,500 | $500 | $2,000 |

**Note:** First 1,000 Vision requests/month are free.

## License

MIT

## Support

For issues or questions:
1. Check [troubleshooting guides](./docs/)
2. Review error messages and logs
3. Open GitHub issue with details

## API Credentials Location

When setup is complete, your API keys are stored at:

```
✓ Google Vision Service Key: ./secrets/google-vision-key.json
✓ Environment Variables: ./.env
✓ Database Connection: DATABASE_URL in .env
✓ Maps API Key: GOOGLE_MAPS_API_KEY in .env
```

**Security Note:**
- `secrets/` is git-ignored
- `.env` is git-ignored
- Never commit authentication credentials
- Use GitHub Secrets for CI/CD

## Setup Complete Checklist

- [ ] Repository cloned
- [ ] Dependencies installed: `npm install`
- [ ] PostgreSQL database created
- [ ] Database migrations run: `npm run db:migrate`
- [ ] Google Vision API setup complete
- [ ] Google Maps API setup complete
- [ ] `.env` file created with all variables
- [ ] Google Vision key stored in `./secrets/`
- [ ] Development environment tested: `npm run dev`
- [ ] Tests passing: `npm test`
- [ ] CI/CD pipeline configured
- [ ] GitHub Secrets configured
- [ ] Ready for Phase 2 implementation

## Next Steps

Phase 2 development can now begin:

1. **Frontend Implementation**
   - Build trip dashboard
   - Receipt upload UI
   - Analytics visualization

2. **Backend Endpoints**
   - Expense CRUD operations
   - Trip analytics API
   - User management

3. **Feature Integration**
   - Hook up Vision API for OCR
   - Integrate Maps for distance tracking
   - Build analytics engine

4. **Testing & Monitoring**
   - Add frontend tests
   - Set up production monitoring
   - Configure alerts

See individual documentation files for detailed information on each component.
