import { ReactNode } from 'react'

import { ChallengeName, ChallengeRewardID } from '@audius/common/models'
import { Nullable, challengeRewardsConfig, route } from '@audius/common/utils'
import { IconArrowRight, IconCloudUpload, IconComponent } from '@audius/harmony'

const { EXPLORE_PAGE, LIBRARY_PAGE, TRENDING_PAGE, UPLOAD_PAGE, profilePage } =
  route

type LinkButtonType =
  | 'trackUpload'
  | 'profile'
  | 'trendingTracks'
  | 'sendFirstTip'
  | 'firstPlaylist'
  | ChallengeName.AudioMatchingSell
  | ChallengeName.AudioMatchingBuy

type LinkButtonInfo = {
  label: string
  leftIcon: IconComponent | null
  rightIcon: IconComponent | null
  link: (handle: string | null) => string | null
}

const linkButtonMap: Record<LinkButtonType, LinkButtonInfo> = {
  trackUpload: {
    label: 'Upload Tracks',
    leftIcon: null,
    rightIcon: IconCloudUpload,
    link: () => UPLOAD_PAGE
  },
  profile: {
    label: 'Complete Your Profile',
    leftIcon: null,
    rightIcon: IconArrowRight,
    link: (handle: Nullable<string>) => (handle ? profilePage(handle) : null)
  },
  trendingTracks: {
    label: 'Trending Tracks',
    leftIcon: null,
    rightIcon: IconArrowRight,
    link: () => TRENDING_PAGE
  },
  sendFirstTip: {
    label: 'Send a Tip',
    leftIcon: null,
    rightIcon: IconArrowRight,
    link: () => LIBRARY_PAGE
  },
  firstPlaylist: {
    label: 'Create A Playlist',
    leftIcon: null,
    rightIcon: IconArrowRight,
    link: () => EXPLORE_PAGE
  },
  [ChallengeName.AudioMatchingSell]: {
    label: 'View Premium Tracks',
    leftIcon: null,
    rightIcon: IconArrowRight,
    link: () => EXPLORE_PAGE
  },
  [ChallengeName.AudioMatchingBuy]: {
    label: 'View Premium Tracks',
    leftIcon: null,
    rightIcon: IconArrowRight,
    link: () => EXPLORE_PAGE
  }
}

type WebChallengeInfo = {
  icon: ReactNode
  modalButtonInfo?: {
    incomplete: LinkButtonInfo | null
    inProgress: LinkButtonInfo | null
    complete: LinkButtonInfo | null
  }
}

const webChallengesConfig: Record<ChallengeRewardID, WebChallengeInfo> = {
  [ChallengeName.Referrals]: {
    icon: <i className='emoji large incoming-envelope' />
  },
  [ChallengeName.ReferralsVerified]: {
    icon: <i className='emoji large incoming-envelope' />
  },
  [ChallengeName.Referred]: {
    icon: <i className='emoji large love-letter' />
  },
  'listen-streak': {
    icon: <i className='emoji large headphone' />,
    modalButtonInfo: {
      incomplete: linkButtonMap.trendingTracks,
      inProgress: linkButtonMap.trendingTracks,
      complete: linkButtonMap.trendingTracks
    }
  },
  [ChallengeName.ListenStreakEndless]: {
    icon: <i className='emoji large fire' />,
    modalButtonInfo: {
      incomplete: linkButtonMap.trendingTracks,
      inProgress: linkButtonMap.trendingTracks,
      complete: linkButtonMap.trendingTracks
    }
  },
  [ChallengeName.ListenStreak]: {
    icon: <i className='emoji large headphone' />,
    modalButtonInfo: {
      incomplete: linkButtonMap.trendingTracks,
      inProgress: linkButtonMap.trendingTracks,
      complete: linkButtonMap.trendingTracks
    }
  },
  'mobile-install': {
    icon: <i className='emoji large mobile-phone-with-arrow' />
  },
  [ChallengeName.MobileInstall]: {
    icon: <i className='emoji large mobile-phone-with-arrow' />
  },
  'profile-completion': {
    icon: <i className='emoji large ballot-box-tick' />,
    modalButtonInfo: {
      incomplete: linkButtonMap.profile,
      inProgress: linkButtonMap.profile,
      complete: linkButtonMap.profile
    }
  },
  [ChallengeName.ProfileCompletion]: {
    icon: <i className='emoji large ballot-box-tick' />,
    modalButtonInfo: {
      incomplete: linkButtonMap.profile,
      inProgress: linkButtonMap.profile,
      complete: linkButtonMap.profile
    }
  },
  'track-upload': {
    icon: <i className='emoji large multiple-musical-notes' />,
    modalButtonInfo: {
      incomplete: linkButtonMap.trackUpload,
      inProgress: linkButtonMap.trackUpload,
      complete: linkButtonMap.trackUpload
    }
  },
  [ChallengeName.TrackUpload]: {
    icon: <i className='emoji large multiple-musical-notes' />,
    modalButtonInfo: {
      incomplete: linkButtonMap.trackUpload,
      inProgress: linkButtonMap.trackUpload,
      complete: linkButtonMap.trackUpload
    }
  },
  'send-first-tip': {
    icon: <i className='emoji large money-wings' />,
    modalButtonInfo: {
      incomplete: linkButtonMap.sendFirstTip,
      inProgress: linkButtonMap.sendFirstTip,
      complete: linkButtonMap.sendFirstTip
    }
  },
  [ChallengeName.FirstTip]: {
    icon: <i className='emoji large money-wings' />,
    modalButtonInfo: {
      incomplete: linkButtonMap.sendFirstTip,
      inProgress: linkButtonMap.sendFirstTip,
      complete: linkButtonMap.sendFirstTip
    }
  },
  'first-playlist': {
    icon: <i className='emoji large treble-clef' />,
    modalButtonInfo: {
      incomplete: linkButtonMap.firstPlaylist,
      inProgress: linkButtonMap.firstPlaylist,
      complete: linkButtonMap.firstPlaylist
    }
  },
  [ChallengeName.FirstPlaylist]: {
    icon: <i className='emoji large treble-clef' />,
    modalButtonInfo: {
      incomplete: linkButtonMap.firstPlaylist,
      inProgress: linkButtonMap.firstPlaylist,
      complete: linkButtonMap.firstPlaylist
    }
  },
  [ChallengeName.AudioMatchingSell]: {
    icon: <i className='emoji large cart' />,
    modalButtonInfo: {
      incomplete: linkButtonMap[ChallengeName.AudioMatchingSell],
      inProgress: linkButtonMap[ChallengeName.AudioMatchingSell],
      complete: linkButtonMap[ChallengeName.AudioMatchingSell]
    }
  },
  [ChallengeName.AudioMatchingBuy]: {
    icon: <i className='emoji large cart' />,
    modalButtonInfo: {
      incomplete: linkButtonMap[ChallengeName.AudioMatchingBuy],
      inProgress: linkButtonMap[ChallengeName.AudioMatchingBuy],
      complete: linkButtonMap[ChallengeName.AudioMatchingBuy]
    }
  },
  'trending-playlist': {
    icon: <i className='emoji large arrow-curve-up' />
  },
  tp: {
    icon: <i className='emoji large arrow-curve-up' />
  },
  'trending-track': {
    icon: <i className='emoji large chart-increasing' />
  },
  tt: {
    icon: <i className='emoji large arrow-curve-up' />
  },
  'top-api': {
    icon: <i className='emoji large gear' />
  },
  'verified-upload': {
    icon: <i className='emoji large white-heavy-check-mark' />
  },
  'trending-underground': {
    icon: <i className='emoji large chart-bar' />
  },
  tut: {
    icon: <i className='emoji large chart-bar' />
  },
  [ChallengeName.OneShot]: {
    icon: <i className='emoji large parachute' />
  },
  [ChallengeName.FirstWeeklyComment]: {
    icon: <i className='emoji large speech-balloon' />
  },
  [ChallengeName.PlayCount250]: {
    icon: <i className='emoji large play-pause' />
  },
  [ChallengeName.PlayCount1000]: {
    icon: <i className='emoji large play-pause' />
  },
  [ChallengeName.PlayCount10000]: {
    icon: <i className='emoji large play-pause' />
  },
  [ChallengeName.Tastemaker]: {
    icon: <i className='emoji large smiling-face-licking-lips' />
  },
  [ChallengeName.CommentPin]: {
    icon: <i className='emoji large pin' />
  },
  [ChallengeName.Cosign]: {
    icon: <i className='emoji large recycle' />
  },
  [ChallengeName.RemixContestWinner]: {
    icon: <i className='emoji large trophy' />
  },
  [ChallengeName.ConnectVerified]: {
    icon: null
  },
  'connect-verified': {
    icon: null
  }
}

export const getChallengeConfig = (id: ChallengeRewardID) => ({
  ...challengeRewardsConfig[id],
  ...webChallengesConfig[id]
})
