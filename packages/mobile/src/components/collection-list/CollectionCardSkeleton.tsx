import { Divider, Flex, Paper } from '@audius/harmony-native'

import { Skeleton } from '../skeleton'

export const CollectionCardSkeleton = () => {
  return (
    <Paper border='default'>
      <Flex p='s' gap='s' alignItems='center'>
        <Skeleton style={{ width: '100%', aspectRatio: 1 }} />
        <Skeleton height={20} width={150} style={{ marginBottom: 6 }} />
        <Skeleton height={18} width={100} style={{ marginBottom: 4 }} />
      </Flex>
      <Divider orientation='horizontal' />
      <Flex
        pv='s'
        backgroundColor='surface1'
        alignItems='center'
        borderBottomLeftRadius='m'
        borderBottomRightRadius='m'
      >
        <Skeleton height={16} width={100} />
      </Flex>
    </Paper>
  )
}
