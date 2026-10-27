import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Db, Document } from 'mongodb';
import { z } from 'zod';
import { CHUNK_SIZE } from '../src/shared.js';
import { database } from './db.js';
import { createFootageSchema, framesSchema, classifierSchema, idSchema, keySchema } from './validation.js';

type Request = IncomingMessage & { body?: unknown };
class HttpError extends Error { constructor(public code: number, message: string) { super(message); } }
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function equalKey(value: string, digest: unknown) {
  if (typeof digest !== 'string' || digest.length !== 64) return false;
  return timingSafeEqual(Buffer.from(hash(value), 'hex'), Buffer.from(digest, 'hex'));
}
async function readBody(req: Request) {
  if (Number(req.headers['content-length'] || 0) > 700000) throw new HttpError(413, 'Dữ liệu gửi lên quá lớn.');
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  let body = '';
  for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 700000) throw new HttpError(413, 'Dữ liệu gửi lên quá lớn.'); }
  return JSON.parse(body || '{}');
}
async function authorize(db: Db, payload: Record<string, unknown>, write = false) {
  const roomId = idSchema.parse(payload.roomId);
  const key = keySchema.parse(payload.key);
  const workspace = await db.collection('workspaces').findOne({ roomId });
  if (!workspace || !(equalKey(key, workspace.writeHash) || (!write && equalKey(key, workspace.readHash)))) throw new HttpError(403, 'Mã phòng không hợp lệ hoặc không có quyền thao tác.');
  return workspace;
}
function publicFootage(item: Document) {
  return { id: item.footageId, label: item.label, background: item.background, kind: item.kind,
    status: item.status, frameCount: item.frameCount, duration: item.duration, size: item.size,
    chunks: item.chunks, mime: item.mime, cover: item.cover, createdAt: item.createdAt };
}
async function footageFor(db: Db, roomId: string, value: unknown) {
  const footageId = idSchema.parse(value);
  const footage = await db.collection('footages').findOne({ roomId, footageId });
  if (!footage) throw new HttpError(404, 'Không tìm thấy footage trong phòng này.');
  return footage;
}
export async function dispatch(db: Db, req: Request, input: unknown): Promise<unknown> {
  const payload = z.record(z.string(), z.unknown()).parse(input);
  const action = z.string().max(40).parse(payload.action);
  if (action === 'workspace.create') {
    const address = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local').split(',')[0].trim();
    const bucket = hash(address + ':' + Math.floor(Date.now() / 3600000));
    const limit = await db.collection('limits').findOneAndUpdate({ bucket }, {
      $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 7200000) },
    }, { upsert: true, returnDocument: 'after' });
    if ((limit?.count || 0) > 5) throw new HttpError(429, 'Đã tạo nhiều phòng test. Hãy dùng lại phòng hiện tại hoặc thử sau.');
    if (await db.collection('workspaces').countDocuments({}) >= 40) throw new HttpError(429, 'Bản test đã đạt giới hạn phòng.');
    const roomId = randomUUID(), readKey = randomBytes(32).toString('hex'), writeKey = randomBytes(32).toString('hex');
    await db.collection('workspaces').insertOne({ roomId, readHash: hash(readKey), writeHash: hash(writeKey), reserved: 0, datasetVersion: 0, createdAt: new Date() });
    return { id: roomId, readKey, writeKey };
  }
  const write = ['footage.create', 'footage.chunk', 'footage.frames', 'footage.complete', 'footage.delete', 'model.save'].includes(action);
  const workspace = await authorize(db, payload, write);
  const roomId = workspace.roomId as string;
  if (action === 'model.get') return { model: workspace.modelArtifact || null };
  if (action === 'model.save') {
    const model = classifierSchema.parse(payload.model);
    const references = await db.collection('footages').find({ roomId, status: 'ready', kind: 'reference', frameCount: { $gt: 0 } }).project({ footageId: 1, label: 1, background: 1 }).toArray();
    const ids = references.map(item => item.footageId).sort();
    if (JSON.stringify(ids) !== JSON.stringify([...model.sourceIds].sort()) || model.supports.some(frame => !references.some(item => item.footageId === frame.footageId && item.label === frame.label && item.background === frame.background))) throw new HttpError(409, 'Bộ mẫu đã thay đổi. Hãy huấn luyện lại.');
    const saved = await db.collection('workspaces').updateOne({ roomId, datasetVersion: workspace.datasetVersion ?? { $exists: false } }, { $set: { modelArtifact: model } });
    if (!saved.matchedCount) throw new HttpError(409, 'Bộ mẫu vừa thay đổi. Hãy huấn luyện lại.');
    return { trained: true, classes: model.classes.length, version: model.version };
  }
  if (action === 'workspace.get') {
    const items = await db.collection('footages').find({ roomId, ...(equalKey(payload.key as string, workspace.writeHash) ? {} : { status: 'ready' }) }).sort({ createdAt: -1 }).limit(12).toArray();
    return { id: roomId, footages: items.map(publicFootage) };
  }
  if (action === 'footage.create') {
    const data = createFootageSchema.parse(payload.data);
    if (data.chunks !== Math.ceil(data.size / CHUNK_SIZE)) throw new HttpError(400, 'Số phần video không hợp lệ.');
    if (await db.collection('footages').countDocuments({ roomId }) >= 12) throw new HttpError(409, 'Mỗi phòng test tối đa 12 footage. Xóa footage cũ trước khi thêm.');
    const reservation = data.size + 2 * 1024 * 1024;
    await db.collection('quota').updateOne({ key: 'app' }, { $setOnInsert: { reserved: 0 } }, { upsert: true });
    const quota = await db.collection('quota').findOneAndUpdate({ key: 'app', reserved: { $lte: 360 * 1024 * 1024 - reservation } }, { $inc: { reserved: reservation } }, { returnDocument: 'after' });
    if (!quota) throw new HttpError(409, 'Kho test đã đầy. Xóa footage không dùng trước khi thêm.');
    const budget = await db.collection('workspaces').findOneAndUpdate({ roomId, reserved: { $lte: 96 * 1024 * 1024 - reservation } }, { $inc: { reserved: reservation } }, { returnDocument: 'after' });
    if (!budget) { await db.collection('quota').updateOne({ key: 'app' }, { $inc: { reserved: -reservation } }); throw new HttpError(409, 'Phòng test đã đầy. Xóa footage cũ trước khi thêm.'); }
    const footageId = randomUUID();
    try { await db.collection('footages').insertOne({ ...data, roomId, footageId, reservation, status: 'pending', createdAt: new Date() }); }
    catch (error) {
      await Promise.all([db.collection('quota').updateOne({ key: 'app' }, { $inc: { reserved: -reservation } }), db.collection('workspaces').updateOne({ roomId }, { $inc: { reserved: -reservation } })]); throw error;
    }
    return { id: footageId };
  }
  const footage = await footageFor(db, roomId, payload.footageId);
  const footageId = footage.footageId;
  if (action === 'footage.delete') {
    const removed = await db.collection('footages').findOneAndDelete({ roomId, footageId });
    if (removed) await Promise.all([
      db.collection('frames').deleteMany({ footageId }), db.collection('chunks').deleteMany({ footageId }),
      db.collection('workspaces').updateOne({ roomId }, { $inc: { reserved: -removed.reservation, datasetVersion: 1 }, $unset: { modelArtifact: '' } }),
      db.collection('quota').updateOne({ key: 'app' }, { $inc: { reserved: -removed.reservation } }),
    ]);
    return { deleted: true };
  }
  if (action === 'footage.chunk') {
    if (footage.status !== 'pending') throw new HttpError(409, 'Footage đã được hoàn tất.');
    const n = z.number().int().min(0).max(footage.chunks - 1).parse(payload.n);
    const base64 = z.string().max(350000).regex(/^[A-Za-z0-9+/]+={0,2}$/).parse(payload.data);
    const data = Buffer.from(base64, 'base64');
    const expected = n === footage.chunks - 1 ? footage.size - n * CHUNK_SIZE : CHUNK_SIZE;
    if (data.length !== expected) throw new HttpError(400, 'Kích thước phần video không khớp.');
    await db.collection('chunks').updateOne({ footageId, n }, { $set: { data } }, { upsert: true });
    return { received: n };
  }
  if (action === 'footage.frames') {
    if (footage.status !== 'pending') throw new HttpError(409, 'Footage đã được hoàn tất.');
    const data = framesSchema.parse(payload);
    if (data.offset + data.frames.length > footage.frameCount) throw new HttpError(400, 'Quá số frame đã khai báo.');
    await db.collection('frames').bulkWrite(data.frames.map((feature, index) => ({ updateOne: { filter: { footageId, n: data.offset + index }, update: { $set: { feature } }, upsert: true } })));
    return { received: data.frames.length };
  }
  if (action === 'footage.complete') {
    const [chunks, frames] = await Promise.all([db.collection('chunks').countDocuments({ footageId }), db.collection('frames').countDocuments({ footageId })]);
    if (chunks !== footage.chunks || frames !== footage.frameCount) throw new HttpError(409, 'Footage chưa được tải lên đầy đủ. Hãy thử lưu lại.');
    await db.collection('footages').updateOne({ roomId, footageId }, { $set: { status: 'ready' } });
    await db.collection('workspaces').updateOne({ roomId }, { $inc: { datasetVersion: 1 }, $unset: { modelArtifact: '' } });
    return { saved: true };
  }
  if (footage.status !== 'ready') throw new HttpError(409, 'Footage chưa sẵn sàng.');
  if (action === 'frames.get') {
    const offset = z.number().int().min(0).max(80).parse(payload.offset ?? 0);
    const items = await db.collection('frames').find({ footageId, n: { $gte: offset } }).sort({ n: 1 }).limit(8).toArray();
    return { frames: items.map(item => item.feature), next: offset + items.length < footage.frameCount ? offset + items.length : null };
  }
  if (action === 'media.get') {
    const n = z.number().int().min(0).max(footage.chunks - 1).parse(payload.n);
    const chunk = await db.collection('chunks').findOne({ footageId, n });
    if (!chunk) throw new HttpError(404, 'Không tìm thấy phần video.');
    return { data: Buffer.from(chunk.data.buffer).toString('base64') };
  }
  throw new HttpError(400, 'Thao tác không được hỗ trợ.');
}
export default async function handler(req: Request, res: ServerResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Chỉ hỗ trợ POST.');
    if (!String(req.headers['content-type']).startsWith('application/json')) throw new HttpError(415, 'Yêu cầu JSON.');
    const origin = req.headers.origin;
    if (origin && new URL(origin).host !== req.headers.host) throw new HttpError(403, 'Nguồn yêu cầu không hợp lệ.');
    const output = await dispatch(await database(), req, await readBody(req));
    res.statusCode = 200; res.end(JSON.stringify(output));
  } catch (error) {
    const known = error instanceof HttpError;
    const invalid = error instanceof z.ZodError || error instanceof SyntaxError || error instanceof TypeError;
    res.statusCode = known ? error.code : invalid ? 400 : 503;
    // Never return driver errors: MongoDB errors can contain connection details.
    res.end(JSON.stringify({ error: known ? error.message : invalid ? 'Dữ liệu không hợp lệ.' : 'Chưa kết nối được kho dữ liệu. Hãy thử lại sau.' }));
  }
}
