import cvModule from '@techstark/opencv-js';
import { env, pipeline, RawImage, type ImageFeatureExtractionPipeline } from '@huggingface/transformers';
import { normalize, quality, retrieve } from './recognition';
import type { CatalogFrame, Feature, Prediction } from './shared';

const cv = cvModule;
let extractor: ImageFeatureExtractionPipeline | null = null;
let catalog: CatalogFrame[] = [];
let initialization: Promise<void> | undefined;
function ready() {
  if (!initialization) initialization = (async () => {
    if (!cv.Mat) await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Không tải được bộ kiểm tra hình ảnh.')), 90000);
      (cv as typeof cv & { onRuntimeInitialized: () => void }).onRuntimeInitialized = () => { clearTimeout(timeout); resolve(); };
    });
    env.allowLocalModels = false;
    env.backends.onnx.wasm!.numThreads = 1;
    env.backends.onnx.wasm!.wasmPaths = `${self.location.origin}/ort/`;
    extractor = await pipeline('image-feature-extraction', 'onnx-community/dinov2-small', {
      dtype: 'q8', device: 'wasm', revision: '8b1f705a3a7f6f062f6bdd21986c1583d3ef105d',
      progress_callback: (progress: { status: string; progress?: number }) => self.postMessage({ event: 'progress', message: progress.status === 'progress' ? `Đang tải model: ${Math.round(progress.progress || 0)}%` : 'Đang chuẩn bị bộ nhận diện…' }),
    }) as ImageFeatureExtractionPipeline;
  })().catch(error => { initialization = undefined; throw error; });
  return initialization;
}
function bytes64(bytes: Uint8Array) { let value = ''; for (const byte of bytes) value += String.fromCharCode(byte); return btoa(value); }
function unbase64(value: string) { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); }
async function extract(image: ImageData, t: number) {
  const check = quality(image.data, image.width, image.height);
  if (!check.accepted) return { feature: null, check };
  const source = cv.matFromImageData(image), gray = new cv.Mat(), descriptors = new cv.Mat(), mask = new cv.Mat(), keypoints = new cv.KeyPointVector();
  const detector = new cv.ORB();
  try {
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    detector.detectAndCompute(gray, mask, keypoints, descriptors);
    const n = Math.min(250, keypoints.size());
    if (n < 18) return { feature: null, check: { ...check, accepted: false, reason: 'Khung hình chưa có đủ chi tiết để đối chiếu' } };
    const points: [number, number][] = Array.from({ length: n }, (_, index) => {
      const p = keypoints.get(index).pt; return [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100];
    });
    // This ONNX export provides last_hidden_state, not pooler_output.
    // DINOv2's first token is the 384-dimensional CLS descriptor.
    const output = await extractor!(new RawImage(image.data, image.width, image.height, 4));
    if (output.dims.at(-1) !== 384) { output.dispose(); throw new Error('Model trả đặc trưng không đúng phiên bản.'); }
    const embedding = normalize((output.data as Float32Array).slice(0, 384));
    output.dispose();
    const feature: Feature = { t, embedding, points, descriptors: bytes64(descriptors.data.slice(0, n * 32)), width: image.width, height: image.height, sharpness: check.sharpness, brightness: check.brightness };
    return { feature, check };
  } finally { source.delete(); gray.delete(); descriptors.delete(); mask.delete(); keypoints.delete(); detector.delete(); }
}
function geometry(query: Feature, reference: Feature) {
  const a = cv.matFromArray(query.points.length, 32, cv.CV_8UC1, unbase64(query.descriptors));
  const b = cv.matFromArray(reference.points.length, 32, cv.CV_8UC1, unbase64(reference.descriptors));
  const matcher = new cv.BFMatcher(cv.NORM_HAMMING, false), matches = new cv.DMatchVectorVector();
  const allocations: { delete(): void }[] = [a, b, matcher, matches];
  try {
    matcher.knnMatch(a, b, matches, 2);
    const from: number[] = [], to: number[] = [], used = new Set<number>();
    for (let i = 0; i < matches.size(); i++) {
      const pair = matches.get(i);
      try {
        if (pair.size() < 2) continue;
        const m = pair.get(0), next = pair.get(1);
        if (m.distance < 64 && m.distance < .72 * next.distance && !used.has(m.trainIdx)) {
          used.add(m.trainIdx); from.push(...query.points[m.queryIdx]); to.push(...reference.points[m.trainIdx]);
        }
      } finally { pair.delete(); }
    }
    if (from.length / 2 < 14) return 0;
    const src = cv.matFromArray(from.length / 2, 1, cv.CV_32FC2, from), dst = cv.matFromArray(to.length / 2, 1, cv.CV_32FC2, to), inlierMask = new cv.Mat();
    allocations.push(src, dst, inlierMask);
    const homography = cv.findHomography(src, dst, cv.RANSAC, 4, inlierMask, 600, .995);
    allocations.push(homography);
    if (homography.empty()) return 0;
    let count = 0; const xs: number[] = [], ys: number[] = [];
    for (let i = 0; i < inlierMask.rows; i++) if (inlierMask.data[i]) { count++; xs.push(from[i * 2]); ys.push(from[i * 2 + 1]); }
    const spread = xs.length ? ((Math.max(...xs) - Math.min(...xs)) / query.width) * ((Math.max(...ys) - Math.min(...ys)) / query.height) : 0;
    return count >= 12 && count / (from.length / 2) >= .45 && spread >= .035 ? count : 0;
  } finally { allocations.forEach(item => item.delete()); }
}
function predict(feature: Feature): Prediction {
  const retrieved = retrieve(feature.embedding, catalog);
  const empty = { label: null, similarity: retrieved.first?.score || 0, inliers: 0 };
  if (!retrieved.accepted || !retrieved.first) return { ...empty, reason: catalog.length ? 'Chưa đủ khác biệt so với các khu vực đã lưu' : 'Phòng chưa có mẫu tham chiếu' };
  let verified = 0, best = 0;
  for (const entry of retrieved.first.entries.slice(0, 4)) {
    const count = geometry(feature, entry.frame);
    if (count) { verified++; best = Math.max(best, count); }
    if (verified >= 2) break;
  }
  return verified >= 2 ? { label: retrieved.first.entries[0].frame.label, reason: 'Đã khớp cảnh và các chi tiết hình học', similarity: retrieved.first.score, inliers: best }
    : { ...empty, reason: 'Chưa xác nhận được chi tiết hình ảnh' };
}
self.onmessage = async (event: MessageEvent<{ id: number; action: string; image?: ImageData; feature?: Feature; t?: number; frames?: CatalogFrame[] }>) => {
  const { id, action } = event.data;
  try {
    if (action === 'init') { await ready(); self.postMessage({ id, result: true }); return; }
    if (action === 'index') { catalog = event.data.frames || []; self.postMessage({ id, result: catalog.length }); return; }
    if (!extractor) throw new Error('Bộ nhận diện chưa sẵn sàng.');
    if (action === 'evaluate') { self.postMessage({ id, result: predict(event.data.feature!) }); return; }
    const extracted = await extract(event.data.image!, event.data.t || 0);
    self.postMessage({ id, result: action === 'extract' ? extracted : extracted.feature ? predict(extracted.feature) : { label: null, reason: extracted.check.reason, similarity: 0, inliers: 0 } });
  } catch (error) { self.postMessage({ id, error: error instanceof Error ? error.message : 'Không xử lý được hình ảnh.' }); }
};
