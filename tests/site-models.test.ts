import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MercatorCoordinate } from 'maplibre-gl';
import { LANDMARKS } from '../src/maps/landmarks';
import { SITE_MODELS, modelInView, modelLod, siteModelPlacement } from '../src/maps/siteModels';
import { readLandmarkGLB, multiplyModelMatrix } from '../src/maps/landmarkMesh';
import placements from '../assets/landmarks/sites.json';

describe('authored landmark delivery contract', () => {
  it('covers all ten destinations with small neutral GLBs and lower-detail LODs', () => {
    expect(SITE_MODELS.map(s => s.id).sort()).toEqual(LANDMARKS.map(s => s.id).sort());
    expect(SITE_MODELS.reduce((n, s) => n + s.near.bytes + s.far.bytes, 0)).toBeLessThan(1000000);
    for (const site of SITE_MODELS) {
      expect(site.far.triangles).toBeLessThanOrEqual(site.near.triangles);
      for (const lod of ['near', 'far'] as const) {
        const file = readFileSync(new URL('../public' + site[lod].url, import.meta.url));
        expect(file.byteLength).toBe(site[lod].bytes);
        const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), mesh = readLandmarkGLB(buffer);
        expect(mesh.indices.length / 3).toBe(site[lod].triangles);
        expect(site[lod].triangles).toBeLessThan(3000);
        // glTF is Y-up: width, height, depth must be in real metres, ground at zero.
        for (const [axis, dim] of [[0, 0], [1, 2], [2, 1]]) expect(mesh.bounds.max[axis] - mesh.bounds.min[axis]).toBeCloseTo(site.dimensionsMeters[dim], 3);
        expect(mesh.bounds.min[1]).toBeCloseTo(0, 4);
        const doc = JSON.parse(file.subarray(20, 20 + file.readUInt32LE(12)).toString());
        expect(doc.meshes).toHaveLength(1); expect(doc.meshes[0].primitives).toHaveLength(1);
        expect(doc.images).toBeUndefined(); expect(doc.textures).toBeUndefined(); expect(doc.animations).toBeUndefined();
        const [r, g, b] = doc.materials[0].pbrMetallicRoughness.baseColorFactor;
        expect(r).toBe(g); expect(g).toBe(b);
      }
    }
  });
  it('fits the measured building envelope independently of the routing POI', () => {
    for (const site of SITE_MODELS) {
      const reference = placements.sites.find(s => s.id === site.id)!;
      if (!reference.footprint) continue;
      const c = Math.cos(site.frontBearing * Math.PI / 180), s = Math.sin(site.frontBearing * Math.PI / 180);
      const sx = 111319.49 * Math.cos(site.center[1] * Math.PI / 180);
      const local = reference.footprint.map(([lon, lat]) => {
        const e = (lon - site.center[0]) * sx, n = (lat - site.center[1]) * 111319.49;
        return [c * e - s * n, s * e + c * n];
      });
      for (const axis of [0, 1]) {
        expect(Math.max(...local.map(p => p[axis]))).toBeCloseTo(site.dimensionsMeters[axis] / 2, 0);
        expect(Math.min(...local.map(p => p[axis]))).toBeCloseTo(-site.dimensionsMeters[axis] / 2, 0);
      }
    }
    const cathedral = SITE_MODELS.find(s => s.slug === 'cathedral')!, poi = LANDMARKS.find(s => s.id === cathedral.id)!;
    expect(Math.abs(cathedral.center[1] - poi.lat)).toBeGreaterThan(.0004);
  });
});

describe('geographic placement and rendering budgets', () => {
  it('preserves one metre on all glTF axes and points facades toward their reviewed street side', () => {
    // Independent control bearings from the north-up street/footprint review.
    const facades: Record<string, number> = { palace: 43, 'war-museum': 133, 'city-museum': 131.5, cathedral: 135, 'post-office': 222.3, market: 149.4, wharf: 334.7, temple: 183.3 };
    for (const site of SITE_MODELS) {
      const p = siteModelPlacement(site.id), m = p.matrix;
      for (const offset of [0, 4, 8]) expect(Math.hypot(m[offset], m[offset + 1], m[offset + 2])).toBeCloseTo(p.metersToMercator, 13);
      // Front = -Z in glTF. Mercator south is opposite geographic north.
      const bearing = (Math.atan2(-m[8], m[9]) * 180 / Math.PI + 360) % 360;
      if (site.slug in facades) expect(bearing).toBeCloseTo(facades[site.slug], 4);
      const center = MercatorCoordinate.fromLngLat(site.center as [number, number]);
      expect(m[12]).toBeCloseTo(center.x, 13); expect(m[13]).toBeCloseTo(center.y, 13);
    }
  });
  it('uses coarse meshes at overview zoom and excludes distant sites before loading', () => {
    const palace = SITE_MODELS[0], bounds = { getWest: () => 106.694, getEast: () => 106.697, getSouth: () => 10.776, getNorth: () => 10.779 };
    expect(modelLod(palace, 15)).toBe('far'); expect(modelLod(palace, 18)).toBe('near');
    expect(modelInView(palace, 17, bounds)).toBe(true);
    expect(modelInView(SITE_MODELS.find(s => s.slug === 'cu-chi')!, 19, bounds)).toBe(false);
    expect(modelInView(palace, 13, bounds)).toBe(false);
  });
  it('combines camera and anchor before float conversion to retain small local offsets', () => {
    const p = siteModelPlacement(SITE_MODELS[0].id), projection = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -p.position.x, -p.position.y, 0, 1];
    const combined = multiplyModelMatrix(projection, p.matrix);
    expect(combined[12]).toBe(0); expect(combined[13]).toBe(0); expect(combined[0]).not.toBe(0);
  });
  it('rejects truncated or non-GLB assets', () => {
    expect(() => readLandmarkGLB(new ArrayBuffer(12))).toThrow();
    const file = readFileSync(new URL('../public' + SITE_MODELS[0].near.url, import.meta.url));
    expect(() => readLandmarkGLB(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength - 8))).toThrow();
  });
});
