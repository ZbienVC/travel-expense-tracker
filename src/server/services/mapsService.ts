import axios from 'axios';
import logger from '../logger';

const MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';

export interface DistanceResult {
  success: boolean;
  distanceMiles: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  origin: string;
  destination: string;
  error?: string;
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

/**
 * Calculate distance between two locations using Google Maps Distance Matrix API
 * @param origin - Origin address or coordinates
 * @param destination - Destination address or coordinates
 * @returns Distance in miles/km and duration
 */
export async function calculateDistance(
  origin: string,
  destination: string
): Promise<DistanceResult> {
  try {
    if (!MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY not configured');
    }

    const url = `${MAPS_BASE_URL}/distancematrix/json`;

    const response = await axios.get(url, {
      params: {
        origins: origin,
        destinations: destination,
        key: MAPS_API_KEY,
        units: 'imperial', // Get results in miles
      },
      timeout: 5000,
    });

    const data = response.data;

    // Check for API errors
    if (data.status !== 'OK') {
      throw new Error(`Maps API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    if (!data.rows || data.rows.length === 0 || !data.rows[0].elements) {
      throw new Error('No route found between locations');
    }

    const element = data.rows[0].elements[0];

    if (element.status !== 'OK') {
      throw new Error(`Route error: ${element.status}`);
    }

    const distanceMeters = element.distance.value;
    const durationSeconds = element.duration.value;

    // Convert meters to miles (1 mile = 1609.34 meters)
    const distanceMiles = distanceMeters / 1609.34;
    const distanceKm = distanceMeters / 1000;
    const durationMinutes = durationSeconds / 60;

    logger.info(
      `Distance calculated: ${origin} → ${destination} = ${distanceMiles.toFixed(2)} miles`
    );

    return {
      success: true,
      distanceMiles: Math.round(distanceMiles * 100) / 100,
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationSeconds,
      durationMinutes: Math.round(durationMinutes),
      origin: data.origin_addresses[0],
      destination: data.destination_addresses[0],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Maps API error: ${errorMessage}`);

    return {
      success: false,
      distanceMiles: 0,
      distanceKm: 0,
      durationSeconds: 0,
      durationMinutes: 0,
      origin,
      destination,
      error: errorMessage,
    };
  }
}

/**
 * Geocode an address to get coordinates
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    if (!MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY not configured');
    }

    const url = `${MAPS_BASE_URL}/geocode/json`;

    const response = await axios.get(url, {
      params: {
        address,
        key: MAPS_API_KEY,
      },
      timeout: 5000,
    });

    const data = response.data;

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      logger.warn(`Geocoding failed for address: ${address}`);
      return null;
    }

    const result = data.results[0];
    const { lat, lng } = result.geometry.location;

    return {
      lat,
      lng,
      formattedAddress: result.formatted_address,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Geocoding error for ${address}: ${errorMessage}`);
    return null;
  }
}

/**
 * Test connectivity and validate API key
 */
export async function validateMapsAPI(): Promise<boolean> {
  try {
    if (!MAPS_API_KEY) {
      logger.error('GOOGLE_MAPS_API_KEY not configured');
      return false;
    }

    // Test with a simple geocoding request
    const result = await geocodeAddress('New York, NY');
    return result !== null;
  } catch (error) {
    logger.error(`Maps API validation failed: ${error}`);
    return false;
  }
}

/**
 * Sample test with hardcoded coordinates
 */
export async function testMapsAPI(): Promise<void> {
  const testCases = [
    { origin: 'New York, NY', destination: 'Boston, MA' },
    { origin: 'Los Angeles, CA', destination: 'San Francisco, CA' },
    { origin: '40.7128, -74.0060', destination: '42.3601, -71.0589' }, // NYC to Boston by coords
  ];

  logger.info('Testing Google Maps API...');

  for (const test of testCases) {
    const result = await calculateDistance(test.origin, test.destination);
    if (result.success) {
      logger.info(
        `✓ ${test.origin} → ${test.destination}: ${result.distanceMiles} miles, ${result.durationMinutes} mins`
      );
    } else {
      logger.error(`✗ ${test.origin} → ${test.destination}: ${result.error}`);
    }
  }
}
