import type { IncomingMessage, ServerResponse } from 'node:http';
import { database } from '../server/db.js';
export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  try { await (await database()).command({ ping: 1 }); res.statusCode = 200; res.end(JSON.stringify({ status: 'ok', database: 'connected', mode: 'test' })); }
  catch { res.statusCode = 503; res.end(JSON.stringify({ status: 'unavailable', database: 'unavailable', mode: 'test' })); }
}
