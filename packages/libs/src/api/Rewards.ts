import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import BN from 'bn.js'
import { sampleSize } from 'lodash'

import { WAUDIO_DECIMALS } from '../constants'
import type { DiscoveryProvider } from '../services/discoveryProvider'
import { RewardsManagerError } from '../services/solana/errors'
import type { AttestationMeta } from '../services/solana/rewards'
import type { Logger, Nullable } from '../utils'
import { Utils } from '../utils/utils'

import type { ServiceProvider } from './ServiceProvider'
import { Base, BaseConstructorArgs, Services } from './base'

const { decodeHashId } = Utils

const GetAttestationError = Object.freeze({
  CHALLENGE_INCOMPLETE: 'CHALLENGE_INCOMPLETE',
  ALREADY_DISBURSED: 'ALREADY_DISBURSED',
  INVALID_ORACLE: 'INVALID_ORACLE',
  MISSING_CHALLENGES: 'MISSING_CHALLENGES',
  INVALID_INPUT: 'INVALID_INPUT',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  HCAPTCHA: 'HCAPTCHA',
  COGNITO_FLOW: 'COGNITO_FLOW',
  DISCOVERY_NODE_ATTESTATION_ERROR: 'DISCOVERY_NODE_ATTESTATION_ERROR',
  DISCOVERY_NODE_UNKNOWN_RESPONSE: 'DISCOVERY_NODE_UNKNOWN_RESPONSE',
  AAO_ATTESTATION_ERROR: 'AAO_ATTESTATION_ERROR',
  AAO_ATTESTATION_REJECTION: 'AAO_ATTESTATION_REJECTION',
  AAO_ATTESTATION_UNKNOWN_RESPONSE: 'AAO_ATTESTATION_UNKNOWN_RESPONSE',
  WAIT_FOR_COOLDOWN: 'WAIT_FOR_COOLDOWN',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
})

const AggregateAttestationError = Object.freeze({
  INSUFFICIENT_DISCOVERY_NODE_COUNT: 'INSUFFICIENT_DISCOVERY_NODE_COUNT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
})

const GetSenderAttestationError = Object.freeze({
  REQUEST_FOR_ATTESTATION_FAILED: 'REQUEST_FOR_ATTESTATION_FAILED'
})

export const SubmitAndEvaluateError = Object.freeze({
  ...GetAttestationError,
  ...AggregateAttestationError,
  ...RewardsManagerError
})

export const AttestationPhases = Object.freeze({
  SANITY_CHECKS: 'SANITY_CHECKS',
  AGGREGATE_ATTESTATIONS: 'AGGREGATE_ATTESTATIONS',
  SUBMIT_ATTESTATIONS: 'SUBMIT_ATTESTATIONS',
  EVALUATE_ATTESTATIONS: 'EVALUATE_ATTESTATIONS'
})

type SubmitAndEvaluateConfig = {
  challengeId: string
  encodedUserId: string
  handle: string
  recipientEthAddress: string
  specifier: string
  oracleEthAddress: string
  amount: number
  quorumSize: number
  AAOEndpoint: string
  endpoints: Nullable<string[]>
  instructionsPerTransaction?: number
  maxAggregationAttempts?: number
  logger: Logger
  feePayerOverride: string | null
}

type AggregateAttestationsConfig = {
  challengeId: string
  encodedUserId: string
  handle: string
  specifier: string
  oracleEthAddress: string
  amount: number
  quorumSize: number
  AAOEndpoint: string
  maxAttempts: number
  endpoints: Nullable<string[]>
  logger: Logger
}

type GetChallengeAttestationConfig = {
  challengeId: string
  encodedUserId: string
  specifier: string
  oracleEthAddress: string
  discoveryProviderEndpoint: string
  logger: Logger
}

type GetAAOAttestationConfig = {
  challengeId: string
  specifier: string
  handle: string
  amount: number
  AAOEndpoint: string
  oracleEthAddress: string
  logger?: Logger
}

type SendAttestationResultConfig = {
  status: string
  userId: string
  challengeId: string
  amount: number
  source: string
  specifier: string
  error?: string
  phase?: string
  reason?: string
}

type CreateSenderPublicConfig = {
  senderEthAddress: string
  operatorEthAddress: string
  endpoints?: string[]
  numAttestations?: number
  feePayerOverride?: string
}

const AAO_REQUEST_TIMEOUT_MS = 15 * 1000
const WRAPPED_AUDIO_PRECISION = 10 ** WAUDIO_DECIMALS

export class Rewards extends Base {
  ServiceProvider: ServiceProvider
  constructor(ServiceProvider: ServiceProvider, ...args: BaseConstructorArgs) {
    super(...args)
    this.ServiceProvider = ServiceProvider
  }

  async submitAndEvaluate({
    challengeId,
    encodedUserId,
    handle,
    recipientEthAddress,
    specifier,
    oracleEthAddress,
    amount,
    quorumSize,
    AAOEndpoint,
    instructionsPerTransaction,
    maxAggregationAttempts = 20,
    endpoints = null,
    logger = console,
    feePayerOverride = null
  }: SubmitAndEvaluateConfig) {
    let phase
    let nodesToReselect = null
    let aaoErrorCode = null
    try {
      phase = AttestationPhases.SANITY_CHECKS

      if (Number(amount) !== amount || amount % 1 !== 0) {
        throw new Error('Invalid amount')
      }

      logger.info(
        `submitAndEvaluate: aggregating attestations for userId [${decodeHashId(
          encodedUserId
        )}], challengeId [${challengeId}]`
      )
      phase = AttestationPhases.AGGREGATE_ATTESTATIONS
      const {
        discoveryNodeAttestations,
        aaoAttestation,
        error: aggregateError,
        aaoErrorCode: errorCode,
        erroringNodes
      } = await this.aggregateAttestations({
        challengeId,
        encodedUserId,
        handle,
        specifier,
        oracleEthAddress,
        amount,
        quorumSize,
        AAOEndpoint,
        endpoints,
        logger,
        maxAttempts: maxAggregationAttempts
      })
      if (aggregateError) {
        nodesToReselect = erroringNodes
        aaoErrorCode = errorCode
        throw new Error(aggregateError)
      }

      logger.info(
        `submitAndEvaluate: submitting for challenge [${challengeId}], userId: [${decodeHashId(
          encodedUserId
        )}] with [${discoveryNodeAttestations?.length}] DN and [${
          aaoAttestation ? 1 : 0
        }] oracle attestations.`
      )
      const fullTokenAmount = new BN(amount * WRAPPED_AUDIO_PRECISION)
      phase = AttestationPhases.SUBMIT_ATTESTATIONS
      // @ts-expect-error the return types are a bit strange here
      const { errorCode: submitErrorCode, error: submitError } =
        await this.solanaWeb3Manager.submitChallengeAttestations({
          attestations: discoveryNodeAttestations as AttestationMeta[],
          oracleAttestation: aaoAttestation!,
          challengeId,
          specifier,
          recipientEthAddress,
          tokenAmount: fullTokenAmount,
          instructionsPerTransaction,
          logger,
          feePayerOverride
        })

      if (submitErrorCode || submitError) {
        const shouldRetryInSeperateTransactions =
          submitErrorCode === RewardsManagerError.REPEATED_SENDERS ||
          submitErrorCode === RewardsManagerError.SIGN_COLLISION ||
          submitErrorCode === RewardsManagerError.OPERATOR_COLLISION
        if (shouldRetryInSeperateTransactions) {
          logger.warn(
            `submitAndEvaluate: saw repeat senders for userId [${decodeHashId(
              encodedUserId
            )}] challengeId: [${challengeId}] with err: ${submitErrorCode}, breaking up into individual transactions`
          )
          await this.solanaWeb3Manager.submitChallengeAttestations({
            attestations: discoveryNodeAttestations as AttestationMeta[],
            oracleAttestation: aaoAttestation!,
            challengeId,
            specifier,
            recipientEthAddress,
            tokenAmount: fullTokenAmount,
            instructionsPerTransaction: 2, // SECP + Attestation
            logger,
            feePayerOverride
          })
        } else {
          throw new Error(submitErrorCode || submitError)
        }
      }

      logger.info(
        `submitAndEvaluate: evaluating for challenge [${challengeId}], userId: [${decodeHashId(
          encodedUserId
        )}]`
      )
      phase = AttestationPhases.EVALUATE_ATTESTATIONS
      const { errorCode: evaluateErrorCode, error: evaluateError } =
        await this.solanaWeb3Manager.evaluateChallengeAttestations({
          challengeId,
          specifier,
          recipientEthAddress,
          oracleEthAddress,
          tokenAmount: fullTokenAmount,
          logger,
          feePayerOverride
        })

      if (evaluateErrorCode ?? evaluateError) {
        throw new Error(
          (evaluateErrorCode ?? evaluateError) as unknown as string
        )
      }

      return {
        success: true,
        error: null,
        aaoErrorCode,
        phase: null,
        nodesToReselect: null
      }
    } catch (e) {
      const err = (e as Error).message
      const log =
        err === GetAttestationError.COGNITO_FLOW ||
        err === GetAttestationError.HCAPTCHA
          ? logger.info
          : logger.error
      log(
        `submitAndEvaluate: failed for userId: [${decodeHashId(
          encodedUserId
        )}] challenge-id [${challengeId}] at phase [${phase}] with err: ${err}`
      )
      return {
        success: false,
        error: err,
        aaoErrorCode,
        phase,
        nodesToReselect
      }
    }
  }

  async aggregateAttestations({
    challengeId,
    encodedUserId,
    handle,
    specifier,
    oracleEthAddress,
    amount,
    quorumSize,
    AAOEndpoint,
    maxAttempts,
    endpoints = null,
    logger = console
  }: AggregateAttestationsConfig) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)

    if (endpoints) {
      endpoints = sampleSize(endpoints, quorumSize)
    } else {
      endpoints = await this.ServiceProvider.getUniquelyOwnedDiscoveryNodes({
        quorumSize
      })
    }

    if (endpoints.length < quorumSize) {
      logger.error(
        `Tried to fetch [${quorumSize}] attestations, but only found [${endpoints.length}] registered nodes.`
      )

      return {
        discoveryNodeAttestations: null,
        aaoAttestation: null,
        error: AggregateAttestationError.INSUFFICIENT_DISCOVERY_NODE_COUNT,
        aaoErrorCode: null,
        erroringNodes: null
      }
    }

    let aaoAttestation: Nullable<AttestationMeta> = null

    try {
      const {
        success,
        aaoErrorCode,
        error: aaoAttestationError
      } = await this.getAAOAttestation({
        challengeId,
        specifier,
        handle,
        amount,
        AAOEndpoint,
        oracleEthAddress
      })

      if (aaoAttestationError) {
        return {
          discoveryNodeAttestations: null,
          aaoAttestation: null,
          error: aaoAttestationError,
          aaoErrorCode,
          erroringNodes: null
        }
      }
      aaoAttestation = success
    } catch (e: any) {
      const err = e.message
      logger.error(
        `Failed to aggregate attestations for user [${decodeHashId(
          encodedUserId
        )}], challenge-id: [${challengeId}] with err: ${err}`
      )
      return {
        discoveryNodeAttestations: null,
        aaoAttestation: null,
        error: GetAttestationError.AAO_ATTESTATION_ERROR,
        aaoErrorCode: null,
        erroringNodes: null
      }
    }

    try {
      const discoveryNodeAttestationResults =
        await this._getDiscoveryAttestationsWithRetries({
          endpoints,
          challengeId,
          encodedUserId,
          specifier,
          oracleEthAddress,
          logger,
          maxAttempts
        })

      const discoveryNodeSuccesses = discoveryNodeAttestationResults.map(
        (r) => r.success
      )
      const discoveryNodeErrors = discoveryNodeAttestationResults.map(
        (r) => r.error
      )
      const error = discoveryNodeErrors.find(Boolean)
      if (error) {
        const erroringNodes = discoveryNodeAttestationResults
          .filter((r) => r.error)
          .map((r) => r.endpoint)
        return {
          discoveryNodeAttestations: null,
          aaoAttestation: null,
          error,
          erroringNodes
        }
      }

      return {
        discoveryNodeAttestations: discoveryNodeSuccesses,
        aaoAttestation,
        error: null,
        aaoErrorCode: null,
        erroringNodes: null
      }
    } catch (e: any) {
      const err = e.message
      logger.error(
        `Failed to aggregate attestations for user [${decodeHashId(
          encodedUserId
        )}], challenge-id: [${challengeId}] with err: ${err}`
      )
      return {
        discoveryNodeAttestations: null,
        aaoAttestation: null,
        error: GetAttestationError.DISCOVERY_NODE_ATTESTATION_ERROR,
        aaoErrorCode: null,
        erroringNodes: null
      }
    }
  }

  async getChallengeAttestation({
    challengeId,
    encodedUserId,
    specifier,
    oracleEthAddress,
    discoveryProviderEndpoint,
    logger = console
  }: GetChallengeAttestationConfig) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    try {
      const res = await this.discoveryProvider.getChallengeAttestation(
        challengeId,
        encodedUserId,
        specifier,
        oracleEthAddress,
        discoveryProviderEndpoint
      )

      const meta = {
        ethAddress: res.owner_wallet,
        signature: res.attestation
      }

      return { success: meta, error: null }
    } catch (e) {
      const err = (e as Error).message
      logger.error(
        `Failed to get challenge attestation for userId [${decodeHashId(
          encodedUserId
        )}] challengeId [${challengeId}]from ${discoveryProviderEndpoint} with ${err}`
      )
      const mappedErr =
        GetAttestationError[err as keyof typeof GetAttestationError] ||
        GetAttestationError.DISCOVERY_NODE_UNKNOWN_RESPONSE
      return {
        success: null,
        error: mappedErr
      }
    }
  }

  async getUndisbursedChallenges(
    {
      limit,
      offset,
      completedBlockNumber,
      encodedUserId,
      logger = console
    }: {
      limit?: number
      offset?: number
      completedBlockNumber?: string
      encodedUserId?: number
      logger?: Logger
    } = {
      logger: console
    }
  ): Promise<
    | {
        success: Awaited<
          ReturnType<DiscoveryProvider['getUndisbursedChallenges']>
        >
      }
    | { error: string }
  > {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    try {
      const res = await this.discoveryProvider.getUndisbursedChallenges(
        limit,
        offset,
        completedBlockNumber,
        encodedUserId
      )
      return { success: res }
    } catch (e) {
      const error = (e as Error).message
      logger.error(`Failed to get undisbursed challenges with error: ${error}`)
      return {
        error
      }
    }
  }

  async getAAOAttestation({
    challengeId,
    specifier,
    handle,
    amount,
    AAOEndpoint,
    oracleEthAddress,
    logger = console
  }: GetAAOAttestationConfig) {
    const data = { challengeId, challengeSpecifier: specifier, amount }
    const request: AxiosRequestConfig = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      url: `${AAOEndpoint}/attestation/${handle}`,
      timeout: AAO_REQUEST_TIMEOUT_MS,
      data
    }

    try {
      const response: AxiosResponse<{
        result: string
        errorCode?: number
      }> = await axios(request)
      const { result, errorCode } = response.data

      if (!result) {
        logger.error('Failed to get AAO attestation')
        return {
          success: null,
          aaoErrorCode: errorCode,
          error: GetAttestationError.AAO_ATTESTATION_REJECTION
        }
      }

      return {
        success: {
          signature: result,
          ethAddress: oracleEthAddress
        },
        aaoErrorCode: null,
        error: null
      }
    } catch (e) {
      const err = (e as Error).message
      logger.error(`Failed to get AAO attestation: ${err}`)
      return {
        success: null,
        aaoErrorCode: null,
        error: GetAttestationError.AAO_ATTESTATION_ERROR
      }
    }
  }

  async _getDiscoveryAttestationsWithRetries({
    endpoints,
    challengeId,
    encodedUserId,
    specifier,
    oracleEthAddress,
    logger,
    maxAttempts
  }: {
    endpoints: string[]
    challengeId: string
    encodedUserId: string
    specifier: string
    oracleEthAddress: string
    logger: Logger
    maxAttempts: number
  }) {
    let retryCount = 0
    let unrecoverableError = false
    const completedAttestations: Array<{
      success: Nullable<{ ethAddress: string; signature: string }>
      error: Nullable<string>
      endpoint: string
    }> = []
    let needsAttestations = endpoints

    do {
      logger.info(
        `Aggregating attestations with retries challenge: ${challengeId}, userId: ${encodedUserId}, endpoints: ${needsAttestations}, attempt ${retryCount}`
      )
      if (retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }

      const attestations = await Promise.all(
        needsAttestations.map(async (endpoint) => {
          const res = await this.getChallengeAttestation({
            challengeId,
            encodedUserId,
            specifier,
            oracleEthAddress,
            discoveryProviderEndpoint: endpoint,
            logger
          })
          return { endpoint, res }
        })
      )

      needsAttestations = []
      attestations.forEach((a) => {
        const isRetryable =
          a.res.error === GetAttestationError.CHALLENGE_INCOMPLETE ||
          a.res.error === GetAttestationError.MISSING_CHALLENGES

        if (isRetryable) {
          needsAttestations.push(a.endpoint)
          logger.info(
            `Node ${a.endpoint} challenge still incomplete for challenge [${challengeId}], userId: ${encodedUserId}`
          )
          if (retryCount === maxAttempts) {
            completedAttestations.push({ ...a.res, endpoint: a.endpoint })
          }
        } else {
          completedAttestations.push({ ...a.res, endpoint: a.endpoint })
          if (a.res.error) {
            unrecoverableError = true
          }
        }
      })

      retryCount++
    } while (needsAttestations.length && retryCount <= maxAttempts)

    if (needsAttestations.length || unrecoverableError) {
      logger.info(
        `Failed to aggregate attestations for challenge [${challengeId}], userId: [${decodeHashId(
          encodedUserId
        )}]`
      )
    } else {
      logger.info(
        `Successfully aggregated attestations for challenge [${challengeId}], userId: [${decodeHashId(
          encodedUserId
        )}]`
      )
    }
    return completedAttestations
  }

  async createSenderPublic({
    senderEthAddress,
    operatorEthAddress,
    endpoints,
    numAttestations = 3,
    feePayerOverride
  }: CreateSenderPublicConfig) {
    let attestEndpoints
    if (endpoints) {
      attestEndpoints = sampleSize(endpoints, numAttestations)
    } else {
      attestEndpoints =
        await this.ServiceProvider.getUniquelyOwnedDiscoveryNodes({
          quorumSize: numAttestations,
          useWhitelist: false,
          filter: async (node) => {
            const isRegistered =
              await this.solanaWeb3Manager.getIsDiscoveryNodeRegistered(
                node.delegateOwnerWallet
              )
            return isRegistered
          }
        })
    }

    if (attestEndpoints.length < numAttestations) {
      throw new Error(
        `Not enough other nodes found, need ${numAttestations}, found ${attestEndpoints.length}`
      )
    }

    let error = null
    const attestations = await Promise.all(
      attestEndpoints.map(async (attestEndpoint) => {
        try {
          const res = await this.discoveryProvider.getCreateSenderAttestation(
            senderEthAddress,
            attestEndpoint
          )
          return {
            ethAddress: res.owner_wallet,
            signature: res.attestation
          }
        } catch (e) {
          console.error(e)
          error = true
          return undefined
        }
      })
    )
    if (error) {
      console.error(
        `Failed to get attestations from other nodes ${attestEndpoints}`
      )
      return {
        success: null,
        error: GetSenderAttestationError.REQUEST_FOR_ATTESTATION_FAILED
      }
    }

    const receipt = await this.solanaWeb3Manager.createSender({
      senderEthAddress,
      operatorEthAddress,
      attestations: attestations as AttestationMeta[],
      feePayerOverride: feePayerOverride as string
    })
    return receipt
  }

  async sendAttestationResult({
    status,
    userId,
    challengeId,
    amount,
    error,
    phase,
    source,
    specifier,
    reason
  }: SendAttestationResultConfig) {
    await this.identityService.sendAttestationResult({
      status,
      userId,
      challengeId,
      amount,
      error,
      phase,
      source,
      specifier,
      reason
    })
  }
}
