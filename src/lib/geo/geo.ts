/**
 * Geospatial helpers (GeoJSON parsing + simple polygon area on a sphere).
 * Replaces PostGIS ST_Area for SQLite-based storage.
 */

export interface GeoPoint {
  lon: number;
  lat: number;
}

export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][]; // [ [ [lon, lat], ... ] ]
}

export interface GeoJsonPoint {
  type: "Point";
  coordinates: [number, number]; // [lon, lat]
}

/**
 * Parse a GeoJSON string. Returns null on failure.
 */
export function parseGeoJson<T = unknown>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

/**
 * Compute the area of a GeoJSON Polygon in hectares using the spherical
 * excess formula (L'Huilier). Suitable for rough field-plot areas.
 */
export function polygonAreaHa(geom: GeoJsonPolygon | string): number {
  const g = typeof geom === "string" ? parseGeoJson<GeoJsonPolygon>(geom) : geom;
  if (!g || g.type !== "Polygon" || !g.coordinates?.length) return 0;
  const ring = g.coordinates[0];
  if (!ring || ring.length < 4) return 0;

  // Spherical polygon area (numerically stable Karney-style summation).
  const R = 6378137; // earth radius (m)
  let total = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];
    const p1 = toRad(lat1);
    const p2 = toRad(lat2);
    const dl = toRad(lon2 - lon1);
    total += dl * (2 + Math.sin(p1) + Math.sin(p2));
  }
  const areaM2 = Math.abs((total * R * R) / 2);
  return areaM2 / 10000; // hectares
}

/** Compute the centroid of a GeoJSON Polygon (simple average of vertices). */
export function polygonCentroid(geom: GeoJsonPolygon | string): GeoPoint | null {
  const g = typeof geom === "string" ? parseGeoJson<GeoJsonPolygon>(geom) : geom;
  if (!g || g.type !== "Polygon" || !g.coordinates?.length) return null;
  const ring = g.coordinates[0];
  if (!ring || ring.length === 0) return null;
  let lonSum = 0;
  let latSum = 0;
  for (const [lon, lat] of ring) {
    lonSum += lon;
    latSum += lat;
  }
  return {
    lon: lonSum / ring.length,
    lat: latSum / ring.length,
  };
}

/** Get bounding box of a GeoJSON Polygon: [minLon, minLat, maxLon, maxLat]. */
export function polygonBounds(
  geom: GeoJsonPolygon | string
): [number, number, number, number] | null {
  const g = typeof geom === "string" ? parseGeoJson<GeoJsonPolygon>(geom) : geom;
  if (!g || g.type !== "Polygon" || !g.coordinates?.length) return null;
  const ring = g.coordinates[0];
  if (!ring || ring.length === 0) return null;
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    minLon = Math.min(minLon, lon);
    minLat = Math.min(minLat, lat);
    maxLon = Math.max(maxLon, lon);
    maxLat = Math.max(maxLat, lat);
  }
  return [minLon, minLat, maxLon, maxLat];
}

/**
 * Build a GeoJSON Polygon from an array of [lon, lat] points. Closes the ring
 * automatically if not already closed.
 */
export function buildPolygon(points: [number, number][]): GeoJsonPolygon {
  if (points.length === 0) {
    return { type: "Polygon", coordinates: [[]] };
  }
  const ring = [...points];
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push(first);
  }
  return { type: "Polygon", coordinates: [ring] };
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Project a [lon, lat] point into an x/y plane suitable for SVG rendering,
 * relative to a bounding box. Returns {x, y} in [0, 1] range with y flipped
 * (SVG y axis points down).
 */
export function projectPoint(
  lon: number,
  lat: number,
  bounds: [number, number, number, number]
): { x: number; y: number } {
  const [minLon, minLat, maxLon, maxLat] = bounds;
  const dLon = maxLon - minLon || 1;
  const dLat = maxLat - minLat || 1;
  return {
    x: (lon - minLon) / dLon,
    y: 1 - (lat - minLat) / dLat, // flip y
  };
}

/** Build an SVG polygon points string from a GeoJSON ring + bounds. */
export function polygonToSvg(
  geom: GeoJsonPolygon | string,
  bounds: [number, number, number, number]
): string {
  const g = typeof geom === "string" ? parseGeoJson<GeoJsonPolygon>(geom) : geom;
  if (!g || !g.coordinates?.length) return "";
  const ring = g.coordinates[0] || [];
  return ring
    .map(([lon, lat]) => {
      const p = projectPoint(lon, lat, bounds);
      return `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
    })
    .join(" ");
}

/** Default bounding box for Thailand agricultural projects (Northeast / Isan). */
export const DEFAULT_VIEW_BBOX: [number, number, number, number] = [
  100.0, 14.5, 105.0, 19.5,
];

/** Check if a GeoJSON string looks like a valid Polygon. */
export function isValidPolygon(input: string): boolean {
  const g = parseGeoJson<GeoJsonPolygon>(input);
  if (!g || g.type !== "Polygon") return false;
  if (!g.coordinates || g.coordinates.length === 0) return false;
  const ring = g.coordinates[0];
  if (!ring || ring.length < 4) return false;
  return true;
}
