import { createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Db } from 'mongodb';
import { z } from 'zod';
import { decodePolyline, distance } from '../src/maps/geo.js';
import type { Place, RoadRoute } from '../src/maps/types.js';
const agent = 'NoSleepClub-HIST/0.2 (+https://github.com/dakiemdarktharr/NoSleepClub_HIST)';
const point = z.object({ lat: z.number().finite().min(10.25).max(11.4), lon: z.number().finite().min(106.15).max(107.4) });
export class MapsError extends Error { constructor(public code: number, message: string) { super(message); } }
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function lease(db: Db, provider: string) {
  // One shared lease across Vercel instances, not a per-process throttle.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await db.collection('limits').findOneAndUpdate({ bucket: 'maps-upstream:' + provider, availableAt: { $lte: Date.now() } }, { $set: { availableAt: Date.now() + 1150, expiresAt: new Date(Date.now() + 3600000) } }, { upsert: true });
      return;
    } catch (error) { if ((error as { code?: number }).code !== 11000) throw error; await pause(1200); }
  }
  throw new MapsError(429, 'Bản đồ đang bận. Thử lại sau vài giây.');
}
async function cached<T>(db: Db, key: string, provider: string, get: () => Promise<T>): Promise<T> {
  const digest = createHash('sha256').update(key).digest('hex');
  const old = await db.collection('maps_cache').findOne({ key: digest, expiresAt: { $gt: new Date() } });
  if (old) return old.data as T;
  await lease(db, provider); const data = await get();
  await db.collection('maps_cache').updateOne({ key: digest }, { $set: { data, expiresAt: new Date(Date.now() + 86400000) } }, { upsert: true });
  return data;
}
export async function mapsAction(db: Db, req: IncomingMessage, payload: Record<string, unknown>) {
  const address = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local').split(',')[0].trim();
  const bucket = createHash('sha256').update('maps:' + address + ':' + Math.floor(Date.now() / 3600000)).digest('hex');
  const count = await db.collection('limits').findOneAndUpdate({ bucket }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 7200000) } }, { upsert: true, returnDocument: 'after' });
  if ((count?.count || 0) > 150) throw new MapsError(429, 'Đã dùng nhiều lượt bản đồ. Vui lòng thử lại sau.');
  if (payload.action === 'maps.search') {
    const query = z.string().trim().min(2).max(160).parse(payload.query);
    return { places: await cached<Place[]>(db, 'search-photon-v1:' + query.toLocaleLowerCase('vi'), 'photon', async () => {
      const params = new URLSearchParams({ q: query, limit: '5', lat: '10.78', lon: '106.7', bbox: '106.15,10.25,107.4,11.4' });
      const response = await fetch('https://photon.komoot.io/api/?' + params, { headers: { 'User-Agent': agent }, signal: AbortSignal.timeout(10000) }).catch(() => { throw new MapsError(503, 'Chưa kết nối được dịch vụ địa điểm. Thử lại hoặc nhập tọa độ.'); });
      if (!response.ok) throw new MapsError(503, 'Chưa tìm được địa điểm. Thử nhập tên đường hoặc tọa độ.');
      const data = z.object({ features: z.array(z.object({ properties: z.object({ osm_id: z.number(), osm_type: z.string(), name: z.string().optional(), street: z.string().optional(), district: z.string().optional(), city: z.string().optional(), country: z.string().optional() }), geometry: z.object({ coordinates: z.tuple([z.number().finite(), z.number().finite()]) }) })).max(5) }).parse(await response.json());
      return data.features.map(item => ({ id: item.properties.osm_type + item.properties.osm_id, name: item.properties.name || item.properties.street || query, address: [item.properties.street, item.properties.district, item.properties.city, item.properties.country].filter(Boolean).join(', '), lat: item.geometry.coordinates[1], lon: item.geometry.coordinates[0] })).filter(item => point.safeParse(item).success);
    }) };
  }
  if (payload.action !== 'maps.route') throw new MapsError(400, 'Thao tác bản đồ không hợp lệ.');
  const origin = point.parse(payload.origin), destination = point.parse(payload.destination);
  const mode = z.enum(['walk', 'motorbike']).parse(payload.mode);
  if (distance(origin, destination) > 60000) throw new MapsError(400, 'Bản thử nghiệm hỗ trợ hành trình trong khu vực TP.HCM, tối đa 60 km giữa hai điểm.');
  const key = JSON.stringify(['road-v2-structured', mode, origin, destination]);
  return { route: await cached<RoadRoute>(db, key, 'valhalla', async () => {
    const costing = mode === 'walk' ? 'pedestrian' : 'motor_scooter';
    const body = { locations: [origin, destination], costing, costing_options: { [costing]: { shortest: true, ...(mode === 'motorbike' ? { disable_hierarchy_pruning: true } : {}) } }, units: 'kilometers', language: 'en-US' };
    const response = await fetch('https://valhalla1.openstreetmap.de/route?json=' + encodeURIComponent(JSON.stringify(body)), { headers: { 'User-Agent': agent }, signal: AbortSignal.timeout(14000) }).catch(() => { throw new MapsError(503, 'Chưa kết nối được bộ tìm đường. Vui lòng thử lại.'); });
    if (!response.ok) throw new MapsError(503, 'Chưa tìm được đường phù hợp với phương tiện này. Hãy chọn lại điểm trên đường.');
    const data = z.object({ trip: z.object({ summary: z.object({ length: z.number().nonnegative(), time: z.number().nonnegative() }), legs: z.array(z.object({ shape: z.string().max(500000), maneuvers: z.array(z.object({ instruction: z.string().max(1000), length: z.number().nonnegative(), type: z.number().int().min(0).max(100), street_names: z.array(z.string().max(300)).max(30).optional(), roundabout_exit_count: z.number().int().nonnegative().optional() })).max(1000) })).min(1).max(2) }) }).parse(await response.json());
    return { coordinates: data.trip.legs.flatMap(leg => decodePolyline(leg.shape)), meters: Math.round(data.trip.summary.length * 1000), seconds: Math.round(data.trip.summary.time), instructions: data.trip.legs.flatMap(leg => leg.maneuvers.map(item => ({ text: item.instruction, meters: Math.round(item.length * 1000), type: item.type, streets: item.street_names, exit: item.roundabout_exit_count }))), provider: 'Valhalla / OpenStreetMap' };
  }) };
}
