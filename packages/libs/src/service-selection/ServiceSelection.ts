import type { AxiosResponse } from 'axios'
import { sampleSize } from 'lodash'

import {
  raceRequests,
  allRequests,
  ServiceName,
  ServiceWithEndpoint,
  Service,
  Maybe
} from '../utils'

import { DECISION_TREE_STATE } from './constants'

function isVerbose(service: Service): service is ServiceWithEndpoint {
  return typeof service !== 'string'
}

export type GetServicesInput =
  | (() => Promise<ServiceName[]>)
  | ((config: { verbose: false }) => Promise<ServiceName[]>)
  | ((config: { verbose: true }) => Promise<ServiceWithEndpoint[]>)
  | ((config: {
      verbose: boolean
    }) => Promise<ServiceName[] | ServiceWithEndpoint[]>)

interface GetServices {
  (): Promise<ServiceName[]>
  (config: { verbose: false }): Promise<ServiceName[]>
  (config: { verbose: true }): Promise<ServiceWithEndpoint[]>
  (config: { verbose: boolean }): Promise<Service[]>
}

export interface Decision {
  stage: string
  val?: unknown
}

export type Backup = { block_difference: number; version: string }

export interface ServiceSelectionConfig {
  blacklist?: Set<string> | undefined | null
  whitelist?: Set<string> | undefined | null
  getServices: GetServicesInput
  maxConcurrentRequests?: number
  requestTimeout?: Maybe<number>
  unhealthyTTL?: number
  backupsTTL?: number
}

export class ServiceSelection {
  blacklist: Set<string> | undefined | null
  whitelist: Set<string> | undefined | null
  getServices: GetServices
  maxConcurrentRequests: number
  requestTimeout: number
  unhealthyTTL: number
  backupsTTL: number
  unhealthy: Set<string>
  backups: Record<string, Backup>
  totalAttempts: number
  decisionTree: Decision[]
  unhealthyCleanupTimeout: NodeJS.Timeout | null = null
  backupCleanupTimeout: NodeJS.Timeout | null = null

  constructor({
    blacklist,
    whitelist,
    getServices,
    maxConcurrentRequests = 6,
    requestTimeout = 30 * 1000, // 30s
    unhealthyTTL = 60 * 60 * 1000, // 1 hour
    backupsTTL = 2 * 60 * 1000
  }: ServiceSelectionConfig) {
    this.blacklist = blacklist
    this.whitelist = whitelist
    this.getServices = getServices as GetServices
    this.maxConcurrentRequests = maxConcurrentRequests
    this.requestTimeout = requestTimeout
    this.unhealthyTTL = unhealthyTTL
    this.backupsTTL = backupsTTL

    this.unhealthy = new Set([])

    this.backups = {}

    this.totalAttempts = 0

    this.decisionTree = []
  }

  async select(reset: any = true): Promise<any> {
    if (reset) {
      this.decisionTree = []
    }

    const shortcircuit = await this.shortcircuit()
    this.decisionTree.push({
      stage: DECISION_TREE_STATE.CHECK_SHORT_CIRCUIT,
      val: shortcircuit
    })
    if (shortcircuit && (!this.blacklist || !this.blacklist.has(shortcircuit)))
      return shortcircuit

    let services = await this.getServices()
    this.decisionTree.push({
      stage: DECISION_TREE_STATE.GET_ALL_SERVICES,
      val: services
    })

    if (this.whitelist) {
      services = this.filterToWhitelist(services)
      this.decisionTree.push({
        stage: DECISION_TREE_STATE.FILTER_TO_WHITELIST,
        val: services
      })
    }

    if (this.blacklist) {
      services = this.filterFromBlacklist(services)
      this.decisionTree.push({
        stage: DECISION_TREE_STATE.FILTER_FROM_BLACKLIST,
        val: services
      })
    }

    const filteredServices = this.filterOutKnownUnhealthy(services)
    this.decisionTree.push({
      stage: DECISION_TREE_STATE.FILTER_OUT_KNOWN_UNHEALTHY,
      val: filteredServices
    })

    const round = this.getSelectionRound(filteredServices)
    this.decisionTree.push({
      stage: DECISION_TREE_STATE.GET_SELECTION_ROUND,
      val: round
    })

    this.totalAttempts += round.length

    if (filteredServices.length === 0) {
      this.decisionTree.push({
        stage: DECISION_TREE_STATE.NO_SERVICES_LEFT_TO_TRY
      })
      if (this.getBackupsSize() > 0) {
        const backup = await this.selectFromBackups()
        this.decisionTree.push({
          stage: DECISION_TREE_STATE.SELECTED_FROM_BACKUP,
          val: backup
        })
        return backup
      } else {
        this.unhealthy = new Set([])
        this.backups = {}
        this.decisionTree.push({
          stage: DECISION_TREE_STATE.FAILED_AND_RESETTING
        })
        return null
      }
    }

    const { best, errored } = await this.race(round)

    errored.forEach((e) => {
      if (e) {
        this.addUnhealthy(e)
      }
    })

    this.triggerCleanup()

    if (!best) {
      this.decisionTree.push({ stage: DECISION_TREE_STATE.ROUND_FAILED_RETRY })
      return await this.select(/* reset */ false)
    }

    this.decisionTree.push({
      stage: DECISION_TREE_STATE.MADE_A_SELECTION,
      val: best
    })
    return best
  }

  async findAll({ verbose = false, whitelist = this.whitelist } = {}) {
    let services = await this.getServices({ verbose })

    if (whitelist) {
      services = services.filter((service) =>
        whitelist.has(isVerbose(service) ? service.endpoint : service)
      )
    }

    const urlMap = services.reduce<Record<string, Service>>(
      (urlMap, service) => {
        urlMap[
          ServiceSelection.getHealthCheckEndpoint(
            isVerbose(service) ? service.endpoint : service
          )
        ] = service
        return urlMap
      },
      {}
    )

    try {
      const results = await allRequests({
        urlMap,
        timeout: this.requestTimeout,
        validationCheck: (resp) => this.isHealthy(resp, urlMap)
      })
      return results
    } catch (e) {
      console.error(e)
      return []
    }
  }

  triggerCleanup() {
    if (this.unhealthyCleanupTimeout) {
      clearTimeout(this.unhealthyCleanupTimeout)
    }

    if (this.backupCleanupTimeout) {
      clearTimeout(this.backupCleanupTimeout)
    }

    this.unhealthyCleanupTimeout = setTimeout(() => {
      this.clearUnhealthy()
    }, this.unhealthyTTL)
    this.backupCleanupTimeout = setTimeout(() => {
      this.clearBackups()
    }, this.backupsTTL)
  }

  clearUnhealthy() {
    this.unhealthy = new Set([])
  }

  clearBackups() {
    this.backups = {}
  }

  async shortcircuit(): Promise<null | string> {
    return null
  }

  filterFromBlacklist(services: string[]) {
    return services.filter((s) => !this.blacklist?.has(s))
  }

  filterToWhitelist(services: string[]) {
    return services.filter((s) => this.whitelist?.has(s))
  }

  filterOutKnownUnhealthy(services: string[]) {
    return services.filter((s) => !this.unhealthy.has(s))
  }

  getSelectionRound(services: string[]) {
    return sampleSize(services, this.maxConcurrentRequests)
  }

  getTotalAttempts() {
    return this.totalAttempts
  }

  static getHealthCheckEndpoint(service: string) {
    return `${service}/health_check`
  }

  isHealthy(response: AxiosResponse, _urlMap: Record<string, Service>) {
    return response.status === 200
  }

  async race(services: string[]) {
    const serviceMap = services.reduce<Record<string, string>>((acc, s) => {
      acc[ServiceSelection.getHealthCheckEndpoint(s)] = s
      return acc
    }, {})

    let best: string | null = null
    try {
      const { errored } = await raceRequests(
        Object.keys(serviceMap),
        (url) => {
          best = serviceMap[url] as string
        },
        {},
        this.requestTimeout,
        0,
        (resp) => this.isHealthy(resp, serviceMap)
      )
      this.decisionTree.push({
        stage: DECISION_TREE_STATE.RACED_AND_FOUND_BEST,
        val: best
      })
      return {
        best,
        errored: errored.map((e) => serviceMap[e.config.url ?? ''])
      }
    } catch (e) {
      return { best: null, errored: [] }
    }
  }

  addUnhealthy(service: ServiceName) {
    this.unhealthy.add(service)
  }

  getUnhealthySize() {
    return this.unhealthy.size
  }

  removeFromUnhealthy(key: string) {
    if (this.unhealthy.has(key)) this.unhealthy.delete(key)
  }

  addBackup(service: string, response: Backup) {
    this.backups[service] = response
  }

  async selectFromBackups() {
    return Object.keys(this.backups)[0]
  }

  removeFromBackups(key: string) {
    if (Object.prototype.hasOwnProperty.call(this.backups, key))
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.backups[key]
  }

  getBackupsSize() {
    return Object.keys(this.backups).length
  }
}
