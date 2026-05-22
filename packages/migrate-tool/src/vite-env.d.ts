/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUDIUS_API_KEY?: string
  readonly VITE_AUDIUS_ENVIRONMENT?: 'development' | 'production'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
