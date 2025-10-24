import { PublicKey } from '@solana/web3.js'
import dotenv from 'dotenv'
import { cleanEnv, str, num } from 'envalid'

import { logger } from './logger'

export const LISTENS_RATE_LIMIT_IP_PREFIX = 'listens-rate-limit-ip'
export const LISTENS_RATE_LIMIT_TRACK_PREFIX = 'listens-rate-limit-track'

export const ClockProgram = new PublicKey(
  'SysvarC1ock11111111111111111111111111111111'
)
export const InstructionsProgram = new PublicKey(
  'Sysvar1nstructions1111111111111111111111111'
)

export type Environment = 'dev' | 'stage' | 'prod'

// reads .env file based on environment
const readDotEnv = () => {
  const environment = process.env.audius_discprov_env || 'dev'
  const dotenvConfig = (filename: string) =>
    dotenv.config({ path: `${filename}.env`, override: true })
  logger.info(`running on ${environment} network`)
  dotenvConfig(environment)
}

type Config = {
  environment: Environment
  discoveryDbConnectionString: string
  redisUrl: string
  serverHost: string
  serverPort: number
  privateSignerAddress: string
}

let cachedConfig: Config | null = null

export const readConfig = (): Config => {
  if (cachedConfig !== null) return cachedConfig
  readDotEnv()

  // validate env
  const env = cleanEnv(process.env, {
    audius_discprov_env: str({
      default: 'dev'
    }),
    audius_discprov_url: str({
      default: 'http://audius-discovery-provider-1'
    }),
    audius_db_url: str({
      default:
        'postgresql+psycopg2://postgres:postgres@db:5432/discovery_provider_1'
    }),
    audius_redis_url: str({
      default: 'redis://audius-discovery-redis-1:6379/00'
    }),
    anti_abuse_oracle_server_host: str({ default: '0.0.0.0' }),
    anti_abuse_oracle_server_port: num({ default: 6003 }),

    private_signer_address: str({ default: '' })
  })

  cachedConfig = {
    environment: env.audius_discprov_env as Environment,
    discoveryDbConnectionString: env.audius_db_url,
    redisUrl: env.audius_redis_url,
    serverHost: env.anti_abuse_oracle_server_host,
    serverPort: env.anti_abuse_oracle_server_port,
    privateSignerAddress: env.private_signer_address
  }
  return readConfig()
}

export const config = readConfig()
