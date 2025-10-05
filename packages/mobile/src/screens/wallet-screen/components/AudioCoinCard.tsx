import { useCallback } from 'react'

import { useFormattedAudioBalance } from '@audius/common/hooks'
import { AUDIO_TICKER, TOKEN_LISTING_MAP } from '@audius/common/store'
import { TouchableOpacity } from 'react-native-gesture-handler'

import {
  Box,
  Flex,
  HexagonalIcon,
  IconTokenAUDIO,
  Skeleton,
  spacing,
  Text
} from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

const ICON_SIZE = 64

export const AudioCoinCardSkeleton = () => {
  return (
    <Flex column gap='xs'>
      <Box w={240} h={36}>
        <Skeleton />
      </Box>
      <Box w={140} h={24}>
        <Skeleton />
      </Box>
    </Flex>
  )
}

export const AudioHexagonalSkeleton = () => {
  return (
    <HexagonalIcon size={ICON_SIZE}>
      <Box w={ICON_SIZE} h={ICON_SIZE}>
        <Skeleton />
      </Box>
    </HexagonalIcon>
  )
}

export const AudioCoinCard = () => {
  const navigation = useNavigation()

  const {
    audioBalanceFormatted,
    isAudioBalanceLoading,
    isAudioPriceLoading,
    formattedHeldValue
  } = useFormattedAudioBalance()

  const onPress = useCallback(() => {
    navigation.navigate('AudioScreen')
  }, [navigation])

  const isLoading = isAudioBalanceLoading || isAudioPriceLoading

  return (
    <TouchableOpacity onPress={onPress}>
      <Flex
        p='l'
        pl='xl'
        row
        justifyContent='space-between'
        alignItems='center'
      >
        <Flex row alignItems='center' gap='l' style={{ flexShrink: 1 }}>
          {isLoading ? <AudioHexagonalSkeleton /> : <IconTokenAUDIO />}
          <Flex column gap='xs'>
            {isLoading ? (
              <AudioCoinCardSkeleton />
            ) : (
              <>
                <Text
                  variant='heading'
                  size='s'
                  numberOfLines={1}
                  ellipsizeMode='tail'
                >
                  {TOKEN_LISTING_MAP.AUDIO.name}
                </Text>
                <Flex
                  row
                  alignItems='center'
                  gap='xs'
                  style={{ maxWidth: '100%' }}
                >
                  <Text variant='title' size='l'>
                    {audioBalanceFormatted}
                  </Text>
                  <Text
                    variant='title'
                    size='l'
                    color='subdued'
                    numberOfLines={1}
                    ellipsizeMode='tail'
                    style={{ flexShrink: 1 }}
                  >
                    ${AUDIO_TICKER}
                  </Text>
                </Flex>
              </>
            )}
          </Flex>
        </Flex>
        <Flex row alignItems='center' gap='m' ml={spacing.unit22}>
          {!isLoading ? (
            <Text variant='title' size='l' color='default'>
              {formattedHeldValue}
            </Text>
          ) : null}
        </Flex>
      </Flex>
    </TouchableOpacity>
  )
}
