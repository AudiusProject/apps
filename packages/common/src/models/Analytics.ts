import { ChatPermission, Genre } from '@audius/sdk'

import { FeedFilter } from '~/models/FeedFilter'
import { ID, PlayableType } from '~/models/Identifiers'
import { TimeRange } from '~/models/TimeRange'
import {
  SolanaWalletAddress,
  StringAudio,
  WalletAddress
} from '~/models/Wallet'
import { Nullable } from '~/utils/typeUtils'

import { Chain } from './Chain'
import { LaunchCoinResponse, LaunchpadFormValues } from './Launchpad'
import { PlaylistLibraryKind } from './PlaylistLibrary'
import { PurchaseMethod } from './PurchaseContent'
import { AccessConditions, TrackAccessType } from './Track'

const ANALYTICS_TRACK_EVENT = 'ANALYTICS/TRACK_EVENT'

type JsonMap = Record<string, unknown>

export type IdentifyTraits = {
  handle?: string
  name?: string
  email?: string
  userId?: ID
}

export type AnalyticsEvent = {
  eventName: string
  properties?: JsonMap
  id?: string
  source?: string
}

export enum Name {
  APP_ERROR = 'App Error', // Generic app error
  SESSION_START = 'Session Start',
  // Account creation
  // When the user opens the create account page
  CREATE_ACCOUNT_OPEN = 'Create Account: Open',
  // When the user continues past the email page
  CREATE_ACCOUNT_COMPLETE_EMAIL = 'Create Account: Complete Email',
  // When the user continues past the password page
  CREATE_ACCOUNT_COMPLETE_PASSWORD = 'Create Account: Complete Password',
  // When the user starts integrating with twitter
  CREATE_ACCOUNT_START_TWITTER = 'Create Account: Start Twitter',
  // When the user successfully continues past the "twitter connection page"
  CREATE_ACCOUNT_COMPLETE_TWITTER = 'Create Account: Complete Twitter',
  // When the user closed the twitter oauth modal
  CREATE_ACCOUNT_CLOSED_TWITTER = 'Create Account: Closed Twitter',
  // When the user encounters an error during twitter oauth
  CREATE_ACCOUNT_TWITTER_ERROR = 'Create Account: Twitter Error',
  // When the user starts integrating with instagram
  CREATE_ACCOUNT_START_INSTAGRAM = 'Create Account: Start Instagram',
  // When the user continues past the "instagram connection page"
  CREATE_ACCOUNT_COMPLETE_INSTAGRAM = 'Create Account: Complete Instagram',
  // When the user closed the instagram oauth modal
  CREATE_ACCOUNT_CLOSED_INSTAGRAM = 'Create Account: Closed Instagram',
  // When the user encounters an error during instagram oauth
  CREATE_ACCOUNT_INSTAGRAM_ERROR = 'Create Account: Error Instagram',
  // When the user starts integrating with tiktok
  CREATE_ACCOUNT_START_TIKTOK = 'Create Account: Start TikTok',
  // When the user continues past the "tiktok connection page"
  CREATE_ACCOUNT_COMPLETE_TIKTOK = 'Create Account: Complete TikTok',
  // When the user closes the tiktok oauth modal
  CREATE_ACCOUNT_CLOSED_TIKTOK = 'Create Account: Closed TikTok',
  // Errors encountered during tiktok oauth
  CREATE_ACCOUNT_TIKTOK_ERROR = 'Create Account: TikTok Error',
  // When the user continues past the "profile info page"
  CREATE_ACCOUNT_COMPLETE_PROFILE = 'Create Account: Complete Profile',
  // When the user uploads a profile photo in signup
  CREATE_ACCOUNT_UPLOAD_PROFILE_PHOTO = 'Create Account: Upload Profile Photo',
  // When the user has an error uploading their profile photo
  CREATE_ACCOUNT_UPLOAD_PROFILE_PHOTO_ERROR = 'Create Account: Upload Profile Photo Error',
  // When the user uploads a cover photo in signup
  CREATE_ACCOUNT_UPLOAD_COVER_PHOTO = 'Create Account: Upload Cover Photo',
  // When the user has an error uploading their cover photo
  CREATE_ACCOUNT_UPLOAD_COVER_PHOTO_ERROR = 'Create Account: Upload Cover Photo Error',
  // When the user selects a genre
  CREATE_ACCOUNT_SELECT_GENRE = 'Create Account: Select Genre',
  // When the user clicks follow on a specific user on the follow artists page
  CREATE_ACCOUNT_FOLLOW_ARTIST = 'Create Account: Follow Artist',
  // When the user clicks to preview a song from an artist on the follow artists page
  CREATE_ACCOUNT_ARTIST_PREVIEWED = 'Create Account: Artist Previewed',
  // When the user continues past the follow page
  CREATE_ACCOUNT_COMPLETE_FOLLOW = 'Create Account: Complete Follow',
  // When the user continues past the loading page
  CREATE_ACCOUNT_COMPLETE_CREATING = 'Create Account: Complete Creating',
  // When the user creates a guest account
  CREATE_ACCOUNT_COMPLETE_GUEST_CREATING = 'Create Account: Complete Guest Creating',
  // When the user completes a guest profile for a full user
  CREATE_ACCOUNT_COMPLETE_GUEST_PROFILE = 'Create Account: Complete Guest Profile',
  // When the user continues past the entire signup modal
  CREATE_ACCOUNT_FINISH = 'Create Account: Finish',
  // When the user gets rate limited during signup auth
  CREATE_ACCOUNT_RATE_LIMIT = 'Create Account: Rate Limit',
  // When the user gets blocked by AAO during the signup path
  CREATE_ACCOUNT_BLOCKED = 'Create Account: Blocked',
  // When the welcome modal gets shown to the user
  CREATE_ACCOUNT_WELCOME_MODAL = 'Create Account: Welcome Modal',
  // When the user clicks the "Upload Track" CTA in the welcome modal
  CREATE_ACCOUNT_WELCOME_MODAL_UPLOAD_TRACK = 'Create Account: Welcome Modal Upload Track Clicked',
  // Sign in
  SIGN_IN_START = 'Sign In: Start',
  SIGN_IN_FINISH = 'Sign In: Finish',
  SIGN_IN_WITH_INCOMPLETE_ACCOUNT = 'Sign In: Incomplete Account',
  SIGN_IN_WITH_DEACTIVATED_ACCOUNT = 'Sign In: Deactivated Account',

  // Settings
  SETTINGS_CHANGE_THEME = 'Settings: Change Theme',
  SETTINGS_START_TWITTER_OAUTH = 'Settings: Start Twitter OAuth',
  SETTINGS_COMPLETE_TWITTER_OAUTH = 'Settings: Complete Twitter OAuth',
  SETTINGS_START_INSTAGRAM_OAUTH = 'Settings: Start Instagram OAuth',
  SETTINGS_COMPLETE_INSTAGRAM_OAUTH = 'Settings: Complete Instagram OAuth',
  SETTINGS_START_TIKTOK_OAUTH = 'Settings: Start TikTok OAuth',
  SETTINGS_COMPLETE_TIKTOK_OAUTH = 'Settings: Complete TikTok OAuth',
  SETTINGS_RESEND_ACCOUNT_RECOVERY = 'Settings: Resend Account Recovery',
  SETTINGS_START_CHANGE_PASSWORD = 'Settings: Start Change Password',
  SETTINGS_COMPLETE_CHANGE_PASSWORD = 'Settings: Complete Change Password',
  SETTINGS_LOG_OUT = 'Settings: Log Out',

  // TikTok
  // TODO: deprecate the following 3 metrics in favor of the duped CREATE_ACCOUNT ones
  TIKTOK_START_OAUTH = 'TikTok: Start TikTok OAuth',
  TIKTOK_COMPLETE_OAUTH = 'TikTok: Complete TikTok OAuth',
  TIKTOK_OAUTH_ERROR = 'TikTok: TikTok OAuth Error',

  // Audius OAuth Login Page
  AUDIUS_OAUTH_START = 'Audius Oauth: Open Login (authenticate)',
  AUDIUS_OAUTH_SUBMIT = 'Audius Oauth: Submit Login (authenticate)',
  AUDIUS_OAUTH_COMPLETE = 'Audius Oauth: Login (authenticate) Success',
  AUDIUS_OAUTH_ERROR = 'Audius Oauth: Login (authenticate) Failed',

  // Developer app
  DEVELOPER_APP_CREATE_SUBMIT = 'Developer Apps: Create app submit',
  DEVELOPER_APP_CREATE_SUCCESS = 'Developer Apps: Create app success',
  DEVELOPER_APP_CREATE_ERROR = 'Developer Apps: Create app error',
  DEVELOPER_APP_EDIT_SUBMIT = 'Developer Apps: Edit app submit',
  DEVELOPER_APP_EDIT_SUCCESS = 'Developer Apps: Edit app success',
  DEVELOPER_APP_EDIT_ERROR = 'Developer Apps: Edit app error',
  DEVELOPER_APP_DELETE_SUCCESS = 'Developer Apps: Delete app success',
  DEVELOPER_APP_DELETE_ERROR = 'Developer Apps: Delete app error',

  // Authorized app
  AUTHORIZED_APP_REMOVE_SUCCESS = 'Authorized Apps: Remove app success',
  AUTHORIZED_APP_REMOVE_ERROR = 'Authorized Apps: Remove app error',

  // Visualizer
  VISUALIZER_OPEN = 'Visualizer: Open',
  VISUALIZER_CLOSE = 'Visualizer: Close',

  // Profile completion
  ACCOUNT_HEALTH_METER_FULL = 'Account Health: Meter Full',
  ACCOUNT_HEALTH_UPLOAD_COVER_PHOTO = 'Account Health: Upload Cover Photo',
  ACCOUNT_HEALTH_UPLOAD_PROFILE_PICTURE = 'Account Health: Upload Profile Picture',
  ACCOUNT_HEALTH_DOWNLOAD_DESKTOP = 'Account Health: Download Desktop',
  ACCOUNT_HEALTH_CLICK_APP_CTA_BANNER = 'Account Health: App CTA Banner',

  // TOS
  BANNER_TOS_CLICKED = 'Banner TOS Clicked',

  // Social actions
  SHARE = 'Share',
  SHARE_TO_TWITTER = 'Share to Twitter',
  REPOST = 'Repost',
  UNDO_REPOST = 'Undo Repost',
  FAVORITE = 'Favorite',
  UNFAVORITE = 'Unfavorite',
  ARTIST_PICK_SELECT_TRACK = 'Artist Pick: Select Track',
  FOLLOW = 'Follow',
  UNFOLLOW = 'Unfollow',

  // Playlist creation
  PLAYLIST_ADD = 'Playlist: Add To Playlist',
  PLAYLIST_OPEN_CREATE = 'Playlist: Open Create Playlist',
  PLAYLIST_START_CREATE = 'Playlist: Start Create Playlist',
  PLAYLIST_COMPLETE_CREATE = 'Playlist: Complete Create Playlist',
  PLAYLIST_MAKE_PUBLIC = 'Playlist: Make Public',
  PLAYLIST_OPEN_EDIT_FROM_LIBRARY = 'Playlist: Open Edit Playlist From Sidebar',

  DELETE = 'Delete',

  // Folders
  FOLDER_OPEN_CREATE = 'Folder: Open Create Playlist Folder',
  FOLDER_SUBMIT_CREATE = 'Folder: Submit Create Playlist Folder',
  FOLDER_CANCEL_CREATE = 'Folder: Cancel Create Playlist Folder',
  FOLDER_OPEN_EDIT = 'Folder: Open Edit Playlist Folder',
  FOLDER_SUBMIT_EDIT = 'Folder: Submit Edit Playlist Folder',
  FOLDER_DELETE = 'Folder: Delete Playlist Folder',
  FOLDER_CANCEL_EDIT = 'Folder: Cancel Edit Playlist Folder',

  // Embed
  EMBED_OPEN = 'Embed: Open modal',
  EMBED_COPY = 'Embed: Copy',

  // Upload funnel / conversion
  TRACK_UPLOAD_OPEN = 'Track Upload: Open',
  TRACK_UPLOAD_START_UPLOADING = 'Track Upload: Start Upload',
  TRACK_UPLOAD_TRACK_UPLOADING = 'Track Upload: Track Uploading',
  // Note that upload is considered complete if it is explicitly rejected
  // by the node receiving the file (HTTP 403).
  TRACK_UPLOAD_COMPLETE_UPLOAD = 'Track Upload: Complete Upload',
  TRACK_UPLOAD_COPY_LINK = 'Track Upload: Copy Link',
  TRACK_UPLOAD_SHARE_WITH_FANS = 'Track Upload: Share with your fans',
  TRACK_UPLOAD_VIEW_TRACK_PAGE = 'Track Upload: View Track page',
  TWEET_FIRST_UPLOAD = 'Tweet First Upload',

  // Upload success tracking
  TRACK_UPLOAD_SUCCESS = 'Track Upload: Success',
  TRACK_UPLOAD_FAILURE = 'Track Upload: Failure',
  TRACK_UPLOAD_REJECTED = 'Track Upload: Rejected',

  // Gated Track Uploads
  TRACK_UPLOAD_FOLLOW_GATED = 'Track Upload: Follow Gated',
  TRACK_UPLOAD_TIP_GATED = 'Track Upload: Tip Gated',
  TRACK_UPLOAD_USDC_GATED = 'Track Upload: USDC Gated',
  TRACK_UPLOAD_TOKEN_GATED = 'Track Upload: Token Gated',
  TRACK_UPLOAD_CLICK_USDC_WAITLIST_LINK = 'Track Upload: Clicked USDC Waitlist Link',
  // Download-Only Gated Track Uploads
  TRACK_UPLOAD_FOLLOW_GATED_DOWNLOAD = 'Track Upload: Follow Gated Download',
  TRACK_UPLOAD_USDC_GATED_DOWNLOAD = 'Track Upload: USDC Gated Download',
  TRACK_UPLOAD_TOKEN_GATED_DOWNLOAD = 'Track Upload: Token Gated Download',
  TRACK_UPLOAD_CLICK_USDC_DOWNLOAD_WAITLIST_LINK = 'Track Upload: Clicked USDC Download Waitlist Link',

  // Track Downloads
  TRACK_DOWNLOAD_CLICKED_DOWNLOAD_ALL = 'Track Download: Clicked Download All',
  TRACK_DOWNLOAD_SUCCESSFUL_DOWNLOAD_ALL = 'Track Download: Successfull Download All',
  TRACK_DOWNLOAD_FAILED_DOWNLOAD_ALL = 'Track Download: Failed Download All',
  TRACK_DOWNLOAD_CLICKED_DOWNLOAD_SINGLE = 'Track Download: Clicked Download Single',
  TRACK_DOWNLOAD_SUCCESSFUL_DOWNLOAD_SINGLE = 'Track Download: Successfull Download Single',
  TRACK_DOWNLOAD_FAILED_DOWNLOAD_SINGLE = 'Track Download: Failed Download Single',

  // Track Edits
  TRACK_EDIT_ACCESS_CHANGED = 'Track Edit: Access Changed',
  TRACK_EDIT_BPM_CHANGED = 'Track Edit: BPM Changed',
  TRACK_EDIT_MUSICAL_KEY_CHANGED = 'Track Edit: Musical Key Changed',

  // Collection Edits
  COLLECTION_EDIT_ACCESS_CHANGED = 'Collection Edit: Access Changed',
  COLLECTION_EDIT = 'Collection Edit: General Edits',

  // Gated Track Listen
  LISTEN_GATED = 'Listen: Gated',

  // Unlocked Gated Tracks
  USDC_PURCHASE_GATED_TRACK_UNLOCKED = 'USDC Gated: Track Unlocked',
  USDC_PURCHASE_GATED_COLLECTION_UNLOCKED = 'USDC Gated: Collection Unlocked',
  FOLLOW_GATED_TRACK_UNLOCKED = 'Follow Gated: Track Unlocked',
  TIP_GATED_TRACK_UNLOCKED = 'Tip Gated: Track Unlocked',
  TOKEN_GATED_TRACK_UNLOCKED = 'Token Gated: Track Unlocked',
  // Unlocked Download-Only Gated Tracks
  USDC_PURCHASE_GATED_DOWNLOAD_TRACK_UNLOCKED = 'USDC Gated: Download Track Unlocked',
  FOLLOW_GATED_DOWNLOAD_TRACK_UNLOCKED = 'Follow Gated: Download Track Unlocked',
  TOKEN_GATED_DOWNLOAD_TRACK_UNLOCKED = 'Token Gated: Download Track Unlocked',

  // Trending
  TRENDING_CHANGE_VIEW = 'Trending: Change view',
  TRENDING_PAGINATE = 'Trending: Fetch next page',

  // Feed
  FEED_CHANGE_VIEW = 'Feed: Change view',
  FEED_PAGINATE = 'Feed: Fetch next page',

  // Notifications
  NOTIFICATIONS_OPEN = 'Notifications: Open',
  NOTIFICATIONS_CLICK_TILE = 'Notifications: Clicked Tile',
  NOTIFICATIONS_CLICK_MILESTONE_TWITTER_SHARE = 'Notifications: Clicked Milestone Twitter Share',
  NOTIFICATIONS_CLICK_REMIX_CREATE_TWITTER_SHARE = 'Notifications: Clicked Remix Create Twitter Share',
  NOTIFICATIONS_CLICK_REMIX_COSIGN_TWITTER_SHARE = 'Notifications: Clicked Remix Co-Sign Twitter Share',
  NOTIFICATIONS_CLICK_TIP_REACTION_TWITTER_SHARE = 'Notifications: Clicked Tip Reaction Twitter Share',
  NOTIFICATIONS_CLICK_TIP_RECEIVED_TWITTER_SHARE = 'Notifications: Clicked Tip Received Twitter Share',
  NOTIFICATIONS_CLICK_TIP_SENT_TWITTER_SHARE = 'Notifications: Clicked Tip Sent Twitter Share',
  NOTIFICATIONS_CLICK_DETHRONED_TWITTER_SHARE = 'Notifications: Clicked Dethroned Twitter Share',
  NOTIFICATIONS_CLICK_SUPPORTER_RANK_UP_TWITTER_SHARE = 'Notifications: Clicked Supporter Rank Up Twitter Share',
  NOTIFICATIONS_CLICK_SUPPORTING_RANK_UP_TWITTER_SHARE = 'Notifications: Clicked Supporting Rank Up Twitter Share',
  NOTIFICATIONS_CLICK_TRENDING_TRACK_TWITTER_SHARE = 'Notifications: Clicked Trending Track Twitter Share',
  NOTIFICATIONS_CLICK_TRENDING_PLAYLIST_TWITTER_SHARE = 'Notifications: Clicked Trending Playlist Twitter Share',
  NOTIFICATIONS_CLICK_TRENDING_UNDERGROUND_TWITTER_SHARE = 'Notifications: Clicked Trending Underground Twitter Share',
  NOTIFICATIONS_CLICK_TASTEMAKER_TWITTER_SHARE = 'Notifications: Clicked Tastemaker Twitter Share',
  NOTIFICATIONS_CLICK_ADD_TRACK_TO_PLAYLIST_TWITTER_SHARE = 'Notifications: Clicked Add Track to Playlist Twitter Share',
  NOTIFICATIONS_CLICK_USDC_PURCHASE_TWITTER_SHARE = 'Notifications: Clicked USDC Purchase Twitter Share',
  NOTIFICATIONS_TOGGLE_SETTINGS = 'Notifications: Toggle Setting',
  BROWSER_NOTIFICATION_SETTINGS = 'Browser Push Notification',

  // Profile page
  PROFILE_PAGE_TAB_CLICK = 'Profile Page: Tab Click',
  PROFILE_PAGE_SORT = 'Profile Page: Sort',
  PROFILE_PAGE_CLICK_INSTAGRAM = 'Profile Page: Go To Instagram',
  PROFILE_PAGE_CLICK_TWITTER = 'Profile Page: Go To Twitter',
  PROFILE_PAGE_CLICK_TIKTOK = 'Profile Page: Go To TikTok',
  PROFILE_PAGE_CLICK_WEBSITE = 'ProfilePage: Go To Website',
  PROFILE_PAGE_SHOWN_ARTIST_RECOMMENDATIONS = 'ProfilePage: Shown Artist Recommendations',

  // Track page
  TRACK_PAGE_DOWNLOAD = 'Track Page: Download',
  TRACK_PAGE_PLAY_MORE = 'Track Page: Play More By This Artist',

  // Playback
  PLAYBACK_PLAY = 'Playback: Play',
  PLAYBACK_PAUSE = 'Playback: Pause',
  // Playback performance metrics
  BUFFERING_TIME = 'Buffering Time',

  // Navigation
  PAGE_VIEW = 'Page View',
  ON_FIRST_PAGE = 'nav-on-first-page',
  NOT_ON_FIRST_PAGE = 'nav-not-on-first-page',
  LINK_CLICKING = 'Link Click',
  TAG_CLICKING = 'Tag Click',

  // Modals
  MODAL_OPENED = 'Modal Opened',
  MODAL_CLOSED = 'Modal Closed',

  // Search
  SEARCH_SEARCH = 'Search: Search',
  SEARCH_TAG_SEARCH = 'Search: Tag Search',
  SEARCH_MORE_RESULTS = 'Search: More Results',
  SEARCH_RESULT_SELECT = 'Search: Result Select',
  SEARCH_TAB_CLICK = 'Search: Tab Click',

  // Errors
  ERROR_PAGE = 'Error Page',
  NOT_FOUND_PAGE = 'Not Found Page',

  // System
  WEB_VITALS = 'Web Vitals',
  PERFORMANCE = 'Performance',
  CREATOR_NODE_SELECTION = 'Creator Node Selection',

  // Remixes
  STEM_COMPLETE_UPLOAD = 'Stem: Complete Upload',
  STEM_DELETE = 'Stem: Delete',
  REMIX_NEW_REMIX = 'Remix: New Remix',
  REMIX_COSIGN = 'Remix: CoSign',
  REMIX_COSIGN_INDICATOR = 'Remix: CoSign Indicator',
  REMIX_HIDE = 'Remix: Hide',

  // $AUDIO
  SEND_AUDIO_REQUEST = 'Send $AUDIO: Request',
  SEND_AUDIO_SUCCESS = 'Send $AUDIO: Success',
  SEND_AUDIO_FAILURE = 'Send $AUDIO: Failure',

  // AUDIO Manager
  TRANSFER_AUDIO_TO_WAUDIO_REQUEST = 'TRANSFER_AUDIO_TO_WAUDIO_REQUEST',
  TRANSFER_AUDIO_TO_WAUDIO_SUCCESS = 'TRANSFER_AUDIO_TO_WAUDIO_SUCCESS',
  TRANSFER_AUDIO_TO_WAUDIO_FAILURE = 'TRANSFER_AUDIO_TO_WAUDIO_FAILURE',

  // Service monitoring
  SERVICE_MONITOR_REQUEST = 'Service Monitor: Request',
  SERVICE_MONITOR_HEALTH_CHECK = 'Service Monitor: Status',

  // Playlist library
  PLAYLIST_LIBRARY_REORDER = 'Playlist Library: Reorder',
  PLAYLIST_LIBRARY_MOVE_PLAYLIST_INTO_FOLDER = 'Playlist Library: Move Playlist Into Folder',
  PLAYLIST_LIBRARY_ADD_PLAYLIST_TO_FOLDER = 'Playlist Library: Add Playlist To Folder',
  PLAYLIST_LIBRARY_MOVE_PLAYLIST_OUT_OF_FOLDER = 'Playlist Library: Move Playlist Out of Folder',
  PLAYLIST_LIBRARY_EXPAND_FOLDER = 'Playlist Library: Expand Folder',
  PLAYLIST_LIBRARY_COLLAPSE_FOLDER = 'Playlist Library: Collapse Folder',
  // When a user clicks on a playlist in the library
  PLAYLIST_LIBRARY_CLICKED = 'Playlist Library: Clicked',

  // Deactivate Account
  DEACTIVATE_ACCOUNT_PAGE_VIEW = 'Deactivate Account: Page View',
  DEACTIVATE_ACCOUNT_REQUEST = 'Deactivate Account: Request',
  DEACTIVATE_ACCOUNT_SUCCESS = 'Deactivate Account: Success',
  DEACTIVATE_ACCOUNT_FAILURE = 'Deactivate Account: Failure',

  // Create User Bank
  CREATE_USER_BANK_REQUEST = 'Create User Bank: Request',
  CREATE_USER_BANK_SUCCESS = 'Create User Bank: Success',
  CREATE_USER_BANK_FAILURE = 'Create User Bank: Failure',

  // Rewards
  REWARDS_CLAIM_DETAILS_OPENED = 'Rewards Claim: Opened',
  REWARDS_CLAIM_ALL_REQUEST = 'Rewards Claim All: Request',
  REWARDS_CLAIM_ALL_SUCCESS = 'Rewards Claim All: Success',
  REWARDS_CLAIM_ALL_FAILURE = 'Rewards Claim All: Failure',
  REWARDS_CLAIM_ALL_BLOCKED = 'Rewards Claim All: Blocked',
  REWARDS_CLAIM_REQUEST = 'Rewards Claim: Request',
  REWARDS_CLAIM_SUCCESS = 'Rewards Claim: Success',
  REWARDS_CLAIM_FAILURE = 'Rewards Claim: Failure',
  REWARDS_CLAIM_BLOCKED = 'Rewards Claim: Blocked',

  // Tipping
  TIP_AUDIO_REQUEST = 'Tip Audio: Request',
  TIP_AUDIO_SUCCESS = 'Tip Audio: Success',
  TIP_AUDIO_FAILURE = 'Tip Audio: Failure',
  TIP_AUDIO_TWITTER_SHARE = 'Tip Audio: Twitter Share',
  TIP_FEED_TILE_DISMISS = 'Tip Feed Tile: Dismiss',

  // Social Proof
  SOCIAL_PROOF_OPEN = 'Social Proof: Open',
  SOCIAL_PROOF_SUCCESS = 'Social Proof: Success',
  SOCIAL_PROOF_ERROR = 'Social Proof: Error',

  // Buy Audio
  BUY_AUDIO_ON_RAMP_OPENED = 'Buy Audio: On Ramp Opened',
  BUY_AUDIO_ON_RAMP_CANCELED = 'Buy Audio: On Ramp Canceled',
  BUY_AUDIO_ON_RAMP_SUCCESS = 'Buy Audio: On Ramp Success',
  BUY_AUDIO_SUCCESS = 'Buy Audio: Success',
  BUY_AUDIO_FAILURE = 'Buy Audio: Failure',

  // Buy Audio Recovery
  BUY_AUDIO_RECOVERY_OPENED = 'Buy Audio Recovery: Opened',
  BUY_AUDIO_RECOVERY_SUCCESS = 'Buy Audio Recovery: Success',
  BUY_AUDIO_RECOVERY_FAILURE = 'Buy Audio Recovery: Failure',

  // Buy USDC
  BUY_USDC_ON_RAMP_OPENED = 'Buy USDC: On Ramp Opened',
  BUY_USDC_ON_RAMP_CANCELED = 'Buy USDC: On Ramp Canceled',
  BUY_USDC_ON_RAMP_FAILURE = 'Buy USDC: On Ramp Failed',
  BUY_USDC_ON_RAMP_SUCCESS = 'Buy USDC: On Ramp Success',
  BUY_USDC_SUCCESS = 'Buy USDC: Success',
  BUY_USDC_FAILURE = 'Buy USDC: Failure',
  BUY_USDC_RECOVERY_IN_PROGRESS = 'Buy USDC: Recovery In Progress',
  BUY_USDC_RECOVERY_SUCCESS = 'Buy USDC: Recovery Success',
  BUY_USDC_RECOVERY_FAILURE = 'Buy USDC: Recovery Failure',
  BUY_USDC_ADD_FUNDS_MANUALLY = 'Buy USDC: Add Funds Manually',

  BUY_SELL_SWAP_REQUESTED = 'Buy Sell Modal: Swap Requested',
  BUY_SELL_SWAP_CONFIRMED = 'Buy Sell Modal: Swap Confirmed',
  BUY_SELL_SWAP_SUCCESS = 'Buy Sell Modal: Swap Success',
  BUY_SELL_SWAP_FAILURE = 'Buy Sell Modal: Swap Failure',
  BUY_SELL_ADD_FUNDS_CLICKED = 'Buy Sell Modal: Add Funds Clicked',

  // Withdraw USDC

  WITHDRAW_USDC_MODAL_OPENED = 'Withdraw USDC: Modal Opened',
  WITHDRAW_USDC_ADDRESS_PASTED = 'Withdraw USDC: Address Pasted',
  WITHDRAW_USDC_REQUESTED = 'Withdraw USDC: Requested',
  WITHDRAW_USDC_CREATE_DEST_TOKEN_ACCOUNT_START = 'Withdraw USDC: Create Destination Token Account Started',
  WITHDRAW_USDC_CREATE_DEST_TOKEN_ACCOUNT_SUCCESS = 'Withdraw USDC: Create Destination Token Account Success',
  WITHDRAW_USDC_CREATE_DEST_TOKEN_ACCOUNT_FAILED = 'Withdraw USDC: Create Destination Token Account Failed',
  WITHDRAW_USDC_TRANSFER_TO_ROOT_WALLET = 'Withdraw USDC: Transfer to Root Wallet',
  WITHDRAW_USDC_COINFLOW_WITHDRAWAL_READY = 'Withdraw USDC: Coinflow Withdrawal Ready',
  WITHDRAW_USDC_COINFLOW_SEND_TRANSACTION = 'Withdraw USDC: Coinflow Send Transaction',
  WITHDRAW_USDC_COINFLOW_SEND_TRANSACTION_FAILED = 'Withdraw USDC: Coinflow Send Transaction Failed',
  WITHDRAW_USDC_CANCELLED = 'Withdraw USDC: Cancelled',
  WITHDRAW_USDC_FORM_ERROR = 'Withdraw USDC: Form Error',
  WITHDRAW_USDC_SUCCESS = 'Withdraw USDC: Success',
  WITHDRAW_USDC_FAILURE = 'Withdraw USDC: Failure',
  WITHDRAW_USDC_HELP_LINK_CLICKED = 'Withdraw USDC: Help Link Clicked',
  WITHDRAW_USDC_TRANSACTION_LINK_CLICKED = 'Withdraw USDC: Transaction Link Clicked',

  // Stripe Tracking
  STRIPE_SESSION_CREATION_ERROR = 'Stripe: Session Creation Error',
  STRIPE_SESSION_CREATED = 'Stripe Session: Created',
  STRIPE_MODAL_INITIALIZED = 'Stripe Modal: Initialized',
  STRIPE_REQUIRES_PAYMENT = 'Stripe Modal: Requires Payment',
  STRIPE_FULLFILMENT_PROCESSING = 'Stripe Modal: Fulfillment Processing',
  STRIPE_FULLFILMENT_COMPLETE = 'Stripe Modal: Fulfillment Complete',
  STRIPE_ERROR = 'Stripe Modal: Error',
  STRIPE_REJECTED = 'Stripe Modal: Rejected',

  // Purchase Content

  PURCHASE_CONTENT_BUY_CLICKED = 'Purchase Content: Buy Clicked',
  PURCHASE_CONTENT_STARTED = 'Purchase Content: Started',
  PURCHASE_CONTENT_SUCCESS = 'Purchase Content: Success',
  PURCHASE_CONTENT_FAILURE = 'Purchase Content: Failure',
  PURCHASE_CONTENT_TWITTER_SHARE = 'Purchase Content: Twitter Share',
  PURCHASE_CONTENT_TOS_CLICKED = 'Purchase Content: Terms of Service Link Clicked',
  PURCHASE_CONTENT_USDC_USER_BANK_COPIED = 'Purchase Content: USDC User Bank Copied',

  // Rate & Review CTA
  RATE_CTA_DISPLAYED = 'Rate CTA: Displayed',
  RATE_CTA_RESPONSE_YES = 'Rate CTA: User Responded Yes',
  RATE_CTA_RESPONSE_NO = 'Rate CTA: User Responded No',

  // Connect Wallet
  CONNECT_WALLET_NEW_WALLET_START = 'Connect Wallet: New Wallet Start',
  CONNECT_WALLET_NEW_WALLET_CONNECTING = 'Connect Wallet: New Wallet Connecting',
  CONNECT_WALLET_NEW_WALLET_CONNECTED = 'Connect Wallet: New Wallet Connected',
  CONNECT_WALLET_DISCONNECTED = 'Connect Wallet: Disconnected',
  CONNECT_WALLET_ALREADY_ASSOCIATED = 'Connect Wallet: Already Associated',
  CONNECT_WALLET_ASSOCIATION_ERROR = 'Connect Wallet: Association Error',
  CONNECT_WALLET_ERROR = 'Connect Wallet: Error',

  // Chat
  CREATE_CHAT_SUCCESS = 'Create Chat: Success',
  CREATE_CHAT_FAILURE = 'Create Chat: Failure',
  CHAT_BLAST_CTA_CLICKED = 'Chat Blast: CTA Clicked',
  CREATE_CHAT_BLAST_SUCCESS = 'Chat Blast: Create - Success',
  CREATE_CHAT_BLAST_FAILURE = 'Chat Blast: Create - Failure',
  CHAT_BLAST_MESSAGE_SENT = 'Chat Blast: Message Sent',
  SEND_MESSAGE_SUCCESS = 'Send Message: Success',
  SEND_MESSAGE_FAILURE = 'Send Message: Failure',
  DELETE_CHAT_SUCCESS = 'Delete Chat: Success',
  DELETE_CHAT_FAILURE = 'Delete Chat: Failure',
  BLOCK_USER_SUCCESS = 'Block User: Success',
  BLOCK_USER_FAILURE = 'Block User: Failure',
  CHANGE_INBOX_SETTINGS_SUCCESS = 'Change Inbox Settings: Success',
  CHANGE_INBOX_SETTINGS_FAILURE = 'Change Inbox Settings: Failure',
  SEND_MESSAGE_REACTION_SUCCESS = 'Send Message Reaction: Success',
  SEND_MESSAGE_REACTION_FAILURE = 'Send Message Reaction: Failure',
  MESSAGE_UNFURL_TRACK = 'Message Unfurl: Track',
  MESSAGE_UNFURL_PLAYLIST = 'Message Unfurl: Playlist',
  TIP_UNLOCKED_CHAT = 'Unlocked Chat: Tip',
  CHAT_REPORT_USER = 'Report User: Chat',
  CHAT_ENTRY_POINT = 'Chat Entry Point',
  CHAT_WEBSOCKET_ERROR = 'Chat Websocket Error',

  // Jupiter
  JUPITER_QUOTE_REQUEST = 'Jupiter: Quote Request',
  JUPITER_QUOTE_RESPONSE = 'Jupiter: Quote Response',

  // Repair Signups
  SIGN_UP_REPAIR_START = 'Sign Up Repair: Start',
  SIGN_UP_REPAIR_SUCCESS = 'Sign Up Repair: Success',
  SIGN_UP_REPAIR_FAILURE = 'Sign Up Repair: Failure',

  // Export Private Key
  EXPORT_PRIVATE_KEY_LINK_CLICKED = 'Export Private Key: Settings Link Clicked',
  EXPORT_PRIVATE_KEY_PAGE_VIEWED = 'Export Private Key: Page Viewed',
  EXPORT_PRIVATE_KEY_MODAL_OPENED = 'Export Private Key: Modal Opened',
  EXPORT_PRIVATE_KEY_PUBLIC_ADDRESS_COPIED = 'Export Private Key: Public Address Copied',
  EXPORT_PRIVATE_KEY_PRIVATE_KEY_COPIED = 'Export Private Key: Private Key Copied',

  // Manager Mode
  MANAGER_MODE_SWITCH_ACCOUNT = 'Manager Mode: Switch Account',
  MANAGER_MODE_INVITE_MANAGER = 'Manager Mode: Invite Manager',
  MANAGER_MODE_ACCEPT_INVITE = 'Manager Mode: Accept Invite',
  MANAGER_MODE_CANCEL_INVITE = 'Manager Mode: Cancel Invite',
  MANAGER_MODE_REJECT_INVITE = 'Manager Mode: Reject Invite',
  MANAGER_MODE_REMOVE_MANAGER = 'Manager Mode: Remove Manager',

  // Comments
  COMMENTS_CREATE_COMMENT = 'Comments: Create Comment',
  COMMENTS_UPDATE_COMMENT = 'Comments: Update Comment',
  COMMENTS_DELETE_COMMENT = 'Comments: Delete Comment',
  COMMENTS_REPLY_TO_COMMENT = 'Comments: Reply to Comment',
  COMMENTS_FOCUS_COMMENT_INPUT = 'Comments: Focus Comment Input',
  COMMENTS_CLICK_REPLY_BUTTON = 'Comments: Click Reply Button',
  COMMENTS_LIKE_COMMENT = 'Comments: Like Comment',
  COMMENTS_UNLIKE_COMMENT = 'Comments: Unlike Comment',
  COMMENTS_REPORT_COMMENT = 'Comments: Report Comment',
  COMMENTS_ADD_MENTION = 'Comments: Add Mention',
  COMMENTS_CLICK_MENTION = 'Comments: Click Mention',
  COMMENTS_ADD_TIMESTAMP = 'Comments: Add Timestamp',
  COMMENTS_CLICK_TIMESTAMP = 'Comments: Click Timestamp',
  COMMENTS_ADD_LINK = 'Comments: Add Link',
  COMMENTS_CLICK_LINK = 'Comments: Click Link',
  COMMENTS_NOTIFICATION_OPEN = 'Comments: Notification Open',
  COMMENTS_MUTE_USER = 'Comments: Mute User',
  COMMENTS_UNMUTE_USER = 'Comments: Unmute User',
  COMMENTS_PIN_COMMENT = 'Comments: Pin Comment',
  COMMENTS_UNPIN_COMMENT = 'Comments: Unpin Comment',
  COMMENTS_LOAD_MORE_COMMENTS = 'Comments: Load More Comments',
  COMMENTS_LOAD_NEW_COMMENTS = 'Comments: Load New Comments',
  COMMENTS_SHOW_REPLIES = 'Comments: Show Replies',
  COMMENTS_LOAD_MORE_REPLIES = 'Comments: Load More Replies',
  COMMENTS_HIDE_REPLIES = 'Comments: Hide Replies',
  COMMENTS_APPLY_SORT = 'Comments: Apply Sort',
  COMMENTS_CLICK_COMMENT_STAT = 'Comments: Click Comment Stat',
  COMMENTS_OPEN_COMMENT_OVERFLOW_MENU = 'Comments: Open Comment Overflow Menu',
  COMMENTS_TURN_ON_NOTIFICATIONS_FOR_COMMENT = 'Comments: Turn On Notifications for Comment',
  COMMENTS_TURN_OFF_NOTIFICATIONS_FOR_COMMENT = 'Comments: Turn Off Notifications for Comment',
  COMMENTS_OPEN_TRACK_OVERFLOW_MENU = 'Comments: Open Track Overflow Menu',
  COMMENTS_TURN_ON_NOTIFICATIONS_FOR_TRACK = 'Comments: Turn On Notifications for Track',
  COMMENTS_TURN_OFF_NOTIFICATIONS_FOR_TRACK = 'Comments: Turn Off Notifications for Track',
  COMMENTS_DISABLE_TRACK_COMMENTS = 'Comments: Disable Track Comments',
  COMMENTS_OPEN_COMMENT_DRAWER = 'Comments: Open Comment Drawer',
  COMMENTS_CLOSE_COMMENT_DRAWER = 'Comments: Close Comment Drawer',
  COMMENTS_OPEN_AUTH_MODAL = 'Comments: Open Auth Modal',
  COMMENTS_OPEN_INSTALL_APP_MODAL = 'Comments: Open Install App Modal',

  // Recent Comments
  RECENT_COMMENTS_CLICK = 'Recent Comments: Click',
  COMMENTS_HISTORY_CLICK = 'Comments History: Click',
  COMMENTS_HISTORY_DRAWER_OPEN = 'Comments History: Drawer Open',

  // Track Replace
  TRACK_REPLACE_DOWNLOAD = 'Track Replace: Download',
  TRACK_REPLACE_PREVIEW = 'Track Replace: Preview',
  TRACK_REPLACE_REPLACE = 'Track Replace: Replace',

  // Remix Contests
  REMIX_CONTEST_CREATE = 'Remix Contest: Create',
  REMIX_CONTEST_UPDATE = 'Remix Contest: Update',
  REMIX_CONTEST_DELETE = 'Remix Contest: Delete',
  REMIX_CONTEST_PICK_WINNERS_OPEN = 'Remix Contest: Pick Winners Open',
  REMIX_CONTEST_PICK_WINNERS_FINALIZE = 'Remix Contest: Finalize Winners',

  // Android App Lifecycle
  ANDROID_APP_RESTART_HEARTBEAT = 'Android App: Restart Due to Heartbeat',
  ANDROID_APP_RESTART_STALE = 'Android App: Restart Due to Stale Time',
  ANDROID_APP_RESTART_FORCE_QUIT = 'Android App: Restart Due to Force Quit',

  // Artist Coins
  BANNER_ARTIST_COINS_LAUNCH_CLICKED = 'Banner Artist Coins Launch Clicked',

  // Artist Coin Launchpad
  LAUNCHPAD_SPLASH_GET_STARTED = 'Launchpad: Get Started Clicked',
  LAUNCHPAD_HAS_EXISTING_ARTIST_COIN = 'Launchpad: Has Existing Artist Coin',
  LAUNCHPAD_SPLASH_LEARN_MORE_CLICKED = 'Launchpad: Learn More Clicked',
  LAUNCHPAD_WALLET_CONNECT_SUCCESS = 'Launchpad: Wallet Connect Success',
  LAUNCHPAD_WALLET_CONNECT_ERROR = 'Launchpad: Wallet Connect Error',
  LAUNCHPAD_WALLET_INSUFFICIENT_BALANCE = 'Launchpad: Wallet Insufficient Balance',
  LAUNCHPAD_SETUP_CONTINUE = 'Launchpad: Setup Continue',
  LAUNCHPAD_FORM_BACK = 'Launchpad: Back To Previous Step',
  LAUNCHPAD_FORM_INPUT_CHANGE = 'Launchpad: Form Input Change',
  LAUNCHPAD_REVIEW_CONTINUE = 'Launchpad: Review Continue',
  LAUNCHPAD_COIN_CREATION_STARTED = 'Launchpad: Coin Creation Started',
  LAUNCHPAD_COIN_CREATION_SUCCESS = 'Launchpad: Coin Creation Success',
  LAUNCHPAD_COIN_CREATION_FAILURE = 'Launchpad: Coin Creation Failure',
  LAUNCHPAD_FIRST_BUY_STARTED = 'Launchpad: First Buy Started',
  LAUNCHPAD_FIRST_BUY_SUCCESS = 'Launchpad: First Buy Success',
  LAUNCHPAD_FIRST_BUY_FAILURE = 'Launchpad: First Buy Failure',
  LAUNCHPAD_FIRST_BUY_RETRY = 'Launchpad: First Buy Retry',
  LAUNCHPAD_FIRST_BUY_MAX_BUTTON = 'Launchpad: First Buy Max Button Clicked',
  LAUNCHPAD_FIRST_BUY_QUOTE_RECEIVED = 'Launchpad: First Buy Quote Received',
  LAUNCHPAD_BUY_MODAL_OPEN = 'Launchpad: Buy Audio Modal Open',
  LAUNCHPAD_BUY_MODAL_CLOSE = 'Launchpad: Buy Audio Modal Close',
  LAUNCHPAD_BUY_MODAL_SUBMIT = 'Launchpad: Buy Audio Modal Submit',
  LAUNCHPAD_BUY_MODAL_SUCCESS = 'Launchpad: Buy Audio Modal Success',
  LAUNCHPAD_BUY_MODAL_FAILURE = 'Launchpad: Buy Audio Modal Failure',
  LAUNCHPAD_BUY_MODAL_CHANGE_CURRENCY = 'Launchpad: Buy Audio Modal Change Currency',
  LAUNCHPAD_BUY_MODAL_FORM_CHANGE = 'Launchpad: Buy Audio Modal Form Change',
  LAUNCHPAD_BUY_MODAL_MAX_BUTTON = 'Launchpad: Buy Audio Modal Max Button Clicked',
  LAUNCHPAD_BUY_MODAL_CONTINUE = 'Launchpad: Buy Audio Modal Continue Clicked',
  LAUNCHPAD_BUY_MODAL_BACK = 'Launchpad: Buy Audio Modal Back Clicked',
  LAUNCHPAD_CLAIM_FEES_CLICKED = 'Launchpad: Claim Fees Clicked',
  LAUNCHPAD_CLAIM_FEES_SUCCESS = 'Launchpad: Claim Fees Success',
  LAUNCHPAD_CLAIM_FEES_FAILURE = 'Launchpad: Claim Fees Failure',
  LAUNCHPAD_CLAIM_FEES_CONNECT_WALLET = 'Launchpad: Claim Fees Connect Wallet',
  LAUNCHPAD_CLAIM_FEES_SWITCH_WALLET = 'Launchpad: Claim Fees Switch Wallet',
  LAUNCHPAD_CLAIM_VESTED_COINS_SWITCH_WALLET = 'Launchpad: Claim Vested Coins Switch Wallet',
  LAUNCHPAD_CLAIM_VESTED_COINS_CLICKED = 'Launchpad: Claim Vested Coins Clicked',
  LAUNCHPAD_CLAIM_VESTED_COINS_CONNECT_WALLET = 'Launchpad: Claim Vested Coins Connect Wallet',
  LAUNCHPAD_CLAIM_FEES_WALLET_CONNECTED = 'Launchpad: Claim Fees Wallet Connected',
  LAUNCHPAD_CLAIM_VESTED_COINS_WALLET_CONNECTED = 'Launchpad: Claim Vested Coins Wallet Connected',
  LAUNCHPAD_CLAIM_VESTED_COINS_SUCCESS = 'Launchpad: Claim Vested Coins Success',
  LAUNCHPAD_CLAIM_VESTED_COINS_FAILURE = 'Launchpad: Claim Vested Coins Failure'
}

type PageView = {
  eventName: Name.PAGE_VIEW
  route: string
}

type AppError = {
  eventName: Name.APP_ERROR
  errorMessage: string
}

// Create Account
export type CreateAccountOpen = {
  eventName: Name.CREATE_ACCOUNT_OPEN
  source:
    | 'nav profile'
    | 'nav button'
    | 'landing page'
    | 'account icon'
    | 'social action'
    | 'sign in page'
    | 'restricted page'
}
type CreateAccountCompleteEmail = {
  eventName: Name.CREATE_ACCOUNT_COMPLETE_EMAIL
  emailAddress: string
}
type CreateAccountCompletePassword = {
  eventName: Name.CREATE_ACCOUNT_COMPLETE_PASSWORD
  emailAddress: string
}
// Twitter Account Creation
type CreateAccountStartTwitter = {
  eventName: Name.CREATE_ACCOUNT_START_TWITTER
  emailAddress?: string
  page?: 'create-email' | 'pick-handle'
}
type CreateAccountCompleteTwitter = {
  eventName: Name.CREATE_ACCOUNT_COMPLETE_TWITTER
  isVerified: boolean
  emailAddress?: string
  handle: string
  page?: 'create-email' | 'pick-handle'
}
type CreateAccountClosedTwitter = {
  eventName: Name.CREATE_ACCOUNT_CLOSED_TWITTER
  emailAddress?: string
  page?: 'create-email' | 'pick-handle'
}
type CreateAccountTwitterError = {
  eventName: Name.CREATE_ACCOUNT_TWITTER_ERROR
  emailAddress?: string
  error?: string
  page?: 'create-email' | 'pick-handle'
}

// Instagram Account Creation
type CreateAccountStartInstagram = {
  eventName: Name.CREATE_ACCOUNT_START_INSTAGRAM
  emailAddress?: string
  page?: string
}
type CreateAccountCompleteInstagram = {
  eventName: Name.CREATE_ACCOUNT_COMPLETE_INSTAGRAM
  isVerified: boolean
  emailAddress?: string
  handle: string
  page?: string
}
type CreateAccountClosedInstagram = {
  eventName: Name.CREATE_ACCOUNT_CLOSED_INSTAGRAM
  emailAddress?: string
  page?: 'create-email' | 'pick-handle'
}
type CreateAccountInstagramError = {
  eventName: Name.CREATE_ACCOUNT_INSTAGRAM_ERROR
  emailAddress?: string
  error?: string
  page?: 'create-email' | 'pick-handle'
}

// TikTok account creation
type CreateAccountStartTikTok = {
  eventName: Name.CREATE_ACCOUNT_START_TIKTOK
  emailAddress?: string
  page?: string
}
type CreateAccountClosedTikTok = {
  eventName: Name.CREATE_ACCOUNT_CLOSED_TIKTOK
  page?: 'create-email' | 'pick-handle'
}
type CreateAccountCompleteTikTok =
  | {
      eventName: Name.CREATE_ACCOUNT_COMPLETE_TIKTOK
      emailAddress: string
      page?: string
    }
  | {
      eventName: Name.CREATE_ACCOUNT_COMPLETE_TIKTOK
      isVerified: boolean
      handle: string
      page?: string
    }
type CreateAccountTikTokError = {
  eventName: Name.CREATE_ACCOUNT_TIKTOK_ERROR
  error?: string
  page?: 'create-email' | 'pick-handle'
}

type CreateAccountUploadProfilePhoto = {
  eventName: Name.CREATE_ACCOUNT_UPLOAD_PROFILE_PHOTO
  emailAddress?: string
  handle?: string
}
type CreateAccountUploadProfilePhotoError = {
  eventName: Name.CREATE_ACCOUNT_UPLOAD_PROFILE_PHOTO_ERROR
  error: string
}
type CreateAccountUploadProfileCover = {
  eventName: Name.CREATE_ACCOUNT_UPLOAD_COVER_PHOTO
  emailAddress?: string
  handle?: string
}
type CreateAccountUploadProfileCoverError = {
  eventName: Name.CREATE_ACCOUNT_UPLOAD_COVER_PHOTO_ERROR
  error: string
}
type CreateAccountCompleteProfile = {
  eventName: Name.CREATE_ACCOUNT_COMPLETE_PROFILE
  emailAddress: string
  handle: string
}
type CreateAccountSelectGenre = {
  eventName: Name.CREATE_ACCOUNT_SELECT_GENRE
  emailAddress?: string
  handle?: string
  genre: Genre
  selectedGenres: Genre[]
}
type CreateAccountFollowArtist = {
  eventName: Name.CREATE_ACCOUNT_FOLLOW_ARTIST
  emailAddress?: string
  handle?: string
  artistID: number
  artistName: string
}

type CreateAccountPreviewArtist = {
  eventName: Name.CREATE_ACCOUNT_ARTIST_PREVIEWED
  artistID: number
  artistName: string
}

type CreateAccountCompleteFollow = {
  eventName: Name.CREATE_ACCOUNT_COMPLETE_FOLLOW
  emailAddress: string
  handle: string
  users: string
  count: number
}
type CreateAccountCompleteCreating = {
  eventName: Name.CREATE_ACCOUNT_COMPLETE_CREATING
  emailAddress: string
  handle: string
}
type CreateAccountWelcomeModal = {
  eventName: Name.CREATE_ACCOUNT_WELCOME_MODAL
  emailAddress: string
  handle: string
}
type CreateAccountWelcomeModalUploadTrack = {
  eventName: Name.CREATE_ACCOUNT_WELCOME_MODAL_UPLOAD_TRACK
  emailAddress: string
  handle: string
}
type CreateAccountOpenFinish = {
  eventName: Name.CREATE_ACCOUNT_FINISH
  emailAddress: string
  handle: string
}

// Sign In
type SignInStart = {
  eventName: Name.SIGN_IN_START
}
type SignInFinish = {
  eventName: Name.SIGN_IN_FINISH
  status: 'success' | 'invalid credentials'
}

type SignInWithIncompleteAccount = {
  eventName: Name.SIGN_IN_WITH_INCOMPLETE_ACCOUNT
  handle: string
}

// Settings
type SettingsChangeTheme = {
  eventName: Name.SETTINGS_CHANGE_THEME
  mode: 'dark' | 'light' | 'matrix' | 'auto'
}
type SettingsStartTwitterOauth = {
  eventName: Name.SETTINGS_START_TWITTER_OAUTH
  handle?: string
}
type SettingsCompleteTwitterOauth = {
  eventName: Name.SETTINGS_COMPLETE_TWITTER_OAUTH
  handle?: string
  screen_name: string
  is_verified: boolean
}
type SettingsStartInstagramOauth = {
  eventName: Name.SETTINGS_START_INSTAGRAM_OAUTH
  handle?: string
}
type SettingsCompleteInstagramOauth = {
  eventName: Name.SETTINGS_COMPLETE_INSTAGRAM_OAUTH
  handle?: string
  username: string
  is_verified: boolean
}
type SettingsStartTikTokOauth = {
  eventName: Name.SETTINGS_START_TIKTOK_OAUTH
  handle?: string
}
type SettingsCompleteTikTokOauth = {
  eventName: Name.SETTINGS_COMPLETE_TIKTOK_OAUTH
  handle?: string
  username: string
  is_verified: boolean
}
type SettingsResetAccountRecovery = {
  eventName: Name.SETTINGS_RESEND_ACCOUNT_RECOVERY
}
type SettingsStartChangePassword = {
  eventName: Name.SETTINGS_START_CHANGE_PASSWORD
}
type SettingsCompleteChangePassword = {
  eventName: Name.SETTINGS_COMPLETE_CHANGE_PASSWORD
  status: 'success' | 'failure'
}
type SettingsLogOut = {
  eventName: Name.SETTINGS_LOG_OUT
}

// TikTok
type TikTokStartOAuth = {
  eventName: Name.TIKTOK_START_OAUTH
}

type TikTokCompleteOAuth = {
  eventName: Name.TIKTOK_COMPLETE_OAUTH
}

type TikTokOAuthError = {
  eventName: Name.TIKTOK_OAUTH_ERROR
  error: string
}

// Error
type ErrorPage = {
  eventName: Name.ERROR_PAGE
  error: string
  name: string
  route?: string
}
type NotFoundPage = {
  eventName: Name.NOT_FOUND_PAGE
}

// Visualizer
type VisualizerOpen = {
  eventName: Name.VISUALIZER_OPEN
}
type VisualizerClose = {
  eventName: Name.VISUALIZER_CLOSE
}

type AccountHealthMeterFull = {
  eventName: Name.ACCOUNT_HEALTH_METER_FULL
}
type AccountHealthUploadCoverPhoto = {
  eventName: Name.ACCOUNT_HEALTH_UPLOAD_COVER_PHOTO
  source: 'original' | 'unsplash' | 'url'
}
type AccountHealthUploadProfilePhoto = {
  eventName: Name.ACCOUNT_HEALTH_UPLOAD_PROFILE_PICTURE
  source: 'original' | 'unsplash' | 'url'
}
type AccountHealthDownloadDesktop = {
  eventName: Name.ACCOUNT_HEALTH_DOWNLOAD_DESKTOP
  source: 'banner' | 'settings'
}

type AccountHealthCTABanner = {
  eventName: Name.ACCOUNT_HEALTH_CLICK_APP_CTA_BANNER
}

// Social
export enum ShareSource {
  TILE = 'tile',
  PAGE = 'page',
  NOW_PLAYING = 'now playing',
  OVERFLOW = 'overflow',
  LEFT_NAV = 'left-nav',
  UPLOAD = 'upload'
}
export enum RepostSource {
  TILE = 'tile',
  PLAYBAR = 'playbar',
  NOW_PLAYING = 'now playing',
  TRACK_PAGE = 'page',
  COLLECTION_PAGE = 'collection page',
  HISTORY_PAGE = 'history page',
  LIBRARY_PAGE = 'library page',
  OVERFLOW = 'overflow',
  TRACK_LIST = 'track list',
  PURCHASE = 'purchase'
}
export enum FavoriteSource {
  TILE = 'tile',
  PLAYBAR = 'playbar',
  NOW_PLAYING = 'now playing',
  TRACK_PAGE = 'page',
  COLLECTION_PAGE = 'collection page',
  HISTORY_PAGE = 'history page',
  LIBRARY_PAGE = 'library page',
  OVERFLOW = 'overflow',
  TRACK_LIST = 'track list',
  SIGN_UP = 'sign up',
  OFFLINE_DOWNLOAD = 'offline download',
  // Favorite triggered by some implicit action, e.g.
  // you had a smart collection and it was favorited so it
  // shows in your left-nav.
  IMPLICIT = 'implicit',
  NAVIGATOR = 'navigator'
}
export enum FollowSource {
  INBOX_UNAVAILABLE_MODAL = 'inbox unavailable modal',
  PROFILE_PAGE = 'profile page',
  TRACK_PAGE = 'track page',
  COLLECTION_PAGE = 'collection page',
  HOVER_TILE = 'hover tile',
  OVERFLOW = 'overflow',
  USER_LIST = 'user list',
  ARTIST_RECOMMENDATIONS_POPUP = 'artist recommendations popup',
  EMPTY_FEED = 'empty feed',
  HOW_TO_UNLOCK_TRACK_PAGE = 'how to unlock track page',
  HOW_TO_UNLOCK_MODAL = 'how to unlock modal',
  SIGN_UP = 'sign up'
}

type Share = {
  eventName: Name.SHARE
  kind: 'profile' | 'album' | 'playlist' | 'track'
  source: ShareSource
  id: string
  url: string
}

export type ShareToTwitter = {
  eventName: Name.SHARE_TO_TWITTER
  kind: 'profile' | 'album' | 'playlist' | 'track'
  source: ShareSource
  id: number
  url: string
}

type Repost = {
  eventName: Name.REPOST
  kind: PlayableType
  source: RepostSource
  id: string
}
type UndoRepost = {
  eventName: Name.UNDO_REPOST
  kind: PlayableType
  source: RepostSource
  id: string
}
type Favorite = {
  eventName: Name.FAVORITE
  kind: PlayableType
  source: FavoriteSource
  id: string
}
type Unfavorite = {
  eventName: Name.UNFAVORITE
  kind: PlayableType
  source: FavoriteSource
  id: string
}
type ArtistPickSelectTrack = {
  eventName: Name.ARTIST_PICK_SELECT_TRACK
  id: string
}
type Follow = {
  eventName: Name.FOLLOW
  id: string
  source: FollowSource
}
type Unfollow = {
  eventName: Name.UNFOLLOW
  id: string
  source: FollowSource
}
type TweetFirstUpload = {
  eventName: Name.TWEET_FIRST_UPLOAD
  handle: string
}

// Playlist
export enum CreatePlaylistSource {
  NAV = 'nav',
  CREATE_PAGE = 'create page',
  FROM_TRACK = 'from track',
  LIBRARY_PAGE = 'library page',
  PROFILE_PAGE = 'profile page'
}

type PlaylistAdd = {
  eventName: Name.PLAYLIST_ADD
  trackId: string
  playlistId: string
}
type PlaylistOpenCreate = {
  eventName: Name.PLAYLIST_OPEN_CREATE
  source: CreatePlaylistSource
}
type PlaylistStartCreate = {
  eventName: Name.PLAYLIST_START_CREATE
  source: CreatePlaylistSource
  artworkSource: 'unsplash' | 'original'
}
type PlaylistCompleteCreate = {
  eventName: Name.PLAYLIST_COMPLETE_CREATE
  source: CreatePlaylistSource
  status: 'success' | 'failure'
}
type PlaylistMakePublic = {
  eventName: Name.PLAYLIST_MAKE_PUBLIC
  id: string
}

type PlaylistOpenEditFromLibrary = {
  eventName: Name.PLAYLIST_OPEN_EDIT_FROM_LIBRARY
}

type Delete = {
  eventName: Name.DELETE
  kind: PlayableType
  id: string
}

// Folder

type FolderOpenCreate = {
  eventName: Name.FOLDER_OPEN_CREATE
}

type FolderSubmitCreate = {
  eventName: Name.FOLDER_SUBMIT_CREATE
}

type FolderCancelCreate = {
  eventName: Name.FOLDER_CANCEL_CREATE
}

type FolderOpenEdit = {
  eventName: Name.FOLDER_OPEN_EDIT
}

type FolderSubmitEdit = {
  eventName: Name.FOLDER_SUBMIT_EDIT
}

type FolderDelete = {
  eventName: Name.FOLDER_DELETE
}

type FolderCancelEdit = {
  eventName: Name.FOLDER_CANCEL_EDIT
}

// Embed
type EmbedOpen = {
  eventName: Name.EMBED_OPEN
  kind: PlayableType
  id: string
}
type EmbedCopy = {
  eventName: Name.EMBED_COPY
  kind: PlayableType
  id: string
  size: 'card' | 'compact' | 'tiny'
}

// Track Upload
type TrackUploadOpen = {
  eventName: Name.TRACK_UPLOAD_OPEN
  source: 'nav' | 'profile' | 'signup' | 'library' | 'dashboard'
}
type TrackUploadStartUploading = {
  eventName: Name.TRACK_UPLOAD_START_UPLOADING
  count: number
  kind: 'tracks' | 'album' | 'playlist'
}
type TrackUploadTrackUploading = {
  eventName: Name.TRACK_UPLOAD_TRACK_UPLOADING
  artworkSource: 'unsplash' | 'original'
  downloadable: 'yes' | 'no' | 'follow'
  trackId: number
  size: number
  fileType: string
  name: string
  genre: string
  mood?: string
}
type TrackUploadCompleteUpload = {
  eventName: Name.TRACK_UPLOAD_COMPLETE_UPLOAD
  count: number
  kind: 'tracks' | 'album' | 'playlist'
}

type TrackUploadSuccess = {
  eventName: Name.TRACK_UPLOAD_SUCCESS
  endpoint: string
  kind: 'single_track' | 'multi_track' | 'album' | 'playlist'
}

type TrackUploadFailure = {
  eventName: Name.TRACK_UPLOAD_FAILURE
  endpoint: string
  kind: 'single_track' | 'multi_track' | 'album' | 'playlist'
  error?: string
}

type TrackUploadRejected = {
  eventName: Name.TRACK_UPLOAD_REJECTED
  endpoint: string
  kind: 'single_track' | 'multi_track' | 'album' | 'playlist'
  error?: string
}

type TrackUploadCopyLink = {
  eventName: Name.TRACK_UPLOAD_COPY_LINK
  uploadType: string
  url: string
}
type TrackUploadShareWithFans = {
  eventName: Name.TRACK_UPLOAD_SHARE_WITH_FANS
  uploadType: string
  text: string
}
type TrackUploadViewTrackPage = {
  eventName: Name.TRACK_UPLOAD_VIEW_TRACK_PAGE
  uploadType: string
}

type TrackUploadFollowGated = {
  eventName: Name.TRACK_UPLOAD_FOLLOW_GATED
  kind: 'tracks'
  downloadable: boolean
  lossless: boolean
}

type TrackUploadTipGated = {
  eventName: Name.TRACK_UPLOAD_TIP_GATED
  kind: 'tracks'
  downloadable: boolean
  lossless: boolean
}

type TrackUploadUSDCGated = {
  eventName: Name.TRACK_UPLOAD_USDC_GATED
  price: number
  kind: 'tracks'
  downloadable: boolean
  lossless: boolean
}

type TrackUploadTokenGated = {
  eventName: Name.TRACK_UPLOAD_TOKEN_GATED
  kind: 'tracks'
  downloadable: boolean
  lossless: boolean
}

type TrackUploadClickUSDCWaitListLink = {
  eventName: Name.TRACK_UPLOAD_CLICK_USDC_WAITLIST_LINK
}

type TrackUploadFollowGatedDownload = {
  eventName: Name.TRACK_UPLOAD_FOLLOW_GATED_DOWNLOAD
  kind: 'tracks'
  downloadable: boolean
  lossless: boolean
}

type TrackUploadTokenGatedDownload = {
  eventName: Name.TRACK_UPLOAD_TOKEN_GATED_DOWNLOAD
  kind: 'tracks'
  downloadable: boolean
  lossless: boolean
}

type TrackUploadUSDCGatedDownload = {
  eventName: Name.TRACK_UPLOAD_USDC_GATED_DOWNLOAD
  price: number
  kind: 'tracks'
  downloadable: boolean
  lossless: boolean
}

type TrackUploadClickUSDCDownloadWaitListLink = {
  eventName: Name.TRACK_UPLOAD_CLICK_USDC_DOWNLOAD_WAITLIST_LINK
}

// Track Downloads
type TrackDownloadClickedDownloadAll = {
  eventName: Name.TRACK_DOWNLOAD_CLICKED_DOWNLOAD_ALL
  parentTrackId: ID
  stemTrackIds: ID[]
  device: 'web' | 'native'
}

type TrackDownloadSuccessfulDownloadAll = {
  eventName: Name.TRACK_DOWNLOAD_SUCCESSFUL_DOWNLOAD_ALL
  device?: 'web' | 'native'
}

type TrackDownloadFailedDownloadAll = {
  eventName: Name.TRACK_DOWNLOAD_FAILED_DOWNLOAD_ALL
  device?: 'web' | 'native'
}

type TrackDownloadClickedDownloadSingle = {
  eventName: Name.TRACK_DOWNLOAD_CLICKED_DOWNLOAD_SINGLE
  trackId: ID
  device: 'web' | 'native'
}

type TrackDownloadSuccessfulDownloadSingle = {
  eventName: Name.TRACK_DOWNLOAD_SUCCESSFUL_DOWNLOAD_SINGLE
  device: 'web' | 'native'
}

type TrackDownloadFailedDownloadSingle = {
  eventName: Name.TRACK_DOWNLOAD_FAILED_DOWNLOAD_SINGLE
  device: 'web' | 'native'
}

// Track Edits
type TrackEditAccessChanged = {
  eventName: Name.TRACK_EDIT_ACCESS_CHANGED
  id: number
  from: TrackAccessType
  to: TrackAccessType
}

type TrackEditBpmChanged = {
  eventName: Name.TRACK_EDIT_BPM_CHANGED
  id: number
  from: number
  to: number
}

type TrackEditMusicalKeyChanged = {
  eventName: Name.TRACK_EDIT_MUSICAL_KEY_CHANGED
  id: number
  from: string
  to: string
}

// Collection Edits
type CollectionEditAccessChanged = {
  eventName: Name.COLLECTION_EDIT_ACCESS_CHANGED
  id: number
  from: Nullable<AccessConditions>
  to: Nullable<AccessConditions>
}

type CollectionEdit = {
  eventName: Name.COLLECTION_EDIT
  id: number
  from: TrackAccessType
  to: TrackAccessType
}

// Unlocked Gated Tracks
type USDCGatedTrackUnlocked = {
  eventName: Name.USDC_PURCHASE_GATED_TRACK_UNLOCKED
  count: number
}

type FollowGatedTrackUnlocked = {
  eventName: Name.FOLLOW_GATED_TRACK_UNLOCKED
  trackId: number
}

type TipGatedTrackUnlocked = {
  eventName: Name.TIP_GATED_TRACK_UNLOCKED
  trackId: number
}

type TokenGatedTrackUnlocked = {
  eventName: Name.TOKEN_GATED_TRACK_UNLOCKED
  trackId: number
}

type USDCGatedDownloadTrackUnlocked = {
  eventName: Name.USDC_PURCHASE_GATED_DOWNLOAD_TRACK_UNLOCKED
  count: number
}

type FollowGatedDownloadTrackUnlocked = {
  eventName: Name.FOLLOW_GATED_DOWNLOAD_TRACK_UNLOCKED
  trackId: number
}

type TokenGatedDownloadTrackUnlocked = {
  eventName: Name.TOKEN_GATED_DOWNLOAD_TRACK_UNLOCKED
  trackId: number
}

// Trending
type TrendingChangeView = {
  eventName: Name.TRENDING_CHANGE_VIEW
  timeframe: TimeRange
  genre: string
}
type TrendingPaginate = {
  eventName: Name.TRENDING_PAGINATE
  offset: number
  limit: number
}

// Feed
type FeedChangeView = {
  eventName: Name.FEED_CHANGE_VIEW
  view: FeedFilter
}
type FeedPaginate = {
  eventName: Name.FEED_PAGINATE
  offset: number
  limit: number
}

// Notifications
type NotificationsOpen = {
  eventName: Name.NOTIFICATIONS_OPEN
  source: 'button' | 'push notifications'
}
type NotificationsClickTile = {
  eventName: Name.NOTIFICATIONS_CLICK_TILE
  kind: string
  link_to: string
}
type NotificationsClickMilestone = {
  eventName: Name.NOTIFICATIONS_CLICK_MILESTONE_TWITTER_SHARE
  milestone: string
}
type NotificationsClickRemixCreate = {
  eventName: Name.NOTIFICATIONS_CLICK_REMIX_CREATE_TWITTER_SHARE
  text: string
}
type NotificationsClickRemixCosign = {
  eventName: Name.NOTIFICATIONS_CLICK_REMIX_COSIGN_TWITTER_SHARE
  text: string
}
type NotificationsClickTipReaction = {
  eventName: Name.NOTIFICATIONS_CLICK_TIP_REACTION_TWITTER_SHARE
  text: string
}
type NotificationsClickTipReceived = {
  eventName: Name.NOTIFICATIONS_CLICK_TIP_RECEIVED_TWITTER_SHARE
  text: string
}
type NotificationsClickTipSent = {
  eventName: Name.NOTIFICATIONS_CLICK_TIP_SENT_TWITTER_SHARE
  text: string
}
type NotificationsClickDethroned = {
  eventName: Name.NOTIFICATIONS_CLICK_DETHRONED_TWITTER_SHARE
  text: string
}
type NotificationsClickSupporterRankUp = {
  eventName: Name.NOTIFICATIONS_CLICK_SUPPORTER_RANK_UP_TWITTER_SHARE
  text: string
}
type NotificationsClickSupportingRankUp = {
  eventName: Name.NOTIFICATIONS_CLICK_SUPPORTING_RANK_UP_TWITTER_SHARE
  text: string
}
type NotificationsClickAddTrackToPlaylist = {
  eventName: Name.NOTIFICATIONS_CLICK_ADD_TRACK_TO_PLAYLIST_TWITTER_SHARE
  text: string
}
type NotificationsClickUSDCPurchaseBuyer = {
  eventName: Name.NOTIFICATIONS_CLICK_USDC_PURCHASE_TWITTER_SHARE
  text: string
}
type NotificationsClickTrendingTrack = {
  eventName: Name.NOTIFICATIONS_CLICK_TRENDING_TRACK_TWITTER_SHARE
  text: string
}
type NotificationsClickTrendingPlaylist = {
  eventName: Name.NOTIFICATIONS_CLICK_TRENDING_PLAYLIST_TWITTER_SHARE
  text: string
}
type NotificationsClickTrendingUnderground = {
  eventName: Name.NOTIFICATIONS_CLICK_TRENDING_UNDERGROUND_TWITTER_SHARE
  text: string
}
type NotificationsClickTastemaker = {
  eventName: Name.NOTIFICATIONS_CLICK_TASTEMAKER_TWITTER_SHARE
  text: string
}
type NotificationsToggleSettings = {
  eventName: Name.NOTIFICATIONS_TOGGLE_SETTINGS
  settings: string
  enabled: boolean
}

// Profile
type ProfilePageTabClick = {
  eventName: Name.PROFILE_PAGE_TAB_CLICK
  tab: 'tracks' | 'albums' | 'reposts' | 'playlists'
}
type ProfilePageSort = {
  eventName: Name.PROFILE_PAGE_SORT
  sort: 'recent' | 'popular'
}
type ProfilePageClickInstagram = {
  eventName: Name.PROFILE_PAGE_CLICK_INSTAGRAM
  handle: string
  instagramHandle: string
}
type ProfilePageClickTwitter = {
  eventName: Name.PROFILE_PAGE_CLICK_TWITTER
  handle: string
  twitterHandle: string
}
type ProfilePageClickTikTok = {
  eventName: Name.PROFILE_PAGE_CLICK_TIKTOK
  handle: string
  tikTokHandle: string
}
type ProfilePageClickWebsite = {
  eventName: Name.PROFILE_PAGE_CLICK_WEBSITE
  handle: string
  website: string
}
type ProfilePageShownArtistRecommendations = {
  eventName: Name.PROFILE_PAGE_SHOWN_ARTIST_RECOMMENDATIONS
  userId: number
}

// Track Page
type TrackPageDownload = {
  eventName: Name.TRACK_PAGE_DOWNLOAD
  id: ID
  category?: string
  parent_track_id?: ID
}
type TrackPagePlayMore = {
  eventName: Name.TRACK_PAGE_PLAY_MORE
  id: ID
}

// Playback
export enum PlaybackSource {
  PLAYBAR = 'playbar',
  NOW_PLAYING = 'now playing',
  PLAYLIST_PAGE = 'playlist page',
  TRACK_PAGE = 'track page',
  TRACK_TILE = 'track tile',
  TRACK_TILE_LINEUP = 'track tile lineup',
  PLAYLIST_TRACK = 'playlist page track list',
  PLAYLIST_TILE_TRACK = 'playlist track tile',
  PLAYLIST_TILE_TRACK_LINEUP = 'playlist track tile lineup',
  HISTORY_PAGE = 'history page',
  LIBRARY_PAGE = 'library page',
  PASSIVE = 'passive',
  EMBED_PLAYER = 'embed player',
  CHAT_TRACK = 'chat_track',
  CHAT_PLAYLIST_TRACK = 'chat_playlist_track',
  SEARCH_PAGE = 'search page',
  EXCLUSIVE_TRACKS_PAGE = 'exclusive tracks page'
}

type PlaybackPlay = {
  eventName: Name.PLAYBACK_PLAY
  id?: string
  isPreview?: boolean
  source: PlaybackSource
}
type PlaybackPause = {
  eventName: Name.PLAYBACK_PAUSE
  id?: string
  source: PlaybackSource
}

type BufferingTime = {
  eventName: Name.BUFFERING_TIME
  duration: number
}

// Linking
type LinkClicking = {
  eventName: Name.LINK_CLICKING
  url: string
  source: 'profile page' | 'track page' | 'collection page' | 'left nav'
}
type TagClicking = {
  eventName: Name.TAG_CLICKING
  tag: string
  source: 'profile page' | 'track page' | 'collection page'
}

export enum ModalSource {
  TrackTile = 'track tile',
  CollectionTile = 'collection tile',
  TrackDetails = 'track details',
  CollectionDetails = 'collection details',
  NowPlaying = 'now playing',
  PlayBar = 'play bar',
  DirectMessageTrackTile = 'track tile - direct message',
  DirectMessageCollectionTile = 'collection tile - direct message',
  LineUpTrackTile = 'track tile - lineup',
  LineUpCollectionTile = 'collection tile - lineup',
  TrackListItem = 'track list item',
  OverflowMenu = 'overflow menu',
  TrackLibrary = 'track library',
  Comment = 'comment',
  // Should never be used, but helps with type-checking
  Unknown = 'unknown'
}

// Modals
type ModalOpened = {
  eventName: Name.MODAL_OPENED
  source: ModalSource
  name: string
} & Record<string, any> // For passing state values

type ModalClosed = {
  eventName: Name.MODAL_CLOSED
  name: string
}

export type SearchSource =
  | 'autocomplete'
  | 'search results page'
  | 'more results page'

// Search
type SearchTerm = {
  eventName: Name.SEARCH_SEARCH
  term: string
  source: SearchSource
}

type SearchTag = {
  eventName: Name.SEARCH_TAG_SEARCH
  tag: string
  source: SearchSource
}

type SearchMoreResults = {
  eventName: Name.SEARCH_MORE_RESULTS
  term: string
  source: SearchSource
}

type SearchResultSelect = {
  eventName: Name.SEARCH_RESULT_SELECT
  term: string
  source: SearchSource
  id: ID
  kind: 'track' | 'profile' | 'playlist' | 'album'
}

type ListenGated = {
  eventName: Name.LISTEN_GATED
  trackId: string
}

type OnFirstPage = {
  eventName: Name.ON_FIRST_PAGE
}

type NotOnFirstPage = {
  eventName: Name.NOT_ON_FIRST_PAGE
}

type BrowserNotificationSetting = {
  eventName: Name.BROWSER_NOTIFICATION_SETTINGS
  provider: 'safari' | 'gcm'
  enabled: boolean
}

type WebVitals = {
  eventName: Name.WEB_VITALS
  metric: string
  value: number
  route: string
}
type Performance = {
  eventName: Name.PERFORMANCE
  metric: string
  value: number
}

type StemCompleteUpload = {
  eventName: Name.STEM_COMPLETE_UPLOAD
  id: number
  parent_track_id: number
  category: string
}

type StemDelete = {
  eventName: Name.STEM_DELETE
  id: number
  parent_track_id: number
}

type RemixNewRemix = {
  eventName: Name.REMIX_NEW_REMIX
  id: number
  handle: string
  title: string
  parent_track_id: number
  parent_track_title: string
  parent_track_user_handle: string
}

type RemixCosign = {
  eventName: Name.REMIX_COSIGN
  id: number
  handle: string
  action: 'reposted' | 'favorited'
  original_track_id: number
  original_track_title: string
}

type RemixCosignIndicator = {
  eventName: Name.REMIX_COSIGN_INDICATOR
  id: number
  handle: string
  action: 'reposted' | 'favorited'
  original_track_id: number
  original_track_title: string
}

type RemixHide = {
  eventName: Name.REMIX_HIDE
  id: number
  handle: string
}

type SendAudioRequest = {
  eventName: Name.SEND_AUDIO_REQUEST
  from: WalletAddress
  recipient: WalletAddress
}

type SendAudioSuccess = {
  eventName: Name.SEND_AUDIO_SUCCESS
  from: WalletAddress
  recipient: WalletAddress
}

type SendAudioFailure = {
  eventName: Name.SEND_AUDIO_FAILURE
  from: WalletAddress
  recipient: WalletAddress
  error: string
}

type TransferAudioToWAudioRequest = {
  eventName: Name.TRANSFER_AUDIO_TO_WAUDIO_REQUEST
  from: WalletAddress
}

type TransferAudioToWAudioSuccess = {
  eventName: Name.TRANSFER_AUDIO_TO_WAUDIO_SUCCESS
  from: WalletAddress
  txSignature: string
  logs: string
}

type TransferAudioToWAudioFailure = {
  eventName: Name.TRANSFER_AUDIO_TO_WAUDIO_FAILURE
  from: WalletAddress
}

type PlaylistLibraryReorder = {
  eventName: Name.PLAYLIST_LIBRARY_REORDER
  // Whether or not the reorder contains newly created temp playlists
  containsTemporaryPlaylists: boolean
  kind: PlaylistLibraryKind
}

type PlaylistLibraryClicked = {
  eventName: Name.PLAYLIST_LIBRARY_CLICKED
  playlistId: ID
  hasUpdate: boolean
}

type PlaylistLibraryMovePlaylistIntoFolder = {
  eventName: Name.PLAYLIST_LIBRARY_MOVE_PLAYLIST_INTO_FOLDER
}

type PlaylistLibraryAddPlaylistToFolder = {
  eventName: Name.PLAYLIST_LIBRARY_ADD_PLAYLIST_TO_FOLDER
}

type PlaylistLibraryMovePlaylistOutOfFolder = {
  eventName: Name.PLAYLIST_LIBRARY_MOVE_PLAYLIST_OUT_OF_FOLDER
}

type PlaylistLibraryExpandFolder = {
  eventName: Name.PLAYLIST_LIBRARY_EXPAND_FOLDER
}

type PlaylistLibraryCollapseFolder = {
  eventName: Name.PLAYLIST_LIBRARY_COLLAPSE_FOLDER
}

type DeactivateAccountPageView = {
  eventName: Name.DEACTIVATE_ACCOUNT_PAGE_VIEW
}
type DeactivateAccountRequest = {
  eventName: Name.DEACTIVATE_ACCOUNT_REQUEST
}
type DeactivateAccountSuccess = {
  eventName: Name.DEACTIVATE_ACCOUNT_SUCCESS
}
type DeactivateAccountFailure = {
  eventName: Name.DEACTIVATE_ACCOUNT_FAILURE
}

type CreateUserBankRequest = {
  eventName: Name.CREATE_USER_BANK_REQUEST
  userId: ID
}

type CreateUserBankSuccess = {
  eventName: Name.CREATE_USER_BANK_SUCCESS
  mint: string
  recipientEthAddress: string
}

type CreateUserBankFailure = {
  eventName: Name.CREATE_USER_BANK_FAILURE
  mint: string
  recipientEthAddress: string
  errorCode: string
  errorMessage: string
}

type RewardsClaimDetailsOpened = {
  eventName: Name.REWARDS_CLAIM_DETAILS_OPENED
  challengeId: string
}

type RewardsClaimRequest = {
  eventName: Name.REWARDS_CLAIM_REQUEST
  challengeId: string
  specifier: string
  amount: number
}

type RewardsClaimSuccess = {
  eventName: Name.REWARDS_CLAIM_SUCCESS
  challengeId: string
  specifier: string
  amount: number
}

type RewardsClaimFailure = {
  eventName: Name.REWARDS_CLAIM_FAILURE
  challengeId: string
  specifier: string
  amount: number
  url?: string
  error: string
  instruction?: string
}

type RewardsClaimBlocked = {
  eventName: Name.REWARDS_CLAIM_BLOCKED
  challengeId: string
  specifier: string
  amount: number
  code: number
}

type RewardsClaimAllRequest = {
  eventName: Name.REWARDS_CLAIM_ALL_REQUEST
  count: number
}
type RewardsClaimAllSuccess = {
  eventName: Name.REWARDS_CLAIM_ALL_SUCCESS
  count: number
}
type RewardsClaimAllFailure = {
  eventName: Name.REWARDS_CLAIM_ALL_FAILURE
  count: number
}
type RewardsClaimAllBlocked = {
  eventName: Name.REWARDS_CLAIM_ALL_BLOCKED
  count: number
  code: number
}

export type TipSource =
  | 'profile'
  | 'feed'
  | 'dethroned'
  | 'buyAudio'
  | 'trackPage'
  | 'howToUnlockTrackPage'
  | 'howToUnlockModal'
  | 'inboxUnavailableModal'

type TipAudioRequest = {
  eventName: Name.TIP_AUDIO_REQUEST
  amount: StringAudio
  senderWallet?: SolanaWalletAddress
  recipientWallet?: SolanaWalletAddress
  senderHandle: string
  recipientHandle: string
  source: TipSource
  device: 'web' | 'native'
}

type TipAudioSuccess = {
  eventName: Name.TIP_AUDIO_SUCCESS
  amount: StringAudio
  senderWallet?: SolanaWalletAddress
  recipientWallet?: SolanaWalletAddress
  senderHandle: string
  recipientHandle: string
  source: TipSource
  device: 'web' | 'native'
}

type TipAudioFailure = {
  eventName: Name.TIP_AUDIO_FAILURE
  amount: StringAudio
  senderWallet?: SolanaWalletAddress
  recipientWallet?: SolanaWalletAddress
  senderHandle: string
  recipientHandle: string
  error: string
  source: TipSource
  device: 'web' | 'native'
}

type TipAudioTwitterShare = {
  eventName: Name.TIP_AUDIO_TWITTER_SHARE
  amount: StringAudio
  senderWallet?: SolanaWalletAddress
  recipientWallet?: SolanaWalletAddress
  senderHandle: string
  recipientHandle: string
  source: TipSource
  device: 'web' | 'native'
}

type TipFeedTileDismiss = {
  eventName: Name.TIP_FEED_TILE_DISMISS
  accountId: string
  receiverId: string
  device: 'web' | 'native'
}

type SocialProofOpen = {
  eventName: Name.SOCIAL_PROOF_OPEN
  kind: 'instagram' | 'twitter' | 'tiktok'
  handle?: string
}

type SocialProofSuccess = {
  eventName: Name.SOCIAL_PROOF_SUCCESS
  kind: 'instagram' | 'twitter' | 'tiktok'
  handle?: string
  screenName: string
}

type SocialProofError = {
  eventName: Name.SOCIAL_PROOF_ERROR
  kind: 'instagram' | 'twitter' | 'tiktok'
  handle?: string
  error: string
}

type AudiusOauthStart = {
  eventName: Name.AUDIUS_OAUTH_START
  redirectUriParam: string | string[]
  originParam: string | string[] | undefined | null
  appId: string | string[] // App name or API Key
  responseMode: string | string[] | undefined | null
  scope: string | string[]
}

type AudiusOauthSubmit = {
  eventName: Name.AUDIUS_OAUTH_SUBMIT
  appId: string | string[]
  scope: string | string[]
  alreadySignedIn: boolean
}

type AudiusOauthComplete = {
  eventName: Name.AUDIUS_OAUTH_COMPLETE
  appId: string | string[]
  scope: string | string[]
  alreadyAuthorized?: boolean
}

type AudiusOauthError = {
  eventName: Name.AUDIUS_OAUTH_ERROR
  appId: string | string[]
  scope: string | string[]
  isUserError: boolean
  error: string
}

type DeveloperAppCreateSubmit = {
  eventName: Name.DEVELOPER_APP_CREATE_SUBMIT
  name?: string
  description?: string
}

type DeveloperAppCreateSuccess = {
  eventName: Name.DEVELOPER_APP_CREATE_SUCCESS
  name: string
  apiKey: string
}

type DeveloperAppCreateError = {
  eventName: Name.DEVELOPER_APP_CREATE_ERROR
  error?: string
}

type DeveloperAppEditSubmit = {
  eventName: Name.DEVELOPER_APP_EDIT_SUBMIT
  name?: string
  description?: string
}

type DeveloperAppEditSuccess = {
  eventName: Name.DEVELOPER_APP_EDIT_SUCCESS
  name: string
  apiKey: string
}

type DeveloperAppEditError = {
  eventName: Name.DEVELOPER_APP_EDIT_ERROR
  error?: string
}

type DeveloperAppDeleteSuccess = {
  eventName: Name.DEVELOPER_APP_DELETE_SUCCESS
  name?: string
  apiKey?: string
}

type DeveloperAppDeleteError = {
  eventName: Name.DEVELOPER_APP_DELETE_ERROR
  name?: string
  apiKey?: string
  error?: string
}

type AuthorizedAppRemoveSuccess = {
  eventName: Name.AUTHORIZED_APP_REMOVE_SUCCESS
  name?: string
  apiKey?: string
}

type AuthorizedAppRemoveError = {
  eventName: Name.AUTHORIZED_APP_REMOVE_ERROR
  name?: string
  apiKey?: string
  error?: string
}

type BuyAudioOnRampOpened = {
  eventName: Name.BUY_AUDIO_ON_RAMP_OPENED
  provider: string
}

type BuyAudioOnRampCanceled = {
  eventName: Name.BUY_AUDIO_ON_RAMP_CANCELED
  provider: string
}

type BuyAudioOnRampSuccess = {
  eventName: Name.BUY_AUDIO_ON_RAMP_SUCCESS
  provider: string
}

type BuyAudioSuccess = {
  eventName: Name.BUY_AUDIO_SUCCESS
  provider: string
  requestedAudio: number
  actualAudio: number
  surplusAudio: number
}

type BuyAudioFailure = {
  eventName: Name.BUY_AUDIO_FAILURE
  provider: string
  requestedAudio: number
  stage: string
  error: string
}

type BuyAudioRecoveryOpened = {
  eventName: Name.BUY_AUDIO_RECOVERY_OPENED
  provider: string
  trigger: string
  balance: string
}

type BuyAudioRecoverySuccess = {
  eventName: Name.BUY_AUDIO_RECOVERY_SUCCESS
  provider: string
  audioRecovered: number
}

type BuyAudioRecoveryFailure = {
  eventName: Name.BUY_AUDIO_RECOVERY_FAILURE
  provider: string
  stage: string
  error: string
}

// Buy USDC
type BuyUSDCOnRampOpened = {
  eventName: Name.BUY_USDC_ON_RAMP_OPENED
  vendor: string
}

type BuyUSDCOnRampCanceled = {
  eventName: Name.BUY_USDC_ON_RAMP_CANCELED
  vendor: string
}

type BuyUSDCOnRampFailed = {
  eventName: Name.BUY_USDC_ON_RAMP_FAILURE
  error: string
  vendor: string
}

type BuyUSDCOnRampSuccess = {
  eventName: Name.BUY_USDC_ON_RAMP_SUCCESS
  vendor: string
}

type BuyUSDCSuccess = {
  eventName: Name.BUY_USDC_SUCCESS
  vendor: string
  requestedAmount: number
}

type BuyUSDCFailure = {
  eventName: Name.BUY_USDC_FAILURE
  vendor: string
  requestedAmount: number
  error: string
}

type BuyUSDCRecoveryInProgress = {
  eventName: Name.BUY_USDC_RECOVERY_IN_PROGRESS
  userBank: string
}

type BuyUSDCRecoverySuccess = {
  eventName: Name.BUY_USDC_RECOVERY_SUCCESS
  userBank: string
}

type BuyUSDCRecoveryFailure = {
  eventName: Name.BUY_USDC_RECOVERY_FAILURE
  error: string
}

type BuyUSDCAddFundsManually = {
  eventName: Name.BUY_USDC_ADD_FUNDS_MANUALLY
}

export type BuySellSwapEventFields = {
  activeTab: 'buy' | 'sell' | 'convert'
  inputToken: string
  outputToken: string
  inputAmount?: number
  outputAmount?: number
  exchangeRate?: number | null
}

type BuySellSwapRequested = BuySellSwapEventFields & {
  eventName: Name.BUY_SELL_SWAP_REQUESTED
}

type BuySellSwapConfirmed = BuySellSwapEventFields & {
  eventName: Name.BUY_SELL_SWAP_CONFIRMED
  slippageBps: number
}

type BuySellSwapSuccess = BuySellSwapEventFields & {
  eventName: Name.BUY_SELL_SWAP_SUCCESS
  signature: string
}

type BuySellSwapFailure = BuySellSwapEventFields & {
  eventName: Name.BUY_SELL_SWAP_FAILURE
  errorType: string
  errorStage: string
  errorMessage?: string
}

type BuySellAddFundsClicked = {
  eventName: Name.BUY_SELL_ADD_FUNDS_CLICKED
  source: 'insufficient_balance_hint' | 'input_screen'
}

// Withdraw USDC

export type WithdrawUSDCEventFields = {
  /** Balance in dollars */
  currentBalance: number
}

export type WithdrawUSDCTransferEventFields = WithdrawUSDCEventFields & {
  amount: number
  destinationAddress: string
}

export type WithdrawUSDCModalOpened = WithdrawUSDCEventFields & {
  eventName: Name.WITHDRAW_USDC_MODAL_OPENED
}

export type WithdrawUSDCAddressPasted = WithdrawUSDCEventFields & {
  eventName: Name.WITHDRAW_USDC_ADDRESS_PASTED
  destinationAddress: string
}

export type WithdrawUSDCFormError = WithdrawUSDCEventFields & {
  eventName: Name.WITHDRAW_USDC_FORM_ERROR
  error: string
  value?: string
}

export type WithdrawUSDCRequested = WithdrawUSDCTransferEventFields & {
  eventName: Name.WITHDRAW_USDC_REQUESTED
}

export type WithdrawUSDCSuccess = WithdrawUSDCTransferEventFields & {
  eventName: Name.WITHDRAW_USDC_SUCCESS
}

export type WithdrawUSDCFailure = WithdrawUSDCTransferEventFields & {
  eventName: Name.WITHDRAW_USDC_FAILURE
}
export type WithdrawUSDCCancelled = WithdrawUSDCTransferEventFields & {
  eventName: Name.WITHDRAW_USDC_CANCELLED
}

export type WithdrawUSDCCreateDestAccountStarted =
  WithdrawUSDCTransferEventFields & {
    eventName: Name.WITHDRAW_USDC_CREATE_DEST_TOKEN_ACCOUNT_START
  }

export type WithdrawUSDCCreateDestAccountSuccess =
  WithdrawUSDCTransferEventFields & {
    eventName: Name.WITHDRAW_USDC_CREATE_DEST_TOKEN_ACCOUNT_SUCCESS
  }

export type WithdrawUSDCCreateDestAccountFailure =
  WithdrawUSDCTransferEventFields & {
    eventName: Name.WITHDRAW_USDC_CREATE_DEST_TOKEN_ACCOUNT_FAILED
  }

export type WithdrawUSDCTransferToRootWallet =
  WithdrawUSDCTransferEventFields & {
    eventName: Name.WITHDRAW_USDC_TRANSFER_TO_ROOT_WALLET
  }

export type WithdrawUSDCCoinflowWithdrawalReady =
  WithdrawUSDCTransferEventFields & {
    eventName: Name.WITHDRAW_USDC_COINFLOW_WITHDRAWAL_READY
  }

export type WithdrawUSDCCoinflowSendTransaction = {
  eventName: Name.WITHDRAW_USDC_COINFLOW_SEND_TRANSACTION
  signature: string
}

export type WithdrawUSDCCoinflowSendTransactionFailed = {
  eventName: Name.WITHDRAW_USDC_COINFLOW_SEND_TRANSACTION_FAILED
  error?: string
  errorCode?: string | number
}

export type WithdrawUSDCHelpLinkClicked = WithdrawUSDCEventFields & {
  eventName: Name.WITHDRAW_USDC_HELP_LINK_CLICKED
}

export type WithdrawUSDCTxLinkClicked = WithdrawUSDCTransferEventFields & {
  eventName: Name.WITHDRAW_USDC_TRANSACTION_LINK_CLICKED
  signature: string
}

// Stripe Tracking
export type StripeEventFields = {
  amount: string
  destinationCurrency: string
}

type StripeSessionCreationError = StripeEventFields & {
  eventName: Name.STRIPE_SESSION_CREATION_ERROR
  code: string
  stripeErrorMessage: string
  kind: string
}

type StripeSessionCreated = StripeEventFields & {
  eventName: Name.STRIPE_SESSION_CREATED
}

type StripeModalInitialized = StripeEventFields & {
  eventName: Name.STRIPE_MODAL_INITIALIZED
}

type StripeRequiresPayment = StripeEventFields & {
  eventName: Name.STRIPE_REQUIRES_PAYMENT
}

type StripeFulfillmentProcessing = StripeEventFields & {
  eventName: Name.STRIPE_FULLFILMENT_PROCESSING
}

type StripeFulfillmentComplete = StripeEventFields & {
  eventName: Name.STRIPE_FULLFILMENT_COMPLETE
}

type StripeError = StripeEventFields & {
  eventName: Name.STRIPE_ERROR
}

type StripeRejected = StripeEventFields & {
  eventName: Name.STRIPE_REJECTED
}

// Content Purchase

type ContentPurchaseMetadata = {
  price: number
  contentId: number
  contentName: string
  contentType: string
  payExtraAmount: number
  payExtraPreset?: string
  purchaseMethod: PurchaseMethod
  totalAmount: number
  artistHandle: string
  isVerifiedArtist: boolean
}

type PurchaseContentBuyClicked = {
  eventName: Name.PURCHASE_CONTENT_BUY_CLICKED
  contentId: number
  contentType: string
}

type PurchaseContentStarted = ContentPurchaseMetadata & {
  eventName: Name.PURCHASE_CONTENT_STARTED
}
type PurchaseContentSuccess = ContentPurchaseMetadata & {
  eventName: Name.PURCHASE_CONTENT_SUCCESS
}

type PurchaseContentFailure = ContentPurchaseMetadata & {
  eventName: Name.PURCHASE_CONTENT_FAILURE
  error: string
}

type PurchaseContentTwitterShare = {
  eventName: Name.PURCHASE_CONTENT_TWITTER_SHARE
  text: string
}

type PurchaseContentTOSClicked = {
  eventName: Name.PURCHASE_CONTENT_TOS_CLICKED
}

type PurchaseContentUSDCUserBankCopied = {
  eventName: Name.PURCHASE_CONTENT_USDC_USER_BANK_COPIED
  address: string
}

type BannerTOSClicked = {
  eventName: Name.BANNER_TOS_CLICKED
}

type BannerArtistCoinsLaunchClicked = {
  eventName: Name.BANNER_ARTIST_COINS_LAUNCH_CLICKED
}

type RateCtaDisplayed = {
  eventName: Name.RATE_CTA_DISPLAYED
}

type RateCtaResponseNo = {
  eventName: Name.RATE_CTA_RESPONSE_NO
}

type RateCtaResponseYes = {
  eventName: Name.RATE_CTA_RESPONSE_YES
}

type ConnectWalletNewWalletStart = {
  eventName: Name.CONNECT_WALLET_NEW_WALLET_START
}

type ConnectWalletNewWalletConnecting = {
  eventName: Name.CONNECT_WALLET_NEW_WALLET_CONNECTING
  chain: Chain
  walletAddress: WalletAddress
}

type ConnectWalletNewWalletConnected = {
  eventName: Name.CONNECT_WALLET_NEW_WALLET_CONNECTED
  chain: Chain
  walletAddress: WalletAddress
}

type ConnectWalletDisconnected = {
  eventName: Name.CONNECT_WALLET_DISCONNECTED
}

type ConnectWalletAlreadyAssociated = {
  eventName: Name.CONNECT_WALLET_ALREADY_ASSOCIATED
  chain: Chain
  walletAddress: WalletAddress
}

type ConnectWalletAssociationError = {
  eventName: Name.CONNECT_WALLET_ASSOCIATION_ERROR
  chain: Chain
  walletAddress: WalletAddress
}

type ConnectWalletError = {
  eventName: Name.CONNECT_WALLET_ERROR
  error: string
}

type ChatBlastCTAClicked = {
  eventName: Name.CHAT_BLAST_CTA_CLICKED
}

type CreateChatSuccess = {
  eventName: Name.CREATE_CHAT_SUCCESS
}

type CreateChatFailure = {
  eventName: Name.CREATE_CHAT_FAILURE
}

type CreateChatBlastSuccess = {
  eventName: Name.CREATE_CHAT_BLAST_SUCCESS
  audience: string
  audienceContentType?: string
  audienceContentId?: ID
  sentBy: ID
}

type CreateChatBlastFailure = {
  eventName: Name.CREATE_CHAT_BLAST_FAILURE
  audience: string
  audienceContentType?: string
  audienceContentId?: ID
  sentBy?: ID
}

type ChatBlastMessageSent = {
  eventName: Name.CHAT_BLAST_MESSAGE_SENT
  audience: string
  audienceContentType?: string
  audienceContentId?: ID
}

type SendMessageSuccess = {
  eventName: Name.SEND_MESSAGE_SUCCESS
}

type SendMessageFailure = {
  eventName: Name.SEND_MESSAGE_FAILURE
}

type DeleteChatSuccess = {
  eventName: Name.DELETE_CHAT_SUCCESS
}

type DeleteChatFailure = {
  eventName: Name.DELETE_CHAT_FAILURE
}

type BlockUserSuccess = {
  eventName: Name.BLOCK_USER_SUCCESS
  blockedUserId: ID
}

type BlockUserFailure = {
  eventName: Name.BLOCK_USER_FAILURE
  blockedUserId: ID
}

type ChangeInboxSettingsSuccess = {
  eventName: Name.CHANGE_INBOX_SETTINGS_SUCCESS
  permission?: ChatPermission
  permitList?: ChatPermission[]
}

type ChangeInboxSettingsFailure = {
  eventName: Name.CHANGE_INBOX_SETTINGS_FAILURE
  permission?: ChatPermission
  permitList?: ChatPermission[]
}

type SendMessageReactionSuccess = {
  eventName: Name.SEND_MESSAGE_REACTION_SUCCESS
  reaction: string | null
}

type SendMessageReactionFailure = {
  eventName: Name.SEND_MESSAGE_REACTION_FAILURE
  reaction: string | null
}

type MessageUnfurlTrack = {
  eventName: Name.MESSAGE_UNFURL_TRACK
}

type MessageUnfurlPlaylist = {
  eventName: Name.MESSAGE_UNFURL_PLAYLIST
}

type TipUnlockedChat = {
  eventName: Name.TIP_UNLOCKED_CHAT
  recipientUserId: ID
}

type ChatReportUser = {
  eventName: Name.CHAT_REPORT_USER
  reportedUserId: ID
}

type ChatEntryPoint = {
  eventName: Name.CHAT_ENTRY_POINT
  source: 'banner' | 'navmenu' | 'share' | 'profile'
}

type ChatWebsocketError = {
  eventName: Name.CHAT_WEBSOCKET_ERROR
  code?: string
}

// Jupiter
type JupiterQuoteRequest = {
  eventName: Name.JUPITER_QUOTE_REQUEST
  inputMint: string
  outputMint: string
  swapMode?: string
  slippageBps?: number
  amount: number
}

type JupiterQuoteResponse = {
  eventName: Name.JUPITER_QUOTE_RESPONSE
  inputMint: string
  outputMint: string
  swapMode: string
  slippageBps: number
  otherAmountThreshold: number
  inAmount: number
  outAmount: number
}

// Export Private Key
type ExportPrivateKeyLinkClicked = {
  eventName: Name.EXPORT_PRIVATE_KEY_LINK_CLICKED
  handle?: string
  userId?: ID
}

type ExportPrivateKeyPageOpened = {
  eventName: Name.EXPORT_PRIVATE_KEY_PAGE_VIEWED
  handle: string
  userId: ID
}

type ExportPrivateKeyModalOpened = {
  eventName: Name.EXPORT_PRIVATE_KEY_MODAL_OPENED
  handle: string
  userId: ID
}

type ExportPrivateKeyPublicAddressCopied = {
  eventName: Name.EXPORT_PRIVATE_KEY_PUBLIC_ADDRESS_COPIED
  handle: string
  userId: ID
}

type ExportPrivateKeyPrivateKeyCopied = {
  eventName: Name.EXPORT_PRIVATE_KEY_PRIVATE_KEY_COPIED
  handle: string
  userId: ID
}

// Manager Mode
type ManagerModeSwitchAccount = {
  eventName: Name.MANAGER_MODE_SWITCH_ACCOUNT
  managedUserId: ID
}

type ManagerModeInviteManager = {
  eventName: Name.MANAGER_MODE_INVITE_MANAGER
  managerId: ID
}

type ManagerModeAcceptInvite = {
  eventName: Name.MANAGER_MODE_ACCEPT_INVITE
  managedUserId: ID
}

type ManagerModeCancelInvite = {
  eventName: Name.MANAGER_MODE_CANCEL_INVITE
  managerId: ID
}

type ManagerModeRejectInvite = {
  eventName: Name.MANAGER_MODE_REJECT_INVITE
  managedUserId: ID
}

type ManagerModeRemoveManager = {
  eventName: Name.MANAGER_MODE_REMOVE_MANAGER
  managerId: ID
}

export type CommentsCreateComment = {
  eventName: Name.COMMENTS_CREATE_COMMENT
  parentCommentId?: ID
  timestamp?: number
  trackId: ID
}

export type CommentsUpdateComment = {
  eventName: Name.COMMENTS_UPDATE_COMMENT
  commentId: ID
}

export type CommentsDeleteComment = {
  eventName: Name.COMMENTS_DELETE_COMMENT
  commentId: ID
}

export type CommentsFocusCommentInput = {
  eventName: Name.COMMENTS_FOCUS_COMMENT_INPUT
  trackId: ID
  source: 'comment_input' | 'comment_preview'
}

export type CommentsClickReplyButton = {
  eventName: Name.COMMENTS_CLICK_REPLY_BUTTON
  commentId: ID
}

export type CommentsLikeComment = {
  eventName: Name.COMMENTS_LIKE_COMMENT
  commentId: ID
}

export type CommentsUnlikeComment = {
  eventName: Name.COMMENTS_UNLIKE_COMMENT
  commentId: ID
}

export type CommentsAddMention = {
  eventName: Name.COMMENTS_ADD_MENTION
  userId: ID
}

export type CommentsClickMention = {
  eventName: Name.COMMENTS_CLICK_MENTION
  commentId: ID
  userId: ID
}

export type CommentsAddTimestamp = {
  eventName: Name.COMMENTS_ADD_TIMESTAMP
  timestamp: number
}

export type CommentsClickTimestamp = {
  eventName: Name.COMMENTS_CLICK_TIMESTAMP
  commentId: ID
  timestamp: number
}

export type CommentsAddLink = {
  eventName: Name.COMMENTS_ADD_LINK
  entityId?: ID
  kind: 'track' | 'collection' | 'user' | 'other'
}

export type CommentsClickLink = {
  eventName: Name.COMMENTS_CLICK_LINK
  commentId: ID
  kind: 'track' | 'collection' | 'user' | 'other'
  entityId?: ID
}

export type CommentsNotificationOpen = {
  eventName: Name.COMMENTS_NOTIFICATION_OPEN
  commentId: ID
  notificationType: 'comment' | 'reaction' | 'thread' | 'mention'
}

export type CommentsReportComment = {
  eventName: Name.COMMENTS_REPORT_COMMENT
  commentId: ID
  commentOwnerId: ID
  isRemoved: boolean
}

export type CommentsMuteUser = {
  eventName: Name.COMMENTS_MUTE_USER
  userId: ID
}

export type CommentsUnmuteUser = {
  eventName: Name.COMMENTS_UNMUTE_USER
  userId: ID
}

export type CommentsPinComment = {
  eventName: Name.COMMENTS_PIN_COMMENT
  trackId: ID
  commentId: ID
}

export type CommentsUnpinComment = {
  eventName: Name.COMMENTS_UNPIN_COMMENT
  trackId: ID
  commentId: ID
}

export type CommentsLoadMoreComments = {
  eventName: Name.COMMENTS_LOAD_MORE_COMMENTS
  trackId: ID
  offset: number
}

export type CommentsLoadNewComments = {
  eventName: Name.COMMENTS_LOAD_NEW_COMMENTS
  trackId: ID
}

export type CommentsShowReplies = {
  eventName: Name.COMMENTS_SHOW_REPLIES
  commentId: ID
  trackId: ID
}

export type CommentsLoadMoreReplies = {
  eventName: Name.COMMENTS_LOAD_MORE_REPLIES
  commentId: ID
  trackId: ID
}

export type CommentsHideReplies = {
  eventName: Name.COMMENTS_HIDE_REPLIES
  commentId: ID
  trackId: ID
}

export type CommentsApplySort = {
  eventName: Name.COMMENTS_APPLY_SORT
  sortType: 'top' | 'newest' | 'timestamp'
}

export type CommentsClickCommentStat = {
  eventName: Name.COMMENTS_CLICK_COMMENT_STAT
  trackId: ID
  source: 'lineup' | 'track_page'
}

export type CommentsOpenCommentOverflowMenu = {
  eventName: Name.COMMENTS_OPEN_COMMENT_OVERFLOW_MENU
  commentId: ID
}

export type CommentsTurnOnNotificationsForComment = {
  eventName: Name.COMMENTS_TURN_ON_NOTIFICATIONS_FOR_COMMENT
  commentId: ID
}

export type CommentsTurnOffNotificationsForComment = {
  eventName: Name.COMMENTS_TURN_OFF_NOTIFICATIONS_FOR_COMMENT
  commentId: ID
}

export type CommentsOpenTrackOverflowMenu = {
  eventName: Name.COMMENTS_OPEN_TRACK_OVERFLOW_MENU
  trackId: ID
}

export type CommentsTurnOnNotificationsForTrack = {
  eventName: Name.COMMENTS_TURN_ON_NOTIFICATIONS_FOR_TRACK
  trackId: ID
}

export type CommentsTurnOffNotificationsForTrack = {
  eventName: Name.COMMENTS_TURN_OFF_NOTIFICATIONS_FOR_TRACK
  trackId: ID
}

export type CommentsDisableTrackComments = {
  eventName: Name.COMMENTS_DISABLE_TRACK_COMMENTS
  trackId: ID
}

type CommentsOpenCommentDrawer = {
  eventName: Name.COMMENTS_OPEN_COMMENT_DRAWER
  trackId: ID
}

type CommentsCloseCommentDrawer = {
  eventName: Name.COMMENTS_CLOSE_COMMENT_DRAWER
  trackId: ID
}

export type CommentsOpenAuthModal = {
  eventName: Name.COMMENTS_OPEN_AUTH_MODAL
  trackId: ID
}

export type CommentsOpenInstallAppModal = {
  eventName: Name.COMMENTS_OPEN_INSTALL_APP_MODAL
  trackId: ID
}

export type CommentsHistoryClick = {
  eventName: Name.COMMENTS_HISTORY_CLICK
  commentId: ID
  userId: ID
}

export type CommentsHistoryDrawerOpen = {
  eventName: Name.COMMENTS_HISTORY_DRAWER_OPEN
  userId: ID | undefined
}

export type RecentCommentsClick = {
  eventName: Name.RECENT_COMMENTS_CLICK
  commentId: ID
  userId: ID
}

export type TrackReplaceDownload = {
  eventName: Name.TRACK_REPLACE_DOWNLOAD
  trackId?: ID
}

export type TrackReplaceReplace = {
  eventName: Name.TRACK_REPLACE_REPLACE
  trackId?: ID
  source: 'upload' | 'edit'
}

export type TrackReplacePreview = {
  eventName: Name.TRACK_REPLACE_PREVIEW
  trackId?: ID
  source: 'upload' | 'edit'
}

export type RemixContestCreate = {
  eventName: Name.REMIX_CONTEST_CREATE
  trackId: ID
}

export type RemixContestUpdate = {
  eventName: Name.REMIX_CONTEST_UPDATE
  remixContestId: ID
  trackId: ID
}

export type RemixContestDelete = {
  eventName: Name.REMIX_CONTEST_DELETE
  remixContestId: ID
  trackId: ID
}

export type RemixContestPickWinnersOpen = {
  eventName: Name.REMIX_CONTEST_PICK_WINNERS_OPEN
  remixContestId: ID
  trackId: ID
}

export type RemixContestPickWinnersFinalize = {
  eventName: Name.REMIX_CONTEST_PICK_WINNERS_FINALIZE
  remixContestId: ID
  trackId: ID
}

export type AndroidAppRestartHeartbeat = {
  eventName: Name.ANDROID_APP_RESTART_HEARTBEAT
  timeSinceLastHeartbeat: number
}

export type AndroidAppRestartStale = {
  eventName: Name.ANDROID_APP_RESTART_STALE
  backgroundDuration: number
}

export type AndroidAppRestartForceQuit = {
  eventName: Name.ANDROID_APP_RESTART_FORCE_QUIT
}

// Artist Coin Launchpad
export type LaunchpadSplashGetStarted = {
  eventName: Name.LAUNCHPAD_SPLASH_GET_STARTED
}

export type LaunchpadHasExistingArtistCoin = {
  eventName: Name.LAUNCHPAD_HAS_EXISTING_ARTIST_COIN
}

export type LaunchpadSplashLearnMoreClicked = {
  eventName: Name.LAUNCHPAD_SPLASH_LEARN_MORE_CLICKED
}

export type LaunchpadFormBack = {
  eventName: Name.LAUNCHPAD_FORM_BACK
}

export type LaunchpadFormInputChange = {
  eventName: Name.LAUNCHPAD_FORM_INPUT_CHANGE
  input: string
  newValue: string
}

export type LaunchpadWalletConnectSuccess = {
  eventName: Name.LAUNCHPAD_WALLET_CONNECT_SUCCESS
  walletAddress: string
  walletSolBalance: number
}

export type LaunchpadWalletConnectError = {
  eventName: Name.LAUNCHPAD_WALLET_CONNECT_ERROR
  error: string
}

export type LaunchpadWalletInsufficientBalance = {
  eventName: Name.LAUNCHPAD_WALLET_INSUFFICIENT_BALANCE
  walletAddress: string
  walletSolBalance: number
}

export type LaunchpadSetupContinue = {
  eventName: Name.LAUNCHPAD_SETUP_CONTINUE
} & Partial<LaunchpadFormValues>

export type LaunchpadReviewContinue = {
  eventName: Name.LAUNCHPAD_REVIEW_CONTINUE
} & Partial<LaunchpadFormValues>

export type LaunchpadCoinCreationStarted = {
  eventName: Name.LAUNCHPAD_COIN_CREATION_STARTED
  coinName: string
  coinSymbol: string
  walletAddress: string
  initialBuyAmount?: string
}

export type LaunchpadCoinCreationSuccess = {
  eventName: Name.LAUNCHPAD_COIN_CREATION_SUCCESS
  launchCoinResponse: LaunchCoinResponse
}

export type LaunchpadCoinCreationFailure = {
  eventName: Name.LAUNCHPAD_COIN_CREATION_FAILURE
  errorState:
    | 'poolCreateFailed'
    | 'sdkCoinFailed'
    | 'firstBuyFailed'
    | 'unknownError'
  launchCoinResponse: LaunchCoinResponse
}

export type LaunchpadFirstBuyStarted = {
  eventName: Name.LAUNCHPAD_FIRST_BUY_STARTED
  coinSymbol: string
  mintAddress: string
  payAmount: string
  receiveAmount: string
}

export type LaunchpadFirstBuySuccess = {
  eventName: Name.LAUNCHPAD_FIRST_BUY_SUCCESS
  coinSymbol: string
  mintAddress: string
  payAmount: string
  receiveAmount: string
}

export type LaunchpadFirstBuyFailure = {
  eventName: Name.LAUNCHPAD_FIRST_BUY_FAILURE
  coinSymbol: string
  mintAddress: string
  payAmount: string
  error: string
}

export type LaunchpadFirstBuyRetry = {
  eventName: Name.LAUNCHPAD_FIRST_BUY_RETRY
  launchCoinResponse: LaunchCoinResponse
}

export type LaunchpadFirstBuyMaxButton = {
  eventName: Name.LAUNCHPAD_FIRST_BUY_MAX_BUTTON
  maxValue?: string
} & Partial<LaunchpadFormValues>

export type LaunchpadFirstBuyQuoteReceived = {
  eventName: Name.LAUNCHPAD_FIRST_BUY_QUOTE_RECEIVED
  payAmount: string
  receiveAmount: string
  usdcValue: string
}

export type LaunchpadBuyModalOpen = {
  eventName: Name.LAUNCHPAD_BUY_MODAL_OPEN
}

export type LaunchpadBuyModalClose = {
  eventName: Name.LAUNCHPAD_BUY_MODAL_CLOSE
}

export type LaunchpadBuyModalContinue = {
  eventName: Name.LAUNCHPAD_BUY_MODAL_CONTINUE
}

export type LaunchpadBuyModalBack = {
  eventName: Name.LAUNCHPAD_BUY_MODAL_BACK
}

export type LaunchpadBuyModalSubmit = {
  eventName: Name.LAUNCHPAD_BUY_MODAL_SUBMIT
  inputAmount: string
  outputAmount: string
  inputTokenSymbol: string
  outputTokenSymbol: string
  walletAddress: string
}

export type LaunchpadBuyModalSuccess = {
  eventName: Name.LAUNCHPAD_BUY_MODAL_SUCCESS
}

export type LaunchpadBuyModalFailure = {
  eventName: Name.LAUNCHPAD_BUY_MODAL_FAILURE
  error: any
}

export type LaunchpadBuyModalChangeCurrency = {
  eventName: Name.LAUNCHPAD_BUY_MODAL_CHANGE_CURRENCY
  newCurrencySymbol: string
}

export type LaunchpadBuyModalFormChange = {
  eventName: Name.LAUNCHPAD_BUY_MODAL_FORM_CHANGE
  inputChanged: string
  newValue: string
}

export type LaunchpadBuyModalMaxButton = {
  eventName: Name.LAUNCHPAD_BUY_MODAL_MAX_BUTTON
}

export type LaunchpadClaimFeesClicked = {
  eventName: Name.LAUNCHPAD_CLAIM_FEES_CLICKED
  walletAddress: string
  coinSymbol?: string
  mintAddress?: string
}

export type LaunchpadClaimFeesSuccess = {
  eventName: Name.LAUNCHPAD_CLAIM_FEES_SUCCESS
  walletAddress: string
  coinSymbol?: string
  mintAddress?: string
  claimedAmount: string
}

export type LaunchpadClaimFeesFailure = {
  eventName: Name.LAUNCHPAD_CLAIM_FEES_FAILURE
  walletAddress: string
  coinSymbol?: string
  mintAddress?: string
  error: string
}

export type LaunchpadClaimFeesConnectWallet = {
  eventName: Name.LAUNCHPAD_CLAIM_FEES_CONNECT_WALLET
  coinSymbol?: string
  mintAddress?: string
}

export type LaunchpadClaimFeesSwitchWallet = {
  eventName: Name.LAUNCHPAD_CLAIM_FEES_SWITCH_WALLET
  currentWalletAddress: string
  expectedWalletAddress: string
  coinSymbol?: string
  mintAddress?: string
}

export type LaunchpadClaimFeesWalletConnected = {
  eventName: Name.LAUNCHPAD_CLAIM_FEES_WALLET_CONNECTED
  walletAddress: string
  coinSymbol?: string
  mintAddress?: string
}

export type LaunchpadClaimVestedCoinsClicked = {
  eventName: Name.LAUNCHPAD_CLAIM_VESTED_COINS_CLICKED
  walletAddress: string
  coinSymbol?: string
  mintAddress?: string
}

export type LaunchpadClaimVestedCoinsConnectWallet = {
  eventName: Name.LAUNCHPAD_CLAIM_VESTED_COINS_CONNECT_WALLET
  coinSymbol?: string
  mintAddress?: string
}

export type LaunchpadClaimVestedCoinsSuccess = {
  eventName: Name.LAUNCHPAD_CLAIM_VESTED_COINS_SUCCESS
  walletAddress: string
  coinSymbol?: string
  mintAddress?: string
  claimedAmount: string
}

export type LaunchpadClaimVestedCoinsFailure = {
  eventName: Name.LAUNCHPAD_CLAIM_VESTED_COINS_FAILURE
  walletAddress: string
  coinSymbol?: string
  mintAddress?: string
  error: string
}

export type LaunchpadClaimVestedCoinsSwitchWallet = {
  eventName: Name.LAUNCHPAD_CLAIM_VESTED_COINS_SWITCH_WALLET
  currentWalletAddress: string
  expectedWalletAddress: string
  coinSymbol?: string
  mintAddress?: string
}

export type LaunchpadClaimVestedCoinsWalletConnected = {
  eventName: Name.LAUNCHPAD_CLAIM_VESTED_COINS_WALLET_CONNECTED
  walletAddress: string
  coinSymbol?: string
  mintAddress?: string
}

export type BaseAnalyticsEvent = { type: typeof ANALYTICS_TRACK_EVENT }

export type AllTrackingEvents =
  | AppError
  | CreateAccountOpen
  | CreateAccountCompleteEmail
  | CreateAccountCompletePassword
  | CreateAccountStartTwitter
  | CreateAccountCompleteTwitter
  | CreateAccountStartInstagram
  | CreateAccountCompleteInstagram
  | CreateAccountStartTikTok
  | CreateAccountClosedTikTok
  | CreateAccountCompleteTikTok
  | CreateAccountCompleteProfile
  | CreateAccountCompleteFollow
  | CreateAccountCompleteCreating
  | CreateAccountOpenFinish
  | CreateAccountClosedTwitter
  | CreateAccountTikTokError
  | CreateAccountTwitterError
  | CreateAccountClosedInstagram
  | CreateAccountInstagramError
  | CreateAccountUploadProfilePhoto
  | CreateAccountUploadProfilePhotoError
  | CreateAccountUploadProfileCover
  | CreateAccountUploadProfileCoverError
  | CreateAccountSelectGenre
  | CreateAccountFollowArtist
  | CreateAccountPreviewArtist
  | CreateAccountWelcomeModal
  | CreateAccountWelcomeModalUploadTrack
  | SignInStart
  | SignInFinish
  | SignInWithIncompleteAccount
  | SettingsChangeTheme
  | SettingsStartTwitterOauth
  | SettingsCompleteTwitterOauth
  | SettingsStartInstagramOauth
  | SettingsCompleteInstagramOauth
  | SettingsStartTikTokOauth
  | SettingsCompleteTikTokOauth
  | SettingsResetAccountRecovery
  | SettingsStartChangePassword
  | SettingsCompleteChangePassword
  | SettingsLogOut
  | TikTokStartOAuth
  | TikTokCompleteOAuth
  | TikTokOAuthError
  | VisualizerOpen
  | VisualizerClose
  | AccountHealthMeterFull
  | AccountHealthUploadCoverPhoto
  | AccountHealthUploadProfilePhoto
  | AccountHealthDownloadDesktop
  | AccountHealthCTABanner
  | Share
  | ShareToTwitter
  | Repost
  | UndoRepost
  | Favorite
  | Unfavorite
  | ArtistPickSelectTrack
  | PlaylistAdd
  | PlaylistOpenCreate
  | PlaylistStartCreate
  | PlaylistCompleteCreate
  | PlaylistMakePublic
  | PlaylistOpenEditFromLibrary
  | Delete
  | EmbedOpen
  | EmbedCopy
  | TrackUploadOpen
  | TrackUploadStartUploading
  | TrackUploadTrackUploading
  | TrackUploadCompleteUpload
  | TrackUploadFollowGated
  | TrackUploadTipGated
  | TrackUploadUSDCGated
  | TrackUploadTokenGated
  | TrackUploadClickUSDCWaitListLink
  | TrackUploadFollowGatedDownload
  | TrackUploadUSDCGatedDownload
  | TrackUploadTokenGatedDownload
  | TrackUploadClickUSDCDownloadWaitListLink
  | TrackDownloadClickedDownloadAll
  | TrackDownloadSuccessfulDownloadAll
  | TrackDownloadFailedDownloadAll
  | TrackDownloadClickedDownloadSingle
  | TrackDownloadSuccessfulDownloadSingle
  | TrackDownloadFailedDownloadSingle
  | TrackEditAccessChanged
  | TrackEditBpmChanged
  | TrackEditMusicalKeyChanged
  | CollectionEditAccessChanged
  | CollectionEdit
  | TrackUploadSuccess
  | TrackUploadFailure
  | TrackUploadRejected
  | TrackUploadCopyLink
  | TrackUploadShareWithFans
  | TrackUploadViewTrackPage
  | USDCGatedTrackUnlocked
  | FollowGatedTrackUnlocked
  | TipGatedTrackUnlocked
  | TokenGatedTrackUnlocked
  | USDCGatedDownloadTrackUnlocked
  | FollowGatedDownloadTrackUnlocked
  | TokenGatedDownloadTrackUnlocked
  | TrendingChangeView
  | TrendingPaginate
  | FeedChangeView
  | FeedPaginate
  | NotificationsOpen
  | NotificationsClickTile
  | NotificationsClickMilestone
  | NotificationsClickRemixCreate
  | NotificationsClickRemixCosign
  | NotificationsClickTipReaction
  | NotificationsClickTipReceived
  | NotificationsClickTipSent
  | NotificationsClickDethroned
  | NotificationsClickSupporterRankUp
  | NotificationsClickSupportingRankUp
  | NotificationsClickAddTrackToPlaylist
  | NotificationsClickTrendingPlaylist
  | NotificationsClickTrendingTrack
  | NotificationsClickTrendingUnderground
  | NotificationsClickUSDCPurchaseBuyer
  | NotificationsClickTastemaker
  | NotificationsToggleSettings
  | ProfilePageTabClick
  | ProfilePageSort
  | ProfilePageClickInstagram
  | ProfilePageClickTwitter
  | ProfilePageClickTikTok
  | ProfilePageClickWebsite
  | ProfilePageShownArtistRecommendations
  | TrackPageDownload
  | TrackPagePlayMore
  | PlaybackPlay
  | PlaybackPause
  | BufferingTime
  | Follow
  | Unfollow
  | LinkClicking
  | TagClicking
  | ModalOpened
  | ModalClosed
  | SearchTerm
  | SearchTag
  | SearchMoreResults
  | SearchResultSelect
  | ListenGated
  | ErrorPage
  | NotFoundPage
  | PageView
  | OnFirstPage
  | NotOnFirstPage
  | BrowserNotificationSetting
  | TweetFirstUpload
  | WebVitals
  | Performance
  | StemCompleteUpload
  | StemDelete
  | RemixNewRemix
  | RemixCosign
  | RemixCosignIndicator
  | RemixHide
  | SendAudioRequest
  | SendAudioSuccess
  | SendAudioFailure
  | PlaylistLibraryReorder
  | PlaylistLibraryClicked
  | PlaylistLibraryMovePlaylistIntoFolder
  | PlaylistLibraryAddPlaylistToFolder
  | PlaylistLibraryMovePlaylistOutOfFolder
  | PlaylistLibraryExpandFolder
  | PlaylistLibraryCollapseFolder
  | TransferAudioToWAudioRequest
  | TransferAudioToWAudioSuccess
  | TransferAudioToWAudioFailure
  | DeactivateAccountPageView
  | DeactivateAccountRequest
  | DeactivateAccountSuccess
  | DeactivateAccountFailure
  | CreateUserBankRequest
  | CreateUserBankSuccess
  | CreateUserBankFailure
  | RewardsClaimDetailsOpened
  | RewardsClaimRequest
  | RewardsClaimSuccess
  | RewardsClaimFailure
  | RewardsClaimBlocked
  | RewardsClaimAllRequest
  | RewardsClaimAllSuccess
  | RewardsClaimAllFailure
  | RewardsClaimAllBlocked
  | TipAudioRequest
  | TipAudioSuccess
  | TipAudioFailure
  | TipAudioTwitterShare
  | TipFeedTileDismiss
  | SocialProofOpen
  | SocialProofSuccess
  | SocialProofError
  | FolderOpenCreate
  | FolderSubmitCreate
  | FolderCancelCreate
  | FolderOpenEdit
  | FolderSubmitEdit
  | FolderDelete
  | FolderCancelEdit
  | AudiusOauthStart
  | AudiusOauthComplete
  | AudiusOauthSubmit
  | AudiusOauthError
  | BuyAudioOnRampOpened
  | BuyAudioOnRampSuccess
  | BuyAudioOnRampCanceled
  | BuyAudioSuccess
  | BuyAudioFailure
  | BuyAudioRecoveryOpened
  | BuyAudioRecoverySuccess
  | BuyAudioRecoveryFailure
  | BuyUSDCOnRampOpened
  | BuyUSDCOnRampSuccess
  | BuyUSDCOnRampCanceled
  | BuyUSDCOnRampFailed
  | BuyUSDCSuccess
  | BuyUSDCFailure
  | BuyUSDCRecoveryInProgress
  | BuyUSDCRecoverySuccess
  | BuyUSDCRecoveryFailure
  | BuyUSDCAddFundsManually
  | BuySellSwapRequested
  | BuySellSwapConfirmed
  | BuySellSwapSuccess
  | BuySellSwapFailure
  | BuySellAddFundsClicked
  | WithdrawUSDCModalOpened
  | WithdrawUSDCAddressPasted
  | WithdrawUSDCFormError
  | WithdrawUSDCRequested
  | WithdrawUSDCSuccess
  | WithdrawUSDCFailure
  | WithdrawUSDCCancelled
  | WithdrawUSDCCreateDestAccountStarted
  | WithdrawUSDCCreateDestAccountSuccess
  | WithdrawUSDCCreateDestAccountFailure
  | WithdrawUSDCTransferToRootWallet
  | WithdrawUSDCCoinflowWithdrawalReady
  | WithdrawUSDCCoinflowSendTransaction
  | WithdrawUSDCCoinflowSendTransactionFailed
  | WithdrawUSDCHelpLinkClicked
  | WithdrawUSDCTxLinkClicked
  | StripeSessionCreationError
  | StripeSessionCreated
  | StripeModalInitialized
  | StripeRequiresPayment
  | StripeFulfillmentProcessing
  | StripeFulfillmentComplete
  | StripeError
  | StripeRejected
  | PurchaseContentBuyClicked
  | PurchaseContentStarted
  | PurchaseContentSuccess
  | PurchaseContentFailure
  | PurchaseContentTwitterShare
  | PurchaseContentTOSClicked
  | PurchaseContentUSDCUserBankCopied
  | BannerTOSClicked
  | BannerArtistCoinsLaunchClicked
  | RateCtaDisplayed
  | RateCtaResponseNo
  | RateCtaResponseYes
  | ConnectWalletNewWalletStart
  | ConnectWalletNewWalletConnecting
  | ConnectWalletNewWalletConnected
  | ConnectWalletDisconnected
  | ConnectWalletAlreadyAssociated
  | ConnectWalletAssociationError
  | ConnectWalletError
  | ChatBlastCTAClicked
  | ChatBlastMessageSent
  | CreateChatSuccess
  | CreateChatFailure
  | CreateChatBlastSuccess
  | CreateChatBlastFailure
  | SendMessageSuccess
  | SendMessageFailure
  | DeleteChatSuccess
  | DeleteChatFailure
  | BlockUserSuccess
  | BlockUserFailure
  | ChangeInboxSettingsSuccess
  | ChangeInboxSettingsFailure
  | SendMessageReactionSuccess
  | SendMessageReactionFailure
  | MessageUnfurlTrack
  | MessageUnfurlPlaylist
  | TipUnlockedChat
  | ChatReportUser
  | DeveloperAppCreateSubmit
  | DeveloperAppCreateSuccess
  | DeveloperAppCreateError
  | DeveloperAppEditSubmit
  | DeveloperAppEditSuccess
  | DeveloperAppEditError
  | DeveloperAppDeleteSuccess
  | DeveloperAppDeleteError
  | AuthorizedAppRemoveSuccess
  | AuthorizedAppRemoveError
  | ChatEntryPoint
  | ChatWebsocketError
  | JupiterQuoteResponse
  | JupiterQuoteRequest
  | ExportPrivateKeyLinkClicked
  | ExportPrivateKeyPageOpened
  | ExportPrivateKeyModalOpened
  | ExportPrivateKeyPublicAddressCopied
  | ExportPrivateKeyPrivateKeyCopied
  | ManagerModeSwitchAccount
  | ManagerModeInviteManager
  | ManagerModeAcceptInvite
  | ManagerModeCancelInvite
  | ManagerModeRejectInvite
  | ManagerModeRemoveManager
  | CommentsCreateComment
  | CommentsUpdateComment
  | CommentsDeleteComment
  | CommentsFocusCommentInput
  | CommentsClickReplyButton
  | CommentsLikeComment
  | CommentsUnlikeComment
  | CommentsReportComment
  | CommentsAddMention
  | CommentsClickMention
  | CommentsAddTimestamp
  | CommentsClickTimestamp
  | CommentsAddLink
  | CommentsClickLink
  | CommentsNotificationOpen
  | CommentsMuteUser
  | CommentsUnmuteUser
  | CommentsPinComment
  | CommentsUnpinComment
  | CommentsLoadMoreComments
  | CommentsLoadNewComments
  | CommentsShowReplies
  | CommentsLoadMoreReplies
  | CommentsHideReplies
  | CommentsApplySort
  | CommentsClickCommentStat
  | CommentsOpenCommentOverflowMenu
  | CommentsTurnOffNotificationsForComment
  | CommentsTurnOnNotificationsForComment
  | CommentsOpenTrackOverflowMenu
  | CommentsTurnOnNotificationsForTrack
  | CommentsTurnOffNotificationsForTrack
  | CommentsDisableTrackComments
  | CommentsOpenCommentDrawer
  | CommentsCloseCommentDrawer
  | CommentsOpenAuthModal
  | CommentsOpenInstallAppModal
  | CommentsHistoryClick
  | CommentsHistoryDrawerOpen
  | RecentCommentsClick
  | TrackReplaceDownload
  | TrackReplacePreview
  | TrackReplaceReplace
  | RemixContestCreate
  | RemixContestUpdate
  | RemixContestDelete
  | RemixContestPickWinnersOpen
  | RemixContestPickWinnersFinalize
  | AndroidAppRestartHeartbeat
  | AndroidAppRestartStale
  | AndroidAppRestartForceQuit
  | LaunchpadSplashGetStarted
  | LaunchpadHasExistingArtistCoin
  | LaunchpadSplashLearnMoreClicked
  | LaunchpadWalletConnectSuccess
  | LaunchpadWalletInsufficientBalance
  | LaunchpadSetupContinue
  | LaunchpadReviewContinue
  | LaunchpadCoinCreationStarted
  | LaunchpadCoinCreationSuccess
  | LaunchpadCoinCreationFailure
  | LaunchpadFirstBuyStarted
  | LaunchpadFirstBuySuccess
  | LaunchpadFirstBuyFailure
  | LaunchpadFirstBuyRetry
  | LaunchpadFormInputChange
  | LaunchpadFormBack
  | LaunchpadWalletConnectError
  | LaunchpadFirstBuyMaxButton
  | LaunchpadFirstBuyQuoteReceived
  | LaunchpadBuyModalOpen
  | LaunchpadBuyModalClose
  | LaunchpadBuyModalSubmit
  | LaunchpadBuyModalSuccess
  | LaunchpadBuyModalFailure
  | LaunchpadBuyModalChangeCurrency
  | LaunchpadBuyModalFormChange
  | LaunchpadBuyModalMaxButton
  | LaunchpadBuyModalContinue
  | LaunchpadBuyModalBack
  | LaunchpadClaimFeesClicked
  | LaunchpadClaimFeesSuccess
  | LaunchpadClaimFeesFailure
  | LaunchpadClaimFeesConnectWallet
  | LaunchpadClaimFeesSwitchWallet
  | LaunchpadClaimFeesWalletConnected
  | LaunchpadClaimVestedCoinsClicked
  | LaunchpadClaimVestedCoinsSuccess
  | LaunchpadClaimVestedCoinsFailure
  | LaunchpadClaimVestedCoinsConnectWallet
  | LaunchpadClaimVestedCoinsSwitchWallet
  | LaunchpadClaimVestedCoinsWalletConnected
