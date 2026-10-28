import { MercatorCoordinate, type CustomLayerInterface, type Map } from 'maplibre-gl';
import { LANDMARKS } from './landmarks';

// Stable geographic anchors for future authored glTF/custom layers. No landmark model is shipped yet.
export const SITE_MODEL_ANCHORS = LANDMARKS.map(site => ({ id: site.id, longitude: site.lon, latitude: site.lat, altitudeMeters: 0 }));
export function siteModelPlacement(siteId: string) {
  const site = SITE_MODEL_ANCHORS.find(item => item.id === siteId);
  if (!site) throw new Error('Unknown landmark model anchor');
  const position = MercatorCoordinate.fromLngLat([site.longitude, site.latitude], site.altitudeMeters);
  return { position, metersToMercator: position.meterInMercatorCoordinateUnits() };
}
export function attachSiteModel(map: Map, layer: CustomLayerInterface) {
  if (layer.renderingMode !== '3d') throw new Error('A site model must share the map depth buffer');
  map.addLayer(layer);
  return () => { if (map.getLayer(layer.id)) map.removeLayer(layer.id); };
}
