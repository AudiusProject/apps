import { useCallback, useMemo, useRef, useState, ChangeEvent } from 'react'

import {
  useCurrentAccountUser,
  useArtistCreatedFanClub
} from '@audius/common/api'
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
  IconFanClub,
  IconSearch,
  IconVerified,
  Paper,
  Text,
  TextInput,
  TextInputSize,
  Tooltip,
  useTheme
} from '@audius/harmony'
import { useNavigate } from 'react-router'

import { MIN_DESKTOP_CONTENT_WIDTH_PX } from 'common/utils/layout'
import { Header } from 'components/header/desktop/Header'
import Page from 'components/page/Page'
import { usePortal } from 'hooks/usePortal'
import useTabs from 'hooks/useTabs/useTabs'
import { useMainContentRef } from 'pages/MainContentContext'
import { isMobile } from 'utils/clientUtil'
import zIndex from 'utils/zIndex'

import {
  FanClubsTable,
  FAN_CLUBS_VIEW_STORAGE_KEY,
  FanClubsViewMode,
  readInitialFanClubsViewMode
} from '../fan-clubs-launchpad-page/components/FanClubsTable'

import { MobileFanClubsExplorePage } from './MobileFanClubsExplorePage'

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
  dismissBanner: 'Dismiss',
  pageDescription:
    'Explore Artist Fan Clubs on Audius. Support your favorite artists, unlock exclusive perks, and become part of their community.'
}

// Desktop version
const DesktopFanClubsExplorePage = () => {
  const navigate = useNavigate()
  const { motion, spacing, color } = useTheme()
  const pageContentRef = useRef<HTMLDivElement>(null)
  const mainContentRef = useMainContentRef()
  const Portal = usePortal({
    container: mainContentRef.current?.parentElement ?? undefined
  })
  const [searchValue, setSearchValue] = useState('')
  const [isLaunchBannerDismissed, setIsLaunchBannerDismissed] = useState(
    readLaunchBannerDismissed
  )
  const [fanClubsViewMode, setFanClubsViewMode] = useState<FanClubsViewMode>(
    readInitialFanClubsViewMode
  )
  const { data: currentUser } = useCurrentAccountUser()
  const { data: createdCoin, isPending: isLoadingCreatedCoin } =
    useArtistCreatedFanClub(currentUser?.user_id)

  const { isEnabled: isLaunchpadVerificationEnabled } = useFeatureFlag(
    FeatureFlags.LAUNCHPAD_VERIFICATION
  )
  const hasExistingFanClub = !!createdCoin
  const existingClubTicker = createdCoin?.ticker ?? null
  const canViewExistingClub =
    hasExistingFanClub &&
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

  const handleClearSearch = useCallback(() => {
    setSearchValue('')
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
    (!hasExistingFanClub && !isLoadingCreatedCoin) ||
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

  const viewModeTabHeaders = useMemo(
    () => [
      { text: walletMessages.fanClubs.cardView, label: 'cards' },
      { text: walletMessages.fanClubs.leaderboardView, label: 'table' }
    ],
    []
  )

  const { tabs: viewModeTabs } = useTabs({
    isMobile: false,
    tabs: viewModeTabHeaders,
    elements: viewModeTabHeaders.map((t) => <div key={t.label} />),
    onTabClick: (label) =>
      handleFanClubsViewModeChange(label as FanClubsViewMode),
    selectedTabLabel: fanClubsViewMode
  })

  const header = (
    <Header
      primary={walletMessages.fanClubs.title}
      icon={IconFanClub}
      rightDecorator={
        <Button variant='secondary' size='small' onClick={handleHeaderClubCta}>
          {canViewExistingClub
            ? walletMessages.fanClubs.viewYourClub
            : walletMessages.fanClubs.launchYourClub}
        </Button>
      }
      bottomBar={viewModeTabs}
    />
  )

  return (
    <Page
      title={walletMessages.fanClubs.title}
      description={messages.pageDescription}
      size='large'
      header={header}
    >
      <Flex
        ref={pageContentRef}
        direction='column'
        gap='3xl'
        alignItems='stretch'
        css={{
          minWidth: MIN_DESKTOP_CONTENT_WIDTH_PX,
          width: '100%',
          paddingBottom: launchCtaReserveY
        }}
      >
        <Paper pv='l' ph='xl' alignSelf='stretch'>
          <TextInput
            label={messages.searchPlaceholder}
            value={searchValue}
            startIcon={IconSearch}
            size={TextInputSize.SMALL}
            onChange={handleSearchChange}
            onClear={handleClearSearch}
          />
        </Paper>
        <FanClubsTable searchQuery={searchValue} viewMode={fanClubsViewMode} />
      </Flex>

      <Portal>
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
                        p='s'
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
      </Portal>
    </Page>
  )
}

// Main component that conditionally renders desktop or mobile version
export const FanClubsExplorePage = () => {
  return isMobile() ? (
    <MobileFanClubsExplorePage />
  ) : (
    <DesktopFanClubsExplorePage />
  )
}
