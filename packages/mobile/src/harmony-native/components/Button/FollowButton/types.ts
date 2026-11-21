import type { ChangeEvent } from 'react'

import type { PressableProps } from 'react-native'

export type FollowButtonMessages = {
  follow?: string
  following?: string
  unfollow?: string
}

export type FollowButtonProps = {
  variant?: 'default' | 'pill'

  size?: 'default' | 'small'

  isFollowing?: boolean

  onFollow?: () => void

  onUnfollow?: () => void

  messages?: FollowButtonMessages

  value?: any
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
} & Pick<PressableProps, 'onPress' | 'disabled'>
