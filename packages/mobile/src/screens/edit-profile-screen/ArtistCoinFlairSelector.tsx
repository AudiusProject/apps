import { useCallback } from 'react'

import { useArtistCoin } from '@audius/common/api'
import { useField } from 'formik'
import { Image, Pressable } from 'react-native'

import {
  Box,
  Flex,
  HexagonalIcon,
  IconCaretDown,
  Skeleton,
  Text,
  useTheme
} from '@audius/harmony-native'

const ICON_SIZE = 18

type ArtistCoinFlairSelectorProps = {
  name: string
}

export const ArtistCoinFlairSelector = ({
  name
}: ArtistCoinFlairSelectorProps) => {
  const [{ value }] = useField<string | null>(name)
  const { color, spacing } = useTheme()

  const { data: coinData, isPending: isLoading } = useArtistCoin(value ?? '', {
    enabled: !!value
  })

  const handlePress = useCallback(() => {
    // TODO: Open artist coin selection modal/drawer
    console.log('Open artist coin selection')
  }, [])

  if (!value) {
    return (
      <Pressable onPress={handlePress}>
        <Flex
          direction='row'
          alignItems='center'
          justifyContent='space-between'
          gap='s'
          ph='m'
          pv='s'
          borderRadius='s'
          border='strong'
          backgroundColor='white'
          style={{ height: spacing['4xl'] }}
        >
          <Text variant='body' size='m' color='subdued'>
            Select an artist coin
          </Text>
          <IconCaretDown size='s' color='subdued' />
        </Flex>
      </Pressable>
    )
  }

  return (
    <Pressable onPress={handlePress}>
      <Flex
        direction='row'
        alignItems='center'
        justifyContent='space-between'
        gap='s'
        ph='m'
        pv='s'
        borderRadius='s'
        border='strong'
        backgroundColor='white'
        style={{ height: spacing['4xl'] }}
      >
        {isLoading ? (
          <Flex direction='row' alignItems='center' gap='s' flex={1}>
            <Box w={ICON_SIZE} h={ICON_SIZE}>
              <Skeleton />
            </Box>
            <Flex column gap='xs' flex={1}>
              <Box w={140} h={18}>
                <Skeleton />
              </Box>
              <Box w={60} h={14}>
                <Skeleton />
              </Box>
            </Flex>
          </Flex>
        ) : (
          <Flex direction='row' alignItems='center' gap='s' flex={1}>
            <HexagonalIcon size={ICON_SIZE}>
              {coinData?.logoUri ? (
                <Image
                  source={{ uri: coinData.logoUri }}
                  style={{ width: ICON_SIZE, height: ICON_SIZE }}
                />
              ) : null}
            </HexagonalIcon>
            <Flex column justifyContent='center' flex={1}>
              <Text
                variant='title'
                size='l'
                color='default'
                numberOfLines={1}
                ellipsizeMode='tail'
              >
                {coinData?.artistName ?? 'Unknown Artist'}
              </Text>
              <Text variant='label' size='l' color='subdued'>
                ${coinData?.ticker?.toUpperCase() ?? ''}
              </Text>
            </Flex>
          </Flex>
        )}
        <IconCaretDown size='s' color='subdued' />
      </Flex>
    </Pressable>
  )
}
