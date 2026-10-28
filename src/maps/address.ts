import { distance } from './geo';
export interface ReverseFeature {
  properties: { name?: string; housenumber?: string | number; street?: string; district?: string; locality?: string; city?: string; county?: string; country?: string };
  geometry: { coordinates: [number, number] };
}
export function pinnedAddress(feature: ReverseFeature | undefined, pin: { lat: number; lon: number }): string | null {
  if (!feature) return null;
  const [lon, lat] = feature.geometry.coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || distance(pin, { lat, lon }) > 250) return null;
  const p = feature.properties;
  const street = [p.housenumber, p.street].filter(value => value !== undefined && value !== '').join(' ');
  const parts = [street || p.name, p.district || p.locality, p.city || p.county, p.country].filter((value): value is string => !!value?.trim());
  if (!street && !p.name) return null;
  return [...new Set(parts.map(value => value.trim()))].join(', ').slice(0, 700);
}
