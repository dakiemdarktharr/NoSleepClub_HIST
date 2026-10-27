import { describe, expect, it } from 'vitest';
import { createFootageSchema, featureSchema, idSchema, keySchema } from '../server/validation';
import { MODEL } from '../src/shared';
describe('API trust boundaries', () => {
  it('requires independent high-entropy keys and valid IDs', () => {
    expect(keySchema.safeParse('dev').success).toBe(false);
    expect(idSchema.safeParse({ $ne: null }).success).toBe(false);
    expect(keySchema.safeParse('a'.repeat(64)).success).toBe(true);
  });
  it('rejects malformed vectors, descriptor size and coordinates', () => {
    const sample = { t: 0, embedding: [1, ...Array(383).fill(0)], points: [], descriptors: '', width: 320, height: 240, sharpness: 100, brightness: 120 };
    expect(featureSchema.safeParse(sample).success).toBe(true);
    expect(featureSchema.safeParse({ ...sample, embedding: Array(384).fill(0) }).success).toBe(false);
    expect(featureSchema.safeParse({ ...sample, points: [[10, 10]] }).success).toBe(false);
    expect(featureSchema.safeParse({ ...sample, embedding: [Infinity, ...Array(383).fill(0)] }).success).toBe(false);
  });
  it('requires a name and enforces video, model and cover constraints', () => {
    const clip = { label: 'Bàn', background: false, kind: 'reference', duration: 10, size: 100, chunks: 1, mime: 'video/webm', cover: 'data:image/jpeg;base64,AAAA', model: MODEL, frameCount: 5 };
    expect(createFootageSchema.safeParse(clip).success).toBe(true);
    expect(createFootageSchema.safeParse({ ...clip, label: '   ' }).success).toBe(false);
    expect(createFootageSchema.safeParse({ ...clip, cover: 'javascript:alert(1)' }).success).toBe(false);
    expect(createFootageSchema.safeParse({ ...clip, size: 30 * 1024 * 1024 }).success).toBe(false);
    expect(createFootageSchema.safeParse({ ...clip, model: 'other' }).success).toBe(false);
  });
});
