import type { CatalogFrame, Prediction, Quality } from './shared';
export function normalize(vector: ArrayLike<number>): number[] {
  const values = Array.from(vector);
  const magnitude = Math.hypot(...values);
  if (!Number.isFinite(magnitude) || magnitude < 1e-8) throw new Error('Không trích được đặc trưng ảnh.');
  return values.map(value => Math.round(value / magnitude * 1e6) / 1e6);
}
export function cosine(a: number[], b: number[]) { return a.reduce((sum, value, index) => sum + value * b[index], 0); }
export function quality(data: Uint8ClampedArray, width: number, height: number): Quality {
  // Always measure at the same spatial scale; Laplacian variance is resolution-sensitive.
  const w = Math.min(256, width), h = Math.max(3, Math.round(height * w / width));
  const gray = new Float32Array(w * h);
  let brightness = 0, sum = 0, squares = 0, count = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (Math.floor(y * height / h) * width + Math.floor(x * width / w)) * 4;
    const value = data[i] * .299 + data[i + 1] * .587 + data[i + 2] * .114;
    gray[y * w + x] = value; brightness += value;
  }
  brightness /= w * h;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const value = gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w] - 4 * gray[i];
    sum += value; squares += value * value; count++;
  }
  const sharpness = squares / count - (sum / count) ** 2;
  const accepted = sharpness >= 65 && brightness >= 18 && brightness <= 240;
  return { sharpness, brightness, accepted, reason: brightness < 18 ? 'Thiếu sáng' : brightness > 240 ? 'Quá sáng' : sharpness < 65 ? 'Ảnh mờ hoặc quá ít chi tiết' : 'Ảnh rõ' };
}
export function retrieve(embedding: number[], frames: CatalogFrame[]) {
  const ranked = frames.map(frame => ({ frame, score: cosine(embedding, frame.embedding) })).sort((a, b) => b.score - a.score);
  const labels = new Map<string, typeof ranked>();
  for (const item of ranked) {
    const name = item.frame.background ? '\u0000background' : item.frame.label.toLocaleLowerCase('vi').normalize('NFC');
    const entries = labels.get(name) || []; entries.push(item); labels.set(name, entries);
  }
  const candidates = [...labels.entries()].map(([name, entries]) => ({ name, entries,
    score: entries.slice(0, 2).reduce((sum, item) => sum + item.score, 0) / Math.min(2, entries.length) })).sort((a, b) => b.score - a.score);
  const first = candidates[0];
  const accepted = !!first && first.name !== '\u0000background' && first.entries.length >= 3 && first.score >= .80 && first.score - (candidates[1]?.score ?? 0) >= .065;
  return { accepted, first, ranked, gap: first ? first.score - (candidates[1]?.score ?? 0) : 0 };
}
export class TemporalGate {
  private label: string | null = null;
  private count = 0;
  private previousAt = 0;
  push(prediction: Prediction, now = performance.now()): Prediction {
    if (!prediction.label) { this.label = null; this.count = 0; this.previousAt = now; return prediction; }
    this.count = prediction.label === this.label && now - this.previousAt < 5000 ? this.count + 1 : 1;
    this.label = prediction.label; this.previousAt = now;
    return this.count >= 3 ? prediction : { ...prediction, label: null, reason: 'Đang xác nhận qua nhiều frame' };
  }
}
