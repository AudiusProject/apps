import { useCallback, useState, ChangeEvent } from 'react'

import { useCurrentAccountUser, useArtistCreatedCoin } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { walletMessages } from '@audius/common/messages'
import { FeatureFlags } from '@audius/common/services'
import { COINS_CREATE_PAGE, clubPage } from '@audius/common/src/utils/route'
import { convertHexToRGBA } from '@audius/common/utils'
import {
  Box,
  Button,
  Flex,
  IconButton,
  IconClose,
  IconVerified,
  Paper,
  SelectablePill,
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

import {
  ArtistCoinsTable,
  FAN_CLUBS_VIEW_STORAGE_KEY,
  FanClubsViewMode,
  readInitialFanClubsViewMode
} from '../artist-coins-launchpad-page/components/ArtistCoinsTable'

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
  required: 'Verification Required',
  getStartedTooltip: 'Verified users only. Request verification in settings.',
  dismissBanner: 'Dismiss'
}

// Desktop version
const DesktopArtistCoinsExplorePage = () => {
  const navigate = useNavigate()
  const { motion, spacing, color } = useTheme()
  const [searchValue, setSearchValue] = useState('')
  const [isLaunchBannerDismissed, setIsLaunchBannerDismissed] = useState(
    readLaunchBannerDismissed
  )
  const [fanClubsViewMode, setFanClubsViewMode] = useState<FanClubsViewMode>(
    readInitialFanClubsViewMode
  )
  const { data: currentUser } = useCurrentAccountUser()
  const { data: createdCoin, isPending: isLoadingCreatedCoin } =
    useArtistCreatedCoin(currentUser?.user_id)

  const { isEnabled: isLaunchpadVerificationEnabled } = useFeatureFlag(
    FeatureFlags.LAUNCHPAD_VERIFICATION
  )
  const hasExistingArtistCoin = !!createdCoin
  const existingClubTicker = createdCoin?.ticker ?? null
  const canViewExistingClub =
    hasExistingArtistCoin &&
    existingClubTicker !== null &&
    existingClubTicker !== ''

  const handleGetStarted = useCallback(() => {
    navigate(COINS_CREATE_PAGE)
  }, [navigate])

  const handleHeaderClubCta = useCallback(() => {
    if (canViewExistingClub) {
      navigate(clubPage(existingClubTicker))
      return
    }
    navigate(COINS_CREATE_PAGE)
  }, [canViewExistingClub, existingClubTicker, navigate])

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value)
  }, [])

  const handleDismissLaunchBanner = useCallback(() => {
    setIsLaunchBannerDismissed(true)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LAUNCH_BANNER_DISMISSED_KEY, '1')
    }
  }, [])

  const handleFanClubsViewModeChange = useCallback((mode: FanClubsViewMode) => {
    setFanClubsViewMode(mode)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FAN_CLUBS_VIEW_STORAGE_KEY, mode)
    }
  }, [])

  const shouldShowLaunchCta =
    (!hasExistingArtistCoin && !isLoadingCreatedCoin) ||
    !isLaunchpadVerificationEnabled

  const launchCtaReserveY =
    shouldShowLaunchCta && !isLaunchBannerDismissed
      ? spacing.xl + spacing['5xl'] + spacing['3xl']
      : 0

  const bannerSurface =
    typeof color.background.surface1 === 'string' &&
    color.background.surface1.startsWith('#')
      ? convertHexToRGBA(color.background.surface1, 0.78)
      : 'rgba(255, 255, 255, 0.78)'

  return (
    <Page
      title={walletMessages.artistCoins.title}
      css={{ minWidth: MIN_WIDTH }}
    >
      <Flex column gap='xl' css={{ paddingBottom: launchCtaReserveY }}>
        <Flex
          direction='column'
          w='100%'
          borderRadius='m'
          border='default'
          css={{
            overflow: 'hidden',
            boxShadow:
              '0px 0px 4px 0px rgba(0, 0, 0, 0.04), 0px 4px 8px 0px rgba(0, 0, 0, 0.06)'
          }}
        >
          <Flex
            p='3xl'
            direction='column'
            alignItems='center'
            justifyContent='center'
            gap='xl'
            w='100%'
            css={{
              backgroundImage: `url(${imageCoinsBackgroundImage})`,
              backgroundSize: 'cover, cover',
              backgroundPosition: '0% 0%, 50% 50%',
              backgroundRepeat: 'no-repeat, no-repeat'
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

          <Flex
            w='100%'
            borderTop='strong'
            backgroundColor='surface1'
            ph='xl'
            pt='l'
            pb='l'
            justifyContent='space-between'
            alignItems='flex-end'
            gap='l'
            css={{ flexWrap: 'wrap' }}
          >
            <Flex column gap='s' alignItems='flex-start'>
              <Text variant='label' size='s' color='subdued'>
                {walletMessages.artistCoins.view}
              </Text>
              <Flex gap='s' alignItems='center' css={{ flexWrap: 'wrap' }}>
                <SelectablePill
                  size='large'
                  label={walletMessages.artistCoins.cardView}
                  isSelected={fanClubsViewMode === 'cards'}
                  onClick={() => {
                    handleFanClubsViewModeChange('cards')
                  }}
                />
                <SelectablePill
                  size='large'
                  label={walletMessages.artistCoins.leaderboardView}
                  isSelected={fanClubsViewMode === 'table'}
                  onClick={() => {
                    handleFanClubsViewModeChange('table')
                  }}
                />
              </Flex>
            </Flex>
            <Button
              variant='secondary'
              size='small'
              onClick={handleHeaderClubCta}
            >
              {canViewExistingClub
                ? walletMessages.artistCoins.viewYourClub
                : walletMessages.artistCoins.launchYourClub}
            </Button>
          </Flex>
        </Flex>

        <ArtistCoinsTable
          searchQuery={searchValue}
          viewMode={fanClubsViewMode}
        />
      </Flex>

      {shouldShowLaunchCta && !isLaunchBannerDismissed ? (
        <Box
          css={{
            position: 'fixed',
            bottom: 'calc(var(--play-bar-height) + 24px)',
            left: 'calc(var(--nav-width) + 48px)',
            right: 48,
            zIndex: zIndex.NAVIGATOR_POPUP
          }}
        >
          <Paper
            border='strong'
            borderRadius='m'
            shadow='mid'
            w='100%'
            css={{
              position: 'relative',
              overflow: 'hidden',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              backgroundColor: bannerSurface,
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
                    css={{
                      alignSelf: 'flex-start',
                      overflow: 'hidden',
                      backgroundColor: bannerSurface,
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)'
                    }}
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
