import { MercatorCoordinate, type CustomLayerInterface, type CustomRenderMethodInput, type Map as LibreMap } from 'maplibre-gl';
import catalog from './siteModelCatalog.json';
import { multiplyModelMatrix, readLandmarkGLB, type LandmarkMesh } from './landmarkMesh';

export const SITE_MODELS = catalog;
export type SiteModel = typeof catalog[number];
type Lod = 'near' | 'far';
type GL = WebGL2RenderingContext;
type GpuMesh = { vao: WebGLVertexArrayObject; vertex: WebGLBuffer; index: WebGLBuffer; count: number; type: number };
export type ModelStats = { state: 'loading' | 'ready' | 'partial'; loaded: number; drawn: number; triangles: number };
export const PALACE_CAMERA = { center: catalog[0].center as [number, number], zoom: 17.25, pitch: 52, bearing: -137 };
export const SITE_MODEL_ANCHORS = catalog.map(site => ({ id: site.id, longitude: site.center[0], latitude: site.center[1], altitudeMeters: 0 }));
export function siteModelPlacement(siteId: string) {
  const site = catalog.find(item => item.id === siteId);
  if (!site) throw new Error('Unknown landmark model anchor');
  const position = MercatorCoordinate.fromLngLat(site.center as [number, number], .12), scale = position.meterInMercatorCoordinateUnits();
  const angle = site.frontBearing * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
  // Standard glTF +Y is up, -Z is front; Mercator +Y is south. No visual exaggeration.
  const matrix = [c * scale, s * scale, 0, 0, 0, 0, scale, 0, -s * scale, c * scale, 0, 0, position.x, position.y, position.z, 1];
  return { position, metersToMercator: scale, matrix, angle: [c, s] };
}
export function modelLod(site: SiteModel, zoom: number): Lod {
  const pixelsPerMeter = MercatorCoordinate.fromLngLat(site.center as [number, number]).meterInMercatorCoordinateUnits() * 512 * 2 ** zoom;
  return Math.max(site.dimensionsMeters[0], site.dimensionsMeters[1]) * pixelsPerMeter >= 125 ? 'near' : 'far';
}
export function modelInView(site: SiteModel, zoom: number, bounds: { getWest(): number; getEast(): number; getNorth(): number; getSouth(): number }) {
  const margin = Math.max(site.dimensionsMeters[0], site.dimensionsMeters[1]) / 100000;
  return zoom >= site.minZoom && site.center[0] >= bounds.getWest() - margin && site.center[0] <= bounds.getEast() + margin && site.center[1] >= bounds.getSouth() - margin && site.center[1] <= bounds.getNorth() + margin;
}

const cachedMeshes = new globalThis.Map<string, LandmarkMesh>();
const vertexSource = `#version 300 es
uniform mat4 u_matrix;
uniform vec2 u_bearing;
layout(location=0) in vec3 a_position;
layout(location=1) in vec3 a_normal;
out vec3 v_normal;
void main(){
  v_normal=vec3(u_bearing.x*a_normal.x-u_bearing.y*a_normal.z,-u_bearing.y*a_normal.x-u_bearing.x*a_normal.z,a_normal.y);
  gl_Position=u_matrix*vec4(a_position,1.0);
}`;
const fragmentSource = `#version 300 es
precision highp float;
in vec3 v_normal;
out vec4 fragColor;
void main(){
  vec3 n=normalize(v_normal);
  float key=max(0.0,dot(n,normalize(vec3(-0.6,0.35,0.85))));
  float shade=0.43+0.39*key+0.10*max(n.z,0.0);
  fragColor=vec4(vec3(shade),1.0);
}`;
function programFor(gl: GL) {
  const program = gl.createProgram(); if (!program) throw new Error('Landmark program unavailable');
  const shaders: WebGLShader[] = [];
  try {
    for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]] as const) {
      const shader = gl.createShader(type); if (!shader) throw new Error('Landmark shader unavailable');
      shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Landmark shader failed');
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Landmark program failed');
    return program;
  } catch (error) { gl.deleteProgram(program); throw error; }
  finally { shaders.forEach(shader => gl.deleteShader(shader)); }
}
function upload(gl: GL, mesh: LandmarkMesh): GpuMesh {
  const previousVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING), previousArray = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
  const vao = gl.createVertexArray(), vertex = gl.createBuffer(), index = gl.createBuffer();
  if (!vao || !vertex || !index) { if (vao) gl.deleteVertexArray(vao); if (vertex) gl.deleteBuffer(vertex); if (index) gl.deleteBuffer(index); throw new Error('Landmark buffer unavailable'); }
  gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vertex); gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
  gl.bindVertexArray(previousVao); gl.bindBuffer(gl.ARRAY_BUFFER, previousArray);
  return { vao, vertex, index, count: mesh.indices.length, type: mesh.indices instanceof Uint16Array ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT };
}
function dispose(gl: GL, mesh: GpuMesh) { gl.deleteVertexArray(mesh.vao); gl.deleteBuffer(mesh.vertex); gl.deleteBuffer(mesh.index); }

export function createSiteModelLayer(onStats: (stats: ModelStats) => void): CustomLayerInterface {
  let map: LibreMap, gl: GL, program: WebGLProgram | null = null, alive = false, inFlight = 0, failed = false;
  let matrixUniform: WebGLUniformLocation | null, bearingUniform: WebGLUniformLocation | null;
  const gpu = new globalThis.Map<string, GpuMesh>(), requests = new globalThis.Map<string, AbortController>(), wanted = new globalThis.Map<string, { site: SiteModel; lod: Lod }>();
  const placements = catalog.map(site => siteModelPlacement(site.id)), matrix = new Float32Array(16);
  let previousStats = '';
  function stats(drawn = 0, triangles = 0) {
    if (!alive) return;
    const value: ModelStats = { state: failed ? 'partial' : inFlight || [...wanted.keys()].some(url => !gpu.has(url)) ? 'loading' : 'ready', loaded: gpu.size, drawn, triangles };
    const key = JSON.stringify(value); if (key !== previousStats) { previousStats = key; onStats(value); }
  }
  function initialize() {
    if (program && gl.isProgram(program)) gl.deleteProgram(program);
    gpu.forEach(mesh => dispose(gl, mesh)); gpu.clear();
    program = programFor(gl); matrixUniform = gl.getUniformLocation(program, 'u_matrix'); bearingUniform = gl.getUniformLocation(program, 'u_bearing');
    update();
  }
  function update() {
    if (!alive || gl.isContextLost()) return;
    wanted.clear(); const zoom = map.getZoom(), bounds = map.getBounds();
    // Fetch/parse/upload only on settled camera events, never in the render loop.
    for (const site of catalog) if (modelInView(site, zoom, bounds)) {
      const lod = modelLod(site, zoom), url = site[lod].url; wanted.set(url, { site, lod });
      if (!gpu.has(url) && cachedMeshes.has(url)) {
        try { gpu.set(url, upload(gl, cachedMeshes.get(url)!)); } catch { failed = true; }
      }
    }
    pump(); stats(); map.triggerRepaint();
  }
  function pump() {
    if (!alive) return;
    for (const [url] of wanted) {
      if (inFlight >= 2) break;
      if (gpu.has(url) || requests.has(url)) continue;
      const controller = new AbortController(); requests.set(url, controller); inFlight++;
      const timer = setTimeout(() => controller.abort(), 15000);
      void fetch(url, { signal: controller.signal }).then(async response => {
        if (!response.ok) throw new Error('Landmark asset unavailable');
        const buffer = await response.arrayBuffer(); if (buffer.byteLength > 250000) throw new Error('Landmark budget exceeded');
        const mesh = readLandmarkGLB(buffer); cachedMeshes.set(url, mesh);
        if (alive && !gl.isContextLost() && wanted.has(url)) gpu.set(url, upload(gl, mesh));
      }).catch(() => { if (alive) failed = true; }).finally(() => {
        clearTimeout(timer); inFlight--;
        // Retain completed request keys to prevent automatic failure retry loops.
        if (alive) { pump(); stats(); map.triggerRepaint(); }
      });
    }
  }
  function restored() { if (alive) { failed = false; try { initialize(); } catch { failed = true; stats(); } } }
  return {
    id: 'hist-landmark-models', type: 'custom', renderingMode: '3d',
    onAdd(instance, context) {
      map = instance; gl = context; alive = true;
      map.on('moveend', update); map.on('webglcontextrestored', restored);
      try { initialize(); } catch { failed = true; stats(); }
    },
    render(context: GL, args: CustomRenderMethodInput) {
      if (!alive || !program || context.isContextLost()) return;
      const zoom = map.getZoom(), bounds = map.getBounds(); let drawn = 0, triangles = 0;
      context.useProgram(program); context.enable(context.DEPTH_TEST); context.depthFunc(context.LEQUAL); context.depthMask(true);
      context.disable(context.BLEND); context.disable(context.CULL_FACE);
      for (let i = 0; i < catalog.length; i++) {
        const site = catalog[i]; if (!modelInView(site, zoom, bounds)) continue;
        const lod = modelLod(site, zoom), mesh = gpu.get(site[lod].url) || gpu.get(site[lod === 'near' ? 'far' : 'near'].url); if (!mesh) continue;
        const placement = placements[i];
        context.uniformMatrix4fv(matrixUniform, false, multiplyModelMatrix(args.defaultProjectionData.mainMatrix, placement.matrix, matrix));
        context.uniform2f(bearingUniform, placement.angle[0], placement.angle[1]); context.bindVertexArray(mesh.vao);
        context.drawElements(context.TRIANGLES, mesh.count, mesh.type, 0); drawn++; triangles += mesh.count / 3;
      }
      context.bindVertexArray(null); context.enable(context.BLEND); stats(drawn, triangles);
    },
    onRemove() {
      alive = false; map.off('moveend', update); map.off('webglcontextrestored', restored);
      requests.forEach(controller => controller.abort()); gpu.forEach(mesh => dispose(gl, mesh)); gpu.clear();
      if (program) gl.deleteProgram(program); program = null;
    },
  };
}
export function attachSiteModel(map: LibreMap, layer: CustomLayerInterface) {
  if (layer.renderingMode !== '3d') throw new Error('A site model must share the map depth buffer');
  map.addLayer(layer, map.getStyle().layers.find(item => item.type === 'symbol')?.id);
  return () => { if (map.getLayer(layer.id)) map.removeLayer(layer.id); };
}
