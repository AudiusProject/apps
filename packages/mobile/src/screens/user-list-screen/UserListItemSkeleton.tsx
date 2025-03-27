import { css } from '@emotion/native'

import { Flex, useTheme } from '@audius/harmony-native'
import { StaticSkeleton } from 'app/components/skeleton'

type Props = {
  tag: string
  height?: number
}

const profileStyle = css({ height: 74, width: 74, borderRadius: 74 })

export const UserListItemSkeleton = (props: Props) => {
  const { tag } = props
  const isSupporterTile = ['SUPPORTING', 'TOP SUPPORTERS'].includes(tag)
  const itemHeight = isSupporterTile ? 171 : 154
  const { cornerRadius } = useTheme()

  return (
    <Flex direction='column' p='l' gap='s' h={itemHeight}>
      <Flex gap='s' direction='row'>
        <StaticSkeleton style={profileStyle} />
        <Flex direction='column' gap='m' flex={1}>
          <Flex direction='column' gap='s'>
            <StaticSkeleton width={100} height={16} />
            <StaticSkeleton width={100} height={16} />
          </Flex>
          <StaticSkeleton width={200} height={18} />
          {isSupporterTile ? (
            <Flex direction='row' justifyContent='space-between'>
              <StaticSkeleton width={100} height={18} />
              <StaticSkeleton width={100} height={18} />
            </Flex>
          ) : null}
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
