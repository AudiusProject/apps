import { useCallback, useState, ChangeEvent } from 'react'

import { useCurrentAccountUser, useUserCreatedCoins } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { walletMessages } from '@audius/common/messages'
import { FeatureFlags } from '@audius/common/services'
import {
  COINS_CREATE_PAGE,
  AUDIUS_ARTIST_COINS_HELP_LINK
} from '@audius/common/src/utils/route'
import {
  Box,
  Button,
  Flex,
  IconCheck,
  IconVerified,
  Paper,
  Text,
  TextInput,
  TextInputSize,
  IconQuestionCircle,
  spacing,
  PlainButton,
  IconSearch
} from '@audius/harmony'
import { useNavigate } from 'react-router-dom-v5-compat'

import imageCoinsBackgroundImage from 'assets/img/publicSite/imageCoinsBackgroundImage2x.webp'
import { ExternalLink } from 'components/link'
import Page from 'components/page/Page'
import { isMobile } from 'utils/clientUtil'

import { ArtistCoinsTable } from '../artist-coins-launchpad-page/components/ArtistCoinsTable'

import { MobileArtistCoinsExplorePage } from './MobileArtistCoinsExplorePage'

const SEARCH_WIDTH = 400
const CHECKLIST_WIDTH = 340
const MIN_WIDTH = 620

const messages = {
  searchPlaceholder: 'Search',
  getStarted: 'Get Started',
  launchYourOwn: 'Launch Your Own Artist Coin!',
  required: 'Required',
  checklistItems: [
    'Launch your Coin',
    'Start collecting trading fees',
    'Offer exclusive perks to your fans'
  ],
  help: 'Help',
  getStartedTooltip: 'Verified users only',
  alreadyHasCoinTooltip: 'You already have an artist coin'
}

// Desktop version
const DesktopArtistCoinsExplorePage = () => {
  const navigate = useNavigate()
  const [searchValue, setSearchValue] = useState('')
  const { data: currentUser } = useCurrentAccountUser()
  const { data: createdCoins, isPending: isLoadingCreatedCoins } =
    useUserCreatedCoins({
      userId: currentUser?.user_id
    })

  const { isEnabled: isLaunchpadVerificationEnabled } = useFeatureFlag(
    FeatureFlags.LAUNCHPAD_VERIFICATION
  )
  const hasExistingArtistCoin = (createdCoins?.length ?? 0) > 0

  const handleGetStarted = useCallback(() => {
    navigate(COINS_CREATE_PAGE)
  }, [navigate])

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value)
  }, [])

  return (
    <Page
      title={walletMessages.artistCoins.title}
      css={{ minWidth: MIN_WIDTH }}
    >
      <Flex column gap='xl'>
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

        {(!hasExistingArtistCoin && !isLoadingCreatedCoins) ||
        !isLaunchpadVerificationEnabled ? (
          <Paper p='xl' gap='xl' border='default' borderRadius='m'>
            <Flex gap='xl' w='100%' wrap='wrap'>
              <Flex
                column
                gap='l'
                justifyContent='space-between'
                flex='2 1 0'
                css={{ minWidth: 'max-content' }}
              >
                <Flex
                  alignItems='center'
                  justifyContent='space-between'
                  wrap='nowrap'
                  gap='s'
                  css={{ minWidth: 'max-content' }}
                >
                  <Text variant='heading'>{messages.launchYourOwn}</Text>
                  <Flex
                    pl='s'
                    gap='s'
                    alignItems='center'
                    border='default'
                    borderRadius='m'
                    css={{ overflow: 'hidden' }}
                  >
                    <Text variant='body' size='s'>
                      {messages.required}
                    </Text>
                    <Flex
                      ph='s'
                      pv='xs'
                      backgroundColor='surface2'
                      borderLeft='default'
                    >
                      <IconVerified size='s' />
                    </Flex>
                  </Flex>
                </Flex>

                <Flex>
                  <Button
                    onClick={handleGetStarted}
                    fullWidth
                    color='coinGradient'
                  >
                    {messages.getStarted}
                  </Button>
                </Flex>
              </Flex>

              <Box
                border='default'
                borderRadius='m'
                p='l'
                backgroundColor='surface1'
                flex='1 1 0'
                css={{ minWidth: CHECKLIST_WIDTH }}
              >
                <Flex column gap='s'>
                  {messages.checklistItems.map((item) => (
                    <Flex key={item} alignItems='center' gap='s'>
                      <IconCheck size='s' color='default' />
                      <Text variant='body' size='l'>
                        {item}
                      </Text>
                    </Flex>
                  ))}
                </Flex>

                {/* With absolute positioning, must be rendered after the checklist items to have higher z-index */}
                <ExternalLink to={AUDIUS_ARTIST_COINS_HELP_LINK}>
                  <PlainButton
                    iconLeft={IconQuestionCircle}
                    asChild
                    css={{
                      position: 'absolute',
                      top: spacing.l,
                      right: spacing.l
                    }}
                  >
                    {messages.help}
                  </PlainButton>
                </ExternalLink>
              </Box>
            </Flex>
          </Paper>
        ) : null}

        <ArtistCoinsTable searchQuery={searchValue} />
      </Flex>
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
