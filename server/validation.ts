import { z } from 'zod';
import { MODEL, CLASSIFIER_VERSION, MAX_FRAMES, MAX_VIDEO_BYTES } from '../src/shared.js';
export const idSchema = z.uuid();
export const keySchema = z.string().regex(/^[a-f0-9]{64}$/);
export const featureSchema = z.object({
  t: z.number().finite().min(0).max(86400),
  embedding: z.array(z.number().finite().min(-1.001).max(1.001)).length(384)
    .refine(vector => Math.abs(Math.hypot(...vector) - 1) < 0.015, 'Invalid embedding normalization'),
  points: z.array(z.tuple([z.number().finite().min(0).max(512), z.number().finite().min(0).max(512)])).max(300),
  descriptors: z.string().max(12800).regex(/^[A-Za-z0-9+/]*={0,2}$/),
  width: z.number().int().min(32).max(512), height: z.number().int().min(32).max(512),
  sharpness: z.number().finite().min(0).max(1e7), brightness: z.number().finite().min(0).max(255),
}).superRefine((frame, ctx) => {
  const data = Buffer.from(frame.descriptors, 'base64');
  if (data.length !== frame.points.length * 32) ctx.addIssue({ code: 'custom', message: 'Invalid ORB descriptor size' });
  if (frame.points.some(([x, y]) => x > frame.width || y > frame.height)) ctx.addIssue({ code: 'custom', message: 'Invalid keypoint position' });
});
export const createFootageSchema = z.object({
  label: z.string().trim().min(1).max(80).transform(value => value.normalize('NFC')),
  background: z.boolean(), kind: z.enum(['reference', 'validation']),
  duration: z.number().finite().min(0).max(86400), size: z.number().int().positive().max(MAX_VIDEO_BYTES),
  chunks: z.number().int().min(1).max(96), mime: z.enum(['video/webm', 'video/mp4']),
  cover: z.string().max(60000).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/),
  model: z.literal(MODEL), frameCount: z.number().int().min(0).max(MAX_FRAMES),
});
export const framesSchema = z.object({ offset: z.number().int().min(0).max(MAX_FRAMES - 1), frames: z.array(featureSchema).min(1).max(6) });
const unitVectorSchema = z.array(z.number().finite().min(-1.001).max(1.001)).length(384).refine(vector => Math.abs(Math.hypot(...vector) - 1) < .015);
export const classifierSchema = z.object({
  version: z.literal(CLASSIFIER_VERSION), featureModel: z.literal(MODEL), sourceIds: z.array(idSchema).max(12), trainedAt: z.iso.datetime(),
  classes: z.array(z.object({ label: z.string().trim().min(1).max(80), background: z.boolean(), prototypes: z.array(unitVectorSchema).min(1).max(3), threshold: z.number().min(.88).max(.94), fastThreshold: z.number().min(.95).max(.985), examples: z.number().int().min(1).max(960) })).max(12),
  supports: z.array(featureSchema.and(z.object({ label: z.string().min(1).max(80), background: z.boolean(), footageId: idSchema }))).max(24),
});
