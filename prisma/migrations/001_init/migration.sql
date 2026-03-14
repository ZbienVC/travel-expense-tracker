-- CreateTable User
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex User_email_unique
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex User_email_index
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateTable Trip
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "destination" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- CreateIndex Trip_userId_index
CREATE INDEX "Trip_userId_idx" ON "Trip"("userId");

-- CreateIndex Trip_startDate_endDate_index
CREATE INDEX "Trip_startDate_endDate_idx" ON "Trip"("startDate", "endDate");

-- CreateTable TravelSegment
CREATE TABLE "TravelSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "distanceMiles" REAL,
    "date" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TravelSegment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE
);

-- CreateIndex TravelSegment_tripId_index
CREATE INDEX "TravelSegment_tripId_idx" ON "TravelSegment"("tripId");

-- CreateIndex TravelSegment_date_index
CREATE INDEX "TravelSegment_date_idx" ON "TravelSegment"("date");

-- CreateTable Expense
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tripId" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "receiptUrl" TEXT,
    "ocrData" TEXT,
    "date" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "Expense_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE SET NULL
);

-- CreateIndex Expense_userId_index
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");

-- CreateIndex Expense_tripId_index
CREATE INDEX "Expense_tripId_idx" ON "Expense"("tripId");

-- CreateIndex Expense_date_index
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex Expense_category_index
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateTable AnalyticsCache
CREATE TABLE "AnalyticsCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "totalExpenses" REAL NOT NULL,
    "expensesByCategory" TEXT NOT NULL,
    "averageDailySpend" REAL NOT NULL,
    "currencyBreakdown" TEXT NOT NULL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsCache_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE
);

-- CreateIndex AnalyticsCache_tripId_unique
CREATE UNIQUE INDEX "AnalyticsCache_tripId_key" ON "AnalyticsCache"("tripId");

-- CreateIndex AnalyticsCache_tripId_index
CREATE INDEX "AnalyticsCache_tripId_idx" ON "AnalyticsCache"("tripId");

-- CreateIndex AnalyticsCache_lastUpdated_index
CREATE INDEX "AnalyticsCache_lastUpdated_idx" ON "AnalyticsCache"("lastUpdated");

-- CreateTable APIRateLimit
CREATE TABLE "APIRateLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "service" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "resetAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex APIRateLimit_service_index
CREATE INDEX "APIRateLimit_service_idx" ON "APIRateLimit"("service");

-- CreateIndex APIRateLimit_resetAt_index
CREATE INDEX "APIRateLimit_resetAt_idx" ON "APIRateLimit"("resetAt");

-- CreateIndex APIRateLimit_service_userId_resetAt_unique
CREATE UNIQUE INDEX "APIRateLimit_service_userId_resetAt_key" ON "APIRateLimit"("service", "userId", "resetAt");
