import { Flex, Skeleton, Divider } from '@audius/harmony'
import { useTheme } from '@emotion/react'

export const SendTokensConfirmationSkeleton = () => {
  const { typography, cornerRadius, spacing } = useTheme()

  return (
    <Flex column gap='xl' p='xl'>
      {/* Segmented Control Skeleton */}
      <Flex
        css={{
          borderRadius: '6px', // Non-standard radius, keep as pixel value
          backgroundColor: 'transparent',
          padding: '3px', // Non-standard spacing, keep as pixel value
          gap: '3.5px', // Non-standard gap, keep as pixel value
        }}
        alignItems='center'
      >
        <Skeleton
          w='100%'
          h='36px'
          css={{ borderRadius: cornerRadius.s, flex: 1 }}
        />
        <Skeleton
          w='100%'
          h='36px'
          css={{ borderRadius: cornerRadius.s, flex: 1 }}
        />
      </Flex>

      {/* Please Review Text Skeleton */}
      <Skeleton w='80%' h={typography.lineHeight.s} />

      <Divider orientation='horizontal' />

      {/* Sending Section Skeleton */}
      <Flex column gap='l'>
        <Skeleton w='60px' h={typography.lineHeight.s} />
        <Flex alignItems='center' gap='s'>
          <Skeleton w='4xl' h='4xl' css={{ borderRadius: cornerRadius.m }} />
          <Flex direction='column' gap='xs' flex={1}>
            <Skeleton w='120px' h={typography.lineHeight.s} />
            <Flex gap='xs' alignItems='center'>
              <Skeleton w='80px' h={typography.lineHeight.l} />
              <Skeleton w='60px' h={typography.lineHeight.l} />
            </Flex>
          </Flex>
        </Flex>
      </Flex>

      <Divider orientation='horizontal' />

      {/* Recipient Section Skeleton */}
      <Flex column gap='l'>
        <Skeleton w='100px' h={typography.lineHeight.s} />
        <Flex alignItems='center' gap='s'>
          <Skeleton w='4xl' h='4xl' css={{ borderRadius: '50%' }} />
          <Flex direction='column' flex={1} gap='xs'>
            <Skeleton w='140px' h={typography.lineHeight.s} />
            <Skeleton w='100px' h={typography.lineHeight.l} />
          </Flex>
        </Flex>
      </Flex>

      {/* Action Buttons Skeleton */}
      <Flex gap='s' row>
        <Skeleton
          w='100%'
          h={spacing.unit12}
          css={{ borderRadius: cornerRadius.m }}
        />
        <Skeleton
          w='100%'
          h={spacing.unit12}
          css={{ borderRadius: cornerRadius.m }}
        />
      </Flex>
    </Flex>
  )
}
