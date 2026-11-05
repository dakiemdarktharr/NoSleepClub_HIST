import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { initialTour, parseTour, tourReducer } from '../src/tour/state';
import { roomSite, TOUR_SITES, tourPlace } from '../src/tour/content';
import { currentModel } from '../src/fewshot';
import { PUBLIC_REFERENCE_IDS } from '../src/tour/publicModel';
import { createFootageSchema } from '../server/validation';

describe('published walk state', () => {
  it('completes all three explicit stops in order and survives serialization', () => {
    let state = tourReducer(initialTour('vi'), { type: 'start' });
    for (const site of TOUR_SITES) { expect(state.current).toBe(site.id); state = tourReducer(state, { type: 'completeStop' }); }
    expect(state.phase).toBe('complete'); expect(state.completed).toEqual(TOUR_SITES.map(site => site.id));
    expect(parseTour(JSON.stringify(state))).toEqual(state);
  });
  it('opening content, pausing and resuming never invent visits or completion', () => {
    let state = tourReducer(initialTour(), { type: 'open', siteId: 'palace' });
    expect(state.completed).toEqual([]);
    state = tourReducer(state, { type: 'pause' });
    expect(tourReducer(state, { type: 'completeStop' })).toEqual(state);
    state = tourReducer(parseTour(JSON.stringify(state)), { type: 'start' });
    expect(state.current).toBe('palace'); expect(state.completed).toEqual([]);
    state = tourReducer(state, { type: 'completeStop' });
    expect(state.current).toBe('post-office'); expect(state.phase).toBe('active');
  });
  it('supports an honest early finish and confirms reset through a separate action', () => {
    const state = tourReducer(tourReducer(initialTour('vi'), { type: 'start' }), { type: 'completeStop' });
    const finished = tourReducer(state, { type: 'finish' });
    expect(finished.completed).toEqual(['post-office']); expect(finished.phase).toBe('complete');
    expect(tourReducer(finished, { type: 'restart' })).toEqual(initialTour('vi'));
  });
  it.each(['{', 'null', '{"tourId":"other"}', JSON.stringify({ ...initialTour(), completed: ['fake'] }), JSON.stringify({ ...initialTour(), current: 'fake' }), JSON.stringify({ ...initialTour(), language: 'xx' })])('recovers from missing, invalid or obsolete storage: %s', raw => {
    expect(parseTour(raw, 'vi')).toEqual(initialTour('vi'));
  });
  it('rejects unknown site navigation and preserves guide language across progress changes', () => {
    const state = tourReducer(initialTour(), { type: 'language', language: 'vi' });
    expect(tourReducer(state, { type: 'open', siteId: '<script>' })).toEqual(state);
    expect(tourReducer(state, { type: 'start' }).language).toBe('vi');
  });
});
describe('camera/content/map contract', () => {
  it('links a room label only to an explicit, unambiguous, ready reference binding', () => {
    const clip = { label: 'My building', siteId: 'palace', background: false, kind: 'reference', status: 'ready' };
    expect(roomSite('my BUILDING', [clip])?.id).toBe('palace');
    expect(roomSite('Dinh Độc Lập', [clip])).toBeUndefined();
    expect(roomSite('My building', [clip, { ...clip, siteId: 'cathedral' }])).toBeUndefined();
    expect(roomSite('My building', [clip, { ...clip, siteId: undefined }])).toBeUndefined();
    expect(roomSite('My building', [{ ...clip, kind: 'validation' }])).toBeUndefined();
    expect(roomSite('My building', [{ ...clip, background: true }])).toBeUndefined();
    expect(roomSite('My building', [{ ...clip, status: 'pending' }])).toBeUndefined();
  });
  it('has sourced bilingual content, credited local photos and distinct exterior waypoints', () => {
    const ids = new Set();
    for (const site of TOUR_SITES) {
      expect(ids.has(site.id)).toBe(false); ids.add(site.id);
      expect(existsSync('public' + site.image)).toBe(true);
      expect(site.sources.length).toBeGreaterThan(0);
      expect(new URL(site.photo.licenseUrl).protocol).toBe('https:');
      for (const lang of ['en','vi'] as const) {
        expect(site[lang].paragraphs.length).toBe(2); expect(site[lang].access.length).toBeGreaterThan(20);
        const place = tourPlace(site, lang); expect(place.id).toBe('tour:' + site.id); expect(place.name).toBe(site[lang].name);
        expect(place.lat).toBeGreaterThan(10.7); expect(place.lon).toBeGreaterThan(106.6);
      }
    }
  });
  it('ships a real compatible public classifier with exactly the published IDs', () => {
    const model = JSON.parse(readFileSync('public/guide/reference-model-v1.json', 'utf8'));
    expect(currentModel(model, PUBLIC_REFERENCE_IDS)).toBe(true);
    expect(model.classes.map((item: { label: string }) => item.label).sort()).toEqual(TOUR_SITES.map(site => 'tour:' + site.id).sort());
    expect(model.supports.length).toBeGreaterThan(2);
    for (const support of model.supports) { expect(support.embedding).toHaveLength(384); expect(support.points.length).toBeGreaterThan(12); }
  });
  it('accepts only known optional bindings at the server boundary', () => {
    const binding = createFootageSchema.pick({ siteId: true });
    expect(binding.safeParse({ siteId: 'palace' }).success).toBe(true);
    expect(binding.safeParse({}).success).toBe(true);
    expect(binding.safeParse({ siteId: 'unknown' }).success).toBe(false);
  });
});
