import type { ReactNode } from 'react'

import type {
  ID,
  SearchUser,
  SearchTrack,
  Track,
  User,
  AccessConditions
} from '@audius/common/models'
import type { PurchaseableContentType } from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import type { TextStyle } from 'react-native'

import type { ImageProps } from '@audius/harmony-native'
import type { GestureResponderHandler } from 'app/types/gesture'

export type DetailsTileDetail = {
  icon?: ReactNode
  isHidden?: boolean
  label: string
  value: ReactNode

  valueStyle?: TextStyle
}

export type DetailsTileProps = {
  contentId?: ID

  contentType: PurchaseableContentType

  coSign?: Track['_co_sign']

  descriptionLinkPressSource: 'track page' | 'collection page'

  description?: string

  hasReposted?: boolean

  hasSaved?: boolean

  hasStreamAccess?: boolean

  streamConditions?: Nullable<AccessConditions>

  headerText?: string

  hideFavorite?: boolean

  hideFavoriteCount?: boolean

  hidePlayCount?: boolean

  hideOverflow?: boolean

  hideRepost?: boolean

  hideRepostCount?: boolean

  hideShare?: boolean

  hideActions?: boolean

  isPlaying?: boolean

  isPreviewing?: boolean

  isPlayable?: boolean

  isCollection?: boolean

  isPublished?: boolean

  isUnlisted?: boolean

  isDeleted?: boolean

  onPressEdit?: GestureResponderHandler

  onPressFavorites?: GestureResponderHandler

  onPressOverflow?: GestureResponderHandler

  onPressPlay: GestureResponderHandler

  onPressPreview?: GestureResponderHandler

  onPressPublish?: GestureResponderHandler

  onPressRepost?: GestureResponderHandler

  onPressReposts?: GestureResponderHandler

  onPressSave?: GestureResponderHandler

  onPressShare?: GestureResponderHandler

  playCount?: number

  duration?: number

  renderBottomContent?: () => ReactNode

  renderImage: (props: ImageProps) => ReactNode

  repostCount?: number

  saveCount?: number

  trackCount?: number

  title: string

  user?: User | SearchUser

  track?: Track | SearchTrack

  ddexApp?: string | null

  releaseDate?: Nullable<string>

  updatedAt?: string
}
