/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUDIUS_API_KEY?: string
  readonly VITE_AUDIUS_ENVIRONMENT?: 'development' | 'production'
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
