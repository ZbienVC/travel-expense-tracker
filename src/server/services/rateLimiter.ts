import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { PrismaClient } from '@prisma/client';
import logger from '../logger';

const prisma = new PrismaClient();

/**
 * Service-specific rate limiting configuration
 */
const RATE_LIMITS = {
  'google-vision': {
    hourlyLimit: parseInt(process.env.GOOGLE_VISION_RATE_LIMIT_PER_HOUR || '1000'),
    costPer: 1.5, // Cost in USD per 1000 requests
  },
  'google-maps': {
    hourlyLimit: parseInt(process.env.GOOGLE_MAPS_RATE_LIMIT_PER_HOUR || '25000'),
    costPer: 5, // $5 per 1000 requests
  },
};

const MONTHLY_COST_LIMIT = parseFloat(process.env.COST_LIMIT_MONTHLY_USD || '100');

/**
 * In-memory rate limiters for quick checks
 */
const limiters = {
  'google-vision': new RateLimiterMemory({
    points: RATE_LIMITS['google-vision'].hourlyLimit,
    duration: 3600, // 1 hour
  }),
  'google-maps': new RateLimiterMemory({
    points: RATE_LIMITS['google-maps'].hourlyLimit,
    duration: 3600,
  }),
};

/**
 * Check if API call is allowed and update rate limit tracking
 */
export async function checkRateLimit(
  service: 'google-vision' | 'google-maps',
  userId: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date; error?: string }> {
  try {
    const limiter = limiters[service];
    const limit = RATE_LIMITS[service];

    // Get or create rate limit record
    const resetAt = new Date(Date.now() + 3600000); // Reset in 1 hour
    const rateLimitKey = `${service}:${userId}:${resetAt.toISOString().slice(0, 13)}`;

    try {
      const res = await limiter.consume(userId, 1);
      const remaining = res.remainingPoints;
      const allowed = remaining >= 0;

      // Log to database for cost tracking
      await logAPIUsage(service, userId, allowed);

      return {
        allowed,
        remaining: Math.max(0, remaining),
        resetAt,
      };
    } catch (error) {
      // Rate limit exceeded
      await logAPIUsage(service, userId, false);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        error: `Rate limit exceeded for ${service}. Reset at ${resetAt.toISOString()}`,
      };
    }
  } catch (error) {
    logger.error(`Rate limit check failed: ${error}`);
    // Fail open - allow the request but log the error
    return {
      allowed: true,
      remaining: -1,
      resetAt: new Date(),
      error: 'Rate limit service unavailable',
    };
  }
}

/**
 * Log API usage for cost tracking
 */
async function logAPIUsage(
  service: 'google-vision' | 'google-maps',
  userId: string,
  allowed: boolean
): Promise<void> {
  try {
    const resetAt = new Date();
    resetAt.setHours(resetAt.getHours() + 1);

    // Upsert usage record
    await prisma.aPIRateLimit.upsert({
      where: {
        service_userId_resetAt: {
          service,
          userId,
          resetAt,
        },
      },
      update: {
        requestCount: {
          increment: 1,
        },
      },
      create: {
        service,
        userId,
        requestCount: 1,
        resetAt,
      },
    });
  } catch (error) {
    logger.warn(`Failed to log API usage: ${error}`);
  }
}

/**
 * Get current month's API costs for a user
 */
export async function getUserMonthlyCost(userId: string): Promise<number> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const visionUsage = await prisma.aPIRateLimit.aggregate({
      _sum: {
        requestCount: true,
      },
      where: {
        userId,
        service: 'google-vision',
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const mapsUsage = await prisma.aPIRateLimit.aggregate({
      _sum: {
        requestCount: true,
      },
      where: {
        userId,
        service: 'google-maps',
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const visionCount = visionUsage._sum.requestCount || 0;
    const mapsCount = mapsUsage._sum.requestCount || 0;

    // Calculate cost: Google charges per 1000 requests
    const visionCost = (visionCount / 1000) * RATE_LIMITS['google-vision'].costPer;
    const mapsCost = (mapsCount / 1000) * RATE_LIMITS['google-maps'].costPer;

    return Math.round((visionCost + mapsCost) * 100) / 100;
  } catch (error) {
    logger.error(`Failed to calculate monthly cost: ${error}`);
    return 0;
  }
}

/**
 * Check if user has exceeded monthly cost limit
 */
export async function isUserWithinCostLimit(userId: string): Promise<boolean> {
  const monthlyCost = await getUserMonthlyCost(userId);
  return monthlyCost <= MONTHLY_COST_LIMIT;
}

/**
 * Get rate limit stats for monitoring
 */
export async function getRateLimitStats(service: 'google-vision' | 'google-maps') {
  return {
    service,
    hourlyLimit: RATE_LIMITS[service].hourlyLimit,
    costPerThousand: RATE_LIMITS[service].costPer,
  };
}

/**
 * Reset rate limits (admin only)
 */
export async function resetUserRateLimits(userId: string): Promise<void> {
  try {
    await prisma.aPIRateLimit.deleteMany({
      where: {
        userId,
      },
    });
    logger.info(`Rate limits reset for user ${userId}`);
  } catch (error) {
    logger.error(`Failed to reset rate limits: ${error}`);
  }
}
