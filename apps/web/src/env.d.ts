/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Clave de Google Maps Platform (Map Tiles API). Opcional. */
  readonly PUBLIC_GOOGLE_MAPS_KEY?: string;
  /** 'true' shows the chat assistant on the real example report. Off when missing. */
  readonly PUBLIC_CHAT_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
