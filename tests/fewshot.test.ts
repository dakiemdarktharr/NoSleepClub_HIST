import { describe, expect, it } from 'vitest';
import { currentModel, rankFewShot, selectTrainingFrames, trainFewShot } from '../src/fewshot';
import type { CapturedFrame, CatalogFrame } from '../src/shared';
const frame = (label: string, embedding: number[], background = false): CatalogFrame => ({ label, embedding, background, footageId: 'clip', t: 0, points: [], descriptors: '', width: 320, height: 240, sharpness: 100, brightness: 100 });
describe('five-second few-shot learning', () => {
  it('recognizes either learned class and rejects an unrelated query', () => {
    const trained = trainFewShot([frame('Desk', [1, 0, 0]), frame('Shelf', [0, 1, 0])], ['clip']);
    expect(rankFewShot([1, 0, 0], trained).first?.learned.label).toBe('Desk');
    expect(rankFewShot([0, 1, 0], trained).first?.learned.label).toBe('Shelf');
    expect(rankFewShot([0, 0, 1], trained).fast).toBe(false);
  });
  it('accepts a single saved viewpoint even when other views do not overlap', () => {
    const frames = [frame('Room', [1, 0, 0]), frame('Room', [0, 1, 0]), frame('Room', [0, 0, 1])];
    const trained = trainFewShot(frames, ['clip']);
    for (const reference of frames) expect(rankFewShot(reference.embedding, trained).fast).toBe(true);
  });
  it('supports one-shot learning without demanding three different images', () => {
    const trained = trainFewShot([frame('Desk', [1, 0, 0])], ['clip']);
    expect(rankFewShot([1, 0, 0], trained).fast).toBe(true);
    expect(rankFewShot([0, 0, 1], trained).fast).toBe(false);
  });
  it('rejects background and visually ambiguous classes', () => {
    const trained = trainFewShot([frame('Desk', [1, 0]), frame('Other', [1, 0], true)], ['clip']);
    expect(rankFewShot([1, 0], trained).fast).toBe(false);
    const negative = trainFewShot([frame('Other', [1, 0], true)], ['clip']);
    expect(rankFewShot([1, 0], negative).fast).toBe(false);
  });
  it('keeps stationary frames from the entire five seconds for later processing', () => {
    const captured = Array.from({ length: 25 }, (_, i) => ({ t: i * .2, sharpness: 100, image: {} as ImageData })) satisfies CapturedFrame[];
    const selected = selectTrainingFrames(captured);
    expect(selected).toHaveLength(8);
    expect(selected[0].t).toBeLessThan(.5);
    expect(selected.at(-1)!.t).toBeGreaterThanOrEqual(4.2);
  });
  it('invalidates a persisted classifier when source footage changes', () => {
    const trained = trainFewShot([frame('Desk', [1, 0])], ['clip']);
    expect(currentModel(trained, ['clip'])).toBe(true);
    expect(currentModel(trained, ['another'])).toBe(false);
  });
  it('caps the published model support set for bounded API payloads', () => {
    const frames = Array.from({ length: 12 }, (_, label) => Array.from({ length: 10 }, () => frame('Place ' + label, [1, 0]))).flat();
    expect(trainFewShot(frames, ['clip']).supports.length).toBeLessThanOrEqual(24);
  });
});
