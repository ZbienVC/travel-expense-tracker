import express, { Request, Response, Router } from 'express';
import { prisma } from '../index';
import logger from '../logger';

const router: Router = express.Router();

/**
 * POST /api/trips
 * Create a new trip
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, name, startDate, endDate, destination } = req.body;

    if (!userId || !name || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required fields: userId, name, startDate, endDate',
      });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const trip = await prisma.trip.create({
      data: {
        userId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        destination: destination || null,
      },
    });

    res.status(201).json(trip);
  } catch (error) {
    logger.error(`Trip creation error: ${error}`);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

/**
 * GET /api/trips/:id
 * Get trip details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const trip = await prisma.trip.findUnique({
      where: { id },
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
    logger.error(`Trip fetch error: ${error}`);
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
});

/**
 * GET /api/trips/user/:userId
 * Get all trips for a user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const trips = await prisma.trip.findMany({
      where: { userId },
      include: {
        expenses: {
          select: {
            amount: true,
          },
        },
        segments: {
          select: {
            distanceMiles: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    // Add summary to each trip
    const tripsWithSummary = trips.map((trip) => {
      const totalExpenses = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalMiles = trip.segments.reduce((sum, s) => sum + (s.distanceMiles || 0), 0);

      return {
        ...trip,
        summary: {
          totalExpenses,
          expenseCount: trip.expenses.length,
          totalMiles,
          segmentCount: trip.segments.length,
        },
      };
    });

    res.json(tripsWithSummary);
  } catch (error) {
    logger.error(`User trips fetch error: ${error}`);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

/**
 * PUT /api/trips/:id
 * Update trip
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate, destination } = req.body;

    const trip = await prisma.trip.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(destination && { destination }),
      },
    });

    res.json(trip);
  } catch (error) {
    logger.error(`Trip update error: ${error}`);
    res.status(500).json({ error: 'Failed to update trip' });
  }
});

/**
 * DELETE /api/trips/:id
 * Delete trip (cascades to expenses and segments)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.trip.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error(`Trip delete error: ${error}`);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
});

export default router;
