/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Clave de Google Maps Platform (Map Tiles API). Opcional. */
  readonly PUBLIC_GOOGLE_MAPS_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
