import type { Environment, Env } from '@audius/common/services'

import { env as envDev } from './env.dev'
import { env as envProd } from './env.prod'

const environment = process.env.VITE_ENVIRONMENT as Environment

let env: Env

switch (environment) {
  case 'development':
    env = envDev
    break
  case 'production':
    env = envProd
    break
  default:
    throw new Error(`Unknown environment: ${environment}`)
}

export { env }
