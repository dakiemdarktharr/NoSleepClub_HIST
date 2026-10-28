import { describe, expect, it } from 'vitest';
import { pinnedAddress, type ReverseFeature } from '../src/maps/address';
const pin={lat:10.778,lon:106.7};
const feature=(properties:ReverseFeature['properties'],coordinates:[number,number]=[pin.lon,pin.lat]):ReverseFeature=>({properties,geometry:{coordinates}});
describe('reverse address labels keep the exact selected coordinates separate',()=>{
  it('formats a house number and street with city context',()=>{
    expect(pinnedAddress(feature({housenumber:'135',street:'Nam Kỳ Khởi Nghĩa',city:'Thành phố Hồ Chí Minh',country:'Việt Nam'}),pin)).toBe('135 Nam Kỳ Khởi Nghĩa, Thành phố Hồ Chí Minh, Việt Nam');
  });
  it('supports numeric house numbers and deduplicates repeated context',()=>{
    expect(pinnedAddress(feature({housenumber:65,street:'Lý Tự Trọng',district:'Thành phố Hồ Chí Minh',city:'Thành phố Hồ Chí Minh'}),pin)).toBe('65 Lý Tự Trọng, Thành phố Hồ Chí Minh');
  });
  it('can use a named place when no street address is published',()=>{
    expect(pinnedAddress(feature({name:'Dinh Độc Lập',city:'Thành phố Hồ Chí Minh'}),pin)).toContain('Dinh Độc Lập');
  });
  it('does not manufacture a street number or substitute a distant location',()=>{
    expect(pinnedAddress(feature({street:'Pasteur'}),pin)).toBe('Pasteur');
    expect(pinnedAddress(feature({street:'Pasteur'},[106.72,10.8]),pin)).toBeNull();
  });
  it('does not call a city-only result a pinned address',()=>{
    expect(pinnedAddress(feature({city:'Thành phố Hồ Chí Minh'}),pin)).toBeNull();
    expect(pinnedAddress(undefined,pin)).toBeNull();
  });
});
