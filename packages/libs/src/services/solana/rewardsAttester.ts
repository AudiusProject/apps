import type { AudiusLibs } from '../../AudiusLibs'
import { SubmitAndEvaluateError } from '../../api/Rewards'
import type { ServiceWithEndpoint } from '../../utils'
import { Utils } from '../../utils/utils'

const { decodeHashId } = Utils

const errors = {
  ...SubmitAndEvaluateError,
  USERBANK_CREATION: 'USERBANK_CREATION'
}
const AAO_ERRORS = new Set<string>([
  errors.AAO_ATTESTATION_REJECTION,
  errors.AAO_ATTESTATION_UNKNOWN_RESPONSE
])
const NEEDS_RESELECT_ERRORS = new Set<string>([
  errors.INSUFFICIENT_DISCOVERY_NODE_COUNT,
  errors.CHALLENGE_INCOMPLETE,
  errors.MISSING_CHALLENGES
])
const ALREADY_COMPLETE_ERRORS = new Set<string>([
  errors.ALREADY_DISBURSED,
  errors.ALREADY_SENT
])

class BaseRewardsReporter {
  async reportSuccess(_: {
    userId: number
    challengeId: string
    amount: number
    specifier: string
  }): Promise<void> {}

  async reportRetry(_: {
    userId: number
    challengeId: string
    amount: number
    error: string
    phase: string
  }): Promise<void> {}

  async reportFailure(_: {
    userId: number
    challengeId: string
    amount: number
    error: string
    phase: string
  }): Promise<void> {}

  async reportAAORejection(_: {
    userId: number
    challengeId: string
    amount: number
    error: string
    reason: string
  }): Promise<void> {}
}

const MAX_DISBURSED_CACHE_SIZE = 100
const SOLANA_EST_SEC_PER_SLOT = 0.5
const POA_SEC_PER_BLOCK = 1
const MAX_DISCOVERY_NODE_BLOCKLIST_LEN = 10

type ATTESTER_PHASE =
  | 'HALTED'
  | 'SELECTING_NODES'
  | 'REFILLING_QUEUE'
  | 'ATTESTING'
  | 'SLEEPING'
  | 'RETRY_BACKOFF'

export class AttestationDelayCalculator {
  libs: any
  solanaSecPerSlot: number
  runBehindSec: number
  lastSolanaThreshold: { threshold: number; time: number } | null
  lastPOAThreshold: { threshold: number; time: number } | null
  allowedStalenessSec: number
  solanaPollingInterval: number
  logger: any
  intervalHandle: NodeJS.Timeout | null

  private readonly blockOffset: number

  constructor({
    libs,
    runBehindSec,
    allowedStalenessSec,
    blockOffset,
    solanaPollingInterval = 30,
    logger = console
  }: {
    libs: any
    runBehindSec: number
    allowedStalenessSec: number
    solanaPollingInterval?: number
    logger: any
    blockOffset: number
  }) {
    this.libs = libs
    this.solanaSecPerSlot = SOLANA_EST_SEC_PER_SLOT
    this.runBehindSec = runBehindSec
    this.lastSolanaThreshold = null
    this.lastPOAThreshold = null
    this.allowedStalenessSec = allowedStalenessSec
    this.solanaPollingInterval = solanaPollingInterval
    this.logger = logger
    this.intervalHandle = null
    this.blockOffset = blockOffset
  }

  async start() {
    let oldSlot = await this.libs.solanaWeb3Manager.getSlot()
    // eslint-disable-next-line
    this.intervalHandle = setInterval(async () => {
      const newSlot = await this.libs.solanaWeb3Manager.getSlot()
      const diff = this.solanaPollingInterval / (newSlot - oldSlot)
      this.solanaSecPerSlot = diff
      this.logger.info(`Setting Solana seconds per slot to ${diff}`)
      oldSlot = newSlot
    }, this.solanaPollingInterval * 1000)
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle)
    }
  }

  async getPOABlockThreshold() {
    if (
      this.lastPOAThreshold &&
      (Date.now() - this.lastPOAThreshold.time) / 1000 <
        this.allowedStalenessSec
    ) {
      return this.lastPOAThreshold.threshold
    }
    const currentBlock =
      Number(await this.libs.web3Manager.getWeb3().eth.getBlockNumber()) +
      this.blockOffset
    const threshold = currentBlock - this.runBehindSec / POA_SEC_PER_BLOCK
    this.lastPOAThreshold = {
      threshold,
      time: Date.now()
    }
    return threshold
  }

  async getSolanaSlotThreshold() {
    if (
      this.lastSolanaThreshold &&
      (Date.now() - this.lastSolanaThreshold.time) / 1000 <
        this.allowedStalenessSec
    ) {
      return this.lastSolanaThreshold.threshold
    }
    const currentSlot = await this.libs.solanaWeb3Manager.getSlot()
    const threshold = currentSlot - this.runBehindSec / this.solanaSecPerSlot
    this.lastSolanaThreshold = {
      threshold,
      time: Date.now()
    }
    return threshold
  }
}

type ConstructorArgs = {
  libs: any
  startingBlock: number
  offset: number
  parallelization: number
  logger?: any
  quorumSize: number
  aaoEndpoint: string
  aaoAddress: string
  updateValues: ({
    startingBlock,
    offset,
    successCount
  }: {
    startingBlock: number
    offset: number
    successCount: number
  }) => void
  getStartingBlockOverride: () => Promise<number | null> | number | null
  maxRetries: number
  reporter?: BaseRewardsReporter
  challengeIdsDenyList: string[]
  endpoints?: string[]
  runBehindSec?: number
  isSolanaChallenge?: (challenge: string) => boolean
  feePayerOverride: string | null
  maxAggregationAttempts?: number
  updateStateCallback?: (state: AttesterState) => Promise<void>
  maxCooldownMsec?: number
  blockOffset: number
}

type Challenge = {
  challengeId: string
  userId: string
  specifier: string
  amount: number
  handle: string
  wallet: string
  completedBlocknumber: number
}

type AttestationResult = Challenge & {
  error?: string | null
  phase?: string | null
  aaoErrorCode?: number | null
  nodesToReselect?: string[] | null
}

type AttesterState = {
  phase: ATTESTER_PHASE
  lastSuccessChallengeTime: number | null
  lastChallengeTime: number | null
  lastActionTime: number
}

export class RewardsAttester {
  private startingBlock: number
  private offset: number
  private recentlyDisbursedQueue: string[]
  private _shouldStop: boolean
  private endpoints: string[]
  private undisbursedQueue: Challenge[]
  private attesterState: AttesterState
  private parallelization: number
  private aaoEndpoint: string
  private aaoAddress: string
  private endpointPool: Set<string>
  private challengeIdsDenyList: Set<string>
  private discoveryNodeBlocklist: string[]

  private readonly libs: AudiusLibs
  private readonly logger: Console
  private readonly quorumSize: number
  private readonly reporter: BaseRewardsReporter
  private readonly maxRetries: number
  private readonly maxAggregationAttempts: number
  private readonly updateValues: (args: {
    startingBlock: number
    offset: number
    successCount: number
  }) => void

  private readonly cooldownMsec: number
  private readonly backoffExponent: number
  private readonly maxCooldownMsec: number
  private readonly getStartingBlockOverride: () =>
    | Promise<number | null>
    | number
    | null

  private readonly feePayerOverride: string | null

  private readonly delayCalculator: AttestationDelayCalculator
  private readonly isSolanaChallenge: (challenge: string) => boolean
  private readonly _updateStateCallback: (state: AttesterState) => Promise<void>

  constructor({
    libs,
    startingBlock,
    offset,
    parallelization,
    logger = console,
    quorumSize,
    aaoEndpoint,
    aaoAddress,
    updateValues = () => {},
    getStartingBlockOverride = () => null,
    maxRetries = 5,
    reporter = new BaseRewardsReporter(),
    challengeIdsDenyList = [],
    endpoints = [],
    runBehindSec = 0,
    isSolanaChallenge = (_) => true,
    feePayerOverride = null,
    maxAggregationAttempts = 20,
    updateStateCallback = async (_) => {},
    maxCooldownMsec = 15000,
    blockOffset
  }: ConstructorArgs) {
    this.libs = libs
    this.logger = logger
    this.parallelization = parallelization
    this.startingBlock = startingBlock
    this.offset = offset
    this.quorumSize = quorumSize
    this.aaoEndpoint = aaoEndpoint
    this.aaoAddress = aaoAddress
    this.reporter = reporter
    this.endpoints = endpoints
    this.endpointPool = new Set(endpoints)
    this.maxRetries = maxRetries
    this.maxAggregationAttempts = maxAggregationAttempts
    this.updateValues = updateValues
    this.challengeIdsDenyList = new Set(...challengeIdsDenyList)
    this.undisbursedQueue = []
    this.recentlyDisbursedQueue = []
    this.cooldownMsec = 2000
    this.backoffExponent = 1.8
    this.maxCooldownMsec = maxCooldownMsec
    this.getStartingBlockOverride = getStartingBlockOverride
    this.feePayerOverride = feePayerOverride
    this.attesterState = {
      phase: 'HALTED',
      lastSuccessChallengeTime: null,
      lastChallengeTime: null,
      lastActionTime: Date.now()
    }

    this.delayCalculator = new AttestationDelayCalculator({
      libs,
      runBehindSec,
      logger,
      allowedStalenessSec: 5,
      blockOffset
    })
    this.isSolanaChallenge = isSolanaChallenge

    this._performSingleAttestation = this._performSingleAttestation.bind(this)
    this._disbursementToKey = this._disbursementToKey.bind(this)
    this._shouldStop = false
    this._updateStateCallback = updateStateCallback
    this.discoveryNodeBlocklist = []
  }

  async start() {
    this.logger.info(`Starting attester with:
      quorum size: ${this.quorumSize}, \
      parallelization: ${this.parallelization} \
      AAO endpoint: ${this.aaoEndpoint} \
      AAO address: ${this.aaoAddress} \
      endpoints: ${this.endpoints}
    `)

    if (this.endpointPool.size === 0) {
      const pool =
        await this.libs.discoveryProvider!.serviceSelector.getServices()
      this.endpointPool = new Set(pool)
    }
    await this._selectDiscoveryNodes()
    await this.delayCalculator.start()

    while (!this._shouldStop) {
      try {
        await this._awaitFeePayerBalance()
        await this._checkForStartingBlockOverride()

        const { error } = await this._refillQueueIfNecessary()
        if (error) {
          this.logger.error(`Got error trying to refill challenges: [${error}]`)
          throw new Error(error)
        }

        if (!this.undisbursedQueue.length) {
          this.logger.info('No undisbursed challenges. Sleeping...')
          await this._updatePhase('SLEEPING')
          await this._delay(1000)
          continue
        }

        const toAttest = this.undisbursedQueue.splice(0, this.parallelization)

        const { highestBlock, offset, successCount } =
          await this._attestInParallel(toAttest)

        if (highestBlock && this.startingBlock === highestBlock - 1) {
          this.offset += offset
        } else {
          this.offset = offset
        }

        this.logger.info(
          `Updating values: startingBlock: ${this.startingBlock}, offset: ${this.offset}`
        )

        this.startingBlock = highestBlock
          ? highestBlock - 1
          : this.startingBlock

        this._addRecentlyDisbursed(toAttest)

        await this.updateValues({
          startingBlock: this.startingBlock,
          offset: this.offset,
          successCount
        })
      } catch (e) {
        this.logger.error(`Got error: ${e}, sleeping`)
        await this._delay(1000)
      }
    }

    this._shouldStop = false
  }

  async stop() {
    this._shouldStop = true
    this.delayCalculator.stop()
  }

  async processChallenges(challenges: Challenge[]) {
    await this._selectDiscoveryNodes()
    const toProcess = [...challenges]
    while (toProcess.length) {
      try {
        this.logger.info(`Processing ${toProcess.length} challenges`)
        const toAttest = toProcess.splice(0, this.parallelization)
        const { accumulatedErrors: errors } =
          await this._attestInParallel(toAttest)
        if (errors?.length) {
          this.logger.error(
            `Got errors in processChallenges: ${JSON.stringify(errors)}`
          )
          return { errors }
        }
      } catch (e) {
        this.logger.error(`Got error: ${e}, sleeping`)
        await this._delay(1000)
      }
    }
    return {}
  }

  updateConfig({
    aaoEndpoint,
    aaoAddress,
    endpoints,
    challengeIdsDenyList,
    parallelization
  }: {
    aaoEndpoint: string
    aaoAddress: string
    endpoints: string[]
    challengeIdsDenyList: string[]
    parallelization: number
  }) {
    this.logger.info(
      `Updating attester with config aaoEndpoint: ${aaoEndpoint}, aaoAddress: ${aaoAddress}, endpoints: ${endpoints}, challengeIdsDenyList: ${challengeIdsDenyList}, parallelization: ${parallelization}`
    )
    this.aaoEndpoint = aaoEndpoint || this.aaoEndpoint
    this.aaoAddress = aaoAddress || this.aaoAddress
    this.endpoints = endpoints || this.endpoints
    this.challengeIdsDenyList = challengeIdsDenyList
      ? new Set(...challengeIdsDenyList)
      : this.challengeIdsDenyList
    this.parallelization = parallelization || this.parallelization
  }

  async _awaitFeePayerBalance() {
    const getHasBalance = async () =>
      await this.libs.solanaWeb3Manager!.hasBalance({
        publicKey: this.libs.solanaWeb3Manager!.feePayerKey
      })
    while (!(await getHasBalance())) {
      this.logger.warn('No usable balance. Waiting...')
      await this._delay(2000)
    }
  }

  _getFeePayer() {
    if (this.feePayerOverride) {
      return this.feePayerOverride
    }
    const feePayerKeypairs =
      this.libs.solanaWeb3Manager!.solanaWeb3Config.feePayerKeypairs
    if (feePayerKeypairs?.length) {
      const randomFeePayerIndex = Math.floor(
        Math.random() * feePayerKeypairs.length
      )
      return feePayerKeypairs[randomFeePayerIndex]!.publicKey.toString()
    }
    return null
  }

  async _checkForStartingBlockOverride() {
    const override = await this.getStartingBlockOverride()
    if (override === null || override === undefined) return
    this.logger.info(
      `Setting starting block override: ${override}, emptying recent disbursed queue`
    )
    this.startingBlock = override
    this.offset = 0
    this.recentlyDisbursedQueue = []
    this.undisbursedQueue = []
    this.discoveryNodeBlocklist = []
  }

  async _attestInParallel(toAttest: Challenge[]) {
    this.logger.info(
      `Attesting in parallel with startingBlock: ${this.startingBlock}, offset: ${this.offset}, parallelization: ${this.parallelization}`
    )
    await this._updatePhase('ATTESTING')
    const poaAttestations = toAttest.filter(
      ({ challengeId }) => !this.isSolanaChallenge(challengeId)
    )
    const highestBlock = poaAttestations.length
      ? Math.max(...poaAttestations.map((e) => e.completedBlocknumber))
      : null

    let retryCount = 0
    let successful: AttestationResult[] = []
    let noRetry: AttestationResult[] = []
    let needsAttestation: AttestationResult[] = toAttest
    let shouldReselect = false
    let accumulatedErrors: AttestationResult[] = []
    let successCount = 0
    let offset = 0
    let failingNodes: string[] = []

    do {
      await this._updatePhase('ATTESTING')
      if (retryCount !== 0) {
        await this._backoff(retryCount)
      }

      this.logger.info(
        `Attestation attempt ${retryCount + 1}, max ${this.maxRetries}`
      )

      if (shouldReselect) {
        await this._selectDiscoveryNodes()
      }

      const results = await Promise.all(
        needsAttestation.map(this._performSingleAttestation)
      )

      // "Process" the results of attestation into noRetry and needsAttestation errors,
      // as well as a flag that indicates whether we should reselect.
      ;({
        successful,
        noRetry,
        needsRetry: needsAttestation,
        shouldReselect,
        failingNodes
      } = await this._processResponses(
        results,
        retryCount === this.maxRetries - 1
      ))

      if (failingNodes?.length) {
        const existing = new Set(this.discoveryNodeBlocklist)
        failingNodes.forEach((n) => {
          if (!existing.has(n)) {
            this.discoveryNodeBlocklist.push(n)
          }
        })
        this.discoveryNodeBlocklist = this.discoveryNodeBlocklist.slice(
          -1 * MAX_DISCOVERY_NODE_BLOCKLIST_LEN
        )
      }

      successCount += successful.length
      accumulatedErrors = [...accumulatedErrors, ...noRetry]

      offset += noRetry.filter(
        ({ completedBlocknumber }) => completedBlocknumber === highestBlock
      ).length

      retryCount++
    } while (needsAttestation.length && retryCount < this.maxRetries)

    if (retryCount === this.maxRetries) {
      this.logger.error(`Gave up with ${retryCount} retries`)
    }

    return {
      accumulatedErrors,
      highestBlock,
      offset,
      successCount
    }
  }

  async _performSingleAttestation({
    challengeId,
    userId,
    specifier,
    amount,
    handle,
    wallet,
    completedBlocknumber
  }: Challenge): Promise<AttestationResult> {
    this.logger.info(
      `Attempting to attest for userId [${decodeHashId(
        userId
      )}], challengeId: [${challengeId}], quorum size: [${this.quorumSize}]}`
    )

    const feePayerOverride = this._getFeePayer()
    if (!feePayerOverride) {
      throw Error('Unexpectedly missing feepayer override')
    }

    const res = await this.libs.solanaWeb3Manager!.createUserBankIfNeeded({
      feePayerOverride,
      ethAddress: wallet
    })

    if ('error' in res) {
      this.logger.error(
        `Failed to create user bank for user [${decodeHashId(userId)}]`,
        res.error
      )

      return {
        challengeId,
        userId,
        specifier,
        amount,
        handle,
        wallet,
        completedBlocknumber,
        error: errors.USERBANK_CREATION
      }
    } else if (!res.didExist) {
      this.logger.info(`Created user bank for user [${decodeHashId(userId)}]`)
    } else {
      this.logger.info(
        `User bank already exists for user [${decodeHashId(userId)}]`
      )
    }

    const { success, error, aaoErrorCode, phase, nodesToReselect } =
      await this.libs.Rewards!.submitAndEvaluate({
        challengeId,
        encodedUserId: userId,
        handle,
        recipientEthAddress: wallet,
        specifier,
        oracleEthAddress: this.aaoAddress,
        amount,
        quorumSize: this.quorumSize,
        AAOEndpoint: this.aaoEndpoint,
        endpoints: this.endpoints,
        logger: this.logger,
        feePayerOverride,
        maxAggregationAttempts: this.maxAggregationAttempts
      })

    if (success) {
      this.logger.info(
        `Successfully attestested for challenge [${challengeId}] for user [${decodeHashId(
          userId
        )}], amount [${amount}]!`
      )
      return {
        challengeId,
        userId,
        specifier,
        amount,
        handle,
        wallet,
        completedBlocknumber,
        nodesToReselect: null
      }
    }

    this.logger.error(
      `Failed to attest for challenge [${challengeId}] for user [${decodeHashId(
        userId
      )}], amount [${amount}], oracle: [${
        this.aaoAddress
      }] at phase: [${phase}] with error [${error}]`
    )

    return {
      challengeId,
      userId,
      specifier,
      amount,
      handle,
      wallet,
      completedBlocknumber,
      error,
      aaoErrorCode,
      phase,
      nodesToReselect
    }
  }

  async _selectDiscoveryNodes() {
    await this._updatePhase('SELECTING_NODES')
    this.logger.info(
      `Selecting discovery nodes with blocklist ${JSON.stringify(
        this.discoveryNodeBlocklist
      )}`
    )
    const startTime = Date.now()
    let endpoints = ((
      await this.libs.discoveryProvider!.serviceSelector.findAll({
        verbose: true,
        whitelist: this.endpointPool.size > 0 ? this.endpointPool : null
      })
    ).filter(Boolean) ?? []) as ServiceWithEndpoint[]
    const blockSet = new Set(this.discoveryNodeBlocklist)
    endpoints = [...endpoints].filter((e) => !blockSet.has(e.endpoint))

    this.endpoints =
      await this.libs.Rewards!.ServiceProvider.getUniquelyOwnedDiscoveryNodes({
        quorumSize: this.quorumSize,
        discoveryNodes: endpoints
      })
    this.logger.info(
      `Selected new discovery nodes in ${
        (Date.now() - startTime) / 1000
      } seconds: [${this.endpoints}]`
    )
  }

  async _refillQueueIfNecessary() {
    if (this.undisbursedQueue.length) return {}

    this.logger.info(
      `Refilling queue with startingBlock: ${this.startingBlock}, offset: ${
        this.offset
      }, recently disbursed: ${JSON.stringify(this.recentlyDisbursedQueue)}`
    )
    await this._updatePhase('REFILLING_QUEUE')
    const res = await this.libs.Rewards!.getUndisbursedChallenges({
      offset: this.offset,
      completedBlockNumber: this.startingBlock.toString(),
      logger: this.logger
    })

    if ('error' in res) {
      return { error: res.error }
    }

    const { success: disbursable } = res
    if (disbursable.length) {
      this.logger.info(
        `Got challenges: ${disbursable.map(
          (
            { challenge_id, user_id, specifier } // eslint-disable-line
          ) => `${challenge_id}-${user_id}-${specifier}`
        )}`
      ) // eslint-disable-line
    }

    this.undisbursedQueue = disbursable
      .map(
        ({
          challenge_id, // eslint-disable-line
          user_id, // eslint-disable-line
          specifier,
          amount,
          handle,
          wallet,
          completed_blocknumber // eslint-disable-line
        }) => ({
          challengeId: challenge_id,
          userId: user_id,
          specifier,
          amount,
          handle,
          wallet,
          completedBlocknumber: completed_blocknumber
        })
      )
      .filter(
        (d) =>
          !(
            this.challengeIdsDenyList.has(d.challengeId) ||
            new Set(this.recentlyDisbursedQueue).has(this._disbursementToKey(d))
          )
      )

    if (this.undisbursedQueue.length) {
      this.undisbursedQueue = await this._filterRecentlyCompleted(
        this.undisbursedQueue
      )
    }

    this.logger.info(
      `Got ${disbursable.length} undisbursed challenges${
        this.undisbursedQueue.length !== disbursable.length
          ? `, filtered out [${
              disbursable.length - this.undisbursedQueue.length
            }] challenges.`
          : '.'
      }`
    )
    return {}
  }

  async _processResponses(
    responses: AttestationResult[],
    isFinalAttempt: boolean
  ): Promise<{
    successful: AttestationResult[]
    noRetry: AttestationResult[]
    needsRetry: AttestationResult[]
    shouldReselect: boolean
    failingNodes: string[]
  }> {
    const noRetry: AttestationResult[] = []
    const successful: AttestationResult[] = []
    const allErrors = responses.filter((res) => {
      if (!res.error) {
        successful.push(res)
        this.reporter.reportSuccess({
          userId: decodeHashId(res.userId) ?? -1,
          challengeId: res.challengeId,
          amount: res.amount,
          specifier: res.specifier
        })
        return false
      }
      return true
    }) as Array<AttestationResult & { error: string; phase: string }>

    const stillIncomplete = allErrors.filter(
      ({ error }) => !ALREADY_COMPLETE_ERRORS.has(error)
    )

    const needsRetry = stillIncomplete.filter((res) => {
      const report = {
        userId: decodeHashId(res.userId) ?? -1,
        challengeId: res.challengeId,
        amount: res.amount,
        error: res.error,
        phase: res.phase,
        specifier: res.specifier,
        reason: 'unknown'
      }

      function getIsAAOError(err?: string): err is string {
        return !!err && AAO_ERRORS.has(err)
      }

      const { error } = res
      const isAAOError = getIsAAOError(error)
      if (isAAOError) {
        noRetry.push(res)
        const errorType = {
          [errors.HCAPTCHA]: 'hcaptcha',
          [errors.COGNITO_FLOW]: 'cognito',
          [errors.AAO_ATTESTATION_REJECTION]: 'rejection',
          [errors.AAO_ATTESTATION_UNKNOWN_RESPONSE]: 'unknown'
          // Some hacky typing here because we haen't typed the imported error type yet
        }[error] as unknown as 'hcaptcha' | 'cognito' | 'rejection' | 'unknown'
        report.reason = errorType
        this.reporter.reportAAORejection(report)
      } else if (isFinalAttempt) {
        noRetry.push(res)
        this.reporter.reportFailure(report)
      } else {
        this.reporter.reportRetry(report)
      }
      return !isAAOError && !isFinalAttempt
    })

    if (needsRetry.length) {
      this.logger.info(
        `Handling errors: ${JSON.stringify(
          needsRetry.map(({ error, phase }) => ({ error, phase }))
        )}`
      )
    }

    const shouldReselect = needsRetry.some(({ error }) =>
      NEEDS_RESELECT_ERRORS.has(error)
    )

    let failingNodes: string[] = []
    if (shouldReselect) {
      failingNodes = [
        ...needsRetry.reduce((acc, cur) => {
          if (cur.nodesToReselect) {
            cur.nodesToReselect?.forEach((n) => acc.add(n))
          }
          return acc
        }, new Set<string>())
      ]
      this.logger.info(`Failing nodes: ${JSON.stringify(failingNodes)}`)
    }

    const now = Date.now()
    let update: {
      lastChallengeTime: number
      lastSuccessChallengeTime?: number
    } = {
      lastChallengeTime: now
    }
    if (successful.length) {
      update = {
        ...update,
        lastSuccessChallengeTime: now
      }
    }
    await this._updateState(update)
    return {
      successful,
      noRetry,
      needsRetry,
      shouldReselect,
      failingNodes
    }
  }

  _disbursementToKey({ challengeId, userId, specifier }: Challenge) {
    return `${challengeId}_${userId}_${specifier}`
  }

  async _backoff(retryCount: number) {
    const backoff = Math.min(
      this.cooldownMsec * Math.pow(this.backoffExponent, retryCount),
      this.maxCooldownMsec
    )
    this.logger.info(`Waiting [${backoff}] msec`)
    await this._updatePhase('RETRY_BACKOFF')
    return await this._delay(backoff)
  }

  async _delay(waitTime: number): Promise<void> {
    return await new Promise((resolve) => setTimeout(resolve, waitTime))
  }

  _addRecentlyDisbursed(challenges: Challenge[]) {
    const ids = challenges.map(this._disbursementToKey)
    this.recentlyDisbursedQueue.push(...ids)
    if (this.recentlyDisbursedQueue.length > MAX_DISBURSED_CACHE_SIZE) {
      this.recentlyDisbursedQueue.splice(
        0,
        this.recentlyDisbursedQueue.length - MAX_DISBURSED_CACHE_SIZE
      )
    }
  }

  async _filterRecentlyCompleted(challenges: Challenge[]) {
    const [poaThreshold, solanaThreshold] = await Promise.all([
      this.delayCalculator.getPOABlockThreshold(),
      this.delayCalculator.getSolanaSlotThreshold()
    ])

    this.logger.info(
      `Filtering with POA threshold: ${poaThreshold}, Solana threshold: ${solanaThreshold}`
    )
    const res = challenges.filter(
      (c) =>
        c.completedBlocknumber <=
        (this.isSolanaChallenge(c.challengeId) ? solanaThreshold : poaThreshold)
    )
    if (res.length < challenges.length) {
      this.logger.info(
        `Filtered out ${challenges.length - res.length} recent challenges`
      )
    }
    return res
  }

  async _updateState(newState: Partial<AttesterState>) {
    try {
      this.attesterState = {
        ...this.attesterState,
        ...newState,
        lastActionTime: Date.now()
      }
      await this._updateStateCallback(this.attesterState)
    } catch (e) {
      this.logger.error(`Got error updating state: ${e}`)
    }
  }

  async _updatePhase(phase: ATTESTER_PHASE) {
    await this._updateState({ phase })
  }
}
