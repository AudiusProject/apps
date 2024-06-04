import { Box, Divider, Flex, Paper } from '@audius/harmony-native'

import { Skeleton } from '../skeleton'

export const UserCardSkeleton = () => {
  return (
    <Paper border='default'>
      <Box p='m' pb='s'>
        <Skeleton
          style={{ width: '100%', aspectRatio: 1, borderRadius: 1000 }}
        />
      </Box>
      <Flex ph='l' pt='xs' pb='m' gap='xs' alignItems='center'>
        <Skeleton height={18} width={150} style={{ marginBottom: 6 }} />
        <Skeleton height={16} width={100} />
      </Flex>
      <Divider />
      <Flex
        pv='s'
        backgroundColor='surface1'
        alignItems='center'
        borderBottomLeftRadius='m'
        borderBottomRightRadius='m'
      >
        <Skeleton height={16} width={100} style={{ marginBottom: 2 }} />
      </Flex>
    </Paper>
  )
}
