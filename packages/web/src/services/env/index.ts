import type { Environment, Env } from '@audius/common/services'

import { env as envDev } from './env.dev'
import { env as envProd } from './env.prod'

// Get environment from process.env, with fallback for Cloudflare Workers
// where process.env may not be properly defined
const environment = (process.env?.VITE_ENVIRONMENT ||
  // Default to production for SSR/workers where env isn't set
  'production') as Environment

let env: Env

switch (environment) {
  case 'development':
    env = envDev
    break
  case 'production':
    env = envProd
    break
  default:
    // Fallback to production if unknown environment
    console.warn(`Unknown environment: ${environment}, defaulting to production`)
    env = envProd
}

export { env }
