import {
  Box,
  Flex,
  IconArrowLeft,
  IconButton,
  Paper,
  Skeleton
} from '@audius/harmony'
import { keyframes } from '@emotion/react'
import { useNavigate } from 'react-router'

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 }
})

/** Fades in when content replaces the loading skeleton. */
export const ContestFadeIn = ({ children }: { children: React.ReactNode }) => (
  <Box
    css={{
      animation: `${fadeIn} 0.35s ease-out both`
    }}
  >
    {children}
  </Box>
)

const DESKTOP_HERO = 288
const MOBILE_HERO = 220
const MAX_CONTENT_WIDTH = 1080
const RIGHT_COL = 360
const DESKTOP_TITLE_PLACEHOLDER = 400

// -----------------------------------------------------------------------------
// Desktop
// -----------------------------------------------------------------------------

export const ContestPageDesktopSkeleton = () => {
  return (
    <Box
      css={{
        maxWidth: MAX_CONTENT_WIDTH,
        margin: '0 auto',
        width: '100%'
      }}
      ph='2xl'
      pv='xl'
    >
      <Paper
        direction='column'
        borderRadius='l'
        border='default'
        shadow='flat'
        backgroundColor='white'
        css={{ overflow: 'hidden' }}
      >
        <Skeleton w='100%' h={DESKTOP_HERO} css={{ borderRadius: 0 }} />
        <Box p='xl'>
          <Flex justifyContent='space-between' alignItems='flex-start' gap='l'>
            <Flex direction='column' gap='m' css={{ flex: 1, maxWidth: 280 }}>
              <Skeleton h={10} w={120} borderRadius='s' />
              <Skeleton h={20} w={200} borderRadius='s' />
            </Flex>
            <Flex gap='s' alignItems='center'>
              <Skeleton h={32} w={100} borderRadius='s' />
              <Skeleton h={32} w={100} borderRadius='s' />
            </Flex>
          </Flex>
          <Box mt='l'>
            <Skeleton h={36} w={DESKTOP_TITLE_PLACEHOLDER} borderRadius='m' />
          </Box>
          <Box mv='l'>
            <Skeleton h={1} w='100%' borderRadius='s' />
          </Box>
          <Flex
            justifyContent='space-between'
            alignItems='center'
            gap='xl'
            wrap='wrap'
          >
            <Flex direction='column' gap='m'>
              <Skeleton h={10} w={80} borderRadius='s' />
              <Flex gap='m' alignItems='center'>
                <Skeleton
                  w={56}
                  h={56}
                  borderRadius='circle'
                  css={{ flexShrink: 0 }}
                />
                <Flex direction='column' gap='xs'>
                  <Skeleton h={18} w={140} borderRadius='s' />
                  <Skeleton h={14} w={100} borderRadius='s' />
                </Flex>
              </Flex>
            </Flex>
            <Flex gap='m' alignItems='center'>
              <Skeleton h={40} w={40} borderRadius='s' />
              <Skeleton h={40} w={40} borderRadius='s' />
              <Skeleton h={40} w={40} borderRadius='s' />
              <Skeleton h={40} w={40} borderRadius='s' />
            </Flex>
          </Flex>
        </Box>
      </Paper>

      <Box pt='xl' />

      <Flex gap='xl' alignItems='flex-start' wrap='wrap'>
        <Flex
          direction='column'
          gap='l'
          css={{ flex: '1 1 auto', minWidth: 0, flexBasis: 400 }}
        >
          <Paper
            direction='column'
            p='xl'
            gap='l'
            borderRadius='l'
            border='default'
            backgroundColor='white'
            shadow='flat'
          >
            <Skeleton h={10} w={160} borderRadius='s' />
            <Flex direction='column' gap='s'>
              <Skeleton h={12} w='100%' borderRadius='s' />
              <Skeleton h={12} w='100%' borderRadius='s' />
              <Skeleton h={12} w='90%' borderRadius='s' />
            </Flex>
          </Paper>
          <Paper
            direction='column'
            p='xl'
            gap='l'
            borderRadius='l'
            border='default'
            backgroundColor='white'
            shadow='flat'
          >
            <Skeleton h={10} w={64} borderRadius='s' />
            <Flex direction='column' gap='s'>
              <Skeleton h={12} w='100%' borderRadius='s' />
              <Skeleton h={12} w='70%' borderRadius='s' />
            </Flex>
          </Paper>
        </Flex>

        <Box
          css={{
            flex: `0 0 ${RIGHT_COL}px`,
            width: RIGHT_COL,
            minWidth: 0
          }}
        >
          <Flex direction='column' gap='l'>
            <Paper
              direction='column'
              p='l'
              gap='m'
              borderRadius='l'
              border='default'
              backgroundColor='white'
              shadow='flat'
            >
              <Skeleton h={10} w='50%' borderRadius='s' />
              <Skeleton h={12} w='100%' borderRadius='s' />
              <Skeleton h={12} w='100%' borderRadius='s' />
            </Paper>
            <Paper
              direction='column'
              p='l'
              gap='m'
              borderRadius='l'
              border='default'
              backgroundColor='white'
              shadow='flat'
            >
              <Skeleton h={10} w='40%' borderRadius='s' />
              <Flex gap='s'>
                <Skeleton
                  w={32}
                  h={32}
                  borderRadius='circle'
                  css={{ flexShrink: 0 }}
                />
                <Flex
                  direction='column'
                  gap='xs'
                  css={{ flex: 1, minWidth: 0 }}
                >
                  <Skeleton h={12} w='100%' borderRadius='s' />
                  <Skeleton h={10} w='60%' borderRadius='s' />
                </Flex>
              </Flex>
            </Paper>
          </Flex>
        </Box>
      </Flex>
    </Box>
  )
}

// -----------------------------------------------------------------------------
// Mobile web
// -----------------------------------------------------------------------------

type ContestPageMobileSkeletonProps = {
  onBack?: () => void
}

export const ContestPageMobileSkeleton = ({
  onBack
}: ContestPageMobileSkeletonProps) => {
  const navigate = useNavigate()
  const handleBack = onBack ?? (() => navigate(-1))
  return (
    <Box
      w='100%'
      pb='xl'
      css={(theme) => ({ backgroundColor: theme.color.background.white })}
    >
      <Box
        w='100%'
        h={MOBILE_HERO}
        css={{
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'var(--harmony-n-100)'
        }}
      >
        <Box
          css={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 2
          }}
        >
          <IconButton
            icon={IconArrowLeft}
            color='staticWhite'
            aria-label='Back'
            onClick={handleBack}
          />
        </Box>
        <Skeleton
          w='100%'
          h='100%'
          css={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            borderRadius: 0
          }}
        />
      </Box>
      <Box p='xl' css={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton h={32} w='85%' borderRadius='m' />
        <Flex gap='s' alignItems='center'>
          <Box css={{ flex: 1 }}>
            <Skeleton h={40} w='100%' borderRadius='m' />
          </Box>
          <Skeleton h={40} w={40} borderRadius='m' />
        </Flex>
        <Flex direction='column' gap='s'>
          <Skeleton h={10} w={120} borderRadius='s' />
          <Flex gap='s' alignItems='baseline' wrap='wrap'>
            <Skeleton h={16} w={180} borderRadius='s' />
            <Skeleton h={16} w={140} borderRadius='s' />
          </Flex>
        </Flex>
        <Flex alignItems='center' w='100%' gap='s'>
          <Flex flex={1} direction='column' alignItems='center' gap='2xs'>
            <Skeleton h={24} w={36} borderRadius='s' />
            <Skeleton h={8} w={28} borderRadius='s' />
          </Flex>
          <Box
            css={{
              width: 1,
              height: 40,
              backgroundColor: 'var(--harmony-n-200)'
            }}
          />
          <Flex flex={1} direction='column' alignItems='center' gap='2xs'>
            <Skeleton h={24} w={36} borderRadius='s' />
            <Skeleton h={8} w={40} borderRadius='s' />
          </Flex>
          <Box
            css={{
              width: 1,
              height: 40,
              backgroundColor: 'var(--harmony-n-200)'
            }}
          />
          <Flex flex={1} direction='column' alignItems='center' gap='2xs'>
            <Skeleton h={24} w={36} borderRadius='s' />
            <Skeleton h={8} w={32} borderRadius='s' />
          </Flex>
        </Flex>
        <Box
          css={{
            width: '100%',
            height: 1,
            backgroundColor: 'var(--harmony-n-200)'
          }}
        />
        <Flex direction='column' gap='s'>
          <Skeleton h={10} w={80} borderRadius='s' />
          <Flex gap='m' alignItems='center'>
            <Skeleton
              w={40}
              h={40}
              borderRadius='circle'
              css={{ flexShrink: 0 }}
            />
            <Flex direction='column' gap='xs'>
              <Skeleton h={16} w={120} borderRadius='s' />
              <Skeleton h={12} w={80} borderRadius='s' />
            </Flex>
          </Flex>
        </Flex>
        <Flex alignItems='center' justifyContent='space-around' w='100%' pt='s'>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} h={16} w={64} borderRadius='s' />
          ))}
        </Flex>
      </Box>
      <Box ph='xl' pb='2xl'>
        <Flex direction='column' gap='l' pt='l'>
          <Paper
            direction='column'
            p='l'
            gap='m'
            borderRadius='m'
            border='default'
            backgroundColor='white'
            shadow='flat'
          >
            <Skeleton h={10} w='55%' borderRadius='s' />
            <Flex direction='column' gap='s'>
              <Skeleton h={12} w='100%' borderRadius='s' />
              <Skeleton h={12} w='100%' borderRadius='s' />
              <Skeleton h={12} w='80%' borderRadius='s' />
            </Flex>
          </Paper>
          <Paper
            direction='column'
            p='l'
            gap='m'
            borderRadius='m'
            border='default'
            backgroundColor='white'
            shadow='flat'
          >
            <Skeleton h={10} w='30%' borderRadius='s' />
            <Skeleton h={12} w='100%' borderRadius='s' />
          </Paper>
        </Flex>
      </Box>
    </Box>
  )
}
