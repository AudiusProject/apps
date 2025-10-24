import dotenv from 'dotenv'
import { logger } from '../logger'
import { bool, cleanEnv, num, str } from 'envalid'
import {
  AntiAbuseConfig,
  allowListPublicKeys,
  blockListPublicKeys,
  newAntiAbuseConfig
} from './antiAbuseConfig'

let config: Config | null = null

export type Config = {
  environment: string
  rpcEndpoint: string
  rpcEndpointFallback: string
  acdcChainId?: string
  discoveryDbConnectionString: string
  entityManagerContractAddress: string
  entityManagerContractRegistryKey: string
  serverHost: string
  serverPort: number
  aao: AntiAbuseConfig
  rateLimitAllowList: string[]
  rateLimitBlockList: string[]
  finalPoaBlock: number
  redisUrl: string
  verifierAddress: string
  coreEndpoint: string
}

// reads .env file based on environment
const readDotEnv = () => {
  const environment = process.env.audius_discprov_env || 'dev'
  const dotenvConfig = (filename: string) =>
    dotenv.config({ path: `${filename}.env` })
  logger.info(`running on ${environment} network`)
  dotenvConfig(environment)
}

const defaultCoreEndpoint = (env: string): string => {
  if (env === 'dev') return 'http://audiusd-1:50051'
  return 'http://core:50051'
}

export const chainId = (config: Config): string => {
  if (config.environment == 'stage') return '1056801'
  if (config.environment == 'dev') return '1337'
  return '31524'
}

export const readConfig = (): Config => {
  if (config !== null) {
    return config
  }

  readDotEnv()

  // validate env
  const env = cleanEnv(process.env, {
    audius_discprov_env: str({ default: 'dev' }),
    audius_contracts_entity_manager_address: str({
      default: '0x254dffcd3277C0b1660F6d42EFbB754edaBAbC2B'
    }),
    audius_web3_localhost: str({
      default: 'http://audius-poa-ganache-1:8545'
    }),
    audius_web3_host: str({
      default: 'http://audius-poa-ganache-1:8545'
    }),
    audius_db_url: str({
      default:
        'postgresql+psycopg2://postgres:postgres@db:5432/discovery_provider_1'
    }),
    audius_aao_endpoint: str({ default: '' }),
    audius_use_aao: bool({ default: false }),
    relay_server_host: str({ default: '0.0.0.0' }),
    relay_server_port: num({ default: 6001 }),
    audius_final_poa_block: num({ default: 0 }),
    audius_redis_url: str({
      default: 'redis://audius--provider-redis-1:6379/0'
    }),
    audius_contracts_verified_address: str({ default: '' }),
    audius_core_endpoint: str({ default: '' })
  })

  if (config === null) {
    config = {
      environment: env.audius_discprov_env,
      rpcEndpoint: env.audius_web3_localhost,
      rpcEndpointFallback: env.audius_web3_host,
      discoveryDbConnectionString: env.audius_db_url,
      entityManagerContractAddress: env.audius_contracts_entity_manager_address,
      entityManagerContractRegistryKey: 'EntityManager',
      serverHost: env.relay_server_host,
      serverPort: env.relay_server_port,
      aao: newAntiAbuseConfig(env.audius_aao_endpoint, env.audius_use_aao),
      rateLimitAllowList: allowListPublicKeys(),
      rateLimitBlockList: blockListPublicKeys(),
      finalPoaBlock: env.audius_final_poa_block,
      redisUrl: env.audius_redis_url,
      verifierAddress: env.audius_contracts_verified_address,
      coreEndpoint:
        env.audius_core_endpoint !== ''
          ? env.audius_core_endpoint
          : defaultCoreEndpoint(env.audius_discprov_env)
    }
  }

  return config
}
