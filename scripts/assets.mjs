import { copyFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
const source = resolve('node_modules/onnxruntime-web/dist');
mkdirSync('public/ort', { recursive: true });
for (const file of readdirSync('public/ort')) {
  if (/^ort-wasm-simd-threaded.*\.(wasm|mjs)$/.test(file) && !file.includes('.asyncify.')) unlinkSync(resolve('public/ort', file));
}
for (const file of readdirSync(source)) {
  if (/^ort-wasm-simd-threaded\.asyncify\.(wasm|mjs)$/.test(file)) copyFileSync(resolve(source, file), resolve('public/ort', file));
}
