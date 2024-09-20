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
  IconCloudUpload
} from '@audius/harmony-native'
import BallotBoxTick from 'app/assets/images/emojis/ballot-box-tick.png'
import Cart from 'app/assets/images/emojis/cart.png'
import BarChart from 'app/assets/images/emojis/chart-bar.png'
import ChartIncreasing from 'app/assets/images/emojis/chart-increasing.png'
import Gear from 'app/assets/images/emojis/gear.png'
import Headphone from 'app/assets/images/emojis/headphone.png'
import IncomingEnvelope from 'app/assets/images/emojis/incoming-envelope.png'
import IconLink from 'app/assets/images/emojis/link-symbol.png'
import LoveLetter from 'app/assets/images/emojis/love-letter.png'
import MobilePhoneWithArrow from 'app/assets/images/emojis/mobile-phone-with-arrow.png'
import MoneyWings from 'app/assets/images/emojis/money-with-wings.png'
import MultipleMusicalNotes from 'app/assets/images/emojis/multiple-musical-notes.png'
import ArrowUp from 'app/assets/images/emojis/right-arrow-curving-up.png'
import TrebleClef from 'app/assets/images/emojis/treble-clef.png'
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
  sendFirstTipButtonAlt: 'Find Artists to Support' // iOS only
}

export type ChallengesParamList = {
  trending: undefined
  AccountVerificationScreen: undefined
  explore: undefined
  library: undefined
  Upload: undefined
  params: { screen: string }
}

export type MobileChallengeConfig = {
  icon?: ImageSourcePropType
  title?: string
  description?: (amount?: OptimisticUserChallenge) => string
  shortDescription?: string
  panelButtonText?: string
  buttonInfo?: {
    navigation?: {
      screen: keyof ChallengesParamList
      params?: ChallengesParamList[keyof ChallengesParamList]
    }
    iconLeft?: IconComponent
    iconRight?: IconComponent
  }
}

const mobileChallengeConfig: Record<ChallengeRewardID, MobileChallengeConfig> =
  {
    'connect-verified': {
      icon: IconLink,
      buttonInfo: {
        navigation: {
          screen: 'AccountVerificationScreen'
        },
        iconRight: IconCheck
      }
    },
    [ChallengeName.ConnectVerified]: {
      icon: IconLink,
      buttonInfo: {
        navigation: {
          screen: 'AccountVerificationScreen'
        },
        iconRight: IconCheck
      }
    },
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
    referrals: {
      icon: IncomingEnvelope
    },
    [ChallengeName.Referrals]: {
      icon: IncomingEnvelope
    },
    'ref-v': {
      icon: IncomingEnvelope
    },
    [ChallengeName.ReferralsVerified]: {
      icon: IncomingEnvelope
    },
    referred: {
      icon: LoveLetter
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
      buttonInfo: {
        navigation: {
          screen: 'library'
        }
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
        }
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
