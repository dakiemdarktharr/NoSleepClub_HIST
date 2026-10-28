import { describe, expect, it } from 'vitest';
import { catalog, LOCALES, translate } from '../src/i18n/catalog';
import { localizeMessage } from '../src/i18n/runtime';
import { LANDMARKS, landmarkPlace, landmarkSource } from '../src/maps/landmarks';
import { maneuverText } from '../src/maps/maneuvers';
describe('locale contracts',()=>{
  it('supplies all five locales and the same interpolation parameters for every UI message',()=>{
    const placeholders=(text:string)=>[...text.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
    for(const [key,row] of Object.entries(catalog)){
      expect(row.length,key).toBe(5);
      for(const text of row){expect(text.trim().length,key).toBeGreaterThan(0);expect(placeholders(text),key).toEqual(placeholders(row[0]));}
    }
  });
  it('interpolates values as text without interpreting user-authored labels',()=>{
    for(const locale of LOCALES) expect(translate('coverAlt',locale,{name:'<img src=x onerror=alert(1)>'})).toContain('<img src=x onerror=alert(1)>');
  });
  it('localizes actual upload, inference and evaluation progress with and without ellipses',()=>{
    const statuses=['Đang lưu video 1/4','Đang tải video 2/4','Đang lưu frame 6/8','Đang học hình ảnh 3/8…','Đang tải model: 42%','18 chi tiết khớp · 892 ms','Đang kiểm tra đường đi bộ 1/2…'];
    for(const locale of LOCALES)for(const text of statuses){const output=localizeMessage(text,locale);expect(output).not.toBe(localizeMessage('unknown',locale));expect(output).not.toContain('Đang');expect(output).toMatch(/\d/);}
  });
  it('does not show server exceptions, credentials or untranslated error text to users',()=>{
    for(const locale of LOCALES){expect(localizeMessage('driver exception with mongodb://private',locale)).toBe(localizeMessage('unknown',locale));expect(localizeMessage('',locale)).toBe('');}
  });
});
describe('selected destinations and structured navigation',()=>{
  it('has exactly ten unique, bounded places with localized names and OSM attribution',()=>{
    expect(LANDMARKS.length).toBe(10);expect(new Set(LANDMARKS.map(item=>item.id)).size).toBe(10);
    for(const item of LANDMARKS)for(const locale of LOCALES){const place=landmarkPlace(item,locale);expect(place.name.length).toBeGreaterThan(0);expect(place.lat).toBeGreaterThanOrEqual(10.25);expect(place.lat).toBeLessThanOrEqual(11.4);expect(place.lon).toBeGreaterThanOrEqual(106.15);expect(place.lon).toBeLessThanOrEqual(107.4);expect(landmarkSource(item.id)).toMatch(/^https:\/\/www.openstreetmap.org\/(node|way)\/\d+$/);}
  });
  it('distinguishes the Cu Chi excursion and cathedral exterior from ordinary city stops',()=>{
    expect(LANDMARKS.find(item=>item.id==='N5922616581')?.note).toBe('excursion');expect(LANDMARKS.find(item=>item.id==='N11774744262')?.note).toBe('exterior');
    expect(LANDMARKS.find(item=>item.id==='W802105071')?.local).toContain('65 Lý Tự Trọng');
  });
  it('localizes turns from types while preserving street names and roundabout exits',()=>{
    const turn={text:'Turn right onto Pasteur.',meters:60,type:10,streets:['Pasteur']};
    expect(maneuverText(turn,'en')).toBe(turn.text);
    for(const locale of ['ko','zh','ja','ru'] as const){expect(maneuverText(turn,locale)).not.toContain('Turn');expect(maneuverText(turn,locale)).toContain('Pasteur');expect(maneuverText({...turn,type:26,exit:3},locale)).toContain('3');}
    expect(maneuverText({...turn,type:15},'zh')).toContain('左转');
  });
});
