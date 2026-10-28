import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Db } from 'mongodb';
import type { IncomingMessage } from 'node:http';
import { mapsAction } from '../server/maps';
const db={collection:()=>({findOneAndUpdate:async()=>({count:1}),findOne:async()=>null,updateOne:async()=>({})})} as unknown as Db;
const req={headers:{},socket:{remoteAddress:'test'}} as IncomingMessage;
const payload={action:'maps.reverse',point:{lat:10.777,lon:106.695}};
afterEach(()=>vi.unstubAllGlobals());
describe('public reverse-geocoding RPC',()=>{
  it('validates the Photon result and returns a nearby street address',async()=>{
    const fetcher=vi.fn(async(_url:string,_init?:RequestInit)=>new Response(JSON.stringify({features:[{properties:{street:'Nam Kỳ Khởi Nghĩa',housenumber:'135',city:'Thành phố Hồ Chí Minh'},geometry:{coordinates:[106.695,10.777]}}]}),{headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',fetcher);
    expect(await mapsAction(db,req,payload)).toEqual({address:'135 Nam Kỳ Khởi Nghĩa, Thành phố Hồ Chí Minh'});
    expect(fetcher.mock.calls[0][0]).toContain('https://photon.komoot.io/reverse?');
  });
  it('bounds coordinates before making a provider request',async()=>{
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
    await expect(mapsAction(db,req,{...payload,point:{lat:0,lon:0}})).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
  });
  it('returns a service error on provider failure instead of inventing an address',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('private upstream detail');}));
    await expect(mapsAction(db,req,payload)).rejects.toMatchObject({code:503});
  });
});
