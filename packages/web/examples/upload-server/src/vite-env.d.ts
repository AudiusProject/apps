/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WRITE_SERVER_URL?: string
  readonly VITE_AUDIUS_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
