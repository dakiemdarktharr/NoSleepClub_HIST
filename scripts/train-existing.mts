// Administrative repair of an existing room's derived classifier. Never exports video/features.
// Usage: node --env-file=.env.local --import tsx scripts/train-existing.mts ROOM_UUID [--write]
import { MongoClient } from 'mongodb';
import { trainFewShot, rankFewShot } from '../src/fewshot.ts';
import { classifierSchema, idSchema } from '../server/validation.ts';
import type { CatalogFrame } from '../src/shared.ts';
const roomId = idSchema.parse(process.argv[2]);
const client = new MongoClient(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 8000 });
try {
  await client.connect(); const db = client.db(process.env.MONGODB_DB || 'nosleepclub_hist');
  const room = await db.collection('workspaces').findOne({ roomId });
  if (!room) throw new Error('Room not found');
  const clips = await db.collection('footages').find({ roomId, status: 'ready', kind: 'reference', frameCount: { $gt: 0 } }).toArray();
  const frames: CatalogFrame[] = [];
  for (const clip of clips) {
    const samples = await db.collection('frames').find({ footageId: clip.footageId }).sort({ n: 1 }).toArray();
    frames.push(...samples.map(item => ({ ...item.feature, label: clip.label, background: clip.background, footageId: clip.footageId } as CatalogFrame)));
  }
  const model = trainFewShot(frames, clips.map(clip => clip.footageId)); classifierSchema.parse(model);
  const ownSavedFramesRetrievable = frames.filter(frame => !frame.background && rankFewShot(frame.embedding, model).fast).length;
  let saved = false;
  if (process.argv.includes('--write')) {
    const latest = await db.collection('footages').find({ roomId, status: 'ready', kind: 'reference', frameCount: { $gt: 0 } }).project({ footageId: 1 }).toArray();
    if (JSON.stringify(latest.map(item => item.footageId).sort()) !== JSON.stringify(model.sourceIds)) throw new Error('Source footage changed');
    const result = await db.collection('workspaces').updateOne({ roomId, datasetVersion: room.datasetVersion ?? { $exists: false } }, { $set: { modelArtifact: model } });
    if (!result.matchedCount) throw new Error('Dataset changed while training');
    saved = true;
  }
  console.log(JSON.stringify({ saved, classes: model.classes.length, storedFrames: frames.length, ownSavedFramesRetrievable, note: 'Retrieval self-match only; geometric verification and new camera accuracy are not measured here' }));
} catch (error) { console.error(error instanceof Error ? error.message.replace(/mongodb[^\s]*/g, '[redacted]') : 'Training failed'); process.exitCode = 1; }
finally { await client.close(); }
