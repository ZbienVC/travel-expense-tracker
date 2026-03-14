# Database Setup & Migrations Guide

## Overview

The Travel Expense Tracker uses Prisma ORM with PostgreSQL. This guide covers setup, migrations, and management.

## Prerequisites

- PostgreSQL 14+ installed
- Node.js 18+
- Prisma CLI (`npm install -g @prisma/client`)

## Step 1: PostgreSQL Setup

### Local Development

#### On macOS (Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16
```

#### On Ubuntu/Debian

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### On Windows

Download and install [PostgreSQL from here](https://www.postgresql.org/download/windows/)

### Verify Installation

```bash
psql --version
psql -U postgres -c "SELECT 1"
```

## Step 2: Create Development Database

```bash
# Connect to default postgres database
psql -U postgres

# Create travel expense tracker database
CREATE DATABASE travel_expense_tracker;
CREATE DATABASE travel_expense_tracker_test;

# Verify
\l

# Exit
\q
```

## Step 3: Configure Connection

Create `.env`:

```env
# Development
DATABASE_URL="postgresql://postgres:password@localhost:5432/travel_expense_tracker"

# Testing (optional)
DATABASE_URL_TEST="postgresql://postgres:password@localhost:5432/travel_expense_tracker_test"
```

## Step 4: Run Initial Migration

```bash
# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Or for development (with prompts)
npm run db:migrate:dev
```

## Database Schema

### Tables

#### User
Stores application users

```prisma
model User {
  id       String   @id @default(cuid())
  email    String   @unique
  name     String?
  trips    Trip[]
  expenses Expense[]
}
```

**Key fields:**
- `id` - Unique identifier (CUID)
- `email` - User email (unique)
- `name` - Optional display name

#### Trip
Parent container for expenses and travel segments

```prisma
model Trip {
  id          String         @id @default(cuid())
  userId      String
  user        User           @relation(fields: [userId], references: [id])
  
  name        String         // e.g., "Europe Summer 2026"
  startDate   DateTime
  endDate     DateTime
  destination String?
  
  expenses    Expense[]
  segments    TravelSegment[]
}
```

**Key fields:**
- `startDate`, `endDate` - Trip duration
- `destination` - Primary destination (for filtering)

#### Expense
Individual expense transactions

```prisma
model Expense {
  id          String   @id @default(cuid())
  userId      String
  tripId      String?
  
  amount      Float    // Amount in cents
  currency    String   // "USD", "EUR", etc.
  category    String   // "food", "transport", "accommodation", "activity", "other"
  description String
  
  receiptUrl  String?  // URL to receipt image
  ocrData     String?  // Extracted text from Vision API
  
  date        DateTime
}
```

**Key fields:**
- `receiptUrl` - S3/GCS URL to receipt image
- `ocrData` - Raw OCR text for reference
- `currency` - Multi-currency support

#### TravelSegment
Travel segments between locations (flights, car rides, etc.)

```prisma
model TravelSegment {
  id              String   @id @default(cuid())
  tripId          String
  trip            Trip     @relation(fields: [tripId], references: [id])
  
  type            String   // "flight", "car", "train", "bus", "walking"
  origin          String   // "NYC", "JFK", "40.7128,-74.0060"
  destination     String   // Same format as origin
  distanceMiles   Float?   // Calculated by Maps API
  
  date            DateTime
  notes           String?
}
```

**Key fields:**
- `distanceMiles` - Set by Google Maps API integration
- `type` - Transport type for analytics
- `date` - When travel occurred

#### AnalyticsCache
Pre-computed analytics for performance

```prisma
model AnalyticsCache {
  id                  String   @id @default(cuid())
  tripId              String   @unique
  trip                Trip     @relation(fields: [tripId], references: [id])
  
  totalExpenses       Float
  expensesByCategory  Json     // { "food": 500, "transport": 1200 }
  averageDailySpend   Float
  currencyBreakdown   Json     // { "USD": 2000, "EUR": 500 }
  
  lastUpdated         DateTime @updatedAt
}
```

**Purpose:**
- Cache expensive analytics queries
- Invalidate on expense changes
- Improves dashboard performance

#### APIRateLimit
Tracks API usage for rate limiting and cost control

```prisma
model APIRateLimit {
  id           String   @id @default(cuid())
  service      String   // "google-vision", "google-maps"
  userId       String
  requestCount Int
  resetAt      DateTime // When counter resets
}
```

## Data Relationships

```
User (1) ────→ (Many) Trip (1) ────→ (Many) Expense
          ────→        Trip (1) ────→ (Many) TravelSegment
          ────→        Trip (1) ────→ (1) AnalyticsCache

Expense points to:
  - User (required)
  - Trip (optional - for unassigned expenses)
```

## Creating Migrations

### After Schema Changes

1. Update `prisma/schema.prisma`
2. Run migration:

```bash
# Development mode (interactive)
npm run db:migrate:dev --name add_field_name

# Example:
npm run db:migrate:dev --name add_receipt_url_to_expenses
```

3. Review generated SQL in `prisma/migrations/[timestamp]_[name]/migration.sql`
4. Commit to git:

```bash
git add prisma/migrations/
git commit -m "Add receipt_url to Expenses table"
```

## Seeding Database

### Create Seed Script

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.expense.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.user.deleteMany();

  // Create test user
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      trips: {
        create: {
          name: 'Europe 2026',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-30'),
          destination: 'Europe',
          expenses: {
            create: [
              {
                amount: 2500,
                currency: 'USD',
                category: 'accommodation',
                description: 'Hotel in Paris',
                date: new Date('2026-06-05'),
              },
            ],
          },
        },
      },
    },
    include: { trips: true },
  });

  console.log('Seeding complete:', user);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

### Run Seed

```bash
npm run db:seed
```

## Database Queries

### Find User with All Trips and Expenses

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const user = await prisma.user.findUnique({
  where: { id: 'user-id' },
  include: {
    trips: {
      include: {
        expenses: true,
        segments: true,
        analyticsCache: true,
      },
    },
  },
});
```

### Get Trip Analytics

```typescript
// Total expenses by category
const byCategory = await prisma.expense.groupBy({
  by: ['category'],
  where: { tripId: 'trip-id' },
  _sum: { amount: true },
  _count: true,
});

// Expenses by date
const byDate = await prisma.expense.findMany({
  where: { tripId: 'trip-id' },
  orderBy: { date: 'asc' },
});

// Daily average
const expenses = await prisma.expense.findMany({
  where: { tripId: 'trip-id' },
  select: { amount: true, date: true },
});

const dailyTotal = new Map();
expenses.forEach(({ amount, date }) => {
  const day = date.toISOString().split('T')[0];
  dailyTotal.set(day, (dailyTotal.get(day) || 0) + amount);
});
```

### Update AnalyticsCache

```typescript
async function updateTripAnalytics(tripId: string) {
  const expenses = await prisma.expense.findMany({
    where: { tripId },
  });

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) return;

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const expensesByCategory = {};
  expenses.forEach((e) => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
  });

  const dayCount = Math.ceil(
    (trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const averageDailySpend = totalExpenses / dayCount;

  const currencyBreakdown = {};
  expenses.forEach((e) => {
    currencyBreakdown[e.currency] = (currencyBreakdown[e.currency] || 0) + e.amount;
  });

  await prisma.analyticsCache.upsert({
    where: { tripId },
    update: {
      totalExpenses,
      expensesByCategory,
      averageDailySpend,
      currencyBreakdown,
    },
    create: {
      tripId,
      totalExpenses,
      expensesByCategory,
      averageDailySpend,
      currencyBreakdown,
    },
  });
}
```

## Backup & Restore

### Backup Database

```bash
# Full backup
pg_dump travel_expense_tracker > backup.sql

# Compressed backup
pg_dump travel_expense_tracker | gzip > backup.sql.gz
```

### Restore Database

```bash
# From SQL file
psql travel_expense_tracker < backup.sql

# From compressed
gunzip -c backup.sql.gz | psql travel_expense_tracker
```

## Production Deployment

### Environment Setup

```bash
# Production DATABASE_URL
DATABASE_URL="postgresql://user:password@prod-db.example.com:5432/travel_expense_tracker"
```

### Run Migrations in Production

```bash
# Never use db:migrate:dev in production!
npm run db:migrate

# This:
# 1. Checks pending migrations
# 2. Applies them in order
# 3. Exits with error if any migration fails
```

### Backup Before Migrations

```bash
# Always backup before production migrations
pg_dump travel_expense_tracker | gzip > backup-$(date +%s).sql.gz

# Then run
npm run db:migrate
```

## Troubleshooting

### Error: "Can't reach database server"

```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Check DATABASE_URL
echo $DATABASE_URL

# Verify connection
psql $DATABASE_URL -c "\l"
```

### Error: "Error in migration"

```bash
# Check migration status
npx prisma migrate status

# View all migrations
ls prisma/migrations/

# Rollback (development only)
npx prisma migrate resolve --rolled-back "migration-name"
```

### Prisma Client Out of Sync

```bash
# Regenerate Prisma Client
npx prisma generate

# Clear cache
rm -rf node_modules/.prisma/
npm install
```

## CLI Commands

```bash
# View schema in browser
npm run db:studio

# Generate migrations interactively
npm run db:migrate:dev --name my_changes

# Deploy to production
npm run db:migrate

# Reset database (development only!)
npx prisma db push --force-reset

# Seed test data
npm run db:seed

# Type-check queries
npx prisma validate
```

## Performance Optimization

### Indexes

Key indexes are already defined in schema:

```prisma
@@index([userId])
@@index([tripId, date])
@@index([category])
```

### Query Optimization

```typescript
// ❌ Bad: N+1 queries
const trips = await prisma.trip.findMany();
for (const trip of trips) {
  const expenses = await prisma.expense.findMany({ where: { tripId: trip.id } });
}

// ✅ Good: Single query with relation
const trips = await prisma.trip.findMany({
  include: { expenses: true },
});
```

## Additional Resources

- [Prisma Docs](https://www.prisma.io/docs/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Prisma Best Practices](https://www.prisma.io/docs/orm/more/help-center/orm-faq)
