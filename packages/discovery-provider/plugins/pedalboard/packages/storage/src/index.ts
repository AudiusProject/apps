// The TypeScript definitions below are automatically generated.
// Do not touch them, or risk, your modifications being lost.

export enum Challengetype {
  Boolean = "boolean",
  Numeric = "numeric",
  Aggregate = "aggregate",
  Trending = "trending",
}

export enum DelistEntity {
  Tracks = "TRACKS",
  Users = "USERS",
}

export enum DelistTrackReason {
  Dmca = "DMCA",
  Acr = "ACR",
  Manual = "MANUAL",
  AcrCounterNotice = "ACR_COUNTER_NOTICE",
  DmcaRetraction = "DMCA_RETRACTION",
  DmcaCounterNotice = "DMCA_COUNTER_NOTICE",
  DmcaAndAcrCounterNotice = "DMCA_AND_ACR_COUNTER_NOTICE",
}

export enum DelistUserReason {
  StrikeThreshold = "STRIKE_THRESHOLD",
  CopyrightSchool = "COPYRIGHT_SCHOOL",
  Manual = "MANUAL",
}

export enum EventEntityType {
  Track = "track",
  Collection = "collection",
  User = "user",
}

export enum EventType {
  RemixContest = "remix_contest",
  LiveEvent = "live_event",
  NewRelease = "new_release",
}

export enum ParentalWarningType {
  Explicit = "explicit",
  ExplicitContentEdited = "explicit_content_edited",
  NotExplicit = "not_explicit",
  NoAdviceAvailable = "no_advice_available",
}

export enum ProfileTypeEnum {
  Label = "label",
}

export enum ProofStatus {
  Unresolved = "unresolved",
  Pass = "pass",
  Fail = "fail",
}

export enum Reposttype {
  Track = "track",
  Playlist = "playlist",
  Album = "album",
}

export enum Savetype {
  Track = "track",
  Playlist = "playlist",
  Album = "album",
}

export enum Sharetype {
  Track = "track",
  Playlist = "playlist",
}

export enum Skippedtransactionlevel {
  Node = "node",
  Network = "network",
}

export enum UsdcPurchaseAccessType {
  Stream = "stream",
  Download = "download",
}

export enum UsdcPurchaseContentType {
  Track = "track",
  Playlist = "playlist",
  Album = "album",
}

export enum ValidatorEvent {
  Registered = "registered",
  Deregistered = "deregistered",
}

export enum WalletChain {
  Eth = "eth",
  Sol = "sol",
}

export enum Table {
  SequelizeMeta = "SequelizeMeta",
  AccessKeys = "access_keys",
  AggregateDailyAppNameMetrics = "aggregate_daily_app_name_metrics",
  AggregateDailyTotalUsersMetrics = "aggregate_daily_total_users_metrics",
  AggregateDailyUniqueUsersMetrics = "aggregate_daily_unique_users_metrics",
  AggregateMonthlyAppNameMetrics = "aggregate_monthly_app_name_metrics",
  AggregateMonthlyPlays = "aggregate_monthly_plays",
  AggregateMonthlyTotalUsersMetrics = "aggregate_monthly_total_users_metrics",
  AggregateMonthlyUniqueUsersMetrics = "aggregate_monthly_unique_users_metrics",
  AggregatePlaylist = "aggregate_playlist",
  AggregatePlays = "aggregate_plays",
  AggregateTrack = "aggregate_track",
  AggregateUser = "aggregate_user",
  AggregateUserTips = "aggregate_user_tips",
  AlbumPriceHistory = "album_price_history",
  AlembicVersion = "alembic_version",
  AntiAbuseBlockedUsers = "anti_abuse_blocked_users",
  ApiMetricsApps = "api_metrics_apps",
  ApiMetricsCounts = "api_metrics_counts",
  ApiMetricsRoutes = "api_metrics_routes",
  AppNameMetrics = "app_name_metrics",
  ArtistCoinPools = "artist_coin_pools",
  ArtistCoinPrices = "artist_coin_prices",
  ArtistCoinStats = "artist_coin_stats",
  ArtistCoins = "artist_coins",
  AssociatedWallets = "associated_wallets",
  AudioTransactionsHistory = "audio_transactions_history",
  AudiusDataTxs = "audius_data_txs",
  Blocks = "blocks",
  ChallengeDisbursements = "challenge_disbursements",
  ChallengeListenStreak = "challenge_listen_streak",
  ChallengeProfileCompletion = "challenge_profile_completion",
  Challenges = "challenges",
  Chat = "chat",
  ChatBan = "chat_ban",
  ChatBlast = "chat_blast",
  ChatBlockedUsers = "chat_blocked_users",
  ChatMember = "chat_member",
  ChatMessage = "chat_message",
  ChatMessageReactions = "chat_message_reactions",
  ChatPermissions = "chat_permissions",
  CidData = "cid_data",
  Collectibles = "collectibles",
  CommentMentions = "comment_mentions",
  CommentNotificationSettings = "comment_notification_settings",
  CommentReactions = "comment_reactions",
  CommentReports = "comment_reports",
  CommentThreads = "comment_threads",
  Comments = "comments",
  CoreAppState = "core_app_state",
  CoreBlocks = "core_blocks",
  CoreDbMigrations = "core_db_migrations",
  CoreDeals = "core_deals",
  CoreErn = "core_ern",
  CoreIndexedBlocks = "core_indexed_blocks",
  CoreMead = "core_mead",
  CoreParties = "core_parties",
  CorePie = "core_pie",
  CoreReleases = "core_releases",
  CoreResources = "core_resources",
  CoreRewards = "core_rewards",
  CoreTransactions = "core_transactions",
  CoreTxStats = "core_tx_stats",
  CoreUploads = "core_uploads",
  CoreValidators = "core_validators",
  Countries = "countries",
  DashboardWalletUsers = "dashboard_wallet_users",
  DelistStatusCursor = "delist_status_cursor",
  DeveloperApps = "developer_apps",
  EmailAccess = "email_access",
  EncryptedEmails = "encrypted_emails",
  EthActiveProposals = "eth_active_proposals",
  EthBlocks = "eth_blocks",
  EthDbMigrations = "eth_db_migrations",
  EthFundingRounds = "eth_funding_rounds",
  EthRegisteredEndpoints = "eth_registered_endpoints",
  EthServiceProviders = "eth_service_providers",
  EthStaked = "eth_staked",
  Events = "events",
  Follows = "follows",
  Grants = "grants",
  HourlyPlayCounts = "hourly_play_counts",
  IndexingCheckpoints = "indexing_checkpoints",
  ManagementKeys = "management_keys",
  Milestones = "milestones",
  MutedUsers = "muted_users",
  NewTracks = "new_tracks",
  Notification = "notification",
  NotificationSeen = "notification_seen",
  PaymentRouterTxs = "payment_router_txs",
  PgStatStatements = "pg_stat_statements",
  PlaylistRoutes = "playlist_routes",
  PlaylistSeen = "playlist_seen",
  PlaylistTracks = "playlist_tracks",
  PlaylistTrendingScores = "playlist_trending_scores",
  Playlists = "playlists",
  Plays = "plays",
  Pubkeys = "pubkeys",
  Reactions = "reactions",
  RelatedArtists = "related_artists",
  Remixes = "remixes",
  ReportedComments = "reported_comments",
  Reposts = "reposts",
  RevertBlocks = "revert_blocks",
  RewardManagerTxs = "reward_manager_txs",
  RouteMetrics = "route_metrics",
  RpcCursor = "rpc_cursor",
  RpcError = "rpc_error",
  RpcLog = "rpc_log",
  Rpclog = "rpclog",
  Saves = "saves",
  SchemaMigrations = "schema_migrations",
  SchemaVersion = "schema_version",
  Shares = "shares",
  SkippedTransactions = "skipped_transactions",
  SlaNodeReports = "sla_node_reports",
  SlaRollups = "sla_rollups",
  SolClaimableAccountTransfers = "sol_claimable_account_transfers",
  SolClaimableAccounts = "sol_claimable_accounts",
  SolKeypairs = "sol_keypairs",
  SolLockerVestingEscrows = "sol_locker_vesting_escrows",
  SolMeteoraDammV2PoolBaseFees = "sol_meteora_damm_v2_pool_base_fees",
  SolMeteoraDammV2PoolDynamicFees = "sol_meteora_damm_v2_pool_dynamic_fees",
  SolMeteoraDammV2PoolFees = "sol_meteora_damm_v2_pool_fees",
  SolMeteoraDammV2PoolMetrics = "sol_meteora_damm_v2_pool_metrics",
  SolMeteoraDammV2Pools = "sol_meteora_damm_v2_pools",
  SolMeteoraDammV2PositionMetrics = "sol_meteora_damm_v2_position_metrics",
  SolMeteoraDammV2Positions = "sol_meteora_damm_v2_positions",
  SolMeteoraDbcConfigFees = "sol_meteora_dbc_config_fees",
  SolMeteoraDbcConfigVestings = "sol_meteora_dbc_config_vestings",
  SolMeteoraDbcConfigs = "sol_meteora_dbc_configs",
  SolMeteoraDbcMigrations = "sol_meteora_dbc_migrations",
  SolMeteoraDbcPoolMetrics = "sol_meteora_dbc_pool_metrics",
  SolMeteoraDbcPoolVolatilityTrackers = "sol_meteora_dbc_pool_volatility_trackers",
  SolMeteoraDbcPools = "sol_meteora_dbc_pools",
  SolPayments = "sol_payments",
  SolPurchases = "sol_purchases",
  SolRetryQueue = "sol_retry_queue",
  SolRewardDisbursements = "sol_reward_disbursements",
  SolRewardManagerInits = "sol_reward_manager_inits",
  SolSlotCheckpoints = "sol_slot_checkpoints",
  SolTokenAccountBalanceChanges = "sol_token_account_balance_changes",
  SolTokenAccountBalances = "sol_token_account_balances",
  SolTokenTransfers = "sol_token_transfers",
  SolUserBalances = "sol_user_balances",
  SoundRecordings = "sound_recordings",
  SplTokenTx = "spl_token_tx",
  Stems = "stems",
  StorageProofPeers = "storage_proof_peers",
  StorageProofs = "storage_proofs",
  Subscriptions = "subscriptions",
  SupporterRankUps = "supporter_rank_ups",
  TrackDelistStatuses = "track_delist_statuses",
  TrackDownloads = "track_downloads",
  TrackPriceHistory = "track_price_history",
  TrackReleases = "track_releases",
  TrackRoutes = "track_routes",
  TrackTrendingScores = "track_trending_scores",
  Tracks = "tracks",
  TrendingResults = "trending_results",
  UsdcPurchases = "usdc_purchases",
  UsdcTransactionsHistory = "usdc_transactions_history",
  UsdcUserBankAccounts = "usdc_user_bank_accounts",
  UserBalanceChanges = "user_balance_changes",
  UserBalanceHistory = "user_balance_history",
  UserBalances = "user_balances",
  UserBankAccounts = "user_bank_accounts",
  UserBankTxs = "user_bank_txs",
  UserChallenges = "user_challenges",
  UserDelistStatuses = "user_delist_statuses",
  UserDistinctPlayHours = "user_distinct_play_hours",
  UserDistinctPlayTracks = "user_distinct_play_tracks",
  UserEvents = "user_events",
  UserListeningHistory = "user_listening_history",
  UserPayoutWalletHistory = "user_payout_wallet_history",
  UserPubkeys = "user_pubkeys",
  UserScoreFeatures = "user_score_features",
  UserTips = "user_tips",
  Users = "users",
  ValidatorHistory = "validator_history",
  VolumeLeaderExclusions = "volume_leader_exclusions",
}

export type Tables = {
  "SequelizeMeta": SequelizeMeta,
  "access_keys": AccessKeys,
  "aggregate_daily_app_name_metrics": AggregateDailyAppNameMetrics,
  "aggregate_daily_total_users_metrics": AggregateDailyTotalUsersMetrics,
  "aggregate_daily_unique_users_metrics": AggregateDailyUniqueUsersMetrics,
  "aggregate_monthly_app_name_metrics": AggregateMonthlyAppNameMetrics,
  "aggregate_monthly_plays": AggregateMonthlyPlays,
  "aggregate_monthly_total_users_metrics": AggregateMonthlyTotalUsersMetrics,
  "aggregate_monthly_unique_users_metrics": AggregateMonthlyUniqueUsersMetrics,
  "aggregate_playlist": AggregatePlaylist,
  "aggregate_plays": AggregatePlays,
  "aggregate_track": AggregateTrack,
  "aggregate_user": AggregateUser,
  "aggregate_user_tips": AggregateUserTips,
  "album_price_history": AlbumPriceHistory,
  "alembic_version": AlembicVersion,
  "anti_abuse_blocked_users": AntiAbuseBlockedUsers,
  "api_metrics_apps": ApiMetricsApps,
  "api_metrics_counts": ApiMetricsCounts,
  "api_metrics_routes": ApiMetricsRoutes,
  "app_name_metrics": AppNameMetrics,
  "artist_coin_pools": ArtistCoinPools,
  "artist_coin_prices": ArtistCoinPrices,
  "artist_coin_stats": ArtistCoinStats,
  "artist_coins": ArtistCoins,
  "associated_wallets": AssociatedWallets,
  "audio_transactions_history": AudioTransactionsHistory,
  "audius_data_txs": AudiusDataTxs,
  "blocks": Blocks,
  "challenge_disbursements": ChallengeDisbursements,
  "challenge_listen_streak": ChallengeListenStreak,
  "challenge_profile_completion": ChallengeProfileCompletion,
  "challenges": Challenges,
  "chat": Chat,
  "chat_ban": ChatBan,
  "chat_blast": ChatBlast,
  "chat_blocked_users": ChatBlockedUsers,
  "chat_member": ChatMember,
  "chat_message": ChatMessage,
  "chat_message_reactions": ChatMessageReactions,
  "chat_permissions": ChatPermissions,
  "cid_data": CidData,
  "collectibles": Collectibles,
  "comment_mentions": CommentMentions,
  "comment_notification_settings": CommentNotificationSettings,
  "comment_reactions": CommentReactions,
  "comment_reports": CommentReports,
  "comment_threads": CommentThreads,
  "comments": Comments,
  "core_app_state": CoreAppState,
  "core_blocks": CoreBlocks,
  "core_db_migrations": CoreDbMigrations,
  "core_deals": CoreDeals,
  "core_ern": CoreErn,
  "core_indexed_blocks": CoreIndexedBlocks,
  "core_mead": CoreMead,
  "core_parties": CoreParties,
  "core_pie": CorePie,
  "core_releases": CoreReleases,
  "core_resources": CoreResources,
  "core_rewards": CoreRewards,
  "core_transactions": CoreTransactions,
  "core_tx_stats": CoreTxStats,
  "core_uploads": CoreUploads,
  "core_validators": CoreValidators,
  "countries": Countries,
  "dashboard_wallet_users": DashboardWalletUsers,
  "delist_status_cursor": DelistStatusCursor,
  "developer_apps": DeveloperApps,
  "email_access": EmailAccess,
  "encrypted_emails": EncryptedEmails,
  "eth_active_proposals": EthActiveProposals,
  "eth_blocks": EthBlocks,
  "eth_db_migrations": EthDbMigrations,
  "eth_funding_rounds": EthFundingRounds,
  "eth_registered_endpoints": EthRegisteredEndpoints,
  "eth_service_providers": EthServiceProviders,
  "eth_staked": EthStaked,
  "events": Events,
  "follows": Follows,
  "grants": Grants,
  "hourly_play_counts": HourlyPlayCounts,
  "indexing_checkpoints": IndexingCheckpoints,
  "management_keys": ManagementKeys,
  "milestones": Milestones,
  "muted_users": MutedUsers,
  "new_tracks": NewTracks,
  "notification": Notification,
  "notification_seen": NotificationSeen,
  "payment_router_txs": PaymentRouterTxs,
  "pg_stat_statements": PgStatStatements,
  "playlist_routes": PlaylistRoutes,
  "playlist_seen": PlaylistSeen,
  "playlist_tracks": PlaylistTracks,
  "playlist_trending_scores": PlaylistTrendingScores,
  "playlists": Playlists,
  "plays": Plays,
  "pubkeys": Pubkeys,
  "reactions": Reactions,
  "related_artists": RelatedArtists,
  "remixes": Remixes,
  "reported_comments": ReportedComments,
  "reposts": Reposts,
  "revert_blocks": RevertBlocks,
  "reward_manager_txs": RewardManagerTxs,
  "route_metrics": RouteMetrics,
  "rpc_cursor": RpcCursor,
  "rpc_error": RpcError,
  "rpc_log": RpcLog,
  "rpclog": Rpclog,
  "saves": Saves,
  "schema_migrations": SchemaMigrations,
  "schema_version": SchemaVersion,
  "shares": Shares,
  "skipped_transactions": SkippedTransactions,
  "sla_node_reports": SlaNodeReports,
  "sla_rollups": SlaRollups,
  "sol_claimable_account_transfers": SolClaimableAccountTransfers,
  "sol_claimable_accounts": SolClaimableAccounts,
  "sol_keypairs": SolKeypairs,
  "sol_locker_vesting_escrows": SolLockerVestingEscrows,
  "sol_meteora_damm_v2_pool_base_fees": SolMeteoraDammV2PoolBaseFees,
  "sol_meteora_damm_v2_pool_dynamic_fees": SolMeteoraDammV2PoolDynamicFees,
  "sol_meteora_damm_v2_pool_fees": SolMeteoraDammV2PoolFees,
  "sol_meteora_damm_v2_pool_metrics": SolMeteoraDammV2PoolMetrics,
  "sol_meteora_damm_v2_pools": SolMeteoraDammV2Pools,
  "sol_meteora_damm_v2_position_metrics": SolMeteoraDammV2PositionMetrics,
  "sol_meteora_damm_v2_positions": SolMeteoraDammV2Positions,
  "sol_meteora_dbc_config_fees": SolMeteoraDbcConfigFees,
  "sol_meteora_dbc_config_vestings": SolMeteoraDbcConfigVestings,
  "sol_meteora_dbc_configs": SolMeteoraDbcConfigs,
  "sol_meteora_dbc_migrations": SolMeteoraDbcMigrations,
  "sol_meteora_dbc_pool_metrics": SolMeteoraDbcPoolMetrics,
  "sol_meteora_dbc_pool_volatility_trackers": SolMeteoraDbcPoolVolatilityTrackers,
  "sol_meteora_dbc_pools": SolMeteoraDbcPools,
  "sol_payments": SolPayments,
  "sol_purchases": SolPurchases,
  "sol_retry_queue": SolRetryQueue,
  "sol_reward_disbursements": SolRewardDisbursements,
  "sol_reward_manager_inits": SolRewardManagerInits,
  "sol_slot_checkpoints": SolSlotCheckpoints,
  "sol_token_account_balance_changes": SolTokenAccountBalanceChanges,
  "sol_token_account_balances": SolTokenAccountBalances,
  "sol_token_transfers": SolTokenTransfers,
  "sol_user_balances": SolUserBalances,
  "sound_recordings": SoundRecordings,
  "spl_token_tx": SplTokenTx,
  "stems": Stems,
  "storage_proof_peers": StorageProofPeers,
  "storage_proofs": StorageProofs,
  "subscriptions": Subscriptions,
  "supporter_rank_ups": SupporterRankUps,
  "track_delist_statuses": TrackDelistStatuses,
  "track_downloads": TrackDownloads,
  "track_price_history": TrackPriceHistory,
  "track_releases": TrackReleases,
  "track_routes": TrackRoutes,
  "track_trending_scores": TrackTrendingScores,
  "tracks": Tracks,
  "trending_results": TrendingResults,
  "usdc_purchases": UsdcPurchases,
  "usdc_transactions_history": UsdcTransactionsHistory,
  "usdc_user_bank_accounts": UsdcUserBankAccounts,
  "user_balance_changes": UserBalanceChanges,
  "user_balance_history": UserBalanceHistory,
  "user_balances": UserBalances,
  "user_bank_accounts": UserBankAccounts,
  "user_bank_txs": UserBankTxs,
  "user_challenges": UserChallenges,
  "user_delist_statuses": UserDelistStatuses,
  "user_distinct_play_hours": UserDistinctPlayHours,
  "user_distinct_play_tracks": UserDistinctPlayTracks,
  "user_events": UserEvents,
  "user_listening_history": UserListeningHistory,
  "user_payout_wallet_history": UserPayoutWalletHistory,
  "user_pubkeys": UserPubkeys,
  "user_score_features": UserScoreFeatures,
  "user_tips": UserTips,
  "users": Users,
  "validator_history": ValidatorHistory,
  "volume_leader_exclusions": VolumeLeaderExclusions,
};

export type SequelizeMeta = {
  name: string;
};

export type AccessKeys = {
  id: number;
  track_id: string;
  pub_key: string;
};

export type AggregateDailyAppNameMetrics = {
  id: number;
  application_name: string;
  count: number;
  timestamp: Date;
  created_at: Date;
  updated_at: Date;
};

export type AggregateDailyTotalUsersMetrics = {
  id: number;
  count: number;
  timestamp: Date;
  created_at: Date;
  updated_at: Date;
  personal_count: number | null;
};

export type AggregateDailyUniqueUsersMetrics = {
  id: number;
  count: number;
  timestamp: Date;
  created_at: Date;
  updated_at: Date;
  summed_count: number | null;
  personal_count: number | null;
};

export type AggregateMonthlyAppNameMetrics = {
  id: number;
  application_name: string;
  count: number;
  timestamp: Date;
  created_at: Date;
  updated_at: Date;
};

export type AggregateMonthlyPlays = {
  play_item_id: number;
  timestamp: Date;
  count: number;
  country: string;
};

export type AggregateMonthlyTotalUsersMetrics = {
  id: number;
  count: number;
  timestamp: Date;
  created_at: Date;
  updated_at: Date;
  personal_count: number | null;
};

export type AggregateMonthlyUniqueUsersMetrics = {
  id: number;
  count: number;
  timestamp: Date;
  created_at: Date;
  updated_at: Date;
  summed_count: number | null;
  personal_count: number | null;
};

export type AggregatePlaylist = {
  playlist_id: number;
  is_album: boolean | null;
  repost_count: number | null;
  save_count: number | null;
  share_count: number | null;
};

export type AggregatePlays = {
  play_item_id: number;
  count: string | null;
};

export type AggregateTrack = {
  track_id: number;
  repost_count: number;
  save_count: number;
  comment_count: number | null;
  share_count: number | null;
};

export type AggregateUser = {
  user_id: number;
  track_count: string | null;
  playlist_count: string | null;
  album_count: string | null;
  follower_count: string | null;
  following_count: string | null;
  repost_count: string | null;
  track_save_count: string | null;
  supporter_count: number;
  supporting_count: number;
  dominant_genre: string | null;
  dominant_genre_count: number | null;
  score: number | null;
  total_track_count: number | null;
  track_share_count: number | null;
};

export type AggregateUserTips = {
  sender_user_id: number;
  receiver_user_id: number;
  amount: string;
};

export type AlbumPriceHistory = {
  playlist_id: number;
  splits: unknown;
  total_price_cents: string;
  blocknumber: number;
  block_timestamp: Date;
  created_at: Date;
};

export type AlembicVersion = {
  version_num: string;
};

export type AntiAbuseBlockedUsers = {
  handle_lc: string;
  is_blocked: boolean;
  created_at: Date | null;
  updated_at: Date | null;
};

export type ApiMetricsApps = {
  date: Date;
  api_key: string;
  app_name: string;
  request_count: string;
  created_at: Date;
  updated_at: Date;
};

export type ApiMetricsCounts = {
  date: Date;
  hll_sketch: Buffer;
  total_count: string;
  unique_count: string;
  created_at: Date | null;
  updated_at: Date | null;
};

export type ApiMetricsRoutes = {
  date: Date;
  route_pattern: string;
  method: string;
  request_count: string;
  created_at: Date;
  updated_at: Date;
};

export type AppNameMetrics = {
  application_name: string;
  count: number;
  timestamp: Date;
  created_at: Date;
  updated_at: Date;
  id: string;
  ip: string | null;
};

export type ArtistCoinPools = {
  address: string;
  base_mint: string;
  quote_mint: string | null;
  token_decimals: number | null;
  base_reserve: string | null;
  quote_reserve: string | null;
  migration_base_threshold: string | null;
  migration_quote_threshold: string | null;
  protocol_quote_fee: string | null;
  partner_quote_fee: string | null;
  creator_base_fee: string | null;
  creator_quote_fee: string | null;
  price: number | null;
  price_usd: number | null;
  curve_progress: number | null;
  is_migrated: boolean | null;
  created_at: Date;
  updated_at: Date;
  total_trading_quote_fee: string | null;
  creator_wallet_address: string | null;
};

export type ArtistCoinPrices = {
  mint: string | null;
  damm_v2_price: number | null;
  dbc_price: number | null;
  stats_price: number | null;
  price: number | null;
};

export type ArtistCoinStats = {
  mint: string;
  market_cap: number | null;
  fdv: number | null;
  liquidity: number | null;
  last_trade_unix_time: string | null;
  last_trade_human_time: string | null;
  price: number | null;
  history_24h_price: number | null;
  price_change_24h_percent: number | null;
  unique_wallet_24h: number | null;
  unique_wallet_history_24h: number | null;
  unique_wallet_24h_change_percent: number | null;
  total_supply: number | null;
  circulating_supply: number | null;
  holder: number | null;
  trade_24h: number | null;
  trade_history_24h: number | null;
  trade_24h_change_percent: number | null;
  sell_24h: number | null;
  sell_history_24h: number | null;
  sell_24h_change_percent: number | null;
  buy_24h: number | null;
  buy_history_24h: number | null;
  buy_24h_change_percent: number | null;
  v_24h: number | null;
  v_24h_usd: number | null;
  v_history_24h: number | null;
  v_history_24h_usd: number | null;
  v_24h_change_percent: number | null;
  v_buy_24h: number | null;
  v_buy_24h_usd: number | null;
  v_buy_history_24h: number | null;
  v_buy_history_24h_usd: number | null;
  v_buy_24h_change_percent: number | null;
  v_sell_24h: number | null;
  v_sell_24h_usd: number | null;
  v_sell_history_24h: number | null;
  v_sell_history_24h_usd: number | null;
  v_sell_24h_change_percent: number | null;
  number_markets: number | null;
  created_at: Date;
  updated_at: Date;
  total_volume: number | null;
  total_volume_usd: number | null;
  volume_buy: number | null;
  volume_buy_usd: number | null;
  volume_sell: number | null;
  volume_sell_usd: number | null;
  buy: number | null;
  sell: number | null;
  total_trade: number | null;
};

export type ArtistCoins = {
  mint: string;
  ticker: string;
  user_id: number;
  decimals: number;
  created_at: Date;
  logo_uri: string | null;
  description: string | null;
  name: string;
  has_discord: boolean;
  updated_at: Date | null;
  link_1: string | null;
  link_2: string | null;
  link_3: string | null;
  link_4: string | null;
  damm_v2_pool: string | null;
};

export type AssociatedWallets = {
  id: number;
  user_id: number;
  wallet: string;
  blockhash: string | null;
  blocknumber: number | null;
  is_current: boolean;
  is_delete: boolean;
  chain: WalletChain;
};

export type AudioTransactionsHistory = {
  user_bank: string;
  slot: number;
  signature: string;
  transaction_type: string;
  method: string;
  created_at: Date;
  updated_at: Date;
  transaction_created_at: Date;
  change: string;
  balance: string;
  tx_metadata: string | null;
};

export type AudiusDataTxs = {
  signature: string;
  slot: number;
};

export type Blocks = {
  blockhash: string;
  parenthash: string | null;
  is_current: boolean | null;
  number: number | null;
};

export type ChallengeDisbursements = {
  challenge_id: string;
  user_id: number;
  specifier: string;
  signature: string;
  slot: number;
  amount: string;
  created_at: Date | null;
};

export type ChallengeListenStreak = {
  user_id: number;
  last_listen_date: Date | null;
  listen_streak: number;
};

export type ChallengeProfileCompletion = {
  user_id: number;
  profile_description: boolean;
  profile_name: boolean;
  profile_picture: boolean;
  profile_cover_photo: boolean;
  follows: boolean;
  favorites: boolean;
  reposts: boolean;
};

export type Challenges = {
  id: string;
  type: Challengetype;
  amount: string;
  active: boolean;
  step_count: number | null;
  starting_block: number | null;
  weekly_pool: number | null;
  cooldown_days: number | null;
};

export type Chat = {
  chat_id: string;
  created_at: Date;
  last_message_at: Date;
  last_message: string | null;
  last_message_is_plaintext: boolean | null;
};

export type ChatBan = {
  user_id: number;
  is_banned: boolean;
  updated_at: Date;
};

export type ChatBlast = {
  blast_id: string;
  from_user_id: number;
  audience: string;
  audience_content_id: number | null;
  plaintext: string;
  created_at: Date;
  audience_content_type: string | null;
};

export type ChatBlockedUsers = {
  blocker_user_id: number;
  blockee_user_id: number;
  created_at: Date;
};

export type ChatMember = {
  chat_id: string;
  user_id: number;
  cleared_history_at: Date | null;
  invited_by_user_id: number;
  invite_code: string;
  last_active_at: Date | null;
  unread_count: number;
  created_at: Date;
  is_hidden: boolean;
};

export type ChatMessage = {
  message_id: string;
  chat_id: string;
  user_id: number;
  created_at: Date;
  ciphertext: string | null;
  blast_id: string | null;
};

export type ChatMessageReactions = {
  user_id: number;
  message_id: string;
  reaction: string;
  created_at: Date;
  updated_at: Date;
};

export type ChatPermissions = {
  user_id: number;
  permits: string;
  updated_at: Date;
  allowed: boolean;
};

export type CidData = {
  cid: string;
  type: string | null;
  data: unknown | null;
};

export type Collectibles = {
  user_id: number;
  data: unknown;
  blockhash: string;
  blocknumber: number;
  created_at: Date | null;
  updated_at: Date | null;
};

export type CommentMentions = {
  comment_id: number;
  user_id: number;
  created_at: Date;
  updated_at: Date;
  is_delete: boolean | null;
  txhash: string;
  blockhash: string;
  blocknumber: number | null;
};

export type CommentNotificationSettings = {
  user_id: number;
  entity_id: number;
  entity_type: string;
  is_muted: boolean | null;
  created_at: Date;
  updated_at: Date;
};

export type CommentReactions = {
  comment_id: number;
  user_id: number;
  created_at: Date;
  updated_at: Date;
  is_delete: boolean | null;
  txhash: string;
  blockhash: string;
  blocknumber: number | null;
};

export type CommentReports = {
  comment_id: number;
  user_id: number;
  created_at: Date;
  updated_at: Date;
  is_delete: boolean | null;
  txhash: string;
  blockhash: string;
  blocknumber: number | null;
};

export type CommentThreads = {
  comment_id: number;
  parent_comment_id: number;
};

export type Comments = {
  comment_id: number;
  text: string;
  user_id: number;
  entity_id: number;
  entity_type: string;
  track_timestamp_s: string | null;
  created_at: Date;
  updated_at: Date;
  is_delete: boolean | null;
  is_visible: boolean | null;
  is_edited: boolean | null;
  txhash: string;
  blockhash: string;
  blocknumber: number | null;
};

export type CoreAppState = {
  block_height: string;
  app_hash: Buffer;
  created_at: Date | null;
};

export type CoreBlocks = {
  rowid: string;
  height: string;
  chain_id: string;
  hash: string;
  proposer: string;
  created_at: Date;
};

export type CoreDbMigrations = {
  id: string;
  applied_at: Date | null;
};

export type CoreDeals = {
  address: string;
  ern_address: string;
  entity_type: string;
  entity_index: number;
  tx_hash: string;
  block_height: string;
  created_at: Date | null;
};

export type CoreErn = {
  id: string;
  address: string;
  index: string;
  tx_hash: string;
  sender: string;
  message_control_type: number;
  raw_message: Buffer;
  raw_acknowledgment: Buffer;
  block_height: string;
};

export type CoreIndexedBlocks = {
  blockhash: string;
  parenthash: string | null;
  chain_id: string;
  height: number;
  plays_slot: number | null;
  em_block: number | null;
};

export type CoreMead = {
  id: string;
  address: string;
  tx_hash: string;
  index: string;
  sender: string;
  resource_addresses: string[] | null;
  release_addresses: string[] | null;
  raw_message: Buffer;
  raw_acknowledgment: Buffer;
  block_height: string;
};

export type CoreParties = {
  address: string;
  ern_address: string;
  entity_type: string;
  entity_index: number;
  tx_hash: string;
  block_height: string;
  created_at: Date | null;
};

export type CorePie = {
  id: string;
  address: string;
  tx_hash: string;
  index: string;
  sender: string;
  party_addresses: string[] | null;
  raw_message: Buffer;
  raw_acknowledgment: Buffer;
  block_height: string;
};

export type CoreReleases = {
  address: string;
  ern_address: string;
  entity_type: string;
  entity_index: number;
  tx_hash: string;
  block_height: string;
  created_at: Date | null;
};

export type CoreResources = {
  address: string;
  ern_address: string;
  entity_type: string;
  entity_index: number;
  tx_hash: string;
  block_height: string;
  created_at: Date | null;
};

export type CoreRewards = {
  id: string;
  address: string;
  index: string;
  tx_hash: string;
  sender: string;
  reward_id: string;
  name: string;
  amount: string;
  claim_authorities: string[] | null;
  raw_message: Buffer;
  block_height: string;
  created_at: Date | null;
  updated_at: Date | null;
};

export type CoreTransactions = {
  rowid: string;
  block_id: string;
  index: number;
  tx_hash: string;
  transaction: Buffer;
  created_at: Date;
};

export type CoreTxStats = {
  id: number;
  tx_type: string;
  tx_hash: string;
  block_height: string;
  created_at: Date | null;
};

export type CoreUploads = {
  id: string;
  uploader_address: string;
  cid: string;
  transcoded_cid: string;
  upid: string;
  upload_signature: string;
  validator_address: string;
  validator_signature: string;
  tx_hash: string;
  block_height: string;
};

export type CoreValidators = {
  rowid: number;
  pub_key: string;
  endpoint: string;
  eth_address: string;
  comet_address: string;
  eth_block: string;
  node_type: string;
  sp_id: string;
  comet_pub_key: string;
};

export type Countries = {
  iso: string;
  name: string;
  nicename: string;
  iso3: string | null;
  numcode: number | null;
  phonecode: number;
};

export type DashboardWalletUsers = {
  wallet: string;
  user_id: number;
  is_delete: boolean;
  updated_at: Date;
  created_at: Date;
  blockhash: string | null;
  blocknumber: number | null;
  txhash: string;
};

export type DelistStatusCursor = {
  host: string;
  entity: DelistEntity;
  created_at: Date;
};

export type DeveloperApps = {
  address: string;
  blockhash: string | null;
  blocknumber: number | null;
  user_id: number | null;
  name: string;
  is_personal_access: boolean;
  is_delete: boolean;
  created_at: Date;
  txhash: string;
  is_current: boolean;
  updated_at: Date;
  description: string | null;
  image_url: string | null;
};

export type EmailAccess = {
  id: number;
  email_owner_user_id: number;
  receiving_user_id: number;
  grantor_user_id: number;
  encrypted_key: string;
  created_at: Date | null;
  updated_at: Date | null;
  is_initial: boolean;
};

export type EncryptedEmails = {
  id: number;
  email_owner_user_id: number;
  encrypted_email: string;
  created_at: Date | null;
  updated_at: Date | null;
};

export type EthActiveProposals = {
  id: string;
  proposer: string;
  submission_block_number: string;
  target_contract_registry_key: string;
  target_contract_address: string;
  call_value: string;
  function_signature: string;
  call_data: string;
};

export type EthBlocks = {
  last_scanned_block: number;
  created_at: Date;
  updated_at: Date;
};

export type EthDbMigrations = {
  version: string;
  dirty: boolean;
};

export type EthFundingRounds = {
  round_num: number;
  blocknumber: string;
  creation_time: Date;
};

export type EthRegisteredEndpoints = {
  id: number;
  service_type: string;
  owner: string;
  delegate_wallet: string;
  endpoint: string;
  blocknumber: string;
  registered_at: Date;
};

export type EthServiceProviders = {
  address: string;
  deployer_stake: string;
  deployer_cut: string;
  valid_bounds: boolean;
  number_of_endpoints: number;
  min_account_stake: string;
  max_account_stake: string;
};

export type EthStaked = {
  address: string;
  total_staked: string;
};

export type Events = {
  event_id: number;
  event_type: EventType;
  user_id: number;
  entity_type: EventEntityType | null;
  entity_id: number | null;
  end_date: Date | null;
  is_deleted: boolean | null;
  event_data: unknown | null;
  created_at: Date;
  updated_at: Date;
  txhash: string;
  blockhash: string;
  blocknumber: number | null;
};

export type Follows = {
  blockhash: string | null;
  blocknumber: number | null;
  follower_user_id: number;
  followee_user_id: number;
  is_current: boolean;
  is_delete: boolean;
  created_at: Date;
  txhash: string;
  slot: number | null;
};

export type Grants = {
  blockhash: string | null;
  blocknumber: number | null;
  grantee_address: string;
  user_id: number;
  is_revoked: boolean;
  is_current: boolean;
  is_approved: boolean | null;
  updated_at: Date;
  created_at: Date;
  txhash: string;
};

export type HourlyPlayCounts = {
  hourly_timestamp: Date;
  play_count: number;
};

export type IndexingCheckpoints = {
  tablename: string;
  last_checkpoint: number;
  signature: string | null;
};

export type ManagementKeys = {
  id: number;
  track_id: string;
  address: string;
};

export type Milestones = {
  id: number;
  name: string;
  threshold: number;
  blocknumber: number | null;
  slot: number | null;
  timestamp: Date;
};

export type MutedUsers = {
  muted_user_id: number;
  user_id: number;
  created_at: Date;
  updated_at: Date;
  is_delete: boolean | null;
  txhash: string;
  blockhash: string;
  blocknumber: number | null;
};

export type NewTracks = {
  blockhash: string | null;
  track_id: number | null;
  is_current: boolean | null;
  is_delete: boolean | null;
  owner_id: number | null;
  title: string | null;
  cover_art: string | null;
  tags: string | null;
  genre: string | null;
  mood: string | null;
  credits_splits: string | null;
  create_date: string | null;
  file_type: string | null;
  metadata_multihash: string | null;
  blocknumber: number | null;
  created_at: Date | null;
  description: string | null;
  isrc: string | null;
  iswc: string | null;
  license: string | null;
  updated_at: Date | null;
  cover_art_sizes: string | null;
  download: unknown | null;
  is_unlisted: boolean | null;
  field_visibility: unknown | null;
  route_id: string | null;
  stem_of: unknown | null;
  remix_of: unknown | null;
  txhash: string | null;
  slot: number | null;
  is_available: boolean | null;
  is_premium: boolean | null;
  premium_conditions: unknown | null;
  track_cid: string | null;
  is_playlist_upload: boolean | null;
  duration: number | null;
  ai_attribution_user_id: number | null;
  preview_cid: string | null;
  audio_upload_id: string | null;
  preview_start_seconds: number | null;
  release_date: Date | null;
  track_segments: unknown | null;
};

export type Notification = {
  id: number;
  specifier: string;
  group_id: string;
  type: string;
  slot: number | null;
  blocknumber: number | null;
  timestamp: Date;
  data: unknown | null;
  user_ids: number[] | null;
  type_v2: string | null;
};

export type NotificationSeen = {
  user_id: number;
  seen_at: Date;
  blocknumber: number | null;
  blockhash: string | null;
  txhash: string | null;
};

export type PaymentRouterTxs = {
  signature: string;
  slot: number;
  created_at: Date;
};

export type PgStatStatements = {
  userid: unknown | null;
  dbid: unknown | null;
  queryid: string | null;
  query: string | null;
  calls: string | null;
  total_time: number | null;
  min_time: number | null;
  max_time: number | null;
  mean_time: number | null;
  stddev_time: number | null;
  rows: string | null;
  shared_blks_hit: string | null;
  shared_blks_read: string | null;
  shared_blks_dirtied: string | null;
  shared_blks_written: string | null;
  local_blks_hit: string | null;
  local_blks_read: string | null;
  local_blks_dirtied: string | null;
  local_blks_written: string | null;
  temp_blks_read: string | null;
  temp_blks_written: string | null;
  blk_read_time: number | null;
  blk_write_time: number | null;
};

export type PlaylistRoutes = {
  slug: string;
  title_slug: string;
  collision_id: number;
  owner_id: number;
  playlist_id: number;
  is_current: boolean;
  blockhash: string;
  blocknumber: number;
  txhash: string;
};

export type PlaylistSeen = {
  user_id: number;
  playlist_id: number;
  seen_at: Date;
  is_current: boolean;
  blocknumber: number | null;
  blockhash: string | null;
  txhash: string | null;
};

export type PlaylistTracks = {
  playlist_id: number;
  track_id: number;
  is_removed: boolean;
  created_at: Date;
  updated_at: Date;
};

export type PlaylistTrendingScores = {
  playlist_id: number;
  type: string;
  version: string;
  time_range: string;
  score: number;
  created_at: Date;
};

export type Playlists = {
  blockhash: string | null;
  blocknumber: number | null;
  playlist_id: number;
  playlist_owner_id: number;
  is_album: boolean;
  is_private: boolean;
  playlist_name: string | null;
  playlist_contents: unknown;
  playlist_image_multihash: string | null;
  is_current: boolean;
  is_delete: boolean;
  description: string | null;
  created_at: Date;
  upc: string | null;
  updated_at: Date;
  playlist_image_sizes_multihash: string | null;
  txhash: string;
  last_added_to: Date | null;
  slot: number | null;
  metadata_multihash: string | null;
  is_image_autogenerated: boolean;
  stream_conditions: unknown | null;
  ddex_app: string | null;
  ddex_release_ids: unknown | null;
  artists: unknown | null;
  copyright_line: unknown | null;
  producer_copyright_line: unknown | null;
  parental_warning_type: string | null;
  is_scheduled_release: boolean;
  release_date: Date | null;
  is_stream_gated: boolean | null;
};

export type Plays = {
  id: number;
  user_id: number | null;
  source: string | null;
  play_item_id: number;
  created_at: Date;
  updated_at: Date;
  slot: number | null;
  signature: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
};

export type Pubkeys = {
  wallet: string;
  pubkey: string | null;
};

export type Reactions = {
  id: number;
  reaction_value: number;
  sender_wallet: string;
  reaction_type: string;
  reacted_to: string;
  timestamp: Date;
  blocknumber: number | null;
};

export type RelatedArtists = {
  user_id: number;
  related_artist_user_id: number;
  score: number;
  created_at: Date;
};

export type Remixes = {
  parent_track_id: number;
  child_track_id: number;
};

export type ReportedComments = {
  reported_comment_id: number;
  user_id: number;
  created_at: Date;
  updated_at: Date;
  txhash: string;
  blockhash: string;
  blocknumber: number | null;
};

export type Reposts = {
  blockhash: string | null;
  blocknumber: number | null;
  user_id: number;
  repost_item_id: number;
  repost_type: Reposttype;
  is_current: boolean;
  is_delete: boolean;
  created_at: Date;
  txhash: string;
  slot: number | null;
  is_repost_of_repost: boolean;
};

export type RevertBlocks = {
  blocknumber: number;
  prev_records: unknown;
};

export type RewardManagerTxs = {
  signature: string;
  slot: number;
  created_at: Date;
};

export type RouteMetrics = {
  route_path: string;
  version: string;
  query_string: string;
  count: number;
  timestamp: Date;
  created_at: Date;
  updated_at: Date;
  id: string;
  ip: string | null;
};

export type RpcCursor = {
  relayed_by: string;
  relayed_at: Date;
};

export type RpcError = {
  sig: string;
  rpc_log_json: unknown;
  error_text: string;
  error_count: number;
  last_attempt: Date;
};

export type RpcLog = {
  relayed_at: Date;
  from_wallet: string;
  rpc: unknown;
  sig: string;
  relayed_by: string;
  applied_at: Date;
};

export type Rpclog = {
  cuid: string;
  wallet: string | null;
  method: string | null;
  params: unknown | null;
  jetstream_seq: number | null;
};

export type Saves = {
  blockhash: string | null;
  blocknumber: number | null;
  user_id: number;
  save_item_id: number;
  save_type: Savetype;
  is_current: boolean;
  is_delete: boolean;
  created_at: Date;
  txhash: string;
  slot: number | null;
  is_save_of_repost: boolean;
};

export type SchemaMigrations = {
  version: string;
};

export type SchemaVersion = {
  file_name: string;
  md5: string | null;
  applied_at: Date;
};

export type Shares = {
  blockhash: string | null;
  blocknumber: number | null;
  user_id: number;
  share_item_id: number;
  share_type: Sharetype;
  created_at: Date;
  txhash: string;
  slot: number | null;
};

export type SkippedTransactions = {
  id: number;
  blocknumber: number;
  blockhash: string;
  txhash: string;
  created_at: Date;
  updated_at: Date;
  level: Skippedtransactionlevel | null;
};

export type SlaNodeReports = {
  id: number;
  address: string;
  blocks_proposed: number;
  sla_rollup_id: number | null;
};

export type SlaRollups = {
  id: number;
  tx_hash: string;
  block_start: string;
  block_end: string;
  time: Date;
};

export type SolClaimableAccountTransfers = {
  signature: string;
  instruction_index: number;
  amount: string;
  slot: string;
  from_account: string;
  to_account: string;
  sender_eth_address: string;
};

export type SolClaimableAccounts = {
  signature: string;
  instruction_index: number;
  slot: string;
  mint: string;
  ethereum_address: string;
  account: string;
};

export type SolKeypairs = {
  public_key: string;
  private_key: Buffer;
};

export type SolLockerVestingEscrows = {
  account: string;
  slot: string;
  recipient: string;
  token_mint: string;
  creator: string;
  base: string;
  escrow_bump: number;
  update_recipient_mode: number;
  cancel_mode: number;
  token_program_flag: number;
  cliff_time: string;
  frequency: string;
  cliff_unlock_amount: string;
  amount_per_period: string;
  number_of_period: string;
  total_claimed_amount: string;
  vesting_start_time: string;
  cancelled_at: string;
  created_at: Date | null;
  updated_at: Date | null;
};

export type SolMeteoraDammV2PoolBaseFees = {
  pool: string;
  slot: string;
  cliff_fee_numerator: string;
  fee_scheduler_mode: number;
  number_of_period: number;
  period_frequency: string;
  reduction_factor: string;
  created_at: Date;
  updated_at: Date;
};

export type SolMeteoraDammV2PoolDynamicFees = {
  pool: string;
  slot: string;
  initialized: number;
  max_volatility_accumulator: number;
  variable_fee_control: number;
  bin_step: number;
  filter_period: number;
  decay_period: number;
  reduction_factor: number;
  last_update_timestamp: string;
  bin_step_u128: string;
  sqrt_price_reference: string;
  volatility_accumulator: string;
  volatility_reference: string;
  created_at: Date;
  updated_at: Date;
};

export type SolMeteoraDammV2PoolFees = {
  pool: string;
  slot: string;
  protocol_fee_percent: number;
  partner_fee_percent: number;
  referral_fee_percent: number;
  created_at: Date;
  updated_at: Date;
};

export type SolMeteoraDammV2PoolMetrics = {
  pool: string;
  slot: string;
  total_lp_a_fee: string;
  total_lp_b_fee: string;
  total_protocol_a_fee: string;
  total_protocol_b_fee: string;
  total_partner_a_fee: string;
  total_partner_b_fee: string;
  total_position: string;
  created_at: Date;
  updated_at: Date;
};

export type SolMeteoraDammV2Pools = {
  account: string;
  slot: string;
  token_a_mint: string;
  token_b_mint: string;
  token_a_vault: string;
  token_b_vault: string;
  whitelisted_vault: string;
  partner: string;
  liquidity: string;
  protocol_a_fee: string;
  protocol_b_fee: string;
  partner_a_fee: string;
  partner_b_fee: string;
  sqrt_min_price: string;
  sqrt_max_price: string;
  sqrt_price: string;
  activation_point: string;
  activation_type: number;
  pool_status: number;
  token_a_flag: number;
  token_b_flag: number;
  collect_fee_mode: number;
  pool_type: number;
  version: number;
  fee_a_per_liquidity: string;
  fee_b_per_liquidity: string;
  permanent_lock_liquidity: string;
  creator: string;
  created_at: Date;
  updated_at: Date;
};

export type SolMeteoraDammV2PositionMetrics = {
  position: string;
  slot: string;
  total_claimed_a_fee: string;
  total_claimed_b_fee: string;
  created_at: Date;
  updated_at: Date;
};

export type SolMeteoraDammV2Positions = {
  account: string;
  slot: string;
  pool: string;
  nft_mint: string;
  fee_a_per_token_checkpoint: string;
  fee_b_per_token_checkpoint: string;
  fee_a_pending: string;
  fee_b_pending: string;
  unlocked_liquidity: string;
  vested_liquidity: string;
  permanent_locked_liquidity: string;
  created_at: Date;
  updated_at: Date;
};

export type SolMeteoraDbcConfigFees = {
  config: string;
  slot: string;
  base_fee_cliff_fee_numerator: string | null;
  base_fee_period_frequency: string | null;
  base_fee_reduction_factor: string | null;
  base_fee_number_of_period: number | null;
  base_fee_fee_scheduler_mode: number | null;
  dynamic_fee_initialized: number | null;
  dynamic_fee_max_volatility_accumulator: number | null;
  dynamic_fee_variable_fee_control: number | null;
  dynamic_fee_bin_step: number | null;
  dynamic_fee_filter_period: number | null;
  dynamic_fee_decay_period: number | null;
  dynamic_fee_reduction_factor: number | null;
  dynamic_fee_bin_step_u128: string | null;
  protocol_fee_percent: number | null;
  referral_fee_percent: number | null;
};

export type SolMeteoraDbcConfigVestings = {
  config: string;
  slot: string;
  amount_per_period: string | null;
  cliff_duration_from_migration_time: string | null;
  frequency: string | null;
  number_of_period: string | null;
  cliff_unlock_amount: string | null;
};

export type SolMeteoraDbcConfigs = {
  account: string;
  slot: string;
  quote_mint: string;
  fee_claimer: string;
  leftover_receiver: string;
  collect_fee_mode: number;
  migration_option: number;
  activation_type: number | null;
  token_decimal: number | null;
  version: number | null;
  token_type: number | null;
  quote_token_flag: number | null;
  partner_locked_lp_percentage: number | null;
  partner_lp_percentage: number | null;
  creator_locked_lp_percentage: number | null;
  creator_lp_percentage: number | null;
  migration_fee_option: number | null;
  fixed_token_supply_flag: number | null;
  creator_trading_fee_percentage: number | null;
  token_update_authority: number | null;
  migration_fee_percentage: number | null;
  creator_migration_fee_percentage: number | null;
  swap_base_amount: string | null;
  migration_quote_threshold: string | null;
  migration_base_threshold: string | null;
  migration_sqrt_price: string | null;
  pre_migration_token_supply: string | null;
  post_migration_token_supply: string | null;
  migrated_collect_fee_mode: number | null;
  migrated_dynamic_fee: number | null;
  migrated_pool_fee_bps: number | null;
  sqrt_start_price: string | null;
  curve: unknown | null;
  created_at: Date | null;
  updated_at: Date | null;
};

export type SolMeteoraDbcMigrations = {
  signature: string;
  instruction_index: number;
  slot: string;
  dbc_pool: string;
  migration_metadata: string;
  config: string;
  dbc_pool_authority: string;
  damm_v2_pool: string;
  first_position_nft_mint: string;
  first_position_nft_account: string;
  first_position: string;
  second_position_nft_mint: string;
  second_position_nft_account: string;
  second_position: string;
  damm_pool_authority: string;
  base_mint: string;
  quote_mint: string;
  created_at: Date;
  updated_at: Date;
};

export type SolMeteoraDbcPoolMetrics = {
  pool: string;
  slot: string;
  total_protocol_base_fee: string;
  total_protocol_quote_fee: string;
  total_trading_base_fee: string;
  total_trading_quote_fee: string;
  created_at: Date;
  updated_at: Date;
};

export type SolMeteoraDbcPoolVolatilityTrackers = {
  pool: string;
  slot: string;
  last_update_timestamp: string;
  volatility_accumulator: string;
  volatility_reference: string;
  created_at: Date;
  updated_at: Date;
};

export type SolMeteoraDbcPools = {
  account: string;
  slot: string;
  config: string;
  creator: string;
  base_mint: string;
  base_vault: string;
  quote_vault: string;
  base_reserve: string;
  quote_reserve: string;
  protocol_base_fee: string;
  protocol_quote_fee: string;
  partner_base_fee: string;
  partner_quote_fee: string;
  sqrt_price: string;
  activation_point: string;
  pool_type: number;
  is_migrated: number;
  is_partner_withdraw_surplus: number;
  is_protocol_withdraw_surplus: number;
  migration_progress: number;
  is_withdraw_leftover: number;
  is_creator_withdraw_surplus: number;
  migration_fee_withdraw_status: number;
  finish_curve_timestamp: string;
  creator_base_fee: string;
  creator_quote_fee: string;
  created_at: Date;
  updated_at: Date;
};

export type SolPayments = {
  signature: string;
  instruction_index: number;
  amount: string;
  slot: string;
  route_index: number;
  to_account: string;
};

export type SolPurchases = {
  signature: string;
  instruction_index: number;
  amount: string;
  slot: string;
  from_account: string;
  content_type: string;
  content_id: number;
  buyer_user_id: number;
  access_type: string;
  valid_after_blocknumber: string;
  is_valid: boolean | null;
  city: string | null;
  region: string | null;
  country: string | null;
};

export type SolRetryQueue = {
  id: string;
  indexer: string;
  update_message: unknown;
  error: string;
  created_at: Date;
  updated_at: Date;
};

export type SolRewardDisbursements = {
  signature: string;
  instruction_index: number;
  amount: string;
  slot: string;
  user_bank: string;
  challenge_id: string;
  specifier: string;
  recipient_eth_address: string | null;
};

export type SolRewardManagerInits = {
  signature: string;
  instruction_index: number;
  slot: string;
  min_votes: number;
  reward_manager_state: string;
  token_source: string;
  mint: string;
  manager: string;
  authority: string;
};

export type SolSlotCheckpoints = {
  id: string;
  from_slot: string;
  to_slot: string;
  subscription_hash: string;
  subscription: unknown;
  updated_at: Date;
  created_at: Date;
  name: string | null;
};

export type SolTokenAccountBalanceChanges = {
  signature: string;
  mint: string;
  owner: string;
  account: string;
  change: string;
  balance: string;
  slot: string;
  updated_at: Date;
  created_at: Date;
  block_timestamp: Date;
  fee_payer: string | null;
};

export type SolTokenAccountBalances = {
  account: string;
  mint: string;
  owner: string;
  balance: string;
  slot: string;
  updated_at: Date;
  created_at: Date;
};

export type SolTokenTransfers = {
  signature: string;
  instruction_index: number;
  amount: string;
  slot: string;
  from_account: string;
  to_account: string;
};

export type SolUserBalances = {
  user_id: number;
  mint: string;
  balance: string;
  updated_at: Date;
  created_at: Date;
};

export type SoundRecordings = {
  id: number;
  sound_recording_id: string;
  track_id: string;
  cid: string;
  encoding_details: string | null;
};

export type SplTokenTx = {
  last_scanned_slot: number;
  signature: string;
  created_at: Date;
  updated_at: Date;
};

export type Stems = {
  parent_track_id: number;
  child_track_id: number;
};

export type StorageProofPeers = {
  id: number;
  block_height: string;
  prover_addresses: string[];
};

export type StorageProofs = {
  id: number;
  block_height: string;
  address: string;
  cid: string | null;
  proof_signature: string | null;
  proof: string | null;
  prover_addresses: string[];
  status: ProofStatus;
};

export type Subscriptions = {
  blockhash: string | null;
  blocknumber: number | null;
  subscriber_id: number;
  user_id: number;
  is_current: boolean;
  is_delete: boolean;
  created_at: Date;
  txhash: string;
};

export type SupporterRankUps = {
  slot: number;
  sender_user_id: number;
  receiver_user_id: number;
  rank: number;
};

export type TrackDelistStatuses = {
  created_at: Date;
  track_id: number;
  owner_id: number;
  track_cid: string;
  delisted: boolean;
  reason: DelistTrackReason;
};

export type TrackDownloads = {
  txhash: string;
  blocknumber: number;
  parent_track_id: number;
  track_id: number;
  user_id: number | null;
  created_at: Date;
  city: string | null;
  region: string | null;
  country: string | null;
};

export type TrackPriceHistory = {
  track_id: number;
  splits: unknown;
  total_price_cents: string;
  blocknumber: number;
  block_timestamp: Date;
  created_at: Date;
  access: UsdcPurchaseAccessType;
};

export type TrackReleases = {
  id: number;
  track_id: string;
};

export type TrackRoutes = {
  slug: string;
  title_slug: string;
  collision_id: number;
  owner_id: number;
  track_id: number;
  is_current: boolean;
  blockhash: string;
  blocknumber: number;
  txhash: string;
};

export type TrackTrendingScores = {
  track_id: number;
  type: string;
  genre: string | null;
  version: string;
  time_range: string;
  score: number;
  created_at: Date;
};

export type Tracks = {
  blockhash: string | null;
  track_id: number;
  is_current: boolean;
  is_delete: boolean;
  owner_id: number;
  title: string | null;
  cover_art: string | null;
  tags: string | null;
  genre: string | null;
  mood: string | null;
  credits_splits: string | null;
  create_date: string | null;
  file_type: string | null;
  metadata_multihash: string | null;
  blocknumber: number | null;
  created_at: Date;
  description: string | null;
  isrc: string | null;
  iswc: string | null;
  license: string | null;
  updated_at: Date;
  cover_art_sizes: string | null;
  is_unlisted: boolean;
  field_visibility: unknown | null;
  route_id: string | null;
  stem_of: unknown | null;
  remix_of: unknown | null;
  txhash: string;
  slot: number | null;
  is_available: boolean;
  stream_conditions: unknown | null;
  track_cid: string | null;
  is_playlist_upload: boolean;
  duration: number | null;
  ai_attribution_user_id: number | null;
  preview_cid: string | null;
  audio_upload_id: string | null;
  preview_start_seconds: number | null;
  release_date: Date | null;
  track_segments: unknown[];
  is_scheduled_release: boolean;
  is_downloadable: boolean;
  download_conditions: unknown | null;
  is_original_available: boolean;
  orig_file_cid: string | null;
  orig_filename: string | null;
  collections_containing_track: number[] | null;
  playlists_containing_track: number[];
  placement_hosts: string | null;
  ddex_app: string | null;
  ddex_release_ids: unknown | null;
  artists: unknown | null;
  resource_contributors: unknown | null;
  indirect_resource_contributors: unknown | null;
  rights_controller: unknown | null;
  copyright_line: unknown | null;
  producer_copyright_line: unknown | null;
  parental_warning_type: string | null;
  playlists_previously_containing_track: unknown;
  allowed_api_keys: string[] | null;
  bpm: number | null;
  musical_key: string | null;
  audio_analysis_error_count: number;
  is_custom_bpm: boolean | null;
  is_custom_musical_key: boolean | null;
  comments_disabled: boolean | null;
  pinned_comment_id: number | null;
  cover_original_song_title: string | null;
  cover_original_artist: string | null;
  is_owned_by_user: boolean;
  is_stream_gated: boolean | null;
  is_download_gated: boolean | null;
  no_ai_use: boolean | null;
  parental_warning: ParentalWarningType | null;
  territory_codes: string[] | null;
};

export type TrendingResults = {
  user_id: number;
  id: string | null;
  rank: number;
  type: string;
  version: string;
  week: Date;
};

export type UsdcPurchases = {
  slot: number;
  signature: string;
  buyer_user_id: number;
  seller_user_id: number;
  amount: string;
  content_type: UsdcPurchaseContentType;
  content_id: number;
  created_at: Date;
  updated_at: Date;
  extra_amount: string;
  access: UsdcPurchaseAccessType;
  city: string | null;
  region: string | null;
  country: string | null;
  vendor: string | null;
  splits: unknown;
};

export type UsdcTransactionsHistory = {
  user_bank: string;
  slot: number;
  signature: string;
  transaction_type: string;
  method: string;
  created_at: Date;
  updated_at: Date;
  transaction_created_at: Date;
  change: string;
  balance: string;
  tx_metadata: string | null;
};

export type UsdcUserBankAccounts = {
  signature: string;
  ethereum_address: string;
  created_at: Date;
  bank_account: string;
};

export type UserBalanceChanges = {
  user_id: number;
  blocknumber: number;
  current_balance: string;
  previous_balance: string;
  created_at: Date;
  updated_at: Date;
};

export type UserBalanceHistory = {
  user_id: number;
  mint: string;
  timestamp: Date;
  balance: string;
  balance_usd: number;
  created_at: Date;
};

export type UserBalances = {
  user_id: number;
  balance: string;
  created_at: Date;
  updated_at: Date;
  associated_wallets_balance: string;
  waudio: string | null;
  associated_sol_wallets_balance: string;
};

export type UserBankAccounts = {
  signature: string;
  ethereum_address: string;
  created_at: Date;
  bank_account: string;
};

export type UserBankTxs = {
  signature: string;
  slot: number;
  created_at: Date;
};

export type UserChallenges = {
  challenge_id: string;
  user_id: number;
  specifier: string;
  is_complete: boolean;
  current_step_count: number | null;
  completed_blocknumber: number | null;
  amount: number;
  created_at: Date;
  completed_at: Date | null;
};

export type UserDelistStatuses = {
  created_at: Date;
  user_id: number;
  delisted: boolean;
  reason: DelistUserReason;
};

export type UserDistinctPlayHours = {
  user_id: number;
  hours_with_play: number;
  updated_at: Date;
};

export type UserDistinctPlayTracks = {
  user_id: number;
  track_count: number;
  updated_at: Date;
};

export type UserEvents = {
  id: number;
  blockhash: string | null;
  blocknumber: number | null;
  is_current: boolean;
  user_id: number;
  referrer: number | null;
  is_mobile_user: boolean;
  slot: number | null;
};

export type UserListeningHistory = {
  user_id: number;
  listening_history: unknown;
};

export type UserPayoutWalletHistory = {
  user_id: number;
  spl_usdc_payout_wallet: string | null;
  blocknumber: number;
  block_timestamp: Date;
  created_at: Date;
};

export type UserPubkeys = {
  user_id: number;
  pubkey_base64: string;
};

export type UserScoreFeatures = {
  user_id: number;
  challenge_count: number | null;
  updated_at: Date;
};

export type UserTips = {
  slot: number;
  signature: string;
  sender_user_id: number;
  receiver_user_id: number;
  amount: string;
  created_at: Date;
  updated_at: Date;
};

export type Users = {
  blockhash: string | null;
  user_id: number;
  is_current: boolean;
  handle: string | null;
  wallet: string | null;
  name: string | null;
  profile_picture: string | null;
  cover_photo: string | null;
  bio: string | null;
  location: string | null;
  metadata_multihash: string | null;
  creator_node_endpoint: string | null;
  blocknumber: number | null;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
  handle_lc: string | null;
  cover_photo_sizes: string | null;
  profile_picture_sizes: string | null;
  primary_id: number | null;
  secondary_ids: number[] | null;
  replica_set_update_signer: string | null;
  has_collectibles: boolean;
  txhash: string;
  playlist_library: unknown | null;
  is_deactivated: boolean;
  slot: number | null;
  user_storage_account: string | null;
  user_authority_account: string | null;
  artist_pick_track_id: number | null;
  is_available: boolean;
  is_storage_v2: boolean;
  allow_ai_attribution: boolean;
  spl_usdc_payout_wallet: string | null;
  twitter_handle: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  verified_with_twitter: boolean | null;
  verified_with_instagram: boolean | null;
  verified_with_tiktok: boolean | null;
  website: string | null;
  donation: string | null;
  profile_type: ProfileTypeEnum | null;
  coin_flair_mint: string | null;
};

export type ValidatorHistory = {
  rowid: number;
  endpoint: string;
  eth_address: string;
  comet_address: string;
  sp_id: string;
  service_type: string;
  event_type: ValidatorEvent;
  event_time: Date;
  event_block: string;
};

export type VolumeLeaderExclusions = {
  address: string;
  description: string | null;
};

