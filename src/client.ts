import { CHUNK_SIZE, MODEL, type Room, type Footage, type Feature, type CatalogFrame } from './shared';
export async function rpc<T>(action: string, data: Record<string, unknown> = {}, room?: Room, write = false): Promise<T> {
  const response = await fetch('/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data, ...(room ? { roomId: room.id, key: write ? room.writeKey : room.writeKey || room.readKey } : {}) }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Không kết nối được máy chủ.');
  return result as T;
}
export async function loadCatalog(room: Room, footages: Footage[]) {
  const frames: CatalogFrame[] = [];
  for (const footage of footages.filter(item => item.status === 'ready' && item.kind === 'reference')) {
    let offset: number | null = 0;
    while (offset !== null) {
      const page: { frames: Feature[]; next: number | null } = await rpc('frames.get', { footageId: footage.id, offset }, room);
      frames.push(...page.frames.map(frame => ({ ...frame, label: footage.label, background: footage.background, footageId: footage.id })));
      offset = page.next;
    }
  }
  return frames;
}
function toBase64(buffer: ArrayBuffer) { let text = ''; for (const byte of new Uint8Array(buffer)) text += String.fromCharCode(byte); return btoa(text); }
export async function saveFootage(room: Room, video: Blob, frames: Feature[], metadata: { label: string; background: boolean; kind: 'reference' | 'validation'; duration: number; cover: string }, progress: (value: string) => void) {
  const chunks = Math.ceil(video.size / CHUNK_SIZE);
  const created = await rpc<{ id: string }>('footage.create', { data: { ...metadata, model: MODEL, size: video.size, chunks, frameCount: frames.length, mime: video.type.startsWith('video/mp4') ? 'video/mp4' : 'video/webm' } }, room, true);
  try {
    for (let n = 0; n < chunks; n++) {
      progress(`Đang lưu video ${n + 1}/${chunks}`);
      await rpc('footage.chunk', { footageId: created.id, n, data: toBase64(await video.slice(n * CHUNK_SIZE, (n + 1) * CHUNK_SIZE).arrayBuffer()) }, room, true);
    }
    for (let offset = 0; offset < frames.length; offset += 6) {
      progress(`Đang lưu frame ${Math.min(offset + 6, frames.length)}/${frames.length}`);
      await rpc('footage.frames', { footageId: created.id, offset, frames: frames.slice(offset, offset + 6) }, room, true);
    }
    await rpc('footage.complete', { footageId: created.id }, room, true);
    return created.id;
  } catch (error) {
    // A failed upload must not become a partial recognition source or consume quota forever.
    try { await rpc('footage.delete', { footageId: created.id }, room, true); } catch { /* Pending uploads remain visible to their developer for cleanup. */ }
    throw error;
  }
}
export async function downloadFootage(room: Room, footage: Footage, progress: (value: string) => void) {
  const parts: Uint8Array<ArrayBuffer>[] = [];
  for (let n = 0; n < footage.chunks; n++) {
    progress(`Đang tải video ${n + 1}/${footage.chunks}`);
    const result = await rpc<{ data: string }>('media.get', { footageId: footage.id, n }, room);
    parts.push(Uint8Array.from(atob(result.data), character => character.charCodeAt(0)));
  }
  return new Blob(parts, { type: footage.mime });
}
const STORAGE = 'nosleepclub-hist-room-v1';
export function rememberRoom(room: Room) { localStorage.setItem(STORAGE + ':' + room.id, JSON.stringify(room)); localStorage.setItem(STORAGE, room.id); }
export function restoreRoom(): Room | null {
  try {
    const url = new URL(location.href), id = url.searchParams.get('room') || localStorage.getItem(STORAGE);
    if (!id || !/^[a-f0-9-]{36}$/.test(id)) return null;
    const previous = JSON.parse(localStorage.getItem(STORAGE + ':' + id) || 'null') as Room | null;
    const key = new URLSearchParams(url.hash.slice(1)).get('view');
    if (key && /^[a-f0-9]{64}$/.test(key)) {
      const room = { id, readKey: key, ...(previous?.id === id ? { writeKey: previous.writeKey } : {}) }; rememberRoom(room);
      history.replaceState(null, '', '?room=' + id); return room;
    }
    return previous;
  } catch { return null; }
}
export function shareLink(room?: Room | null) { return room ? `${location.origin}/?room=${room.id}#view=${room.readKey}` : location.origin + '/'; }
export class Vision {
  private worker = new Worker(new URL('./vision.worker.ts', import.meta.url), { type: 'module' });
  private sequence = 0;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  constructor(progress: (message: string) => void) {
    this.worker.onmessage = ({ data }) => {
      if (data.event === 'progress') { progress(data.message); return; }
      const waiting = this.pending.get(data.id); if (!waiting) return;
      clearTimeout(waiting.timer);
      this.pending.delete(data.id); data.error ? waiting.reject(new Error(data.error)) : waiting.resolve(data.result);
    };
    this.worker.onerror = event => { console.error('Vision worker initialization:', event.message); for (const item of this.pending.values()) { clearTimeout(item.timer); item.reject(new Error('Không mở được bộ nhận diện trên thiết bị này. Hãy thử Chrome hoặc Safari phiên bản mới.')); } this.pending.clear(); };
  }
  request<T>(action: string, data: Record<string, unknown> = {}): Promise<T> {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(action === 'init' ? 'Tải model quá lâu. Kiểm tra mạng và thử bật camera lại.' : 'Xử lý ảnh quá lâu. Hãy thử lại trên Chrome hoặc Safari mới.')); }, action === 'init' ? 180000 : 30000);
      this.pending.set(id, { resolve: value => resolve(value as T), reject, timer }); this.worker.postMessage({ id, action, ...data });
    });
  }
  close() { this.worker.terminate(); for (const item of this.pending.values()) { clearTimeout(item.timer); item.reject(new Error('Đã đóng bộ nhận diện.')); } this.pending.clear(); }
}
