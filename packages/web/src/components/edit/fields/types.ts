import {
  AccessConditions,
  DownloadTrackAvailabilityType,
  FieldVisibility,
  StemUpload,
  StreamTrackAvailabilityType
} from '@audius/common/models'
import { Nullable } from '@audius/common/utils'

export enum SpecialAccessType {
  FOLLOW = 'follow'
}

type GateKeeperField = 'accessAndSale' | 'stemsAndDownloads'
export type GateKeeper = {
  access: GateKeeperField // who last changed the access gates
  downloadable: GateKeeperField // who last changed the downloadability
}

export const STREAM_AVAILABILITY_TYPE = 'stream_availability_type'
export const IS_STREAM_GATED = 'is_stream_gated'
export const STREAM_CONDITIONS = 'stream_conditions'
export const PRICE = 'stream_conditions.usdc_purchase.price'
export const ALBUM_TRACK_PRICE =
  'stream_conditions.usdc_purchase.albumTrackPrice'
export const PRICE_HUMANIZED = 'price_humanized'
export const PREVIEW = 'preview_start_seconds'
export const DOWNLOAD_AVAILABILITY_TYPE = 'download_availability_type'
export const IS_DOWNLOADABLE = 'is_downloadable'
export const IS_ORIGINAL_AVAILABLE = 'is_original_available'
export const IS_DOWNLOAD_GATED = 'is_download_gated'
export const DOWNLOAD_CONDITIONS = 'download_conditions'
export const DOWNLOAD_PRICE = 'download_conditions.usdc_purchase.price'
export const DOWNLOAD_PRICE_HUMANIZED = 'download_price_humanized'
export const STEMS = 'stems'
export const SPECIAL_ACCESS_TYPE = 'special_access_type'
export const IS_UNLISTED = 'is_unlisted'
export const IS_PRIVATE = 'is_private'
export const FIELD_VISIBILITY = 'field_visibility'
export const IS_SCHEDULED_RELEASE = 'is_scheduled_release'
export const IS_OWNED_BY_USER = 'is_owned_by_user'

// whether Access & Sale or Stems & Downloads last set the stream / download conditions
export const LAST_GATE_KEEPER = 'last_gate_keeper'

export type AccessAndSaleFormValues = {
  [IS_UNLISTED]: boolean
  [STREAM_AVAILABILITY_TYPE]: StreamTrackAvailabilityType
  [STREAM_CONDITIONS]: Nullable<AccessConditions>
  [SPECIAL_ACCESS_TYPE]: Nullable<SpecialAccessType>
  [FIELD_VISIBILITY]: FieldVisibility
  [PRICE_HUMANIZED]: string
  [PREVIEW]?: number
}

export type StemsAndDownloadsFormValues = {
  [IS_DOWNLOADABLE]: boolean
  [IS_ORIGINAL_AVAILABLE]: boolean
  [STEMS]: StemUpload[]
  [IS_DOWNLOAD_GATED]: boolean
  [DOWNLOAD_CONDITIONS]: Nullable<AccessConditions>
  [STREAM_CONDITIONS]: Nullable<AccessConditions>
  [DOWNLOAD_AVAILABILITY_TYPE]: DownloadTrackAvailabilityType
  [IS_OWNED_BY_USER]: boolean
}
