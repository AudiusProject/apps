import { NextFunction, Request, Response } from 'express'
import { RelayRequest } from '../types/relay'
import { validationError } from '../error'
import { DeveloperApps, Table, Users } from '@pedalboard/storage'
import { audiusSdk, config, discoveryDb } from '..'
import {
  isTrackDownload,
  isUserCreate,
  isUserDeactivate,
  isViewNotification,
  isViewPlaylistNotification
} from '../utils'
import { getEntityManagerActionKey } from './rateLimiter'

const MAX_ACDC_GAS_LIMIT = 10485760

const validateSender = async (encodedABI: string, senderAddress: string) => {
  const recoveredAddress = await audiusSdk.services.entityManager.recoverSigner(
    encodedABI as `0x${string}`
  )
  return recoveredAddress.toLowerCase() === senderAddress.toLowerCase()
}

export const validator = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const body = request.body as RelayRequest
  const { logger } = response.locals.ctx

  // Validation of input fields
  const contractAddress =
    body.contractAddress || config.entityManagerContractAddress

  if (
    body.contractRegistryKey === null ||
    body.contractRegistryKey === undefined
  ) {
    validationError(next, 'contractRegistryKey is a required field')
    return
  }
  const contractRegistryKey = body.contractRegistryKey

  if (body.encodedABI === null || body.encodedABI === undefined) {
    validationError(next, 'encodedABI is a required field')
    return
  }
  const encodedABI = body.encodedABI

  // remove "null" possibility
  const gasLimit = MAX_ACDC_GAS_LIMIT
  const senderAddress = body.senderAddress || undefined
  const handle = body.handle || undefined

  const validatedRelayRequest = {
    contractAddress,
    contractRegistryKey,
    encodedABI,
    gasLimit,
    senderAddress,
    handle
  }

  const loggerInfo: {
    operation?: string
    handle?: string
    address?: string
    userId?: number
    isApp?: boolean
  } = {
    isApp: false
  }

  if (
    senderAddress &&
    !(await validateSender(body.encodedABI, senderAddress))
  ) {
    validationError(next, 'recovered signer does not match sender address')
    return
  }

  const operation = getEntityManagerActionKey(encodedABI)
  loggerInfo.operation = operation
  logger.info({ operation, encodedABI }, 'retrieved operation')

  // Gather user from input data
  // @ts-ignore, partially populate for now
  let recoveredSigner: Users | DeveloperApps = {
    wallet: senderAddress || null,
    handle: handle || null
  }

  let signerIsApp = false
  let signerIsUser = false
  let isAnonymousAllowed = false
  const isSenderVerifier = senderAddress === config.verifierAddress

  const user = await retrieveUser(
    contractRegistryKey,
    contractAddress,
    encodedABI,
    senderAddress,
    handle
  )
  if (user !== undefined) {
    recoveredSigner = user
    signerIsUser = true
    loggerInfo.handle = user.handle_lc || undefined
    loggerInfo.address = user.wallet || undefined
    loggerInfo.userId = user.user_id || undefined

    logger.info(
      {
        handle: user.handle_lc,
        address: user.wallet,
        userId: user.user_id,
        operation
      },
      `retrieved user ${user.handle_lc}`
    )
  }

  if (signerIsUser) {
    const isDeactivated = (recoveredSigner as Users).is_deactivated
    if (isUserDeactivate(isDeactivated, encodedABI)) {
      logger.info('user deactivation')
      isAnonymousAllowed = true
    }
  }

  if (isUserCreate(encodedABI)) {
    logger.info('user create')
    isAnonymousAllowed = true
  }

  if (isTrackDownload(encodedABI)) {
    logger.info('track download')
    isAnonymousAllowed = true
  }

  if (isViewNotification(encodedABI)) {
    isAnonymousAllowed = true
  }

  if (isViewPlaylistNotification(encodedABI)) {
    isAnonymousAllowed = true
  }

  // could not find user and is not create, find app
  if (!signerIsUser && !isAnonymousAllowed && !isSenderVerifier) {
    const developerApp = await retrieveDeveloperApp({
      encodedABI,
      contractAddress
    })
    if (developerApp === undefined) {
      logger.error('neither user nor developer app could be found for address')
      validationError(next, 'recoveredSigner not valid')
      return
    }
    recoveredSigner = developerApp
    signerIsApp = true
    loggerInfo.address = developerApp.address
    loggerInfo.userId = developerApp.user_id || undefined
    loggerInfo.handle = developerApp.name
    loggerInfo.isApp = true
    logger.info(
      {
        address: developerApp.address,
        userId: developerApp.user_id,
        handle: developerApp.name,
        operation
      },
      `retrieved developer app ${developerApp.name}`
    )
  }

  // inject remaining fields into ctx for downstream middleware
  const ip = request.ip ?? ''

  const oldCtx = response.locals.ctx
  // create child logger with additional
  const newLogger = logger.child({ ...loggerInfo })
  response.locals.ctx = {
    ...oldCtx,
    validatedRelayRequest,
    recoveredSigner,
    isAnonymousAllowed,
    ip,
    signerIsApp,
    signerIsUser,
    isSenderVerifier,
    logger: newLogger
  }
  next()
}

/** Retrieves user based on data that's available. */
export const retrieveUser = async (
  contractRegistryKey: string,
  contractAddress: string,
  encodedABI: string,
  senderAddress?: string,
  handle?: string
): Promise<Users | undefined> => {
  let query = discoveryDb<Users>(Table.Users)
  let addedWalletClause = false
  let addedHandleClause = false

  // if entitymanager transaction, recover signer
  if (contractRegistryKey === 'EntityManager') {
    const recoveredAddress =
      await audiusSdk.services.entityManager.recoverSigner(
        encodedABI as `0x${string}`
      )

    query = query.where('wallet', '=', recoveredAddress.toLowerCase())
    addedWalletClause = true
  }

  // if something outside of entity manager, use sender address
  if (!addedWalletClause && senderAddress) {
    query = query.where('wallet', '=', senderAddress)
    addedWalletClause = true
  }

  if (!addedWalletClause && handle) {
    query = query
      .where('handle_lc', '=', handle.toLowerCase())
      .orWhereNull('handle_lc')
    addedHandleClause = true
  }

  if (!addedWalletClause && !addedHandleClause) {
    throw new Error('either handle or senderAddress is required')
  }

  const user = await query
    .andWhere('is_current', '=', true)
    .orderBy('created_at', 'asc')
    .first()
  return user
}

export const retrieveDeveloperApp = async (params: {
  encodedABI: string
  contractAddress: string
}): Promise<DeveloperApps | undefined> => {
  const { encodedABI } = params
  const recoveredAddress = await audiusSdk.services.entityManager.recoverSigner(
    encodedABI as `0x${string}`
  )
  return await discoveryDb<DeveloperApps>(Table.DeveloperApps)
    .where('address', '=', recoveredAddress.toLowerCase())
    .first()
}
