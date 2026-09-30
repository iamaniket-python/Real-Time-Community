const KM_PER_DEGREE_LAT = 111.32;

/** Rectangle that fully contains a circle of radiusKm around (lat, lng). */
export function boundingBox(lat, lng, radiusKm) {
  const dLat = radiusKm / KM_PER_DEGREE_LAT;
  // Longitude degrees shrink towards the poles; clamp so we never divide by ~0
  const dLng = radiusKm / (KM_PER_DEGREE_LAT * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}

/** 2 decimals is about 1.1 km: enough to show "roughly here" without exposing an address. */
export const roundCoord = (value, decimals = 2) => {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
};

/**
 * Haversine distance in km as a SQL expression. Arguments are SQL snippets
 * written by our own code (columns or typed parameters), never user input.
 */
export const haversineSql = (lat1, lng1, lat2, lng2) => `
  6371 * 2 * asin(sqrt(least(1,
    power(sin(radians(${lat2} - ${lat1}) / 2), 2) +
    cos(radians(${lat1})) * cos(radians(${lat2})) *
    power(sin(radians(${lng2} - ${lng1}) / 2), 2)
  )))`;

export const roundKm = (km) => Math.round(km * 10) / 10;