import {
  Divider,
  Flex,
  IconHeart,
  IconRepost,
  IconShare,
  Paper
} from '@audius/harmony-native'
import Skeleton from 'app/components/skeleton'

interface LineupTileSkeletonProps {
  noShimmer?: boolean
}

export const LineupTileSkeleton = ({ noShimmer }: LineupTileSkeletonProps) => {
  return (
    <Paper>
      <Flex flex={1} justifyContent='space-between'>
        <Flex direction='row' alignItems='center' p='s' gap='s'>
          <Skeleton height={72} width={72} noShimmer={noShimmer} />
          <Flex gap='s' flex={1}>
            <Skeleton width='80%' height={20} noShimmer={noShimmer} />
            <Skeleton width='60%' height={20} noShimmer={noShimmer} />
          </Flex>
        </Flex>
        <Divider mh='s' pt='l' />
        <Flex row gap='2xl' p='s'>
          <IconRepost color='disabled' />
          <IconHeart color='disabled' />
          <IconShare color='disabled' />
        </Flex>
      </Flex>
    </Paper>
  )
}
