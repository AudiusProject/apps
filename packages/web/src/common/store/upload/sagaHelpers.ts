import { queryAccountUser } from '@audius/common/api'
import {
  Name,
  isContentFollowGated,
  isContentTipGated,
  isContentTokenGated,
  isContentUSDCPurchaseGated,
  USDCPurchaseConditions
} from '@audius/common/models'
import {
  getOrCreateUSDCUserBank,
  TrackForUpload,
  TrackMetadataForUpload
} from '@audius/common/store'
import { USDC } from '@audius/fixed-decimal'
import { all, call, put } from 'typed-redux-saga'

import { make } from 'common/store/analytics/actions'

/** Records gated track uploads. */
export function* recordGatedTracks(
  tracks: (TrackForUpload | TrackMetadataForUpload)[]
) {
  const events = tracks.reduce<ReturnType<typeof make>[]>(
    (out, trackOrMetadata) => {
      const {
        is_stream_gated: isStreamGated,
        stream_conditions: streamConditions,
        is_download_gated: isDownloadGated,
        download_conditions: dowloadConditions,
        is_downloadable: isDownloadable,
        is_original_available: isOriginalAvailable
      } = 'metadata' in trackOrMetadata
        ? trackOrMetadata.metadata
        : trackOrMetadata
      if (isStreamGated && streamConditions) {
        if (isContentFollowGated(streamConditions)) {
          out.push(
            make(Name.TRACK_UPLOAD_FOLLOW_GATED, {
              kind: 'tracks',
              downloadable: isDownloadable,
              lossless: isOriginalAvailable
            })
          )
        } else if (isContentTipGated(streamConditions)) {
          out.push(
            make(Name.TRACK_UPLOAD_TIP_GATED, {
              kind: 'tracks',
              downloadable: isDownloadable,
              lossless: isOriginalAvailable
            })
          )
        } else if (isContentTokenGated(streamConditions)) {
          out.push(
            make(Name.TRACK_UPLOAD_TOKEN_GATED, {
              kind: 'tracks',
              downloadable: isDownloadable,
              lossless: isOriginalAvailable
            })
          )
        } else if (isContentUSDCPurchaseGated(streamConditions)) {
          out.push(
            make(Name.TRACK_UPLOAD_USDC_GATED, {
              kind: 'tracks',
              price: streamConditions.usdc_purchase.price / 100,
              downloadable: isDownloadable,
              lossless: isOriginalAvailable
            })
          )
        }
      } else if (isDownloadGated && dowloadConditions) {
        if (isContentFollowGated(dowloadConditions)) {
          out.push(
            make(Name.TRACK_UPLOAD_FOLLOW_GATED_DOWNLOAD, {
              kind: 'tracks',
              downloadable: isDownloadable,
              lossless: isOriginalAvailable
            })
          )
        } else if (isContentTokenGated(dowloadConditions)) {
          out.push(
            make(Name.TRACK_UPLOAD_TOKEN_GATED_DOWNLOAD, {
              kind: 'tracks',
              downloadable: isDownloadable,
              lossless: isOriginalAvailable
            })
          )
        } else if (isContentUSDCPurchaseGated(dowloadConditions)) {
          out.push(
            make(Name.TRACK_UPLOAD_USDC_GATED_DOWNLOAD, {
              kind: 'tracks',
              price: dowloadConditions.usdc_purchase.price / 100,
              downloadable: isDownloadable,
              lossless: isOriginalAvailable
            })
          )
        }
      }
      return out
    },
    []
  )

  yield* all(events.map((e) => put(e)))
}

export function* getUSDCMetadata(stream_conditions: USDCPurchaseConditions) {
  const ownerAccount = yield* call(queryAccountUser)
  const wallet = ownerAccount?.erc_wallet ?? ownerAccount?.wallet
  const ownerUserbank = yield* call(getOrCreateUSDCUserBank, wallet)
  const priceCents = stream_conditions.usdc_purchase.price
  const priceWei = Number(USDC(priceCents / 100).value.toString())
  const conditionsWithMetadata: USDCPurchaseConditions = {
    usdc_purchase: {
      price: priceCents,
      splits: {
        [ownerUserbank?.toString() ?? '']: priceWei
      }
    }
  }
  return conditionsWithMetadata
}

/**
 * Adds relevant premium metadata
 * Converts prices to WEI and adds splits for USDC purchasable content.
 */
export function* addPremiumMetadata<T extends TrackMetadataForUpload>(
  track: T
) {
  // download_conditions could be set separately from stream_conditions, so we check for them first
  if (isContentUSDCPurchaseGated(track.download_conditions)) {
    track.download_conditions = yield* call(
      getUSDCMetadata,
      track.download_conditions
    )
  }

  if (isContentUSDCPurchaseGated(track.stream_conditions)) {
    track.stream_conditions = yield* call(
      getUSDCMetadata,
      track.stream_conditions
    )
    // If stream_conditions are set, download_conditions should always match
    track.download_conditions = yield* call(
      getUSDCMetadata,
      track.stream_conditions
    )
  }

  return track
}
