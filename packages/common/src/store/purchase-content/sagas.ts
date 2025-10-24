import { USDC, UsdcWei } from '@audius/fixed-decimal'
import { Id, OptionalId, type AudiusSdk } from '@audius/sdk'
import type { createJupiterApiClient, QuoteResponse } from '@jup-ag/api'
import { getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token'
import {
  AddressLookupTableAccount,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js'
import bs58 from 'bs58'
import { sumBy } from 'lodash'
import { takeLatest } from 'redux-saga/effects'
import nacl, { BoxKeyPair } from 'tweetnacl'
import { call, put, race, select, take, takeEvery } from 'typed-redux-saga'

import { userTrackMetadataFromSDK } from '~/adapters'
import {
  queryAccountUser,
  queryCollection,
  queryCurrentUserId,
  queryTrack,
  queryUser,
  updateTrackData,
  queryWalletAddresses,
  WalletAddresses
} from '~/api'
import { isPurchaseableAlbum, PurchaseableContentMetadata } from '~/hooks'
import { Collection } from '~/models'
import { FavoriteSource, Name } from '~/models/Analytics'
import { ErrorLevel, Feature } from '~/models/ErrorReporting'
import { ID } from '~/models/Identifiers'
import {
  PurchaseAccess,
  PurchaseMethod,
  PurchaseVendor
} from '~/models/PurchaseContent'
import { isContentUSDCPurchaseGated, Track } from '~/models/Track'
import { User } from '~/models/User'
import { FeatureFlags } from '~/services/remote-config/feature-flags'
import {
  buyUSDCFlowFailed,
  buyUSDCFlowSucceeded,
  onrampCanceled,
  onrampOpened
} from '~/store/buy-usdc/slice'
import { BuyUSDCError } from '~/store/buy-usdc/types'
import {
  getBuyUSDCRemoteConfig,
  getOrCreateUSDCUserBank,
  pollForTokenAccountInfo
} from '~/store/buy-usdc/utils'
import { getContext } from '~/store/effects'
import { getPreviewing, getTrackId } from '~/store/player/selectors'
import { stop } from '~/store/player/slice'
import { saveTrack } from '~/store/social/tracks/actions'
import {
  transactionCanceled,
  transactionFailed,
  transactionSucceeded
} from '~/store/ui/coinflow-modal/slice'
import {
  coinflowOnrampModalActions,
  CoinflowPurchaseMetadata
} from '~/store/ui/modals/coinflow-onramp-modal'
import { waitForQueryValue, waitForValue } from '~/utils'

import { pollGatedContent } from '../gated-content/sagas'
import { updateGatedContentStatus } from '../gated-content/slice'
import { getSDK } from '../sdkUtils'
import { saveCollection } from '../social/collections/actions'
import { TOKEN_LISTING_MAP } from '../ui'

import {
  buyUSDC,
  eagerCreateUserBank,
  purchaseCanceled,
  purchaseConfirmed,
  purchaseContentFlowFailed,
  purchaseSucceeded,
  startPurchaseContentFlow,
  usdcBalanceSufficient
} from './slice'
import {
  PurchaseableContentType,
  PurchaseContentError,
  PurchaseErrorCode
} from './types'
import { getBalanceNeeded } from './utils'

type GetPurchaseConfigArgs = {
  contentId: ID
  contentType: PurchaseableContentType
}

const serializeKeyPair = (value: BoxKeyPair) => {
  const { publicKey, secretKey } = value
  const encodedKeyPair = {
    publicKey: bs58.encode(publicKey),
    secretKey: bs58.encode(secretKey)
  }
  return JSON.stringify(encodedKeyPair)
}

const deserializeKeyPair = (value: string): BoxKeyPair => {
  const { publicKey, secretKey } = JSON.parse(value)
  return {
    publicKey: bs58.decode(publicKey),
    secretKey: bs58.decode(secretKey)
  }
}

function* getContentInfo({ contentId, contentType }: GetPurchaseConfigArgs) {
  const metadata =
    contentType === PurchaseableContentType.ALBUM
      ? yield* queryCollection(contentId)
      : yield* queryTrack(contentId)
  const purchaseConditions =
    metadata?.stream_conditions ??
    (metadata && 'download_conditions' in metadata
      ? metadata?.download_conditions
      : null)
  // Stream access is a superset of download access - purchasing a stream-gated
  // track also gets you download access, but purchasing a download-gated track
  // only gets you download access (because the track was already free to stream).
  const purchaseAccess = metadata?.is_stream_gated
    ? PurchaseAccess.STREAM
    : PurchaseAccess.DOWNLOAD
  if (!metadata || !isContentUSDCPurchaseGated(purchaseConditions)) {
    throw new Error('Content is missing purchase conditions')
  }
  const isAlbum = 'playlist_id' in metadata
  const artistId = isAlbum ? metadata.playlist_owner_id : metadata.owner_id
  const artistInfo = yield* queryUser(artistId)
  if (!artistInfo) {
    throw new Error('Failed to retrieve content owner')
  }

  const title = isAlbum ? metadata.playlist_name : metadata.title
  const price = purchaseConditions.usdc_purchase.price

  return {
    price,
    title,
    artistInfo,
    purchaseAccess,
    purchaseConditions,
    metadata
  }
}

const getUserPurchaseMetadata = ({
  handle,
  name,
  wallet,
  spl_wallet,
  created_at,
  updated_at,
  user_id,
  is_deactivated,
  is_verified,
  location
}: User) => ({
  handle,
  name,
  wallet,
  spl_wallet,
  created_at,
  updated_at,
  user_id,
  is_deactivated,
  is_verified,
  location
})

const getPurchaseMetadata = (metadata: PurchaseableContentMetadata) => {
  const {
    created_at,
    description,
    is_delete,
    permalink,
    release_date,
    updated_at
  } = metadata

  const commonFields = {
    created_at,
    description,
    is_delete,
    permalink,
    release_date,
    updated_at
  }

  const isAlbum = isPurchaseableAlbum(metadata)
  if (isAlbum) {
    return {
      ...commonFields,
      duration: sumBy(metadata.tracks, (track) => track.duration),
      owner_id: metadata.playlist_owner_id,
      title: metadata.playlist_name,
      content_id: metadata.playlist_id
    }
  }

  const {
    duration,
    genre,
    isrc,
    iswc,
    license,
    owner_id,
    tags,
    title,
    track_id
  } = metadata

  return {
    created_at,
    description,
    duration,
    genre,
    is_delete,
    isrc,
    iswc,
    license,
    owner_id,
    permalink,
    release_date,
    tags,
    title,
    content_id: track_id,
    updated_at
  }
}

function* getCoinflowPurchaseMetadata({
  contentId,
  contentType
}: GetPurchaseMetadataArgs) {
  const { metadata, artistInfo, title, price } = yield* call(getContentInfo, {
    contentId,
    contentType
  })
  const currentUser = yield* call(queryAccountUser)

  const data: CoinflowPurchaseMetadata = {
    productName: `${artistInfo.name}:${title}`,
    productType: 'digitalArt',
    quantity: 1,
    rawProductData: {
      priceUSD: price / 100,
      artistInfo: getUserPurchaseMetadata(artistInfo),
      purchaserInfo: currentUser ? getUserPurchaseMetadata(currentUser) : null,
      contentInfo: getPurchaseMetadata(metadata as PurchaseableContentMetadata)
    }
  }
  return data
}

function* pollForPurchaseConfirmation({
  contentId,
  contentType
}: {
  contentId: ID
  contentType: PurchaseableContentType
}) {
  const currentUserId = yield* call(queryCurrentUserId)
  if (!currentUserId) {
    throw new Error(
      'Failed to fetch current user id while polling for purchase confirmation'
    )
  }
  yield* put(updateGatedContentStatus({ contentId, status: 'UNLOCKING' }))

  yield* pollGatedContent({
    contentId,
    contentType,
    currentUserId,
    isSourceTrack: true
  })

  if (contentType === PurchaseableContentType.ALBUM) {
    const { metadata } = yield* call(getContentInfo, {
      contentId,
      contentType
    })
    if (
      'playlist_contents' in metadata &&
      metadata.playlist_contents.track_ids
    ) {
      const sdk = yield* getSDK()
      for (const trackId of metadata.playlist_contents.track_ids) {
        const { data } = yield* call(
          [sdk.full.tracks, sdk.full.tracks.getTrack],
          {
            trackId: Id.parse(trackId.track),
            userId: OptionalId.parse(currentUserId)
          }
        )
        const track = data ? userTrackMetadataFromSDK(data) : null

        if (track) {
          yield* call(updateTrackData, [
            { track_id: track.track_id, access: track.access }
          ])
        }
      }
    }
  }
}

type GetPurchaseMetadataArgs = {
  contentId: ID
  contentType: PurchaseableContentType
}

/**
 * Intended to replace the old purchaseWithCoinflow Saga to use new SDK.
 * purchaseAlbumWithCoinflow to follow
 * Creates the purchase transaction but doesn't send it and instead pops the coinflow modal.
 * @see {@link https://github.com/AudiusProject/apps/blob/75169cfb00894f5462a612b423129895f58a53fe/packages/libs/src/sdk/api/tracks/TracksApi.ts#L386 purchase}
 */
function* purchaseTrackWithCoinflow(args: {
  sdk: AudiusSdk
  trackId: ID
  userId: ID
  price: number
  extraAmount?: number
  guestEmail?: string
  includeNetworkCut?: boolean
}) {
  const {
    sdk,
    userId,
    trackId,
    price,
    extraAmount = 0,
    includeNetworkCut = false,
    guestEmail
  } = args

  const solanaWalletService = yield* getContext('solanaWalletService')
  const wallet = yield* call([
    solanaWalletService,
    solanaWalletService.getKeypair
  ])
  if (!wallet) {
    throw new Error('Missing solana root wallet')
  }

  const params = {
    price: args.price,
    extraAmount: args.extraAmount,
    trackId: Id.parse(trackId),
    userId: Id.parse(userId),
    includeNetworkCut
  }
  const mint = 'USDC'
  const {
    instructions: {
      routeInstruction,
      memoInstruction,
      locationMemoInstruction
    },
    total: amount
  } = yield* call([sdk.tracks, sdk.tracks.getPurchaseTrackInstructions], params)

  const transferInstruction = yield* call(
    [
      sdk.services.paymentRouterClient,
      sdk.services.paymentRouterClient.createTransferInstruction
    ],
    { sourceWallet: wallet.publicKey, total: amount, mint }
  )

  const transaction = yield* call(
    [sdk.services.solanaClient, sdk.services.solanaClient.buildTransaction],
    {
      feePayer: wallet.publicKey,
      instructions: [
        transferInstruction,
        routeInstruction,
        memoInstruction,
        locationMemoInstruction
      ].filter(Boolean) as TransactionInstruction[]
    }
  )

  const serializedTransaction = Buffer.from(transaction.serialize()).toString(
    'base64'
  )

  const purchaseMetadata = yield* call(getCoinflowPurchaseMetadata, {
    contentId: trackId,
    contentType: PurchaseableContentType.TRACK
  })
  const total = price + extraAmount
  yield* put(
    coinflowOnrampModalActions.open({
      amount: Number(USDC(total).toString()),
      serializedTransaction,
      purchaseMetadata,
      contentId: trackId,
      guestEmail
    })
  )

  const result = yield* race({
    succeeded: take(transactionSucceeded),
    failed: take(transactionFailed),
    canceled: take(transactionCanceled)
  })

  // Return early for failure or cancellation
  if (result.canceled) {
    throw new PurchaseContentError(
      PurchaseErrorCode.Canceled,
      'Coinflow transaction canceled'
    )
  }
  if (result.failed) {
    throw result.failed.payload.error
  }
}

/**
 * Intended to replace the old purchaseWithCoinflow Saga to use new SDK.
 * Creates the purchase transaction but doesn't send it and instead pops the coinflow modal.
 * @see {@link https://github.com/AudiusProject/apps/blob/75169cfb00894f5462a612b423129895f58a53fe/packages/libs/src/sdk/api/albums/AlbumsApi.ts#L386 purchase}
 */
function* purchaseAlbumWithCoinflow(args: {
  sdk: AudiusSdk
  albumId: ID
  userId: ID
  price: number
  extraAmount?: number
  includeNetworkCut?: boolean
  guestEmail?: string
}) {
  const {
    sdk,
    userId,
    albumId,
    price,
    extraAmount = 0,
    includeNetworkCut = false,
    guestEmail
  } = args
  const solanaWalletService = yield* getContext('solanaWalletService')
  const wallet = yield* call([
    solanaWalletService,
    solanaWalletService.getKeypair
  ])
  if (!wallet) {
    throw new Error('Missing solana root wallet')
  }

  const params = {
    price: args.price,
    extraAmount: args.extraAmount,
    albumId: Id.parse(albumId),
    userId: Id.parse(userId),
    includeNetworkCut
  }

  const mint = 'USDC'
  const {
    instructions: {
      routeInstruction,
      memoInstruction,
      locationMemoInstruction
    },
    total: amount
  } = yield* call([sdk.albums, sdk.albums.getPurchaseAlbumInstructions], params)

  const transferInstruction = yield* call(
    [
      sdk.services.paymentRouterClient,
      sdk.services.paymentRouterClient.createTransferInstruction
    ],
    { sourceWallet: wallet.publicKey, total: amount, mint }
  )

  const transaction = yield* call(
    [sdk.services.solanaClient, sdk.services.solanaClient.buildTransaction],
    {
      feePayer: wallet.publicKey,
      instructions: [
        transferInstruction,
        routeInstruction,
        memoInstruction,
        locationMemoInstruction
      ].filter(Boolean) as TransactionInstruction[]
    }
  )

  const serializedTransaction = Buffer.from(transaction.serialize()).toString(
    'base64'
  )

  const purchaseMetadata = yield* call(getCoinflowPurchaseMetadata, {
    contentId: albumId,
    contentType: PurchaseableContentType.ALBUM
  })
  const total = price + extraAmount
  yield* put(
    coinflowOnrampModalActions.open({
      amount: Number(USDC(total).toString()),
      serializedTransaction,
      purchaseMetadata,
      contentId: albumId,
      guestEmail
    })
  )

  const result = yield* race({
    succeeded: take(transactionSucceeded),
    failed: take(transactionFailed),
    canceled: take(transactionCanceled)
  })

  // Return early for failure or cancellation
  if (result.canceled) {
    throw new PurchaseContentError(
      PurchaseErrorCode.Canceled,
      'Coinflow transaction canceled'
    )
  }
  if (result.failed) {
    throw result.failed.payload.error
  }
}

type PurchaseUSDCWithStripeArgs = {
  /** Amount of USDC to purchase, as dollars */
  amount: number
}
function* purchaseUSDCWithStripe({ amount }: PurchaseUSDCWithStripeArgs) {
  yield* put(buyUSDC())

  const cents = Math.ceil(amount * 100)

  yield* put(
    onrampOpened({
      vendor: PurchaseVendor.STRIPE,
      purchaseInfo: {
        desiredAmount: cents
      }
    })
  )

  const result = yield* race({
    succeeded: take(buyUSDCFlowSucceeded),
    canceled: take(onrampCanceled),
    failed: take(buyUSDCFlowFailed)
  })

  // Return early for cancellation
  if (result.canceled) {
    throw new PurchaseContentError(
      PurchaseErrorCode.Canceled,
      'User canceled onramp'
    )
  }
  // throw errors out to the shared handler below
  if (result.failed) {
    throw result.failed.payload.error
  }
  yield* put(usdcBalanceSufficient())
}

/**
 * Collects and encrypts user's email after a successful purchase
 * @param metadata The metadata of the purchased content
 */
function* collectEmailAfterPurchase({
  metadata
}: {
  metadata: Collection | Track
}) {
  try {
    const audiusSdk = yield* getContext('audiusSdk')

    const sdk = yield* call(audiusSdk)
    const identityService = yield* getContext('identityService')
    const isAlbum = 'playlist_id' in metadata

    const purchaserUserId = yield* call(queryCurrentUserId)
    const sellerId = isAlbum ? metadata.playlist_owner_id : metadata.owner_id

    const email = yield* call([identityService, identityService.getUserEmail])

    if (!purchaserUserId) {
      throw new Error('Purchaser user ID not found')
    }

    if (!email) {
      console.warn('No email found for user after purchase')
      return
    }

    const { data: managers } = yield* call(
      [sdk.full.users, sdk.full.users.getManagers],
      {
        id: Id.parse(sellerId),
        isApproved: true
      }
    )

    const grantees = managers?.map((m) => m.manager.id)

    const { EMAIL_ENCRYPTION_UUID } = yield* getContext('env')
    yield* call([sdk.users, sdk.users.shareEmail], {
      emailOwnerUserId: purchaserUserId,
      receivingUserId: sellerId,
      email,
      granteeUserIds: grantees ?? [],
      initialEmailEncryptionUuid: EMAIL_ENCRYPTION_UUID ?? 0
    })
  } catch (error) {
    // Log error but don't disrupt purchase flow
    console.error('Failed to process email after purchase:', error)
  }
}

function* doStartPurchaseContentFlow({
  payload: {
    extraAmount,
    extraAmountPreset,
    purchaseMethod,
    purchaseVendor,
    purchaseMethodMintAddress,
    contentId,
    contentType = PurchaseableContentType.TRACK,
    guestEmail
  }
}: ReturnType<typeof startPurchaseContentFlow>) {
  const usdcConfig = yield* call(getBuyUSDCRemoteConfig)
  const reportToSentry = yield* getContext('reportToSentry')
  const { track, make } = yield* getContext('analytics')
  const audiusSdk = yield* getContext('audiusSdk')
  const sdk = yield* call(audiusSdk)

  // wait for guest account creation
  yield* call(
    waitForQueryValue<WalletAddresses>,
    queryWalletAddresses,
    null,
    (value: WalletAddresses) => !!value?.currentUser
  )

  const getFeatureEnabled = yield* getContext('getFeatureEnabled')
  const isNetworkCutEnabled = yield* call(
    getFeatureEnabled,
    FeatureFlags.NETWORK_CUT_ENABLED
  )

  const { price, title, artistInfo } = yield* call(getContentInfo, {
    contentId,
    contentType
  })

  const totalAmount = (price + (extraAmount ?? 0)) / 100
  const purchaserUserId = yield* call(queryCurrentUserId)

  const analyticsInfo = {
    price: price / 100,
    contentId,
    contentType,
    purchaseMethod,
    purchaseVendor,
    contentName: title,
    artistHandle: artistInfo.handle,
    isVerifiedArtist: artistInfo.is_verified,
    totalAmount,
    payExtraAmount: extraAmount ? extraAmount / 100 : 0,
    payExtraPreset: extraAmountPreset,
    buyerUserId: purchaserUserId,
    isGuest: !!guestEmail
  }

  // Record start
  yield* call(
    track,
    make({
      eventName: Name.PURCHASE_CONTENT_STARTED,
      ...analyticsInfo
    })
  )

  try {
    // get user & user bank

    if (!purchaserUserId) {
      throw new Error('Failed to fetch purchasing user id')
    }
    const userBank = yield* call(getOrCreateUSDCUserBank)
    const tokenAccountInfo = yield* call(pollForTokenAccountInfo, {
      tokenAccount: userBank
    })

    // In the case where there is no amount, the token account was probably
    // just created. Just use 0 for initial balance.
    const { amount: initialBalance } = tokenAccountInfo ?? { amount: 0 }

    // USDC has 6 decimals, so 1 cent = 10^4 wei
    const USDC_CENT_WEI = USDC(0.01).value
    const priceWei = USDC(BigInt(price) * USDC_CENT_WEI).value
    const extraAmountWei = USDC(BigInt(extraAmount ?? 0) * USDC_CENT_WEI).value
    const totalAmountDueCentsWei = USDC(priceWei + extraAmountWei).value

    const balanceNeeded = getBalanceNeeded(
      totalAmountDueCentsWei,
      BigInt(initialBalance) as UsdcWei,
      usdcConfig.minUSDCPurchaseAmountCents
    )

    switch (purchaseMethod) {
      case PurchaseMethod.BALANCE:
      case PurchaseMethod.CRYPTO: {
        // Invariant: The user must have enough funds
        if (balanceNeeded > BigInt(0)) {
          throw new PurchaseContentError(
            PurchaseErrorCode.InsufficientBalance,
            'Unexpected insufficient balance to complete purchase'
          )
        }
        // No balance needed, perform the purchase right away
        if (contentType === PurchaseableContentType.TRACK) {
          yield* call([sdk.tracks, sdk.tracks.purchaseTrack], {
            userId: Id.parse(purchaserUserId),
            trackId: Id.parse(contentId),
            price: price / 100.0,
            extraAmount: extraAmount ? extraAmount / 100.0 : undefined,
            includeNetworkCut: isNetworkCutEnabled
          })
        } else {
          yield* call([sdk.albums, sdk.albums.purchaseAlbum], {
            userId: Id.parse(purchaserUserId),
            albumId: Id.parse(contentId),
            price: price / 100.0,
            extraAmount: extraAmount ? extraAmount / 100.0 : undefined,
            includeNetworkCut: isNetworkCutEnabled
          })
        }
        break
      }
      case PurchaseMethod.WALLET: {
        const decimals = TOKEN_LISTING_MAP.USDC.decimals
        const totalAmountWithDecimals = Math.ceil(totalAmount * 10 ** decimals)
        if (!purchaseMethodMintAddress) {
          throw new Error('Missing purchase method mint address')
        }
        yield* call(purchaseWithAnything, {
          purchaserUserId,
          contentId,
          contentType,
          price,
          extraAmount,
          totalAmountWithDecimals,
          inputMint: purchaseMethodMintAddress
        })
        break
      }
      case PurchaseMethod.CARD: {
        const purchaseAmount = (price + (extraAmount ?? 0)) / 100.0
        switch (purchaseVendor) {
          case PurchaseVendor.COINFLOW:
            // Purchase with coinflow, funding and completing the purchase in one step.
            if (contentType === PurchaseableContentType.TRACK) {
              yield* call(purchaseTrackWithCoinflow, {
                sdk,
                trackId: contentId,
                userId: purchaserUserId,
                price: price / 100.0,
                extraAmount: extraAmount ? extraAmount / 100.0 : undefined,
                guestEmail,
                includeNetworkCut: isNetworkCutEnabled
              })
            } else {
              yield* call(purchaseAlbumWithCoinflow, {
                sdk,
                albumId: contentId,
                userId: purchaserUserId,
                price: price / 100.0,
                extraAmount: extraAmount ? extraAmount / 100.0 : undefined,
                guestEmail,
                includeNetworkCut: isNetworkCutEnabled
              })
            }
            break
          case PurchaseVendor.STRIPE:
            // Buy USDC with Stripe. Once funded, continue with purchase.
            yield* call(purchaseUSDCWithStripe, { amount: purchaseAmount })
            if (contentType === PurchaseableContentType.TRACK) {
              yield* call([sdk.tracks, sdk.tracks.purchaseTrack], {
                userId: Id.parse(purchaserUserId),
                trackId: Id.parse(contentId),
                price: price / 100.0,
                extraAmount: extraAmount ? extraAmount / 100.0 : undefined,
                includeNetworkCut: isNetworkCutEnabled
              })
            } else {
              yield* call([sdk.albums, sdk.albums.purchaseAlbum], {
                userId: Id.parse(purchaserUserId),
                albumId: Id.parse(contentId),
                price: price / 100.0,
                extraAmount: extraAmount ? extraAmount / 100.0 : undefined,
                includeNetworkCut: isNetworkCutEnabled
              })
            }
            break
        }
        break
      }
    }

    // Mark the purchase as successful
    yield* put(purchaseSucceeded())

    // Poll to confirm purchase (waiting for a signature)
    yield* pollForPurchaseConfirmation({ contentId, contentType })

    const { metadata } = yield* call(getContentInfo, {
      contentId,
      contentType
    })

    // Collect email after successful purchase
    yield* call(collectEmailAfterPurchase, { metadata })

    // Auto-favorite the purchased item
    if (!guestEmail) {
      if (contentType === PurchaseableContentType.TRACK) {
        yield* put(saveTrack(contentId, FavoriteSource.IMPLICIT))
      }
      if (contentType === PurchaseableContentType.ALBUM) {
        yield* put(saveCollection(contentId, FavoriteSource.IMPLICIT))
        if (
          'playlist_contents' in metadata &&
          metadata.playlist_contents.track_ids &&
          !metadata.is_private
        ) {
          for (const track of metadata.playlist_contents.track_ids) {
            yield* put(saveTrack(track.track, FavoriteSource.IMPLICIT))
          }
        }
      }
    }

    // Check if playing the purchased track's preview and if so, stop it
    const isPreviewing = yield* select(getPreviewing)
    const nowPlayingTrackId = yield* select(getTrackId)
    const isPlayingTrackInAlbum =
      contentType === PurchaseableContentType.ALBUM &&
      'playlist_contents' in metadata &&
      metadata.playlist_contents.track_ids.some(
        ({ track: trackId }) => trackId === nowPlayingTrackId
      )
    const isPlayingPurchasedTrack =
      contentType === PurchaseableContentType.TRACK &&
      contentId === nowPlayingTrackId

    if (isPreviewing && (isPlayingTrackInAlbum || isPlayingPurchasedTrack)) {
      yield* put(stop({}))
    }

    // Finish
    yield* put(purchaseConfirmed({ contentId, contentType }))

    yield* call(
      track,
      make({
        eventName: Name.PURCHASE_CONTENT_SUCCESS,
        ...analyticsInfo
      })
    )
  } catch (e: unknown) {
    // If we get a known error, pipe it through directly. Otherwise make sure we
    // have a properly contstructed error to put into the slice.
    const error =
      e instanceof PurchaseContentError || e instanceof BuyUSDCError
        ? e
        : new PurchaseContentError(PurchaseErrorCode.Unknown, `${e}`)

    // Nested sagas will throw for cancellation, but we don't need to log that as
    // an error, just return early
    if (error.code === PurchaseErrorCode.Canceled) {
      yield* put(purchaseCanceled())
      return
    }

    yield* call(reportToSentry, {
      level: ErrorLevel.Error,
      error,
      additionalInfo: { contentId, contentType },
      feature: Feature.Purchase
    })
    yield* put(purchaseContentFlowFailed({ error }))
    yield* put(updateGatedContentStatus({ contentId, status: 'LOCKED' }))
    yield* call(
      track,
      make({
        eventName: Name.PURCHASE_CONTENT_FAILURE,
        error: error.message,
        ...analyticsInfo
      })
    )
  }
}

let jup: ReturnType<typeof createJupiterApiClient> | undefined

const initJupiter = async () => {
  try {
    const { createJupiterApiClient } = await import('@jup-ag/api')
    return createJupiterApiClient()
  } catch (e) {
    console.error('Jupiter failed to initialize', e)
    throw e
  }
}

const getJupiterInstance = async () => {
  if (!jup) {
    jup = await initJupiter()
  }
  return jup
}

function* purchaseWithAnything({
  purchaserUserId,
  contentId,
  contentType = PurchaseableContentType.TRACK,
  price,
  extraAmount,
  totalAmountWithDecimals,
  inputMint
}: {
  purchaserUserId: ID
  contentId: ID
  contentType: PurchaseableContentType
  price: number
  extraAmount?: number
  totalAmountWithDecimals: number
  inputMint: string
}) {
  try {
    const audiusSdk = yield* getContext('audiusSdk')
    const sdk = yield* call(audiusSdk)
    const connection = sdk.services.solanaClient.connection
    const getFeatureEnabled = yield* getContext('getFeatureEnabled')
    const isNetworkCutEnabled = yield* call(
      getFeatureEnabled,
      FeatureFlags.NETWORK_CUT_ENABLED
    )

    // Get the USDC user bank
    const usdcUserBank = yield* call(getOrCreateUSDCUserBank)
    const usdcUserBankTokenAccount = yield* call(pollForTokenAccountInfo, {
      tokenAccount: usdcUserBank
    })
    if (!usdcUserBankTokenAccount) {
      throw new Error('Failed to fetch USDC user bank token account info')
    }

    let sourceWallet: PublicKey

    const isNativeMobile = yield* getContext('isNativeMobile')
    const mobileWalletActions = yield* getContext('mobileWalletActions')
    if (isNativeMobile && mobileWalletActions) {
      const { connect } = mobileWalletActions
      const getWalletConnectPublicKey = (state: any) => {
        return state.walletConnect.publicKey
      }
      const dappKeyPair = nacl.box.keyPair()
      yield* put({
        type: 'walletConnect/setDappKeyPair',
        payload: { dappKeyPair: serializeKeyPair(dappKeyPair) }
      })
      yield* call(connect, dappKeyPair)
      yield* call(waitForValue, getWalletConnectPublicKey)
      sourceWallet = new PublicKey(yield* select(getWalletConnectPublicKey))
    } else {
      // Get the solana wallet provider
      const provider = window.solana
      if (!provider) {
        throw new Error('No solana provider / wallet found')
      }
      sourceWallet = new PublicKey(
        (yield* call(provider.connect)).publicKey.toString()
      )
    }

    let transaction: VersionedTransaction
    let message: TransactionMessage
    let addressLookupTableAccounts: AddressLookupTableAccount[] | undefined
    if (inputMint === TOKEN_LISTING_MAP.USDC.address) {
      const instruction = yield* call(
        [
          sdk.services.paymentRouterClient,
          sdk.services.paymentRouterClient.createTransferInstruction
        ],
        {
          sourceWallet,
          total: BigInt(totalAmountWithDecimals),
          mint: 'USDC'
        }
      )
      transaction = yield* call(
        [sdk.services.solanaClient, sdk.services.solanaClient.buildTransaction],
        {
          feePayer: sourceWallet,
          instructions: [instruction]
        }
      )
      message = TransactionMessage.decompile(transaction.message)
    } else {
      const paymentRouterTokenAccount = yield* call(
        [
          sdk.services.paymentRouterClient,
          sdk.services.paymentRouterClient.getOrCreateProgramTokenAccount
        ],
        {
          mint: 'USDC'
        }
      )
      const externalTokenAccountPublicKey = getAssociatedTokenAddressSync(
        new PublicKey(inputMint),
        sourceWallet
      )

      const jup = yield* call(getJupiterInstance)
      let quote: QuoteResponse
      try {
        quote = yield* call([jup, jup.quoteGet], {
          inputMint,
          outputMint: TOKEN_LISTING_MAP.USDC.address,
          amount: totalAmountWithDecimals,
          swapMode: 'ExactOut'
        })
        if (!quote) {
          throw new Error()
        }
      } catch (e) {
        throw new PurchaseContentError(
          PurchaseErrorCode.NoQuote,
          `Failed to get Jupiter quote for ${inputMint} => USDC`
        )
      }

      // Make sure user has enough funds to purchase content
      let hasEnoughTokens = false
      try {
        const { amount } = yield* call(
          getAccount,
          connection,
          externalTokenAccountPublicKey
        )
        hasEnoughTokens = amount >= BigInt(quote.inAmount)
      } catch (e) {
        hasEnoughTokens = false
      }

      if (!hasEnoughTokens) {
        // For wrapped SOL, check SOL balance as well since jupiter will handle the wrapping
        if (inputMint === TOKEN_LISTING_MAP.SOL.address) {
          const amount = yield* call(
            [connection, connection.getBalance],
            sourceWallet
          )
          hasEnoughTokens = amount >= BigInt(quote.inAmount)
        }
      }
      if (!hasEnoughTokens) {
        throw new PurchaseContentError(
          PurchaseErrorCode.InsufficientExternalTokenBalance,
          `You do not have enough funds for ${inputMint} to complete this purchase.`
        )
      }

      // Get the payment router address and swap directly into it
      const { swapTransaction } = yield* call([jup, jup.swapPost], {
        swapRequest: {
          quoteResponse: quote,
          userPublicKey: sourceWallet.toString(),
          destinationTokenAccount: paymentRouterTokenAccount.address.toString()
        }
      })
      const decoded = Buffer.from(swapTransaction, 'base64')
      transaction = VersionedTransaction.deserialize(decoded)

      // Get address lookup table accounts
      const getLUTs = async () => {
        return await Promise.all(
          transaction.message.addressTableLookups.map(async (lookup) => {
            return new AddressLookupTableAccount({
              key: lookup.accountKey,
              state: AddressLookupTableAccount.deserialize(
                await connection
                  .getAccountInfo(lookup.accountKey)
                  .then((res: any) => res.data)
              )
            })
          })
        )
      }
      addressLookupTableAccounts = yield* call(getLUTs)
      // Decompile transaction message and add transfer instruction
      message = TransactionMessage.decompile(transaction.message, {
        addressLookupTableAccounts
      })
    }

    if (contentType === PurchaseableContentType.TRACK) {
      const {
        instructions: {
          routeInstruction,
          memoInstruction,
          locationMemoInstruction
        }
      } = yield* call([sdk.tracks, sdk.tracks.getPurchaseTrackInstructions], {
        userId: Id.parse(purchaserUserId),
        trackId: Id.parse(contentId),
        price: price / 100.0,
        extraAmount: extraAmount ? extraAmount / 100.0 : undefined,
        includeNetworkCut: isNetworkCutEnabled
      })
      message.instructions.push(routeInstruction, memoInstruction)
      if (locationMemoInstruction) {
        message.instructions.push()
      }
    } else {
      const {
        instructions: {
          routeInstruction,
          memoInstruction,
          locationMemoInstruction
        }
      } = yield* call([sdk.albums, sdk.albums.getPurchaseAlbumInstructions], {
        userId: Id.parse(purchaserUserId),
        albumId: Id.parse(contentId),
        price: price / 100.0,
        extraAmount: extraAmount ? extraAmount / 100.0 : undefined,
        includeNetworkCut: isNetworkCutEnabled
      })
      message.instructions.push(routeInstruction, memoInstruction)
      if (locationMemoInstruction) {
        message.instructions.push()
      }
    }
    console.info(
      `Purchasing ${
        contentType === PurchaseableContentType.TRACK ? 'track' : 'album'
      } with id ${contentId}...`
    )

    // Compile the message and update the transaction
    transaction.message = message.compileToV0Message(addressLookupTableAccounts)

    // Execute the swap by signing and sending the transaction
    if (isNativeMobile && mobileWalletActions) {
      const { signAndSendTransaction } = mobileWalletActions
      const getWalletConnectState = (state: any) => state.walletConnect
      const { dappKeyPair, sharedSecret, session } = yield* select(
        getWalletConnectState
      )
      return yield* call(signAndSendTransaction, {
        transaction,
        dappKeyPair: deserializeKeyPair(dappKeyPair),
        sharedSecret: new Uint8Array(bs58.decode(sharedSecret)),
        session
      })
    } else {
      const provider = window.solana
      return yield* call(
        [provider, provider.signAndSendTransaction],
        transaction
      )
    }
  } catch (e) {
    console.error(`handlePayWithAnything | Error: ${e}`)
    throw e
  }
}

function* watchStartPurchaseContentFlow() {
  yield takeLatest(startPurchaseContentFlow, doStartPurchaseContentFlow)
}

function* watchEagerCreateUserBank() {
  yield takeEvery(eagerCreateUserBank, function* () {
    try {
      yield* call(getOrCreateUSDCUserBank)
    } catch (e) {
      console.error(`eagerCreateUserBank failed: ${e}`)
    }
  })
}

export default function sagas() {
  return [watchStartPurchaseContentFlow, watchEagerCreateUserBank]
}
