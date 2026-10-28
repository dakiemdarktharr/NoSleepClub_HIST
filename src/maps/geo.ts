import type { Place } from './types';
export const coordinates = (point: Place): [number, number] => [point.lat, point.lon];
export function distance(a: Pick<Place, 'lat' | 'lon'>, b: Pick<Place, 'lat' | 'lon'>) {
  const rad = Math.PI / 180, lat = (b.lat - a.lat) * rad, lon = (b.lon - a.lon) * rad;
  const value = Math.sin(lat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(lon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(Math.max(0, 1 - value)));
}
export function decodePolyline(encoded: string, precision = 6): [number, number][] {
  const points: [number, number][] = []; let index = 0, lat = 0, lon = 0;
  function next() {
    let result = 0, shift = 0, value: number;
    do { if (index >= encoded.length || shift > 30) throw new Error('Đường dẫn không hợp lệ.'); value = encoded.charCodeAt(index++) - 63; if (value < 0 || value > 63) throw new Error('Đường dẫn không hợp lệ.'); result |= (value & 31) << shift; shift += 5; } while (value >= 32);
    return result & 1 ? ~(result >> 1) : result >> 1;
  }
  while (index < encoded.length) { lat += next(); lon += next(); points.push([lat / 10 ** precision, lon / 10 ** precision]); }
  return points;
}
