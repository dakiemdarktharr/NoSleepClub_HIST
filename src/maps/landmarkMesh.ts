// Small loader for our static Blender exports. Unsupported glTF features are rejected.
export type LandmarkMesh = { vertices: Float32Array; indices: Uint16Array | Uint32Array; bounds: { min: number[]; max: number[] } };
type Accessor = { bufferView: number; byteOffset?: number; componentType: number; count: number; type: string; sparse?: unknown };
type BufferView = { buffer: number; byteOffset?: number; byteLength: number; byteStride?: number };
export function readLandmarkGLB(buffer: ArrayBuffer): LandmarkMesh {
  const view = new DataView(buffer);
  const invalid = () => { throw new Error('Unsupported landmark mesh'); };
  if (buffer.byteLength < 28 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.byteLength) return invalid();
  const jsonBytes = view.getUint32(12, true), binaryHeader = 20 + jsonBytes;
  if (view.getUint32(16, true) !== 0x4e4f534a || binaryHeader + 8 > buffer.byteLength || view.getUint32(binaryHeader + 4, true) !== 0x004e4942) return invalid();
  const doc = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonBytes)));
  const binaryStart = binaryHeader + 8, binaryEnd = binaryStart + view.getUint32(binaryHeader, true);
  if (binaryEnd > buffer.byteLength || doc.buffers?.length !== 1 || doc.buffers[0].uri || doc.meshes?.length !== 1 || doc.nodes?.length !== 1 || doc.nodes[0].mesh !== 0 || ['matrix', 'translation', 'rotation', 'scale', 'children'].some(key => doc.nodes[0][key]) || doc.skins || doc.animations || doc.images || doc.textures) return invalid();
  const primitives = doc.meshes[0].primitives;
  if (primitives?.length !== 1 || (primitives[0].mode !== undefined && primitives[0].mode !== 4)) return invalid();
  const primitive = primitives[0];
  if (primitive.targets || doc.meshes[0].weights || Object.keys(primitive.attributes).some(key => !['POSITION', 'NORMAL'].includes(key))) return invalid();
  function accessor(index: number, type: string, allowed: number[]) {
    const a: Accessor = doc.accessors?.[index], b: BufferView = doc.bufferViews?.[a?.bufferView];
    if (!a || !b || a.type !== type || !allowed.includes(a.componentType) || a.sparse || b.buffer !== 0 || !Number.isInteger(a.count) || a.count < 1 || a.count > 100000) return invalid();
    const bytes = a.componentType === 5123 ? 2 : 4, components = type === 'VEC3' ? 3 : 1;
    const start = binaryStart + (b.byteOffset || 0) + (a.byteOffset || 0), stride = b.byteStride || components * bytes;
    if (stride < components * bytes || start < binaryStart || start + (a.count - 1) * stride + components * bytes > Math.min(binaryEnd, binaryStart + (b.byteOffset || 0) + b.byteLength)) return invalid();
    return { a, start, stride, bytes };
  }
  const position = accessor(primitive.attributes.POSITION, 'VEC3', [5126]), normal = accessor(primitive.attributes.NORMAL, 'VEC3', [5126]), index = accessor(primitive.indices, 'SCALAR', [5123, 5125]);
  if (position.a.count !== normal.a.count || index.a.count % 3) return invalid();
  const vertices = new Float32Array(position.a.count * 6), indices = index.bytes === 2 ? new Uint16Array(index.a.count) : new Uint32Array(index.a.count);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < position.a.count; i++) for (let axis = 0; axis < 3; axis++) {
    const p = view.getFloat32(position.start + i * position.stride + axis * 4, true), n = view.getFloat32(normal.start + i * normal.stride + axis * 4, true);
    if (!Number.isFinite(p) || !Number.isFinite(n)) return invalid();
    vertices[i * 6 + axis] = p; vertices[i * 6 + 3 + axis] = n; min[axis] = Math.min(min[axis], p); max[axis] = Math.max(max[axis], p);
  }
  for (let i = 0; i < indices.length; i++) {
    const n = index.bytes === 2 ? view.getUint16(index.start + i * index.stride, true) : view.getUint32(index.start + i * index.stride, true);
    if (n >= position.a.count) return invalid(); indices[i] = n;
  }
  return { vertices, indices, bounds: { min, max } };
}

// Combine world translation in JS doubles before Float32 conversion to prevent jitter.
export function multiplyModelMatrix(projection: ArrayLike<number>, model: ArrayLike<number>, out = new Float32Array(16)) {
  for (let column = 0; column < 4; column++) for (let row = 0; row < 4; row++) {
    let value = 0;
    for (let k = 0; k < 4; k++) value += projection[k * 4 + row] * model[column * 4 + k];
    out[column * 4 + row] = value;
  }
  return out;
}
