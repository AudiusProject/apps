import { Flex, Skeleton } from '@audius/harmony'

export const UserListItemSkeleton = () => {
  return (
    <Flex
      direction='row'
      alignItems='center'
      justifyContent='space-between'
      p='m'
      w='100%'
      h={97}
    >
      <Flex direction='row' gap='s' flex={1}>
        <Skeleton w={74} h={74} borderRadius='circle' />
        <Flex direction='column' gap='m' flex={1}>
          <Flex direction='column' gap='s'>
            <Skeleton w={100} h={16} noShimmer />
            <Skeleton w={100} h={16} noShimmer />
          </Flex>
          <Skeleton w={200} h={18} noShimmer />
        </Flex>
      </Flex>
      <Flex alignItems='center'>
        <Skeleton w={80} h={32} borderRadius='l' noShimmer />
      </Flex>
    </Flex>
  )
}
