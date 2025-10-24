import { audiusSdk } from './sdk'
import {
  AudiusSdk,
  developmentConfig,
  productionConfig,
  stagingConfig
} from '@audius/sdk'
import dotenv from 'dotenv'

dotenv.config()

export type SharedData = {
  apiEndpoint: string
  sdk: AudiusSdk
  runNow: boolean
  dryRun: boolean
  audiusDbUrl: string
  slackChannel?: string
  slackSigningSecret?: string
  slackBotToken?: string
  slackAppToken?: string
}

let sharedData: SharedData | undefined = undefined

const getApiEndpoint = (
  environment: 'development' | 'staging' | 'production'
) => {
  const sdkConfig =
    environment === 'development'
      ? developmentConfig
      : environment === 'staging'
        ? stagingConfig
        : productionConfig
  return sdkConfig.network.apiEndpoint
}

export const initSharedData = async (): Promise<SharedData> => {
  if (sharedData !== undefined) return sharedData

  sharedData = {
    sdk: audiusSdk({
      apiKey: process.env.trending_rewards_api_key!,
      apiSecret: process.env.trending_rewards_api_secret!,
      environment: process.env.environment as
        | 'development'
        | 'staging'
        | 'production',
      solanaRpcEndpoint: process.env.solana_rpc_endpoint,
      solanaRelayNode: process.env.solana_relay_node!
    }),
    apiEndpoint: getApiEndpoint(
      process.env.environment as 'development' | 'staging' | 'production'
    ),
    runNow: process.env.run_now?.toLowerCase() === 'true',
    dryRun: process.env.tcr_dry_run?.toLowerCase() === 'true',
    audiusDbUrl: process.env.audius_db_url!,
    slackChannel: process.env.slack_channel,
    slackSigningSecret: process.env.slack_signing_secret,
    slackBotToken: process.env.slack_bot_token,
    slackAppToken: process.env.slack_app_token
  }
  return sharedData
}
