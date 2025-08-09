// Simple Haversine distance calculator in meters
export function haversineDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Accepts numbers or strings like "12.9629° N", "77.5775° E", "-12.34"
export function parseCoordinate(input: unknown): number {
  if (typeof input === "number") return input;
  if (typeof input !== "string") return NaN;
  const trimmed = input.trim().toUpperCase();
  let sign = 1;
  if (/[SW]$/.test(trimmed)) sign = -1;
  const numeric = trimmed.replace(/[^0-9.+-]/g, "");
  const val = parseFloat(numeric);
  return Number.isFinite(val) ? val * sign : NaN;
}

// Returns meters; prefers radiusMeters if provided; supports string inputs
export function parseMeters(
  radiusMeters: unknown,
  radiusKm: unknown
): number | null {
  const m =
    typeof radiusMeters === "string" ? parseFloat(radiusMeters) : radiusMeters;
  const km = typeof radiusKm === "string" ? parseFloat(radiusKm) : radiusKm;
  if (typeof m === "number" && Number.isFinite(m)) return m;
  if (typeof km === "number" && Number.isFinite(km)) return km * 1000;
  return null;
}
