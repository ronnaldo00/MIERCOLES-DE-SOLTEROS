/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_PRODUCER_URLNAME: string;
  readonly VITE_APP_SCHEME: string;
  /** 'true' = no llamar a la API, solo mostrar contenido/eventos.json (GitHub Pages) */
  readonly VITE_SOLO_VISTA_PREVIA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
