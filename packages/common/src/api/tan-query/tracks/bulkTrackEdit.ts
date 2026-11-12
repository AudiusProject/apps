import {
  isContentUSDCPurchaseGated,
  Track,
  USDCPurchaseConditions
} from '~/models/Track'
import { TrackMetadataForUpload } from '~/store/upload'

export const BULK_EDIT_MAX_TAGS = 10

export type BulkTrackEditPrice =
  | { type: 'premium'; priceCents: number }
  | { type: 'free' }

/** Fields left undefined are not changed. */
export type BulkTrackEdit = {
  genre?: string
  mood?: string
  tags?: { mode: 'add' | 'replace'; values: string[] }
  price?: BulkTrackEditPrice
}

export type BulkTrackEditPriceSkipReason = 'remix' | 'special_access'

type EditableTrack = Pick<
  Track,
  | 'genre'
  | 'mood'
  | 'tags'
  | 'remix_of'
  | 'is_stream_gated'
  | 'stream_conditions'
  | 'preview_start_seconds'
>

const splitTags = (tags: string | null | undefined) =>
  (tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

const mergeTags = (existing: string[], added: string[]) => {
  const seen = new Set(existing.map((tag) => tag.toLowerCase()))
  const merged = [...existing]
  for (const tag of added) {
    if (seen.has(tag.toLowerCase())) continue
    seen.add(tag.toLowerCase())
    merged.push(tag)
  }
  return merged.slice(0, BULK_EDIT_MAX_TAGS)
}

/**
 * Returns the metadata fields that differ once `edit` is applied to `track`.
 * `priceSkipReason` is set when the price change can't apply to this track;
 * the other fields are still returned.
 */
export const getBulkTrackEditChanges = (
  track: EditableTrack,
  edit: BulkTrackEdit
): {
  changes: Partial<TrackMetadataForUpload>
  priceSkipReason?: BulkTrackEditPriceSkipReason
} => {
  const changes: Partial<TrackMetadataForUpload> = {}
  let priceSkipReason: BulkTrackEditPriceSkipReason | undefined

  if (edit.genre && edit.genre !== track.genre) {
    changes.genre = edit.genre
  }

  if (edit.mood && edit.mood !== track.mood) {
    changes.mood = edit.mood
  }

  if (edit.tags) {
    const existing = splitTags(track.tags)
    const next =
      edit.tags.mode === 'replace'
        ? mergeTags([], edit.tags.values)
        : mergeTags(existing, edit.tags.values)
    if (next.join(',') !== existing.join(',')) {
      changes.tags = next.join(',')
    }
  }

  const currentConditions = track.stream_conditions
  const isPremium = isContentUSDCPurchaseGated(currentConditions)

  if (edit.price?.type === 'premium') {
    const { priceCents } = edit.price
    if (track.remix_of?.tracks?.length) {
      priceSkipReason = 'remix'
    } else if (
      !isPremium ||
      currentConditions.usdc_purchase.price !== priceCents
    ) {
      const albumTrackPrice = isPremium
        ? currentConditions.usdc_purchase.albumTrackPrice
        : undefined
      const conditions: USDCPurchaseConditions = {
        usdc_purchase: {
          price: priceCents,
          ...(albumTrackPrice != null && { albumTrackPrice })
        }
      }
      changes.is_stream_gated = true
      changes.stream_conditions = conditions
      changes.is_download_gated = true
      changes.download_conditions = conditions
      changes.is_downloadable = true
      changes.preview_start_seconds = track.preview_start_seconds ?? 0
    }
  } else if (edit.price?.type === 'free') {
    if (isPremium) {
      changes.is_stream_gated = false
      changes.stream_conditions = null
      changes.is_download_gated = false
      changes.download_conditions = null
      // Premium turns downloads on, so turn them back off with the price.
      changes.is_downloadable = false
    } else if (track.is_stream_gated) {
      priceSkipReason = 'special_access'
    }
  }

  return { changes, priceSkipReason }
}

export const hasBulkTrackEdit = (edit: BulkTrackEdit) =>
  !!edit.genre || !!edit.mood || !!edit.tags?.values.length || !!edit.price
