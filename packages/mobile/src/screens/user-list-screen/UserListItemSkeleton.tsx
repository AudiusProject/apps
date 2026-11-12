import { css } from '@emotion/native'

import { Flex, useTheme } from '@audius/harmony-native'
import { StaticSkeleton } from 'app/components/skeleton'

import { USER_LIST_AVATAR_SIZE } from './constants'

type Props = {
  tag: string
}

const avatarStyle = css({
  height: USER_LIST_AVATAR_SIZE,
  width: USER_LIST_AVATAR_SIZE,
  borderRadius: USER_LIST_AVATAR_SIZE / 2
})

export const UserListItemSkeleton = (_props: Props) => {
  const { cornerRadius } = useTheme()

  return (
    <Flex row alignItems='center' gap='m' ph='l' pv='m'>
      <StaticSkeleton style={avatarStyle} />
      <Flex flex={1} gap='s'>
        <StaticSkeleton width={120} height={14} />
        <StaticSkeleton width={170} height={12} />
      </Flex>
      <StaticSkeleton
        width={72}
        height={28}
        style={css({ borderRadius: cornerRadius['2xl'] })}
      />
    </Flex>
  )
}
