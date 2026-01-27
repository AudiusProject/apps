import { useCallback } from 'react'

import { ChallengeName } from '@audius/common/models'
import { audioRewardsPageActions } from '@audius/common/store'
import {
  IconCaretRight,
  IconCrown,
  Flex,
  Text,
  useTheme,
  PlainButton,
  Paper
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { useSetVisibility } from 'common/hooks/useModalState'
import { useIsMobile } from 'hooks/useIsMobile'

const { setChallengeRewardsModalType } = audioRewardsPageActions

const messages = {
  learnMore: 'Learn More'
}

const messageMap = {
  tracks: {
    title: 'Global Trending: Weekly Top 5',
    description: 'Artists trending Fridays at 12PM PT win tokens!'
  },
  playlists: {
    title: 'Trending Playlists: Weekly Top 5',
    description: 'Playlists trending Fridays at 12PM PT win tokens!'
  },
  underground: {
    title: 'Underground Trending: Weekly Top 5',
    description: 'Artists trending Fridays at 12PM PT win tokens!'
  }
}

type RewardsBannerProps = {
  bannerType: 'tracks' | 'playlists' | 'underground'
}

const useHandleBannerClick = () => {
  const setVisibility = useSetVisibility()
  const dispatch = useDispatch()
  const onClickBanner = useCallback(
    (bannerType: 'tracks' | 'playlists' | 'underground') => {
      let challengeName: ChallengeName
      if (bannerType === 'tracks') {
        challengeName = ChallengeName.TrendingTrack
      } else if (bannerType === 'playlists') {
        challengeName = ChallengeName.TrendingPlaylist
      } else {
        challengeName = ChallengeName.TrendingUndergroundTrack
      }
      dispatch(setChallengeRewardsModalType({ modalType: challengeName }))
      setVisibility('ChallengeRewards')(true)
    },
    [dispatch, setVisibility]
  )
  return onClickBanner
}

const RewardsBanner = ({ bannerType }: RewardsBannerProps) => {
  const isMobile = useIsMobile()
  const onClick = useHandleBannerClick()
  const { spacing, color } = useTheme()

  return (
    <Paper
      w='100%'
      direction={isMobile ? 'column' : 'row'}
      alignItems='center'
      onClick={() => onClick(bannerType)}
      pv='m'
      ph='2xl'
      css={{
        background: color.special.gradient
      }}
    >
      <Flex
        direction={isMobile ? 'column' : 'row'}
        w='100%'
        alignItems={isMobile ? 'flex-start' : 'center'}
        gap={isMobile ? undefined : 'l'}
        css={{
          '@media (max-width: 1300px)': {
            flexDirection: 'column',
            alignItems: isMobile ? 'center' : 'flex-start',
            gap: 'unset'
          }
        }}
      >
        <Flex mb={isMobile ? 'xs' : undefined} gap={isMobile ? 'xs' : 's'}>
          <IconCrown size={isMobile ? 's' : 'm'} color='staticWhite' />
          <Text variant='title' size={isMobile ? 's' : 'l'} color='staticWhite'>
            {messageMap[bannerType].title}
          </Text>
        </Flex>
        <Text
          variant='body'
          size={isMobile ? 's' : 'l'}
          strength='strong'
          color='staticWhite'
          css={{
            opacity: 0.8,
            marginTop: isMobile ? spacing.xs : 0,
            whiteSpace: 'nowrap'
          }}
        >
          {messageMap[bannerType].description}
        </Text>
      </Flex>
      {!isMobile && (
        <PlainButton
          css={{
            pointerEvents: 'none'
          }}
          variant='inverted'
          size='large'
          iconRight={IconCaretRight}
        >
          {messages.learnMore}
        </PlainButton>
      )}
    </Paper>
  )
}

export default RewardsBanner
