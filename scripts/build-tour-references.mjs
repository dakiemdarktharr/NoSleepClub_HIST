// Development-only: run against Vite with Playwright available, then commit the public artifact.
import { writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(240000);
  await page.goto(process.argv[2] || 'http://127.0.0.1:5173/');
  const result = await page.evaluate(async () => {
    const { Vision } = await import('/src/client.ts');
    const { TOUR_SITES } = await import('/src/tour/content.ts');
    const { PUBLIC_REFERENCE_IDS } = await import('/src/tour/publicModel.ts');
    const vision = new Vision(message => console.info(message));
    try {
      await vision.request('init');
      const frames = [], images = [];
      for (const site of TOUR_SITES) {
        const image = new Image(); image.src = site.image; await image.decode();
        for (const scale of [1, .82, .64]) {
          const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
          const canvas = document.createElement('canvas');
          const ratio = 512 / Math.max(width, height); canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
          const context = canvas.getContext('2d', { willReadFrequently: true });
          context.drawImage(image, (image.naturalWidth - width) / 2, (image.naturalHeight - height) / 2, width, height, 0, 0, canvas.width, canvas.height);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
          const { feature } = await vision.request('extract', { image: pixels, t: scale });
          if (!feature) throw Error('Reference failed quality check: ' + site.id);
          frames.push({ ...feature, label: 'tour:' + site.id, background: false, footageId: 'published:' + site.id + ':2019' });
          if (scale === 1) images.push({ id: site.id, image: pixels });
        }
      }
      const model = await vision.request('train', { frames, sourceIds: PUBLIC_REFERENCE_IDS });
      await vision.request('restore', { model });
      const checks = [];
      for (const reference of images) {
        const prediction = await vision.request('predict', { image: reference.image });
        if (prediction.label !== 'tour:' + reference.id) throw Error('Reference regression failed: ' + reference.id);
        checks.push({ site: reference.id, label: prediction.label, inliers: prediction.inliers, latencyMs: prediction.latencyMs });
      }
      const blank = new ImageData(new Uint8ClampedArray(384 * 384 * 4).fill(180), 384, 384);
      const unknown = await vision.request('predict', { image: blank });
      if (unknown.label) throw Error('Blank frame accepted as known site');
      return { model, checks, unknown: { label: unknown.label, reason: unknown.reason } };
    } finally { vision.close(); }
  });
  await writeFile('public/guide/reference-model-v1.json', JSON.stringify(result.model));
  await writeFile('docs/public-recognition-build.json', JSON.stringify({ generatedAt: new Date().toISOString(), samples: 9, independentPhotos: 3, method: 'One licensed photo per site with three nested crops. Self-source regression only, not independent field accuracy.', featureModel: result.model.featureModel, version: result.model.version, checks: result.checks, unknown: result.unknown }, null, 2) + '\n');
  console.log(JSON.stringify({ classes: result.model.classes.length, supports: result.model.supports.length, checks: result.checks, unknown: result.unknown }));
} finally { await browser.close(); }
