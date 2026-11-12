export enum IntKeys {
  /**
   * Frequency (in ms) to poll for notifications from identity service.
   */
  NOTIFICATION_POLLING_FREQ_MS = 'NOTIFICATION_POLLING_FREQ_MS',

  /**
   * Number of random (recommended) tracks to fetch and add to the autoplay queue
   */
  AUTOPLAY_LIMIT = 'AUTOPLAY_LIMIT',

  /**
   * Number of services that are required to attest for a user challenge
   */
  ATTESTATION_QUORUM_SIZE = 'ATTESTATION_QUORUM_SIZE',

  /**
   * The refresh interval in milliseconds for user challenges
   */
  CHALLENGE_REFRESH_INTERVAL_MS = 'CHALLENGE_REFRESH_INTERVAL_MS',

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
   * The time to spend polling the validator node for updates to the challenge being claimed to check if it has been indexed as complete.
   */
  CHALLENGE_CLAIM_COMPLETION_POLL_TIMEOUT_MS = 'CHALLENGE_CLAIM_COMPLETION_POLL_TIMEOUT_MS',

  /**
   * The interval between polls to the validator node for updates to the challenge being claimed to check if it has been indexed as complete.
   */
  CHALLENGE_CLAIM_COMPLETION_POLL_FREQUENCY_MS = 'CHALLENGE_CLAIM_COMPLETION_POLL_FREQUENCY_MS',

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
   * The interval in milliseconds between polls for gated tracks to check for access
   */
  GATED_TRACK_POLL_INTERVAL_MS = 'GATED_TRACK_POLL_INTERVAL_MS',

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

export enum StringKeys {
  /**
   * Custom text for a top of page notice.
   */
  APP_WIDE_NOTICE_TEXT = 'APP_WIDE_NOTICE_TEXT',

  /** Rewards IDs as comma-separated array */
  TRENDING_REWARD_IDS = 'TRENDING_REWARD_IDS',
  CHALLENGE_REWARD_IDS = 'CHALLENGE_REWARD_IDS',

  /** Embedded tweet for trending rewards UI tracks */
  REWARDS_TWEET_ID_TRACKS = 'REWARDS_TWEET_ID_TRACKS',

  /** Embedded tweet for underground trending rewards UI  */
  REWARDS_TWEET_ID_UNDERGROUND = 'REWARDS_TWEET_ID_UNDERGROUND',

  /** Trending experiment id */
  TRENDING_EXPERIMENT = 'TRENDING_EXPERIMENT',

  /** Ethereum address for oracle */
  ORACLE_ETH_ADDRESS = 'ORACLE_ETH_ADDRESS',

  /** Endpoint of oracle */
  ORACLE_ENDPOINT = 'ORACLE_ENDPOINT',

  /** Endpoints to use for rewards attestations */
  REWARDS_ATTESTATION_ENDPOINTS = 'REWARDS_ATTESTATION_ENDPOINTS',

  /** Minimum required version for the app */
  MIN_APP_VERSION = 'MIN_APP_VERSION',

  /** 2-Letter ISO Country Codes of Denied Countries for Buy/Sell */
  BUY_SELL_DENIED_COUNTRIES = 'BUY_SELL_DENIED_COUNTRIES',

  /** Text to display on related features when Solana/$AUDIO features are degraded */
  AUDIO_FEATURES_DEGRADED_TEXT = 'AUDIO_FEATURES_DEGRADED_TEXT',

  /** Preset amounts for the Pay Extra feature in USDC purchases, specified in cents */
  PAY_EXTRA_PRESET_CENT_AMOUNTS = 'PAY_EXTRA_PRESET_CENT_AMOUNTS'
}

export type AllRemoteConfigKeys = IntKeys | StringKeys
