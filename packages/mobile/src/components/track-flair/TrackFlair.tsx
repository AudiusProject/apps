import type { ReactNode } from 'react'

import { useRemixContest, useTrack } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import type { ID } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import type { StyleProp, ViewStyle } from 'react-native'
import { View } from 'react-native'

import { IconCosign, IconContestSign } from '@audius/harmony-native'

import { Size } from './types'

type CoSignProps = {
  size: Size
  children: ReactNode
  style?: StyleProp<ViewStyle>
  trackId: ID
}

const layoutBySize = {
  [Size.TINY]: {
    position: {
      bottom: 2,
      right: -2
    },
    size: {
      height: 10,
      width: 10
    }
  },
  [Size.SMALL]: {
    position: {
      bottom: -4,
      right: -5
    },
    size: {
      height: 16,
      width: 16
    }
  },
  [Size.MEDIUM]: {
    position: {
      bottom: -3,
      right: -3
    },
    size: {
      height: 24,
      width: 24
    }
  },
  [Size.LARGE]: {
    position: {
      bottom: -8,
      right: -8
    },
    size: {
      height: 32,
      width: 32
    }
  },
  [Size.XLARGE]: {
    position: {
      bottom: -7,
      right: -7
    },
    size: {
      height: 44,
      width: 44
    }
  }
}

export const TrackFlair = ({ size, children, style, trackId }: CoSignProps) => {
  const { data: isCosign } = useTrack(trackId, {
    select: (track) => {
      const remixTrack = track.remix_of?.tracks[0]
      return (
        remixTrack?.has_remix_author_reposted ||
        remixTrack?.has_remix_author_saved
      )
    }
  })
  const { data: remixContest } = useRemixContest(trackId)
  // When CONTESTS is on, the contest experience moved to its own screen
  // and the trophy flair on the artwork is an orphaned indicator on what
  // should be a clean tile (Figma 2888-16639).
  const { isEnabled: isContestsEnabled } = useFeatureFlag(FeatureFlags.CONTESTS)

  const { size: iconSize, position } = layoutBySize[size]

  const FlairIcon = isCosign
    ? IconCosign
    : remixContest?.endDate && !isContestsEnabled
      ? IconContestSign
      : null

  return (
    <View style={style}>
      <View>{children}</View>
      {FlairIcon ? (
        <FlairIcon
          {...iconSize}
          style={[{ position: 'absolute' }, position]}
          color='active'
          colorSecondary='white'
        />
      ) : null}
    </View>
  )
}
