import { describe, expect, it } from 'vitest';
import { normalize, quality, TemporalGate } from '../src/recognition';
describe('quality and result timing', () => {
  it('normalizes descriptors and rejects invalid all-zero vectors', () => {
    expect(Math.hypot(...normalize([3, 4]))).toBeCloseTo(1);
    expect(() => normalize([0, 0])).toThrow();
  });
  it('confirms a moderate match twice and clears immediately on unknown', () => {
    const gate = new TemporalGate(); const known = { label: 'A', reason: '', similarity: .95, inliers: 20 };
    expect(gate.push(known, 0).label).toBeNull(); expect(gate.push(known, 500).label).toBe('A');
    expect(gate.push(known, 1000).label).toBe('A');
    expect(gate.push({ ...known, label: null }, 1500).label).toBeNull();
    expect(gate.push(known, 2000).label).toBeNull(); expect(gate.push(known, 8000).label).toBeNull();
  });
  it('returns a strong learned match on its very first frame', () => {
    const gate = new TemporalGate();
    expect(gate.push({ label: 'A', reason: '', similarity: .999, inliers: 0, immediate: true }, 0).label).toBe('A');
  });
  it('filters flat and dark frames and accepts sharp texture', () => {
    const width = 128, height = 96, data = new Uint8ClampedArray(width * height * 4);
    data.fill(120); expect(quality(data, width, height).accepted).toBe(false);
    data.fill(0); expect(quality(data, width, height).reason).toBe('Thiếu sáng');
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const i = (y * width + x) * 4, v = (x + y) % 2 ? 50 : 180; data.set([v, v, v, 255], i); }
    expect(quality(data, width, height).accepted).toBe(true);
  });
});
