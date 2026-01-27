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

export const SendTokensInputSkeleton = () => {
  const { typography, cornerRadius, spacing } = useTheme()

  return (
    <Flex direction='column' gap='xl' p='xl'>
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

      {/* Current Wallet Banner Skeleton */}
      <Skeleton w='100%' h='48px' css={{ borderRadius: cornerRadius.m }} />

      <Divider orientation='horizontal' />

      {/* Sending Section Skeleton */}
      <Flex direction='column' gap='m'>
        <Skeleton w='80px' h={typography.lineHeight.l} />
        <Flex alignItems='center' gap='s'>
          <Skeleton w='100%' h='64px' css={{ borderRadius: cornerRadius.m }} />
          <Skeleton w='60px' h='64px' css={{ borderRadius: cornerRadius.m }} />
        </Flex>
      </Flex>

      <Divider orientation='horizontal' />

      {/* Recipient Section Skeleton */}
      <Flex direction='column' gap='m'>
        <Flex direction='column' gap='xs'>
          <Skeleton w='120px' h={typography.lineHeight.s} />
          <Skeleton w='80%' h={typography.lineHeight.s} />
        </Flex>
        <Skeleton w='100%' h='48px' css={{ borderRadius: cornerRadius.m }} />
      </Flex>

      {/* Terms Text Skeleton */}
      <Skeleton w='90%' h={typography.lineHeight.s} />

      {/* Continue Button Skeleton */}
      <Skeleton
        w='100%'
        h={spacing.unit12}
        css={{ borderRadius: cornerRadius.m }}
      />
    </Flex>
  )
}

export const SendTokensSuccessSkeleton = () => {
  const { typography, cornerRadius, spacing } = useTheme()

  return (
    <Flex direction='column' gap='xl' p='xl'>
      {/* Token Balance Section Skeleton */}
      <Flex alignItems='center' gap='s'>
        <Skeleton w='4xl' h='4xl' css={{ borderRadius: cornerRadius.m }} />
        <Flex direction='column' gap='xs' flex={1}>
          <Skeleton w='120px' h={typography.lineHeight.s} />
          <Skeleton w='100px' h={typography.lineHeight.l} />
        </Flex>
      </Flex>

      <Divider orientation='horizontal' />

      {/* Sent Section Skeleton */}
      <Flex column gap='s'>
        <Skeleton w='60px' h={typography.lineHeight.s} />
        <Flex direction='column' gap='xs'>
          <Skeleton w='120px' h={typography.lineHeight.m} />
          <Skeleton w='100px' h={typography.lineHeight.s} />
        </Flex>
      </Flex>

      <Divider orientation='horizontal' />

      {/* Recipient Section Skeleton */}
      <Flex direction='column' gap='s'>
        <Skeleton w='80px' h={typography.lineHeight.s} />
        <Flex alignItems='center' gap='s'>
          <Skeleton w='32px' h='32px' css={{ borderRadius: '50%' }} />
          <Flex direction='column' flex={1} gap='xs'>
            <Skeleton w='140px' h={typography.lineHeight.m} />
            <Skeleton w='100px' h={typography.lineHeight.s} />
          </Flex>
        </Flex>
      </Flex>

      {/* View on Solana Link Skeleton */}
      <Skeleton w='200px' h={typography.lineHeight.m} />

      {/* Completion Check Skeleton */}
      <Flex gap='s' alignItems='center'>
        <Skeleton w='24px' h='24px' css={{ borderRadius: '50%' }} />
        <Skeleton w='200px' h={typography.lineHeight.s} />
      </Flex>

      {/* Done Button Skeleton */}
      <Skeleton
        w='100%'
        h={spacing.unit12}
        css={{ borderRadius: cornerRadius.m }}
      />
    </Flex>
  )
}

export const SendTokensFailureSkeleton = () => {
  const { typography, cornerRadius, spacing } = useTheme()

  return (
    <Flex direction='column' gap='xl' p='xl'>
      {/* Token Balance Section Skeleton */}
      <Flex alignItems='center' gap='s'>
        <Skeleton w='4xl' h='4xl' css={{ borderRadius: cornerRadius.m }} />
        <Flex direction='column' gap='xs' flex={1}>
          <Skeleton w='120px' h={typography.lineHeight.s} />
          <Skeleton w='100px' h={typography.lineHeight.l} />
        </Flex>
      </Flex>

      <Divider orientation='horizontal' />

      {/* Failed Section Skeleton */}
      <Flex column gap='s'>
        <Skeleton w='60px' h={typography.lineHeight.s} />
        <Flex direction='column' gap='xs'>
          <Skeleton w='120px' h={typography.lineHeight.m} />
          <Skeleton w='100px' h={typography.lineHeight.s} />
        </Flex>
      </Flex>

      <Divider orientation='horizontal' />

      {/* Recipient Section Skeleton */}
      <Flex direction='column' gap='s'>
        <Skeleton w='80px' h={typography.lineHeight.s} />
        <Flex alignItems='center' gap='s'>
          <Skeleton w='32px' h='32px' css={{ borderRadius: '50%' }} />
          <Flex direction='column' flex={1} gap='xs'>
            <Skeleton w='140px' h={typography.lineHeight.m} />
            <Skeleton w='100px' h={typography.lineHeight.s} />
          </Flex>
        </Flex>
      </Flex>

      {/* Error Message Skeleton */}
      <Flex gap='s' alignItems='center'>
        <Skeleton w='24px' h='24px' css={{ borderRadius: '50%' }} />
        <Skeleton w='250px' h={typography.lineHeight.s} />
      </Flex>

      {/* Error Details Skeleton */}
      <Skeleton w='100%' h={typography.lineHeight.s} />

      {/* Action Buttons Skeleton */}
      <Flex gap='s' direction='row'>
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
