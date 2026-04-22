import { ReactNode } from 'react'

import {
  Box,
  Flex,
  Text,
  useTheme,
  IconCaretRight,
  Artwork
} from '@audius/harmony'
import { roundedHexClipPath } from '@audius/harmony/src/icons/SVGDefs'

import Skeleton from 'components/skeleton/Skeleton'

const CoinCardSkeleton = () => {
  return (
    <Flex direction='column' gap='xs'>
      <Skeleton width='240px' height='36px' />
      <Skeleton width='140px' height='24px' />
    </Flex>
  )
}

const HexagonSkeleton = () => {
  return (
    <Skeleton
      width='64px'
      height='64px'
      css={{
        clipPath: `url(#${roundedHexClipPath})`
      }}
    />
  )
}

export type CoinCardProps = {
  icon: string | ReactNode
  name: string
  symbol: string
  balance?: string
  heldValue?: string | null
  dollarValue: string
  loading?: boolean
  noDollarSignPrefix?: boolean
  onClick?: () => void
}

export const CoinRow = ({
  icon,
  name,
  symbol,
  balance,
  heldValue,
  dollarValue,
  loading = false,
  noDollarSignPrefix = false,
  onClick
}: CoinCardProps) => {
  const { color, spacing } = useTheme()

  const renderIcon = () => {
    if (typeof icon === 'string') {
      return (
        <Artwork
          src={icon}
          hex
          w={spacing.unit16}
          h={spacing.unit16}
          borderWidth={0}
        />
      )
    }
    return icon
  }

  return (
    <Flex
      alignItems='center'
      justifyContent='space-between'
      p='l'
      flex={1}
      onClick={onClick}
      css={{
        cursor: onClick ? 'pointer' : 'default',
        minWidth: 0,
        '&:hover': onClick ? { backgroundColor: color.background.surface2 } : {}
      }}
    >
      <Flex alignItems='center' gap='l' css={{ minWidth: 0, flex: 1 }}>
        {loading ? <HexagonSkeleton /> : renderIcon()}
        <Flex direction='column' gap='2xs' flex={1} css={{ minWidth: 0 }}>
          {loading ? (
            <CoinCardSkeleton />
          ) : (
            <>
              <Text variant='heading' size='s' css={{ wordWrap: 'break-word' }}>
                {name}
              </Text>
              <Flex gap='xs' alignItems='center' css={{ flexWrap: 'wrap' }}>
                {balance !== undefined ? (
                  <Text
                    variant='title'
                    size='l'
                    strength='weak'
                    css={{
                      wordWrap: 'break-word',
                      '@container wallet (max-width: 420px)': {
                        fontSize: 16
                      }
                    }}
                  >
                    {balance}
                  </Text>
                ) : null}
                <Text
                  variant='title'
                  size='l'
                  strength='weak'
                  color='subdued'
                  css={{
                    wordWrap: 'break-word',
                    '@container wallet (max-width: 420px)': {
                      fontSize: 16
                    }
                  }}
                >
                  {noDollarSignPrefix ? symbol : `$${symbol}`}
                </Text>
              </Flex>
              {/* Relocated heldValue — only shown in the left column at narrow widths */}
              <Box
                css={{
                  display: 'none',
                  '@container wallet (max-width: 420px)': {
                    display: 'block'
                  }
                }}
              >
                <Text
                  variant='title'
                  size='m'
                  strength='weak'
                  color='default'
                  css={{ wordWrap: 'break-word' }}
                >
                  {heldValue ?? dollarValue}
                </Text>
              </Box>
            </>
          )}
        </Flex>
      </Flex>
      <Flex alignItems='center' gap='m' css={{ flexShrink: 0 }}>
        <Box
          css={{
            '@container wallet (max-width: 420px)': { display: 'none' }
          }}
        >
          {!loading && (
            <Text variant='title' size='l' strength='weak' color='default'>
              {heldValue ?? dollarValue}
            </Text>
          )}
        </Box>
        {onClick ? <IconCaretRight size='l' color='subdued' /> : null}
      </Flex>
    </Flex>
  )
}
