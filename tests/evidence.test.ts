import { describe, expect, it } from 'vitest';
import { decideEvidence } from '../src/evidence';
import { TemporalGate } from '../src/recognition';
const match = (label: string, inliers: number, score = .98, background = false) => ({ label, inliers, score, background, fast: true });
describe('place identity evidence', () => {
  it('rejects a semantically near-identical but geometrically unrelated scene', () => {
    expect(decideEvidence([match('Desk', 0, .999)]).label).toBeNull();
    expect(decideEvidence([match('Desk', 5, .999)]).label).toBeNull();
  });
  it('returns the first verified frame, including a single saved viewpoint', () => {
    const result = decideEvidence([match('Desk', 32)]);
    expect(new TemporalGate().push(result, 0).label).toBe('Desk');
  });
  it('rejects repeated objects shared between two registered places', () => {
    expect(decideEvidence([match('A', 42), match('B', 40)]).label).toBeNull();
    expect(decideEvidence([match('A', 42), match('B', 12)]).label).toBe('A');
  });
  it('rejects background even when it is the strongest geometric match', () => {
    expect(decideEvidence([match('A', 18), match('Other', 80, .99, true)]).label).toBeNull();
  });
  it('does not switch a confirmed label on one weak challenger frame', () => {
    const gate = new TemporalGate(); gate.push(decideEvidence([match('A', 30)]), 0);
    expect(gate.push(decideEvidence([match('B', 13)]), 800).label).toBeNull();
    expect(gate.push(decideEvidence([match('A', 30)]), 1600).label).toBe('A');
    expect(gate.push(decideEvidence([match('B', 35)]), 2400).label).toBe('B');
  });
});
