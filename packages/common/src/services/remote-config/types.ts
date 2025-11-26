export enum IntKeys {
  /**
   * Duration (in ms) before we consider the fetch of an image against
   * a primary creator node a failure
   * @deprecated
   */
  IMAGE_QUICK_FETCH_TIMEOUT_MS = 'IMAGE_QUICK_FETCH_TIMEOUT_MS',
  /**
   * The size at which a bundle of image loading performance metrics
   * are sent to the analytics sever
   */
  IMAGE_QUICK_FETCH_PERFORMANCE_BATCH_SIZE = 'IMAGE_QUICK_FETCH_PERFORMANCE_BATCH_SIZE',

  /**
   * Frequency (in ms) to poll for user wallet balance on the client dashboard page
   */
  DASHBOARD_WALLET_BALANCE_POLLING_FREQ_MS = 'DASHBOARD_WALLET_BALANCE_POLLING_FREQ_MS',

  /**
   * Frequency (in ms) to poll for notifications from identity service.
   */
  NOTIFICATION_POLLING_FREQ_MS = 'NOTIFICATION_POLLING_FREQ_MS',

  /**
   * Service monitoring health check analytics sample rate (int out of 100). A value of 50
   * means that half of health checks are recorded.
   */
  SERVICE_MONITOR_HEALTH_CHECK_SAMPLE_RATE = 'SERVICE_MONITOR_HEALTH_CHECK_SAMPLE_RATE',

  /**
   * Service monitoring request analytics sample rate (int out of 100). A value of 50
   * means that half of all requests are recorded.
   */
  SERVICE_MONITOR_REQUEST_SAMPLE_RATE = 'SERVICE_MONITOR_REQUEST_SAMPLE_RATE',

  /**
   * Instagram handle taken check timeout
   */
  INSTAGRAM_HANDLE_CHECK_TIMEOUT = 'INSTAGRAM_HANDLE_CHECK_TIMEOUT',

  /**
   * Number of random (recommended) tracks to fetch and add to the autoplay queue
   */
  AUTOPLAY_LIMIT = 'AUTOPLAY_LIMIT',

  /**
   * Number of services that are required to attest for a user challenge
   */
  ATTESTATION_QUORUM_SIZE = 'ATTESTATION_QUORUM_SIZE',

  /**
   * The minimum amount of AUDIO needed to be sent
   */
  MIN_AUDIO_SEND_AMOUNT = 'MIN_AUDIO_SEND_AMOUNT',

  /**
   * The refresh interval in milliseconds for user challenges
   */
  CHALLENGE_REFRESH_INTERVAL_MS = 'CHALLENGE_REFRESH_INTERVAL_MS',

  /**
   * The refresh interval in milliseconds for user challenges when the user is on the $AUDIO page
   */
  CHALLENGE_REFRESH_INTERVAL_AUDIO_PAGE_MS = 'CHALLENGE_REFRESH_INTERVAL_AUDIO_PAGE_MS',

  /**
   * The time to wait after a challenge is marked completed before showing a claim reward prompt.
   * Should be larger than both CHALLENGE_REFRESH_INTERVAL_MS and CHALLENGE_REFRESH_INTERVAL_AUDIO_PAGE_MS
   * to allow additional polls to check for disbursement
   */
  MANUAL_CLAIM_PROMPT_DELAY_MS = 'MANUAL_CLAIM_PROMPT_DELAY_MS',

  /**
   * The maximum number of times to retry the claim method for a reward on the client
   * Note: Exponential backoff is used between retries
   */
  MAX_CLAIM_RETRIES = 'MAX_CLAIM_RETRIES',

  /**
   * How many challenges the client will attempt to attest for in parallel, in the
   * case of aggregate challenges.
   */
  CLIENT_ATTESTATION_PARALLELIZATION = 'CLIENT_ATTESTATION_PARALLELIZATION',

  /**
   * The time to spend polling DN for updates to the challenge being claimed to check if it has been indexed as complete.
   */
  CHALLENGE_CLAIM_COMPLETION_POLL_TIMEOUT_MS = 'CHALLENGE_CLAIM_COMPLETION_POLL_TIMEOUT_MS',

  /**
   * The interval between polls to DN for updates to the challenge being claimed to check if it has been indexed as complete.
   */
  CHALLENGE_CLAIM_COMPLETION_POLL_FREQUENCY_MS = 'CHALLENGE_CLAIM_COMPLETION_POLL_FREQUENCY_MS',

  /**
   * Minimum AUDIO required to purchase in the BuyAudio modal
   */
  MIN_AUDIO_PURCHASE_AMOUNT = 'MIN_AUDIO_PURCHASE_AMOUNT',

  /**
   * Maximum AUDIO required to purchase in the BuyAudio modal
   */
  MAX_AUDIO_PURCHASE_AMOUNT = 'MAX_AUDIO_PURCHASE_AMOUNT',

  /**
   * Minimum price for purchasable content in cents
   */
  MIN_CONTENT_PRICE_CENTS = 'MIN_CONTENT_PRICE_CENTS',

  /**
   * Maximum price for purchasable content in cents
   */
  MAX_CONTENT_PRICE_CENTS = 'MAX_CONTENT_PRICE_CENTS',

  /**
   * Minimum USDC (in cents) required to purchase in the BuyUSDC modal
   */
  MIN_USDC_PURCHASE_AMOUNT_CENTS = 'MIN_USDC_PURCHASE_AMOUNT_CENTS',

  /**
   * Maximum USDC (in cents) required to purchase in the BuyUSDC modal
   */
  MAX_USDC_PURCHASE_AMOUNT_CENTS = 'MAX_USDC_PURCHASE_AMOUNT_CENTS',

  /**
   * The time to delay between polls of the user wallet when performing a purchase of $AUDIO/$USDC
   */
  BUY_TOKEN_WALLET_POLL_DELAY_MS = 'BUY_TOKEN_WALLET_POLL_DELAY_MS',

  /**
   * The maximum amount of times to poll the user wallet before giving up on an $AUDIO/$USDC purchase
   */
  BUY_TOKEN_WALLET_POLL_MAX_RETRIES = 'BUY_TOKEN_WALLET_POLL_MAX_RETRIES',

  /**
   * The maximum amount the price of SOL is allowed to slip before
   * the Jupiter swap from SOL to the requested token fails.
   * Expressed in percentage basis points (1pt = 0.01%).
   *
   * Note: Increasing this number will increase how much SOL gets purchased,
   * which improves the likelihood the purchase swaps successfully but with the
   * downside of charging the user extra for their purchase.
   * @see https://station.jup.ag/guides/jupiter-swap/price-impact-slippage-price-warning#slippage
   * @see https://station.jup.ag/guides/general/faq#my-swap-fails-reporting-a-slippage-error-what-should-i-do
   */
  BUY_TOKEN_VIA_SOL_SLIPPAGE_BPS = 'BUY_TOKEN_VIA_SOL_SLIPPAGE_BPS',

  /**
   * The allowed slippage percentage/padding percentage for the BuyAudio Modal
   */
  BUY_AUDIO_SLIPPAGE = 'BUY_AUDIO_SLIPPAGE',

  /**
   * The maximum amount the price of SOL is allowed to slip before
   * the Jupiter swap from USDC to SOL
   * Expressed in percentage basis points (1pt = 0.01%).
   */
  BUY_SOL_WITH_TOKEN_SLIPPAGE_BPS = 'BUY_SOL_WITH_TOKEN_SLIPPAGE_BPS',

  /**
   * The interval in milliseconds between polls for gated tracks to check for access
   */
  GATED_TRACK_POLL_INTERVAL_MS = 'GATED_TRACK_POLL_INTERVAL_MS',

  /**
   * Cache entry TTL to determine when a cache value should be overwritten with new instance
   */
  CACHE_ENTRY_TTL = 'CACHE_ENTRY_TTL',

  /**
   * Timeout for handle verification from socials.
   */
  HANDLE_VERIFICATION_TIMEOUT_MILLIS = 'HANDLE_VERIFICATION_TIMEOUT_MILLIS',

  /** Coinflow maximum */
  COINFLOW_MAXIMUM_CENTS = 'COINFLOW_MAXIMUM_CENTS',

  /** Minimum balance required to initiate a USDC cash transfer */
  MIN_USDC_WITHDRAW_BALANCE_CENTS = 'MIN_USDC_WITHDRAW_BALANCE_CENTS',

  /** User must meet this tier requirement to send chat blasts */
  CHAT_BLAST_TIER_REQUIREMENT = 'CHAT_BLAST_TIER_REQUIREMENT'
}

export enum BooleanKeys {
  /*
   * Boolean to show wallet connect as an option for associating wallets
   */
  DISPLAY_WEB3_PROVIDER_WALLET_CONNECT = 'DISPLAY_WEB3_PROVIDER_WALLET_CONNECT',
  /*
   * Boolean to show bitski as an option for associating wallets
   */
  DISPLAY_WEB3_PROVIDER_BITSKI = 'DISPLAY_WEB3_PROVIDER_BITSKI',
  /*
   * Boolean to show wallet link as an option for associating wallets
   */
  DISPLAY_WEB3_PROVIDER_WALLET_LINK = 'DISPLAY_WEB3_PROVIDER_WALLET_LINK',
  /*
   * Boolean to show phantom as an option for associating spl wallets
   */
  DISPLAY_SOLANA_WEB3_PROVIDER_PHANTOM = 'DISPLAY_SOLANA_WEB3_PROVIDER_PHANTOM',
  /*
   * Boolean to show instagram verification on mobile.
   */
  DISPLAY_INSTAGRAM_VERIFICATION = 'DISPLAY_INSTAGRAM_VERIFICATION',
  /*
   * Boolean to show instagram verification on web + desktop.
   */
  DISPLAY_INSTAGRAM_VERIFICATION_WEB_AND_DESKTOP = 'DISPLAY_INSTAGRAM_VERIFICATION_WEB_AND_DESKTOP',
  /**
   * Boolean to show twitter verification on mobile.
   */
  DISPLAY_TWITTER_VERIFICATION = 'DISPLAY_TWITTER_VERIFICATION',
  /**
   * Boolean to show twitter verification on web + desktop.
   */
  DISPLAY_TWITTER_VERIFICATION_WEB_AND_DESKTOP = 'DISPLAY_TWITTER_VERIFICATION_WEB_AND_DESKTOP',
  /**
   * Boolean to show twitter verification on mobile.
   */
  DISPLAY_TIKTOK_VERIFICATION = 'DISPLAY_TIKTOK_VERIFICATION',
  /**
   * Boolean to show twitter verification on web + desktop.
   */
  DISPLAY_TIKTOK_VERIFICATION_WEB_AND_DESKTOP = 'DISPLAY_TIKTOK_VERIFICATION_WEB_AND_DESKTOP',

  /**
   * Boolean to skip the rollover nodes sanity check.
   */
  SKIP_ROLLOVER_NODES_SANITY_CHECK = 'SKIP_ROLLOVER_NODES_SANITY_CHECK',

  /**
   * Boolean to enable "Transactions" button on Audio page.
   */
  AUDIO_TRANSACTIONS_ENABLED = 'AUDIO_TRANSACTIONS_ENABLED'
}

export enum DoubleKeys {
  /**
   * How often we should show recommendations of top artists as suggested follows
   * if the followed user doesn't have related artists
   */
  SHOW_ARTIST_RECOMMENDATIONS_FALLBACK_PERCENT = 'SHOW_ARTIST_RECOMMENDATIONS_FALLBACK_PERCENT',
  /**
   * How often we should show suggested follows after a user follows another user
   */
  SHOW_ARTIST_RECOMMENDATIONS_PERCENT = 'SHOW_ARTIST_RECOMMENDATIONS_PERCENT',

  /** How many Sentry error recordings we sample. Value ranges from 0.0-1.0 */
  SENTRY_REPLAY_ERROR_SAMPLE_RATE = 'SENTRY_REPLAY_ERROR_SAMPLE_RATE'
}

export enum StringKeys {
  /**
   * Logo variant to display in the top left of the app.
   * `AUDIUS_LOGO_VARIANT_CLICK_TARGET` can be used to customize the
   * url that is navigated to on click.
   */
  AUDIUS_LOGO_VARIANT = 'AUDIUS_LOGO_VARIANT',

  /**
   * Click target for the top left Audius logo in the app.
   */
  AUDIUS_LOGO_VARIANT_CLICK_TARGET = 'AUDIUS_LOGO_VARIANT_CLICK_TARGET',

  /**
   * Custom text for a top of page notice.
   */
  APP_WIDE_NOTICE_TEXT = 'APP_WIDE_NOTICE_TEXT',

  /**
   * Custom eth provider urls to use for talking to main-net contracts
   */
  ETH_PROVIDER_URLS = 'ETH_PROVIDER_URLS',

  /**
   * Blocks content
   */
  CONTENT_BLOCK_LIST = 'CONTENT_BLOCK_LIST',

  /**
   * Blocks content nodes from selection
   */
  CONTENT_NODE_BLOCK_LIST = 'CONTENT_NODE_BLOCK_LIST',

  /**
   * Instagram Profile API url. Must contain $USERNAME$
   */
  INSTAGRAM_API_PROFILE_URL = 'INSTAGRAM_API_PROFILE_URL',

  /**
   * User ids omitted from trending playlists (used to omit Audius from rewards).
   * Comma-separated.
   */
  TRENDING_PLAYLIST_OMITTED_USER_IDS = 'TRENDING_PLAYLIST_OMITTED_USER_IDS',

  /** Rewards IDs as comma-separated array */
  TRENDING_REWARD_IDS = 'TRENDING_REWARD_IDS',
  CHALLENGE_REWARD_IDS = 'CHALLENGE_REWARD_IDS',

  /** Embedded tweet for trending rewards UI tracks */
  REWARDS_TWEET_ID_TRACKS = 'REWARDS_TWEET_ID_TRACKS',

  /** Embedded tweet for trending rewards UI playlists */
  REWARDS_TWEET_ID_PLAYLISTS = 'REWARDS_TWEET_ID_PLAYLISTS',

  /** Embedded tweet for underground trending rewards UI  */
  REWARDS_TWEET_ID_UNDERGROUND = 'REWARDS_TWEET_ID_UNDERGROUND',

  /** TF */
  TF = 'TF',
  TPF = 'TPF',
  UTF = 'UTF',

  /** Trending experiment id */
  TRENDING_EXPERIMENT = 'TRENDING_EXPERIMENT',

  /** Underground trending experiment id */
  UNDERGROUND_TRENDING_EXPERIMENT = 'UNDERGROUND_TRENDING_EXPERIMENT',

  /** Playlist trending experiment id */
  PLAYLIST_TRENDING_EXPERIMENT = 'PLAYLIST_TRENDING_EXPERIMENT',

  /** Ethereum address for oracle */
  ORACLE_ETH_ADDRESS = 'ORACLE_ETH_ADDRESS',

  /** Endpoint of oracle */
  ORACLE_ENDPOINT = 'ORACLE_ENDPOINT',

  /** Endpoints to use for rewards attestations */
  REWARDS_ATTESTATION_ENDPOINTS = 'REWARDS_ATTESTATION_ENDPOINTS',

  /** Minimum required version for the app */
  MIN_APP_VERSION = 'MIN_APP_VERSION',

  /** Preset amounts for the Buy Audio modal */
  BUY_AUDIO_PRESET_AMOUNTS = 'BUY_AUDIO_PRESET_AMOUNTS',

  /** 2-Letter ISO Country Codes of Denied Countries for Buy/Sell */
  BUY_SELL_DENIED_COUNTRIES = 'BUY_SELL_DENIED_COUNTRIES',

  /** Text to display on related features when Solana/$AUDIO features are degraded */
  AUDIO_FEATURES_DEGRADED_TEXT = 'AUDIO_FEATURES_DEGRADED_TEXT',

  /** Preset amounts for the Pay Extra feature in USDC purchases, specified in cents */
  PAY_EXTRA_PRESET_CENT_AMOUNTS = 'PAY_EXTRA_PRESET_CENT_AMOUNTS',

  /** Denylist of user ids for explore premium tracks page */
  EXPLORE_PREMIUM_DENIED_USERS = 'EXPLORE_PREMIUM_DENIED_USERS'
}

export type AllRemoteConfigKeys =
  | IntKeys
  | BooleanKeys
  | DoubleKeys
  | StringKeys
