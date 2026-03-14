import express, { Request, Response, Router } from 'express';
import { prisma } from '../index';
import { calculateDistance } from '../services/mapsService';
import logger from '../logger';

const router: Router = express.Router();

/**
 * POST /api/segments
 * Add travel segment to trip
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { tripId, type, origin, destination, distanceMiles, date, notes } = req.body;

    if (!tripId || !type || !origin || !destination || !date) {
      return res.status(400).json({
        error: 'Missing required fields: tripId, type, origin, destination, date',
      });
    }

    // Verify trip exists
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Calculate distance if not provided and transport type is ground-based
    let finalDistance = distanceMiles;
    if (!finalDistance && ['car', 'train', 'bus', 'walking'].includes(type)) {
      logger.info(`Calculating distance: ${origin} → ${destination}`);
      const distanceResult = await calculateDistance(origin, destination);
      if (distanceResult.success) {
        finalDistance = distanceResult.distanceMiles;
      }
    }

    const segment = await prisma.travelSegment.create({
      data: {
        tripId,
        type,
        origin,
        destination,
        distanceMiles: finalDistance || null,
        date: new Date(date),
        notes: notes || null,
      },
    });

    res.status(201).json(segment);
  } catch (error) {
    logger.error(`Segment creation error: ${error}`);
    res.status(500).json({ error: 'Failed to create segment' });
  }
});

/**
 * GET /api/segments/trip/:tripId
 * Get all segments for a trip
 */
router.get('/trip/:tripId', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;

    const segments = await prisma.travelSegment.findMany({
      where: { tripId },
      orderBy: { date: 'asc' },
    });

    const totalDistance = segments.reduce((sum, s) => sum + (s.distanceMiles || 0), 0);

    res.json({
      segments,
      summary: {
        totalDistance: Math.round(totalDistance * 100) / 100,
        segmentCount: segments.length,
        transportTypes: [...new Set(segments.map((s) => s.type))],
      },
    });
  } catch (error) {
    logger.error(`Segments fetch error: ${error}`);
    res.status(500).json({ error: 'Failed to fetch segments' });
  }
});

/**
 * GET /api/segments/:id
 * Get single segment
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const segment = await prisma.travelSegment.findUnique({
      where: { id },
    });

    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    res.json(segment);
  } catch (error) {
    logger.error(`Segment fetch error: ${error}`);
    res.status(500).json({ error: 'Failed to fetch segment' });
  }
});

/**
 * PUT /api/segments/:id
 * Update segment
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, origin, destination, distanceMiles, date, notes } = req.body;

    const segment = await prisma.travelSegment.update({
      where: { id },
      data: {
        ...(type && { type }),
        ...(origin && { origin }),
        ...(destination && { destination }),
        ...(distanceMiles !== undefined && { distanceMiles }),
        ...(date && { date: new Date(date) }),
        ...(notes && { notes }),
      },
    });

    res.json(segment);
  } catch (error) {
    logger.error(`Segment update error: ${error}`);
    res.status(500).json({ error: 'Failed to update segment' });
  }
});

/**
 * DELETE /api/segments/:id
 * Delete segment
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.travelSegment.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error(`Segment delete error: ${error}`);
    res.status(500).json({ error: 'Failed to delete segment' });
  }
});

/**
 * POST /api/segments/calculate-distance
 * Calculate distance between two locations
 */
router.post('/calculate-distance', async (req: Request, res: Response) => {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }

    const result = await calculateDistance(origin, destination);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      data: {
        distanceMiles: result.distanceMiles,
        distanceKm: result.distanceKm,
        durationMinutes: result.durationMinutes,
        origin: result.origin,
        destination: result.destination,
      },
    });
  } catch (error) {
    logger.error(`Distance calculation error: ${error}`);
    res.status(500).json({ error: 'Failed to calculate distance' });
  }
});

export default router;
