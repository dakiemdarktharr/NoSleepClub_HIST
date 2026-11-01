import { afterEach, describe, expect, it, vi } from 'vitest';
import { rememberRoom, rpc } from '../src/client';
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
describe('RPC failure recovery',()=>{
  it('aborts stalled requests and returns the registered retryable message',async()=>{
    vi.useFakeTimers();let signal:AbortSignal|undefined;
    vi.stubGlobal('fetch',vi.fn((_url:string,init:RequestInit)=>new Promise((_resolve,reject)=>{signal=init.signal!;signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')));}))); 
    const result=rpc('workspace.create');const assertion=expect(result).rejects.toThrow('Không kết nối được máy chủ.');
    await vi.advanceTimersByTimeAsync(25000);await assertion;expect(signal?.aborted).toBe(true);expect(vi.getTimerCount()).toBe(0);
  });
  it('clears the timeout after a successful response',async()=>{
    vi.useFakeTimers();vi.stubGlobal('fetch',vi.fn(async()=>new Response('{"ok":true}')));
    expect(await rpc('workspace.get')).toEqual({ok:true});expect(vi.getTimerCount()).toBe(0);
  });
  it('preserves actionable server errors',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('{"error":"Storage unavailable"}',{status:503})));
    await expect(rpc('workspace.create')).rejects.toThrow('Storage unavailable');
  });
  it('reports a hosting error page as a retryable connection error',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('A server error has occurred',{status:500})));
    await expect(rpc('workspace.create')).rejects.toThrow('Không kết nối được máy chủ.');
  });
  it('does not prevent the current session when private storage refuses writes',()=>{
    vi.stubGlobal('localStorage',{setItem:()=>{throw new DOMException('Blocked','QuotaExceededError');}});
    expect(()=>rememberRoom({id:'00000000-0000-4000-8000-000000000001',readKey:'test-read',writeKey:'test-write'})).not.toThrow();
  });
});
