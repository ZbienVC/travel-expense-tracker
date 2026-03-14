# Travel Expense Tracker

AI-powered travel expense tracking app with receipt OCR scanning, analytics dashboard, and distance tracking.

## Features ✨

### Phase 1 - MVP ✅
- Trip management (create, edit, delete)
- Basic expense logging
- Expense categorization

### Phase 2 - Analytics & OCR 🎯 (Current)
- **Analytics Dashboard**
  - Pie chart: category breakdown
  - Line chart: daily spending trends
  - Bar chart: trip comparisons
  - Cost per day metric
  - Cost per mile metric
  - Top expense categories list

- **Receipt Scanning System**
  - Image upload UI
  - Google Vision API integration
  - Automated extraction: merchant, amount, date
  - Auto-fill expense form with OCR data
  - Error handling and confidence scoring

- **Updated Expense Form**
  - Pre-fill from OCR results
  - Manual edit fields
  - Category auto-suggestion based on merchant
  - Location auto-complete (ready for Google Maps)

- **Distance Tracking**
  - Travel segment tracking (flight, car, train, bus, etc.)
  - Google Maps distance calculation
  - Manual distance entry
  - Cost per mile analytics

- **API Endpoints**
  - `GET /api/analytics/trip/:tripId` - Trip analytics with all metrics
  - `GET /api/analytics/user/:userId` - User-level summary
  - `POST /api/expenses/scan` - Receipt OCR processing
  - `GET /api/expenses/trip/:tripId` - Trip expenses
  - `POST /api/segments` - Add travel segments
  - `GET /api/segments/trip/:tripId` - Trip segments with distance summary
  - `POST /api/segments/calculate-distance` - Calculate distance via Maps API

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- React Router for navigation
- Recharts for data visualization
- CSS3 Grid/Flexbox

**Backend:**
- Express.js (Node.js)
- TypeScript
- Google Vision API (OCR)
- Google Maps API (Distance)
- Prisma ORM
- PostgreSQL database

**Infrastructure:**
- Multer (file uploads)
- Pino (logging)
- Rate limiting support

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Google Cloud Vision API credentials
- Google Maps API key

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

Fill in:
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_VISION_KEY_PATH` - Path to Google Vision key JSON
- `GOOGLE_MAPS_API_KEY` - Your Google Maps API key

3. **Set up database:**
```bash
npm run db:migrate:dev
```

4. **Start development servers:**
```bash
npm run dev
```

Frontend: http://localhost:5173  
Backend API: http://localhost:3001

## API Examples

### Get Trip Analytics
```bash
curl http://localhost:3001/api/analytics/trip/{tripId}
```

**Response:**
```json
{
  "trip": {
    "id": "trip-123",
    "name": "Paris Summer 2024",
    "destination": "Paris",
    "startDate": "2024-07-01",
    "endDate": "2024-07-15"
  },
  "summary": {
    "totalExpenses": 2500.50,
    "expenseCount": 42,
    "tripDays": 15,
    "totalMiles": 850.5,
    "costPerDay": 166.70,
    "costPerMile": 2.94
  },
  "categoryBreakdown": {
    "food": 850,
    "transport": 600,
    "accommodation": 900,
    "activity": 150
  },
  "largestCategories": [
    {
      "category": "accommodation",
      "amount": 900,
      "percentage": 36
    }
  ]
}
```

### Scan Receipt
```bash
curl -X POST http://localhost:3001/api/expenses/scan \
  -F "receipt=@receipt.jpg" \
  -F "userId=user-123" \
  -F "tripId=trip-123"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rawText": "McDonald's\n42.50 USD\n2024-07-15",
    "merchant": "McDonald's",
    "amount": 42.50,
    "date": "2024-07-15",
    "confidence": 0.95,
    "receiptUrl": "/uploads/user-123/receipt-1721046000000.jpg"
  }
}
```

### Add Travel Segment
```bash
curl -X POST http://localhost:3001/api/segments \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "trip-123",
    "type": "flight",
    "origin": "JFK",
    "destination": "CDG",
    "date": "2024-07-01",
    "notes": "Direct flight"
  }'
```

## Project Structure

```
travel-expense-tracker/
├── src/
│   ├── server/
│   │   ├── index.ts              # Express app setup
│   │   ├── logger.ts             # Pino logger config
│   │   ├── routes/
│   │   │   ├── analytics.ts      # Analytics endpoints
│   │   │   ├── expenses.ts       # Expense CRUD + OCR
│   │   │   ├── segments.ts       # Travel segments
│   │   │   └── trips.ts          # Trip management
│   │   └── services/
│   │       ├── visionService.ts  # Google Vision API
│   │       └── mapsService.ts    # Google Maps API
│   │
│   └── client/
│       ├── App.tsx               # Root component
│       ├── main.tsx              # Entry point
│       ├── pages/
│       │   ├── AnalyticsDashboard.tsx
│       │   ├── ReceiptScanner.tsx
│       │   ├── DistanceTracker.tsx
│       │   ├── ExpenseForm.tsx
│       │   └── TripsList.tsx
│       ├── components/
│       │   └── Navigation.tsx
│       └── styles/
│           ├── Dashboard.css
│           ├── Scanner.css
│           ├── DistanceTracker.css
│           ├── ExpenseForm.css
│           └── TripsList.css
│
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── migrations/               # DB migrations
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Key Features Explained

### Receipt Scanning
1. User uploads receipt image
2. Google Vision API extracts text
3. Smart regex parsing finds:
   - Merchant name (first line)
   - Amount (currency + numbers)
   - Date (ISO format or MM/DD/YYYY)
4. Confidence score indicates accuracy
5. User can review and edit before saving

### Analytics Dashboard
- Real-time calculation from expense data
- Responsive charts using Recharts
- Cached metrics for performance
- Category breakdown with percentages
- Daily/trip comparisons

### Distance Tracking
- Automatic calculation via Google Maps Distance Matrix API
- Manual entry for non-route segments (flights)
- Integrated cost-per-mile metric
- Segment history with transport type

## Development

### Scripts
```bash
npm run dev              # Start frontend + backend
npm run dev:backend     # Backend only (tsx watch)
npm run dev:frontend    # Frontend only (Vite)
npm run build           # Build frontend + backend
npm run db:migrate:dev  # Run DB migrations
npm run db:studio       # Open Prisma Studio
npm run lint            # ESLint
npm run type-check      # TypeScript check
```

### Adding New Features

1. **Backend:**
   - Add route in `src/server/routes/`
   - Update Prisma schema if needed
   - Run `npm run db:migrate:dev`

2. **Frontend:**
   - Create component in `src/client/pages/` or `components/`
   - Add route in `App.tsx`
   - Style with CSS or Tailwind

## Performance Optimizations

- Analytics caching in database (AnalyticsCache table)
- Lazy loading for route components
- Recharts optimized for large datasets
- Rate limiting on Google APIs
- Image compression for receipt uploads (10MB limit)

## Error Handling

- OCR failures gracefully display confidence scores
- Maps API errors show helpful messages
- Database migrations validate schema
- File upload validation (type, size)
- Network request retry logic

## Future Enhancements (Phase 3)

- Currency conversion
- Shared trip budgets
- Expense splitting
- Mobile app (React Native)
- Export to CSV/PDF
- Real-time collaboration
- AI-powered budget recommendations

## Troubleshooting

### "Failed to connect to database"
- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Verify credentials

### "Google Vision API error"
- Verify `GOOGLE_VISION_KEY_PATH` points to valid JSON
- Check GCP project has Vision API enabled
- Ensure service account has proper permissions

### "No text detected in receipt"
- Image quality too low
- Receipt not clearly visible
- Try different angle/lighting

### "Port 3001/5173 already in use"
```bash
# Kill process on port
lsof -ti:3001 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3001   # Windows
```

## Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m "Add amazing feature"`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Create issue]
- Email: support@travelexpensetracker.dev
- Documentation: [Link to docs]

---

**Built with ❤️ using React, Express, and Google Cloud APIs**
