import { reachabilitySelectors } from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import LottieView from 'lottie-react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { View } from 'react-native'
import { useSelector } from 'react-redux'

import type { IconSize } from '@audius/harmony-native'
import {
  IconCloudDownloadError,
  IconCloudDownloadInactive,
  IconCloudDownloadQueued,
  IconCloudDownload,
  useTheme
} from '@audius/harmony-native'
import { OfflineDownloadStatus } from 'app/store/offline-downloads/slice'

import iconDownloading from './iconDownloading.lottie'

const { getIsReachable } = reachabilitySelectors

export type DownloadStatusIndicatorProps = {
  status: Nullable<OfflineDownloadStatus>
  size?: IconSize
  style?: StyleProp<ViewStyle>
}

export const DownloadStatusIndicator = (
  props: DownloadStatusIndicatorProps
) => {
  const { status, size = 'l', style } = props
  const isReachable = useSelector(getIsReachable)
  const { color, iconSizes } = useTheme()

  const renderIndicator = () => {
    if (!isReachable && status !== OfflineDownloadStatus.INACTIVE) {
      return <IconCloudDownload color='accent' size={size} />
    }
    switch (status) {
      case OfflineDownloadStatus.INIT:
        return <IconCloudDownloadQueued color='subdued' size={size} />
      case OfflineDownloadStatus.LOADING:
        return (
          <LottieView
            style={{ height: iconSizes[size], width: iconSizes[size] }}
            source={iconDownloading}
            colorFilters={[
              { keypath: 'Arrow.Fill 1', color: color.secondary.secondary },
              {
                keypath: 'Stroke 2.Stroke 1',
                color: color.secondary.secondary
              },
              { keypath: 'Stroke.Stroke 1', color: color.neutral.neutral }
            ]}
            autoPlay
            loop
          />
        )
      case OfflineDownloadStatus.SUCCESS:
        return <IconCloudDownload color='accent' size={size} />
      case OfflineDownloadStatus.ERROR:
      case OfflineDownloadStatus.ABANDONED:
        return <IconCloudDownloadError color='accent' size={size} />
      case OfflineDownloadStatus.INACTIVE:
        return <IconCloudDownloadInactive color='subdued' size={size} />
      default:
        return null
    }
  }

  const indicator = renderIndicator()
  if (!indicator) return null
  return <View style={style}>{indicator}</View>
}
