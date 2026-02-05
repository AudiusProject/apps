import { css } from '@emotion/native'

import { Flex, useTheme } from '@audius/harmony-native'
import { StaticSkeleton } from 'app/components/skeleton'

type Props = {
  tag: string
  height?: number
}

const profileStyle = css({ height: 74, width: 74, borderRadius: 74 })

export const UserListItemSkeleton = (_props: Props) => {
  const { cornerRadius } = useTheme()

  return (
    <Flex direction='column' p='l' gap='s' h={154}>
      <Flex gap='s' direction='row'>
        <StaticSkeleton style={profileStyle} />
        <Flex direction='column' gap='m' flex={1}>
          <Flex direction='column' gap='s'>
            <StaticSkeleton width={100} height={16} />
            <StaticSkeleton width={100} height={16} />
          </Flex>
          <StaticSkeleton width={200} height={18} />
        </Flex>
      </Flex>
      <StaticSkeleton
        width='100%'
        height={32}
        style={css({ borderRadius: cornerRadius.xl })}
      />
    </Flex>
  )
}
