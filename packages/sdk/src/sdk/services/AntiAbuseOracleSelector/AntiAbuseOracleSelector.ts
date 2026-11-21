import {
  ErrorContext,
  Middleware,
  RequestContext
} from '../../api/generated/default'
import { productionConfig } from '../../config/production'
import fetch from '../../utils/fetch'
import { getPathFromUrl } from '../../utils/getPathFromUrl'
import { mergeConfigWithDefaults } from '../../utils/mergeConfigs'
import { promiseAny } from '../../utils/promiseAny'
import { AntiAbuseOracleHealthCheckResponse } from '../AntiAbuseOracle/types'
import type { LoggerService } from '../Logger'

import { getDefaultAntiAbuseOracleSelectorConfig } from './getDefaultConfig'
import type {
  AntiAbuseOracleSelectorService,
  AntiAbuseOracleNode,
  AntiAbuseOracleSelectorConfig
} from './types'

export class AntiAbuseOracleSelector implements AntiAbuseOracleSelectorService {
  private readonly endpoints: string[]
  private readonly registeredAddresses: string[]
  private readonly logger: LoggerService
  private selectedNode: AntiAbuseOracleNode | null = null

  constructor(config?: AntiAbuseOracleSelectorConfig) {
    const configWithDefaults = mergeConfigWithDefaults(
      config,
      getDefaultAntiAbuseOracleSelectorConfig(productionConfig)
    )
    this.endpoints = configWithDefaults.endpoints
    this.registeredAddresses = configWithDefaults.registeredAddresses
    this.logger = configWithDefaults.logger
  }

  public createMiddleware(): Middleware {
    return {
      pre: async (context: RequestContext) => {
        let url = context.url
        if (!url.startsWith('http')) {
          const service = await this.getSelectedService()
          url = `${service.endpoint}${context.url}`
        }
        return { url, init: context.init }
      },
      onError: async (context: ErrorContext) => {
        const path = getPathFromUrl(context.url)
        this.selectedNode = null
        const newService = await this.getSelectedService()
        return context.fetch(`${newService.endpoint}${path}`, context.init)
      }
    }
  }

  /**
   * Gets the currently selected Anti Abuse Oracle.
   * @throws if no service is available.
   */
  public async getSelectedService() {
    if (!this.selectedNode) {
      this.selectedNode = await this.select()
    }
    return this.selectedNode
  }

  /**
   * Races the configured endpoints for the fastest healthy registered service.
   * @throws if no services available.
   */
  private async select() {
    try {
      return await promiseAny(
        this.endpoints.map(async (endpoint) => {
          try {
            return await this.getNode(endpoint)
          } catch (e) {
            this.logger.warn(`Anti Abuse Oracle ${endpoint} is unhealthy: ${e}`)
            throw e
          }
        })
      )
    } catch (e) {
      throw new Error('All Anti Abuse Oracles are unhealthy')
    }
  }

  /**
   * Fetches the healthcheck for the given endpoint, and checks that the wallet
   * is a registered Anti Abuse Oracle wallet.
   * @returns the node wallet and endpoint if healthy
   */
  private async getNode(endpoint: string) {
    const response = await fetch(`${endpoint}/health_check`)
    if (response.ok) {
      const json: AntiAbuseOracleHealthCheckResponse = await response.json()
      const wallet = json.walletPubkey ?? json.antiAbuseWalletPubkey
      if (!this.registeredAddresses.includes(wallet)) {
        throw new Error(`Not registered: ${wallet}`)
      }
      return { wallet, endpoint }
    } else {
      throw new Error(`Response failed with status ${response.status}`)
    }
  }
}
