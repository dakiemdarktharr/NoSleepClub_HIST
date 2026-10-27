import { describe, expect, it } from 'vitest';
import { normalize, quality, retrieve, TemporalGate } from '../src/recognition';
import type { CatalogFrame } from '../src/shared';
const frame = (label: string, embedding: number[], background = false): CatalogFrame => ({ label, embedding, background, points: [], descriptors: '', width: 320, height: 240, sharpness: 100, brightness: 100, t: 0, footageId: 'clip' });
const copies = (item: CatalogFrame) => Array.from({ length: 3 }, () => ({ ...item }));
describe('conservative recognition', () => {
  it('distinguishes registered corners and rejects unrelated scenes', () => {
    const refs = [...copies(frame('Bàn', [1, 0, 0])), ...copies(frame('Kệ', [0, 1, 0]))];
    expect(retrieve(normalize([1, .01, 0]), refs).first?.entries[0].frame.label).toBe('Bàn');
    expect(retrieve(normalize([1, .01, 0]), refs).accepted).toBe(true);
    expect(retrieve([0, 0, 1], refs).accepted).toBe(false);
  });
  it('rejects ambiguity rather than selecting a close competitor', () => {
    const refs = [...copies(frame('A', normalize([1, .02]))), ...copies(frame('B', normalize([1, .03])))];
    expect(retrieve([1, 0], refs).accepted).toBe(false);
  });
  it('lets background references veto a plausible match', () => {
    const refs = [...copies(frame('A', normalize([1, .1]))), ...copies(frame('Khác', [1, 0], true))];
    expect(retrieve([1, 0], refs).accepted).toBe(false);
  });
  it('combines footage labels without inventing classes', () => {
    const refs = [frame('Bàn', [1, 0]), frame('bàn', [1, 0]), frame('Bàn', [1, 0])];
    expect(retrieve([1, 0], refs).accepted).toBe(true);
    expect(retrieve([1, 0], []).accepted).toBe(false);
  });
  it('requires three consecutive fresh checks and clears on unknown', () => {
    const gate = new TemporalGate(); const known = { label: 'A', reason: '', similarity: .95, inliers: 20 };
    expect(gate.push(known, 0).label).toBeNull(); expect(gate.push(known, 500).label).toBeNull();
    expect(gate.push(known, 1000).label).toBe('A');
    expect(gate.push({ ...known, label: null }, 1500).label).toBeNull();
    expect(gate.push(known, 2000).label).toBeNull(); expect(gate.push(known, 8000).label).toBeNull();
  });
  it('filters flat and dark frames and accepts sharp texture', () => {
    const width = 128, height = 96, data = new Uint8ClampedArray(width * height * 4);
    data.fill(120); expect(quality(data, width, height).accepted).toBe(false);
    data.fill(0); expect(quality(data, width, height).reason).toBe('Thiếu sáng');
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const i = (y * width + x) * 4, v = (x + y) % 2 ? 50 : 180; data.set([v, v, v, 255], i); }
    expect(quality(data, width, height).accepted).toBe(true);
  });
});
