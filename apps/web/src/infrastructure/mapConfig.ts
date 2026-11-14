import type { StyleSpecification } from 'maplibre-gl';

// Mapa base satelital sin clave: Sentinel-2 cloudless de EOX (CC BY-NC-SA 4.0, uso no comercial).
// Se puede cambiar por Google Map Tiles con una clave del proyecto de Google Cloud.
export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg'],
      tileSize: 256,
      maxzoom: 15,
      attribution:
        'Sentinel-2 cloudless – https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2020)',
    },
  },
  layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
};

// Vista inicial: Nebraska (estado de la demo)
export const INITIAL_VIEW = { center: [-98.5, 41.3] as [number, number], zoom: 6 };
