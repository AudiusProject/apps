import type {
  ChallengeRewardID,
  OptimisticUserChallenge
} from '@audius/common/models'
import { ChallengeName } from '@audius/common/models'
import type { Dayjs } from '@audius/common/utils'
import { challengeRewardsConfig } from '@audius/common/utils'
import type { ImageSourcePropType } from 'react-native'
import { Platform } from 'react-native'

import type { IconComponent } from '@audius/harmony-native'
import {
  Text,
  IconArrowRight,
  IconCheck,
  IconCloudUpload,
  IconPlaybackPause
} from '@audius/harmony-native'
import BallotBoxTick from 'app/assets/images/emojis/ballot-box-tick.png'
import Cart from 'app/assets/images/emojis/cart.png'
import BarChart from 'app/assets/images/emojis/chart-bar.png'
import ChartIncreasing from 'app/assets/images/emojis/chart-increasing.png'
import Fire from 'app/assets/images/emojis/fire.png'
import Gear from 'app/assets/images/emojis/gear.png'
import Headphone from 'app/assets/images/emojis/headphone.png'
import IncomingEnvelope from 'app/assets/images/emojis/incoming-envelope.png'
import LoveLetter from 'app/assets/images/emojis/love-letter.png'
import MobilePhoneWithArrow from 'app/assets/images/emojis/mobile-phone-with-arrow.png'
import MoneyWings from 'app/assets/images/emojis/money-with-wings.png'
import MultipleMusicalNotes from 'app/assets/images/emojis/multiple-musical-notes.png'
import Parachute from 'app/assets/images/emojis/parachute.png'
import Recycle from 'app/assets/images/emojis/recycle.png'
import ArrowUp from 'app/assets/images/emojis/right-arrow-curving-up.png'
import SmilingFaceLickingLips from 'app/assets/images/emojis/smiling-face-licking-lips.png'
import SpeechBalloon from 'app/assets/images/emojis/speech-balloon.png'
import TrebleClef from 'app/assets/images/emojis/treble-clef.png'
import Trophy from 'app/assets/images/emojis/trophy.png'
import type { SummaryTableItem } from 'app/components/summary-table/SummaryTable'

export const messages = {
  sendFirstTipTitle: 'Send Your First Tip',
  // NOTE: Send tip -> Send $AUDIO change
  sendFirstTipTitleAlt: 'Send Your First $AUDIO', // iOS only
  sendFirstTipDescription:
    'Show some love to your favorite artist and send them a tip',
  sendFirstTipShortDescription:
    'Show some love to your favorite artist and send them a tip',
  sendFirstTipDescriptionAlt:
    'Show some love to your favorite artist and send them $AUDIO', // iOS only
  sendFirstTipShortDescriptionAlt:
    'Show some love to your favorite artist and send them $AUDIO', // iOS only
  sendFirstTipButton: 'Send a Tip',
  sendFirstTipButtonAlt: 'Find Artists to Support', // iOS only
  sendFirstTipCompletedLabelAlt: 'Support Another Artist' // iOS only
}

export type ChallengesParamList = {
  trending: undefined
  explore: undefined
  library: undefined
  Upload: undefined
  params: { screen: string }
}

export type MobileChallengeConfig = {
  icon?: ImageSourcePropType
  shortTitle?: string
  title?: string
  description?: (amount?: OptimisticUserChallenge) => string
  shortDescription?: string
  panelButtonText?: string
  completedLabel?: string
  buttonInfo?: {
    navigation?: {
      screen: keyof ChallengesParamList
      params?: ChallengesParamList[keyof ChallengesParamList]
    }
    iconLeft?: IconComponent
    iconRight?: IconComponent
  }
}

const mobileChallengeConfig: Record<
  Exclude<
    ChallengeRewardID,
    'connect-verified' | ChallengeName.ConnectVerified
  >,
  MobileChallengeConfig
> = {
  'listen-streak': {
    icon: Headphone,
    buttonInfo: {
      navigation: {
        screen: 'trending'
      },
      iconRight: IconArrowRight
    }
  },
  [ChallengeName.ListenStreak]: {
    icon: Headphone,
    buttonInfo: {
      navigation: {
        screen: 'trending'
      },
      iconRight: IconArrowRight
    }
  },
  'mobile-install': {
    icon: MobilePhoneWithArrow
  },
  [ChallengeName.MobileInstall]: {
    icon: MobilePhoneWithArrow
  },
  'profile-completion': {
    icon: BallotBoxTick
  },
  [ChallengeName.ProfileCompletion]: {
    icon: BallotBoxTick
  },
  [ChallengeName.Referrals]: {
    icon: IncomingEnvelope
  },
  [ChallengeName.ReferralsVerified]: {
    icon: IncomingEnvelope
  },
  [ChallengeName.Referred]: {
    icon: LoveLetter
  },
  'track-upload': {
    icon: MultipleMusicalNotes,
    buttonInfo: {
      iconRight: IconCloudUpload
    }
  },
  [ChallengeName.TrackUpload]: {
    icon: MultipleMusicalNotes,
    buttonInfo: {
      iconRight: IconCloudUpload
    }
  },
  'send-first-tip': {
    icon: MoneyWings,
    title:
      Platform.OS === 'ios'
        ? messages.sendFirstTipTitleAlt
        : messages.sendFirstTipTitle,
    description: () =>
      Platform.OS === 'ios'
        ? messages.sendFirstTipDescriptionAlt
        : messages.sendFirstTipDescription,
    shortDescription:
      Platform.OS === 'ios'
        ? messages.sendFirstTipShortDescriptionAlt
        : messages.sendFirstTipShortDescription,
    panelButtonText:
      Platform.OS === 'ios'
        ? messages.sendFirstTipButtonAlt
        : messages.sendFirstTipButton,
    completedLabel:
      Platform.OS === 'ios'
        ? messages.sendFirstTipCompletedLabelAlt
        : undefined,
    buttonInfo: {
      navigation: {
        screen: 'library'
      },
      iconRight: IconArrowRight
    }
  },
  [ChallengeName.FirstTip]: {
    icon: MoneyWings,
    title:
      Platform.OS === 'ios'
        ? messages.sendFirstTipTitleAlt
        : messages.sendFirstTipTitle,
    description: () =>
      Platform.OS === 'ios'
        ? messages.sendFirstTipDescriptionAlt
        : messages.sendFirstTipDescription,
    shortDescription:
      Platform.OS === 'ios'
        ? messages.sendFirstTipShortDescriptionAlt
        : messages.sendFirstTipShortDescription,
    panelButtonText:
      Platform.OS === 'ios'
        ? messages.sendFirstTipButtonAlt
        : messages.sendFirstTipButton,
    buttonInfo: {
      navigation: {
        screen: 'library'
      }
    }
  },
  'first-playlist': {
    icon: TrebleClef,
    buttonInfo: {
      navigation: {
        screen: 'explore',
        params: { screen: 'Explore' }
      },
      iconRight: IconArrowRight
    }
  },
  [ChallengeName.FirstPlaylist]: {
    icon: TrebleClef,
    buttonInfo: {
      navigation: {
        screen: 'explore',
        params: { screen: 'Explore' }
      }
    }
  },
  'trending-playlist': {
    icon: ArrowUp,
    buttonInfo: {
      iconRight: IconCheck
    }
  },
  tp: {
    icon: ArrowUp,
    buttonInfo: {
      iconRight: IconCheck
    }
  },
  'trending-track': {
    icon: ChartIncreasing,
    buttonInfo: {
      iconRight: IconCheck
    }
  },
  tt: {
    icon: ChartIncreasing,
    buttonInfo: {
      iconRight: IconCheck
    }
  },
  'top-api': {
    icon: Gear,
    buttonInfo: {
      iconRight: IconCheck
    }
  },
  'verified-upload': {
    title: 'First Upload With Your Verified Account',
    icon: ChartIncreasing,
    buttonInfo: {
      iconRight: IconCheck
    }
  },
  'trending-underground': {
    icon: BarChart,
    buttonInfo: {
      iconRight: IconCheck
    }
  },
  tut: {
    icon: BarChart,
    buttonInfo: {
      iconRight: IconCheck
    }
  },

  [ChallengeName.AudioMatchingBuy]: {
    icon: Cart,
    buttonInfo: {
      navigation: {
        screen: 'explore',
        params: { screen: 'PremiumTracks' }
      },
      iconRight: IconArrowRight
    }
  },
  [ChallengeName.AudioMatchingSell]: {
    icon: Cart,
    buttonInfo: {
      navigation: {
        screen: 'Upload'
      },
      iconRight: IconArrowRight
    }
  },
  [ChallengeName.OneShot]: {
    icon: Parachute,
    buttonInfo: {
      iconRight: IconCheck
    }
  },
  [ChallengeName.ListenStreakEndless]: {
    icon: Fire,
    buttonInfo: {
      iconRight: IconCheck
    }
  },
  [ChallengeName.FirstWeeklyComment]: {
    icon: SpeechBalloon,
    buttonInfo: {
      iconRight: IconCheck
    }
  },
  [ChallengeName.PlayCount250]: {
    icon: IconPlaybackPause,
    buttonInfo: {
      iconRight: IconCheck
    }
  },
  [ChallengeName.PlayCount1000]: {
    icon: IconPlaybackPause,
    buttonInfo: {
      iconRight: IconCheck
    }
  },
  [ChallengeName.PlayCount10000]: {
    icon: IconPlaybackPause,
    buttonInfo: {
      iconRight: IconCheck
    }
  },
  [ChallengeName.Tastemaker]: {
    icon: SmilingFaceLickingLips,
    buttonInfo: {
      iconRight: IconCheck
    }
  },
  [ChallengeName.CommentPin]: {
    icon: SpeechBalloon,
    buttonInfo: {
      iconRight: IconCheck
    }
  },
  [ChallengeName.Cosign]: {
    icon: Recycle,
    buttonInfo: {
      iconRight: IconCheck
    }
  },
  [ChallengeName.RemixContestWinner]: {
    icon: Trophy,
    buttonInfo: {
      iconRight: IconCheck
    }
  }
}

export const getChallengeConfig = (id: ChallengeRewardID) => ({
  ...challengeRewardsConfig[id],
  ...mobileChallengeConfig[id]
})

export const formatLabel = (item: {
  claimableDate: Dayjs
  id: string
  isClose: boolean
  label: string
  value: number
}): SummaryTableItem => {
  const { label, claimableDate, isClose, id, value } = item
  const formattedLabel = isClose ? (
    label
  ) : (
    <Text>
      {label}&nbsp;
      <Text variant='body' color='subdued'>
        {claimableDate.format('(M/D)')}
      </Text>
    </Text>
  )
  return {
    id,
    label: formattedLabel,
    value
  }
}
