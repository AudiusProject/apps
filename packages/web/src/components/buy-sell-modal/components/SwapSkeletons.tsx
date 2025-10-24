import { Flex, Skeleton } from '@audius/harmony'
import { useTheme } from '@emotion/react'

export const SegmentedControlSkeleton = () => {
  const { color, cornerRadius } = useTheme()

  return (
    <Flex
      css={{
        borderRadius: '6px', // Non-standard radius, keep as pixel value
        backgroundColor: color.border.strong,
        padding: '3px', // Non-standard spacing, keep as pixel value
        gap: '3.5px', // Non-standard gap, keep as pixel value
        flex: 1
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
      <Skeleton
        w='100%'
        h='36px'
        css={{ borderRadius: cornerRadius.s, flex: 1 }}
      />
    </Flex>
  )
}

export const YouPaySkeleton = () => {
  const { typography } = useTheme()

  return (
    <Flex direction='column' gap='m'>
      <Flex justifyContent='space-between' alignItems='center'>
        <Skeleton w='80px' h={typography.lineHeight.l} />
        <Skeleton w='140px' h={typography.lineHeight.l} />
      </Flex>
      <Flex alignItems='center' gap='s'>
        <Skeleton w='100%' h='64px' />
        <Skeleton w='60px' h='64px' />
        <Skeleton w='48px' h='48px' />
      </Flex>
    </Flex>
  )
}

export const YouReceiveSkeleton = () => {
  const { typography } = useTheme()

  return (
    <Flex direction='column' gap='m'>
      <Skeleton w='120px' h={typography.lineHeight.l} />
      <Flex alignItems='center' gap='s'>
        <Skeleton w='100%' h='64px' />
        <Skeleton w='60px' h='64px' />
      </Flex>
    </Flex>
  )
}

export const ContinueButtonSkeleton = () => {
  const { cornerRadius, spacing } = useTheme()

  return (
    <Skeleton
      w='100%'
      h={spacing.unit12}
      css={{ borderRadius: cornerRadius.m }}
    />
  )
}

export const SwapFormSkeleton = () => (
  <Flex direction='column' gap='xl'>
    <SegmentedControlSkeleton />
    <YouPaySkeleton />
    <YouReceiveSkeleton />
    <ContinueButtonSkeleton />
  </Flex>
)

export const TabContentSkeleton = () => (
  <Flex direction='column' gap='xl'>
    <YouPaySkeleton />
    <YouReceiveSkeleton />
  </Flex>
)
