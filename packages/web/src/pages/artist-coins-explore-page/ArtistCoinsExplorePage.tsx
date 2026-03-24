import { useCallback, useState, ChangeEvent } from 'react'

import { useCurrentAccountUser, useArtistCreatedCoin } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { walletMessages } from '@audius/common/messages'
import { FeatureFlags } from '@audius/common/services'
import { COINS_CREATE_PAGE } from '@audius/common/src/utils/route'
import {
  Box,
  Button,
  Flex,
  IconButton,
  IconClose,
  IconVerified,
  Paper,
  Text,
  TextInput,
  TextInputSize,
  IconSearch,
  Tooltip,
  useTheme
} from '@audius/harmony'
import { useNavigate } from 'react-router'

import imageCoinsBackgroundImage from 'assets/img/imageCoinsBackgroundImage2x.webp'
import Page from 'components/page/Page'
import { isMobile } from 'utils/clientUtil'
import zIndex from 'utils/zIndex'

import { ArtistCoinsTable } from '../artist-coins-launchpad-page/components/ArtistCoinsTable'

import { MobileArtistCoinsExplorePage } from './MobileArtistCoinsExplorePage'

const SEARCH_WIDTH = 400
const MIN_WIDTH = 620

const LAUNCH_BANNER_DISMISSED_KEY = 'audius:fan-clubs-launch-banner-dismissed'

const readLaunchBannerDismissed = () => {
  if (typeof window === 'undefined') {
    return false
  }
  return window.localStorage.getItem(LAUNCH_BANNER_DISMISSED_KEY) === '1'
}

const messages = {
  searchPlaceholder: 'Search',
  getStarted: 'Get Started',
  launchYourOwn: 'Launch Your Own Fan Club!',
  launchYourClubFallback: 'Launch your club',
  required: 'Required',
  getStartedTooltip: 'Verified users only. Request verification in settings.',
  dismissBanner: 'Dismiss'
}

// Desktop version
const DesktopArtistCoinsExplorePage = () => {
  const navigate = useNavigate()
  const { motion, spacing } = useTheme()
  const [searchValue, setSearchValue] = useState('')
  const [isLaunchBannerDismissed, setIsLaunchBannerDismissed] = useState(
    readLaunchBannerDismissed
  )
  const { data: currentUser } = useCurrentAccountUser()
  const { data: createdCoin, isPending: isLoadingCreatedCoin } =
    useArtistCreatedCoin(currentUser?.user_id)

  const { isEnabled: isLaunchpadVerificationEnabled } = useFeatureFlag(
    FeatureFlags.LAUNCHPAD_VERIFICATION
  )
  const hasExistingArtistCoin = !!createdCoin

  const handleGetStarted = useCallback(() => {
    navigate(COINS_CREATE_PAGE)
  }, [navigate])

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value)
  }, [])

  const handleDismissLaunchBanner = useCallback(() => {
    setIsLaunchBannerDismissed(true)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LAUNCH_BANNER_DISMISSED_KEY, '1')
    }
  }, [])

  const shouldShowLaunchCta =
    (!hasExistingArtistCoin && !isLoadingCreatedCoin) ||
    !isLaunchpadVerificationEnabled

  const launchCtaReserveY = shouldShowLaunchCta
    ? spacing.xl +
      (isLaunchBannerDismissed
        ? spacing.unit22
        : spacing['5xl'] + spacing['3xl'])
    : 0

  return (
    <Page
      title={walletMessages.artistCoins.title}
      css={{ minWidth: MIN_WIDTH }}
    >
      <Flex column gap='xl' css={{ paddingBottom: launchCtaReserveY }}>
        <Flex
          p='3xl'
          direction='column'
          alignItems='center'
          justifyContent='center'
          gap='xl'
          w='100%'
          borderRadius='m'
          css={{
            backgroundImage: `url(${imageCoinsBackgroundImage})`,
            backgroundSize: 'cover, cover',
            backgroundPosition: '0% 0%, 50% 50%',
            backgroundRepeat: 'no-repeat, no-repeat',
            boxShadow:
              '0px 0px 4px 0px rgba(0, 0, 0, 0.04), 0px 4px 8px 0px rgba(0, 0, 0, 0.06)'
          }}
        >
          <Text variant='display' size='s' color='staticWhite'>
            {walletMessages.artistCoins.title}
          </Text>

          <Box w='100%' css={{ maxWidth: SEARCH_WIDTH }}>
            <TextInput
              label={messages.searchPlaceholder}
              placeholder={messages.searchPlaceholder}
              value={searchValue}
              onChange={handleSearchChange}
              startIcon={IconSearch}
              size={TextInputSize.SMALL}
            />
          </Box>
        </Flex>

        <ArtistCoinsTable searchQuery={searchValue} />
      </Flex>

      {shouldShowLaunchCta ? (
        <Box
          css={{
            position: 'fixed',
            bottom: 'calc(var(--play-bar-height) + 24px)',
            left: 'calc(var(--nav-width) + 48px)',
            right: 48,
            zIndex: zIndex.NAVIGATOR_POPUP
          }}
        >
          {isLaunchBannerDismissed ? (
            <Flex
              ph='xl'
              pv='m'
              justifyContent='flex-start'
              backgroundColor='white'
              border='strong'
              borderRadius='m'
            >
              <Button
                onClick={handleGetStarted}
                variant='secondary'
                color='coinGradient'
              >
                {messages.launchYourClubFallback}
              </Button>
            </Flex>
          ) : (
            <Paper
              border='strong'
              borderRadius='m'
              shadow='mid'
              w='100%'
              css={{
                position: 'relative',
                overflow: 'hidden',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                transition: `opacity ${motion.expressive}`
              }}
            >
              <IconButton
                size='s'
                color='subdued'
                icon={IconClose}
                onClick={handleDismissLaunchBanner}
                aria-label={messages.dismissBanner}
                css={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  zIndex: 1
                }}
              />
              <Flex
                ph='xl'
                pv='l'
                pr='3xl'
                gap='l'
                alignItems='center'
                justifyContent='space-between'
                w='100%'
                css={{
                  flexWrap: 'wrap',
                  rowGap: 16,
                  columnGap: 24
                }}
              >
                <Flex column gap='s' css={{ flex: '1 1 240px', minWidth: 0 }}>
                  <Text variant='heading' size='m'>
                    {messages.launchYourOwn}
                  </Text>
                  <Tooltip text={messages.getStartedTooltip} placement='top'>
                    <Flex
                      alignItems='center'
                      gap='s'
                      border='strong'
                      borderRadius='m'
                      backgroundColor='white'
                      css={{ alignSelf: 'flex-start', overflow: 'hidden' }}
                    >
                      <Flex ph='s' pv='xs'>
                        <Text variant='body' size='s'>
                          {messages.required}
                        </Text>
                      </Flex>
                      <Flex
                        ph='s'
                        pv='xs'
                        backgroundColor='surface2'
                        borderLeft='strong'
                      >
                        <IconVerified size='s' />
                      </Flex>
                    </Flex>
                  </Tooltip>
                </Flex>
                <Box
                  css={{
                    flex: '1 1 200px',
                    minWidth: 0,
                    display: 'flex',
                    justifyContent: 'flex-end'
                  }}
                >
                  <Button
                    onClick={handleGetStarted}
                    fullWidth
                    css={{ maxWidth: 360 }}
                    color='coinGradient'
                  >
                    {messages.getStarted}
                  </Button>
                </Box>
              </Flex>
            </Paper>
          )}
        </Box>
      ) : null}
    </Page>
  )
}

// Main component that conditionally renders desktop or mobile version
export const ArtistCoinsExplorePage = () => {
  return isMobile() ? (
    <MobileArtistCoinsExplorePage />
  ) : (
    <DesktopArtistCoinsExplorePage />
  )
}
