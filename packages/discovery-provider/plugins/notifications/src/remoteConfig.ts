import optimizelySDK, { Client } from '@optimizely/optimizely-sdk'

const optimizelySDKKey =
  process.env.OPTIMIZELY_SDK_KEY || 'MX4fYBgANQetvmBXGpuxzF'

export const MappingFeatureName = 'discovery_notification_mapping'
export enum MappingVariable {
  PushRepost = 'push_repost',
  PushSave = 'push_save',
  PushSaveOfRepost = 'push_save_of_repost',
  PushRepostOfRepost = 'push_repost_of_repost',
  PushRemix = 'push_remix',
  PushCosign = 'push_cosign',
  PushAddTrackToPlaylist = 'push_add_track_to_playlist',
  PushFollow = 'push_follow',
  PushMilestone = 'push_milestone',
  PushMilestoneFollowerCount = 'push_milestone_follower_count',
  PushSupporterRankUp = 'push_supporter_rank_up',
  PushSupportingRankUp = 'push_supporting_rank_up',
  PushSupporterDethroned = 'push_supporter_dethroned',
  PushTipRceive = 'push_tip_receive',
  PushTipSend = 'push_tip_send',
  PushTastemaker = 'push_tastemaker',
  PushChallengeReward = 'push_challenge_reward',
  PushClaimableReward = 'push_claimable_reward',
  PushTrackAddedToPlaylist = 'push_track_added_to_playlist',
  PushCreate = 'push_create',
  PushTrending = 'push_trending',
  PushTrendingUnderground = 'push_trending_underground',
  PushUSDCPurchaseBuyer = 'push_usdc_purchase_buyer',
  PushUSDCPurchaseSeller = 'push_usdc_purchase_seller',
  PushAnnouncement = 'push_announcement',
  PushReaction = 'push_reaction',
  PushUSDCTransfer = 'push_usdc_transfer',
  PushUSDCWithdrawal = 'push_usdc_withdrawal',
  PushRequestManager = 'push_request_manager',
  PushApproveManagerRequest = 'push_approve_manager_request',
  PushRewardInCooldown = 'push_reward_in_cooldown',
  PushComment = 'push_comment',
  PushCommentThread = 'push_comment_thread',
  PushCommentMention = 'push_comment_mention',
  PushCommentReaction = 'push_comment_reaction',
  PushListenStreakReminder = 'push_listen_streak_reminder',
  PushArtistRemixContestEnded = 'push_artist_remix_contest_ended',
  PushFanRemixContestEnded = 'push_fan_remix_contest_ended',
  PushFanRemixContestEndingSoon = 'push_fan_remix_contest_ending_soon',
  PushFanRemixContestStarted = 'push_fan_remix_contest_started',
  PushFanRemixContestWinnersSelected = 'push_fan_remix_contest_winners_selected',
  PushArtistRemixContestEndingSoon = 'push_artist_remix_contest_ending_soon',
  PushArtistRemixContestSubmissions = 'push_artist_remix_contest_submissions'
}

export const NotificationsEmailPlugin = 'notification_email_plugin'
export const EmailPluginMappings = {
  Live: 'live',
  Scheduled: 'scheduled'
}

export const NotificationsScheduledEmails = 'notification_scheduled_emails'
export const ScheduledEmailPluginMappings = {
  PageCount: 'page_count'
}

const defaultMappingVariable = {
  [MappingVariable.PushRepost]: false,
  [MappingVariable.PushSave]: false,
  [MappingVariable.PushSaveOfRepost]: false,
  [MappingVariable.PushRepostOfRepost]: false,
  [MappingVariable.PushTastemaker]: false,
  [MappingVariable.PushUSDCPurchaseBuyer]: false,
  [MappingVariable.PushUSDCPurchaseSeller]: false,
  [MappingVariable.PushRemix]: false,
  [MappingVariable.PushCosign]: false,
  [MappingVariable.PushAddTrackToPlaylist]: false,
  [MappingVariable.PushFollow]: false,
  [MappingVariable.PushMilestone]: false,
  [MappingVariable.PushMilestoneFollowerCount]: false,
  [MappingVariable.PushSupporterRankUp]: false,
  [MappingVariable.PushSupportingRankUp]: false,
  [MappingVariable.PushSupporterDethroned]: false,
  [MappingVariable.PushTipRceive]: false,
  [MappingVariable.PushTipSend]: false,
  [MappingVariable.PushChallengeReward]: false,
  [MappingVariable.PushTrackAddedToPlaylist]: false,
  [MappingVariable.PushCreate]: false,
  [MappingVariable.PushTrending]: false,
  [MappingVariable.PushTrendingUnderground]: false,
  [MappingVariable.PushAnnouncement]: false,
  [MappingVariable.PushReaction]: false,
  [MappingVariable.PushUSDCTransfer]: false,
  [MappingVariable.PushUSDCWithdrawal]: false,
  [MappingVariable.PushRequestManager]: false,
  [MappingVariable.PushApproveManagerRequest]: false,
  [MappingVariable.PushComment]: false,
  [MappingVariable.PushCommentThread]: false,
  [MappingVariable.PushCommentMention]: false,
  [MappingVariable.PushCommentReaction]: false,
  [MappingVariable.PushFanRemixContestEnded]: false,
  [MappingVariable.PushFanRemixContestEndingSoon]: false,
  [MappingVariable.PushArtistRemixContestEnded]: false,
  [MappingVariable.PushFanRemixContestStarted]: false,
  [MappingVariable.PushFanRemixContestWinnersSelected]: false,
  [MappingVariable.PushArtistRemixContestEndingSoon]: false,
  [MappingVariable.PushArtistRemixContestSubmissions]: false
}

export const BrowserPushPlugin = 'browser_push_plugin'
export const BrowserPluginMappings = {
  Enabled: 'enabled'
}

export class RemoteConfig {
  optimizelyClient: Client
  isInit: boolean

  constructor() {
    this.optimizelyClient = optimizelySDK.createInstance({
      sdkKey: optimizelySDKKey,
      datafileOptions: {
        autoUpdate: true,
        updateInterval: 5000 // Poll for updates every 5s
      }
    })
    this.isInit = false
  }

  init = async () => {
    const optimizelyPromise = new Promise((resolve) => {
      this.optimizelyClient.onReady().then(() => {
        this.isInit = true
        resolve(true)
      })
    })
    await optimizelyPromise
  }

  close = () => {
    this.isInit = false
    this.optimizelyClient.close()
  }

  getFeatureVariableEnabled(featureName: string, variable: string): boolean {
    const optimizelyValue = this.optimizelyClient.getFeatureVariableBoolean(
      featureName,
      variable,
      ''
    )
    // In case not set in optimizely, set to default
    if (optimizelyValue === null) {
      if (featureName == MappingFeatureName) {
        return defaultMappingVariable[variable]
      }
    }
    return optimizelyValue
  }

  getFeatureVariableValue<T>(
    featureName: string,
    variable: string,
    defaultValue: T
  ): T {
    const optimizelyValue = this.optimizelyClient.getFeatureVariable(
      featureName,
      variable,
      ''
    )

    if (optimizelyValue === null) {
      return defaultValue
    }
    return optimizelyValue as T
  }
}
