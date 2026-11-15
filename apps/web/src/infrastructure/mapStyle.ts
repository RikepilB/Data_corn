import type { StyleSpecification } from 'maplibre-gl';
import { BLUE_MARBLE_TILES, EOX_ATTRIBUTION, EOX_TILES, GIBS_ATTRIBUTION } from './gibs';

/** La Tierra en 3D: Blue Marble de NASA GIBS y, al acercarse, Sentinel-2 cloudless (EOX). */
export function globeStyle(): StyleSpecification {
  return {
    version: 8,
    projection: { type: 'globe' },
    sky: {
      'sky-color': '#0b1d3a',
      'horizon-color': '#4a86c5',
      'sky-horizon-blend': 0.5,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
    },
    sources: {
      'blue-marble': {
        type: 'raster',
        tiles: [BLUE_MARBLE_TILES],
        tileSize: 256,
        maxzoom: 8,
        attribution: GIBS_ATTRIBUTION,
      },
      eox: {
        type: 'raster',
        tiles: [EOX_TILES],
        tileSize: 256,
        maxzoom: 16,
        attribution: EOX_ATTRIBUTION,
      },
    },
    layers: [
      { id: 'ocean', type: 'background', paint: { 'background-color': '#0a1a2f' } },
      { id: 'blue-marble', type: 'raster', source: 'blue-marble' },
      {
        id: 'eox',
        type: 'raster',
        source: 'eox',
        minzoom: 5,
        paint: {
          'raster-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0, 7, 1],
        },
      },
    ],
  };
}

/** Vista inicial: el globo entero, centrado en las Américas. */
export const GLOBE_VIEW = { center: [-75, 12] as [number, number], zoom: 1.5 };
export const FIELD_ZOOM = 14.5;

export const SAMPLE_FIELD: [number, number][] = [
  [-98.004, 40.9],
  [-97.994, 40.9],
  [-97.994, 40.9073],
  [-98.004, 40.9073],
];
