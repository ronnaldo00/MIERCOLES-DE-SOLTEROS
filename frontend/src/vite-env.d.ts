/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_PRODUCER_URLNAME: string;
  readonly VITE_APP_SCHEME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
