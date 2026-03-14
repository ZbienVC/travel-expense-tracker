import express, { Request, Response, Router } from 'express';
import { prisma } from '../index';
import logger from '../logger';

const router: Router = express.Router();

/**
 * GET /api/analytics/trip/:tripId
 * Get comprehensive analytics for a specific trip
 */
router.get('/trip/:tripId', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;

    // Get trip data
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        expenses: true,
        segments: true,
        analyticsCache: true,
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Calculate analytics
    const expenses = trip.expenses;
    const tripDays = Math.ceil(
      (trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    let totalExpenses = 0;

    expenses.forEach((expense) => {
      categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] || 0) + expense.amount;
      totalExpenses += expense.amount;
    });

    // Daily spending
    const dailySpending: Record<string, number> = {};
    expenses.forEach((expense) => {
      const dateKey = expense.date.toISOString().split('T')[0];
      dailySpending[dateKey] = (dailySpending[dateKey] || 0) + expense.amount;
    });

    // Distance metrics
    let totalMiles = 0;
    trip.segments.forEach((segment) => {
      if (segment.distanceMiles) {
        totalMiles += segment.distanceMiles;
      }
    });

    const costPerDay = tripDays > 0 ? totalExpenses / tripDays : 0;
    const costPerMile = totalMiles > 0 ? totalExpenses / totalMiles : 0;

    // Largest expense categories
    const largestCategories = Object.entries(categoryBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount, percentage: (amount / totalExpenses) * 100 }));

    const analytics = {
      trip: {
        id: trip.id,
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
        destination: trip.destination,
      },
      summary: {
        totalExpenses,
        expenseCount: expenses.length,
        tripDays,
        totalMiles,
        costPerDay: Math.round(costPerDay * 100) / 100,
        costPerMile: Math.round(costPerMile * 100) / 100,
      },
      categoryBreakdown,
      dailySpending,
      largestCategories,
      segments: trip.segments.map((s) => ({
        id: s.id,
        type: s.type,
        origin: s.origin,
        destination: s.destination,
        distanceMiles: s.distanceMiles,
        date: s.date,
      })),
      lastUpdated: new Date().toISOString(),
    };

    // Update cache
    try {
      await prisma.analyticsCache.upsert({
        where: { tripId },
        create: {
          tripId,
          totalExpenses,
          expensesByCategory: categoryBreakdown,
          averageDailySpend: costPerDay,
          currencyBreakdown: { USD: totalExpenses }, // Simplified
        },
        update: {
          totalExpenses,
          expensesByCategory: categoryBreakdown,
          averageDailySpend: costPerDay,
          currencyBreakdown: { USD: totalExpenses },
        },
      });
    } catch (cacheError) {
      logger.warn(`Failed to update analytics cache: ${cacheError}`);
    }

    res.json(analytics);
  } catch (error) {
    logger.error(`Analytics error: ${error}`);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/analytics/user/:userId
 * Get summary analytics for all trips by user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const trips = await prisma.trip.findMany({
      where: { userId },
      include: {
        expenses: true,
        segments: true,
      },
    });

    if (trips.length === 0) {
      return res.json({
        summary: {
          totalTrips: 0,
          totalExpenses: 0,
          totalDays: 0,
          totalMiles: 0,
        },
        trips: [],
      });
    }

    const tripAnalytics = trips.map((trip) => {
      const expenses = trip.expenses;
      const tripDays = Math.ceil(
        (trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      let totalMiles = 0;
      trip.segments.forEach((s) => {
        if (s.distanceMiles) totalMiles += s.distanceMiles;
      });

      return {
        id: trip.id,
        name: trip.name,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        totalExpenses,
        tripDays,
        totalMiles,
        costPerDay: Math.round((totalExpenses / tripDays) * 100) / 100,
        expenseCount: expenses.length,
      };
    });

    const summary = {
      totalTrips: trips.length,
      totalExpenses: tripAnalytics.reduce((sum, t) => sum + t.totalExpenses, 0),
      totalDays: tripAnalytics.reduce((sum, t) => sum + t.tripDays, 0),
      totalMiles: tripAnalytics.reduce((sum, t) => sum + t.totalMiles, 0),
    };

    res.json({ summary, trips: tripAnalytics });
  } catch (error) {
    logger.error(`User analytics error: ${error}`);
    res.status(500).json({ error: 'Failed to fetch user analytics' });
  }
});

export default router;
