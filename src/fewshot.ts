import { CLASSIFIER_VERSION, MODEL, type CatalogFrame, type CapturedFrame, type LearnedClass, type TrainedClassifier } from './shared';
import { cosine, normalize } from './recognition';
export const classKey = (label: string, background: boolean) => background ? '\u0000background' : label.trim().toLocaleLowerCase('vi').normalize('NFC');
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
function seedsFor(frames: CatalogFrame[], count: number) {
  if (!frames.length) return [];
  const selected = [frames[0]];
  while (selected.length < Math.min(count, frames.length)) {
    const remaining = frames.filter(frame => !selected.includes(frame));
    remaining.sort((a, b) => Math.max(...selected.map(seed => cosine(a.embedding, seed.embedding))) - Math.max(...selected.map(seed => cosine(b.embedding, seed.embedding))));
    selected.push(remaining[0]);
  }
  return selected;
}
export function trainFewShot(frames: CatalogFrame[], sourceIds: string[]): TrainedClassifier {
  const groups = new Map<string, CatalogFrame[]>();
  for (const frame of frames) {
    const key = classKey(frame.label, frame.background);
    groups.set(key, [...(groups.get(key) || []), frame]);
  }
  const classes: LearnedClass[] = [], supports: CatalogFrame[] = [];
  const supportLimit = Math.max(2, Math.min(8, Math.floor(24 / Math.max(1, groups.size))));
  for (const examples of groups.values()) {
    const seeds = seedsFor(examples, Math.min(3, examples.length));
    let centers = seeds.map(frame => frame.embedding);
    // A small spherical prototype classifier, fitted to the labelled footage.
    // Several prototypes preserve different viewpoints instead of averaging them away.
    for (let iteration = 0; iteration < 6; iteration++) {
      const buckets = centers.map(() => [] as number[][]);
      for (const frame of examples) {
        const scores = centers.map(center => cosine(center, frame.embedding));
        buckets[scores.indexOf(Math.max(...scores))].push(frame.embedding);
      }
      centers = centers.map((center, i) => buckets[i].length ? normalize(center.map((_, dimension) => buckets[i].reduce((sum, vector) => sum + vector[dimension], 0) / buckets[i].length)) : center);
    }
    const neighbors = examples.map((frame, i) => Math.max(...examples.filter((_, j) => i !== j).map(other => cosine(frame.embedding, other.embedding)), .90)).sort((a, b) => a - b);
    const threshold = clamp(neighbors[Math.floor(neighbors.length * .1)] - .035, .88, .94);
    const negatives = frames.filter(frame => classKey(frame.label, frame.background) !== classKey(examples[0].label, examples[0].background));
    const nearestNegative = Math.max(0, ...examples.map(frame => Math.max(0, ...negatives.map(other => cosine(frame.embedding, other.embedding)))));
    classes.push({ label: examples[0].label, background: examples[0].background, prototypes: centers, threshold, fastThreshold: clamp(Math.max(neighbors[Math.floor(neighbors.length * .1)] - .01, nearestNegative + .025), .95, .995), examples: examples.length });
    supports.push(...seedsFor(examples, supportLimit));
  }
  return { version: CLASSIFIER_VERSION, featureModel: MODEL, sourceIds: [...sourceIds].sort(), trainedAt: new Date().toISOString(), classes, supports };
}
export function rankFewShot(embedding: number[], model: TrainedClassifier) {
  const ranked = model.classes.map(learned => {
    const supports = model.supports.filter(frame => classKey(frame.label, frame.background) === classKey(learned.label, learned.background))
      .map(frame => ({ frame, score: cosine(embedding, frame.embedding) })).sort((a, b) => b.score - a.score);
    return { learned, supports, score: Math.max(...learned.prototypes.map(center => cosine(embedding, center)), ...supports.map(item => item.score)) };
  }).sort((a, b) => b.score - a.score);
  const first = ranked[0], gap = first ? first.score - (ranked[1]?.score ?? 0) : 0;
  const fast = !!first && !first.learned.background && first.score >= first.learned.fastThreshold && gap >= .04;
  return { ranked, first, gap, fast };
}
export function sourceIdsFor(clips: { id: string; status: string; kind: string; frameCount: number }[]) {
  return clips.filter(item => item.status === 'ready' && item.kind === 'reference' && item.frameCount > 0).map(item => item.id).sort();
}
export function currentModel(model: TrainedClassifier | null, sourceIds: string[]) {
  return !!model && model.version === CLASSIFIER_VERSION && model.featureModel === MODEL && Array.isArray(model.classes) && Array.isArray(model.supports) && JSON.stringify(model.sourceIds) === JSON.stringify([...sourceIds].sort());
}
export function selectTrainingFrames(frames: CapturedFrame[], maximum = 8): CapturedFrame[] {
  if (frames.length <= maximum) return frames;
  const selected: CapturedFrame[] = [];
  // Keep the sharpest frame in each time bin. A stationary five-second clip is valid.
  for (let index = 0; index < maximum; index++) {
    const bin = frames.slice(Math.floor(index * frames.length / maximum), Math.floor((index + 1) * frames.length / maximum));
    selected.push(bin.reduce((best, frame) => frame.sharpness > best.sharpness ? frame : best));
  }
  return selected;
}
