export interface AggregateDailyAppNameMetricRow {
  application_name: string
  count: number
  created_at: Date
  id: number
  timestamp: Date
  updated_at: Date
}
export interface AggregateDailyTotalUsersMetricRow {
  count: number
  created_at: Date
  id: number
  personal_count: number | null
  timestamp: Date
  updated_at: Date
}
export interface AggregateDailyUniqueUsersMetricRow {
  count: number
  created_at: Date
  id: number
  personal_count: number | null
  summed_count: number | null
  timestamp: Date
  updated_at: Date
}
export interface AggregateIntervalPlayRow {
  created_at: Date | null
  genre: string | null
  month_listen_counts: string | null
  track_id: number | null
  week_listen_counts: string | null
}
export interface AggregateMonthlyAppNameMetricRow {
  application_name: string
  count: number
  created_at: Date
  id: number
  timestamp: Date
  updated_at: Date
}
export interface AggregateMonthlyPlayRow {
  count: number
  play_item_id: number
  timestamp: Date
}
export interface AggregateMonthlyTotalUsersMetricRow {
  count: number
  created_at: Date
  id: number
  personal_count: number | null
  timestamp: Date
  updated_at: Date
}
export interface AggregateMonthlyUniqueUsersMetricRow {
  count: number
  created_at: Date
  id: number
  personal_count: number | null
  summed_count: number | null
  timestamp: Date
  updated_at: Date
}
export interface AggregatePlaylistRow {
  is_album: boolean | null
  playlist_id: number
  repost_count: number | null
  save_count: number | null
}
export interface AggregatePlayRow {
  count: string | null
  play_item_id: number
}
export interface AggregateTrackRow {
  repost_count: number
  save_count: number
  track_id: number
}
export interface AggregateUserRow {
  album_count: string | null
  follower_count: string | null
  following_count: string | null
  playlist_count: string | null
  repost_count: string | null
  supporter_count: number
  supporting_count: number
  track_count: string | null
  track_save_count: string | null
  user_id: number
}
export interface AggregateUserTipRow {
  amount: string
  receiver_user_id: number
  sender_user_id: number
}
export interface AppNameMetricRow {
  application_name: string
  count: number
  created_at: Date
  id: string
  ip: string | null
  timestamp: Date
  updated_at: Date
}
export interface AppNameMetricsAllTimeRow {
  count: string | null
  name: string | null
}
export interface AppNameMetricsTrailingMonthRow {
  count: string | null
  name: string | null
}
export interface AppNameMetricsTrailingWeekRow {
  count: string | null
  name: string | null
}
export interface AssociatedWalletRow {
  blockhash: string
  blocknumber: number
  chain: wallet_chain
  id: number
  is_current: boolean
  is_delete: boolean
  user_id: number
  wallet: string
}
export interface AudioTransactionsHistoryRow {
  balance: string
  change: string
  created_at: Date
  method: string
  signature: string
  slot: number
  transaction_created_at: Date
  transaction_type: string
  tx_metadata: string | null
  updated_at: Date
  user_bank: string
}
export interface AudiusDataTxRow {
  signature: string
  slot: number
}
export interface BlockRow {
  blockhash: string
  is_current: boolean | null
  number: number | null
  parenthash: string | null
}
export interface ChallengeDisbursementRow {
  amount: string
  challenge_id: string
  created_at: Date | null
  signature: string
  slot: number
  specifier: string
  user_id: number
}
export interface ChallengeListenStreakRow {
  last_listen_date: Date | null
  listen_streak: number
  user_id: number
}
export interface ChallengeProfileCompletionRow {
  favorites: boolean
  follows: boolean
  profile_cover_photo: boolean
  profile_description: boolean
  profile_name: boolean
  profile_picture: boolean
  reposts: boolean
  user_id: number
}
export interface ChallengeRow {
  active: boolean
  amount: string
  cooldown_days: number | null
  id: string
  starting_block: number | null
  step_count: number | null
  type: challengetype
  weekly_pool: number | null
}
export interface ChatRow {
  chat_id: string
  created_at: Date
  last_message: string | null
  last_message_at: Date
}
export interface ChatBanRow {
  is_banned: boolean
  updated_at: Date
  user_id: number
}
export interface ChatBlockedUserRow {
  blockee_user_id: number
  blocker_user_id: number
  created_at: Date
}
export interface ChatMemberRow {
  chat_id: string
  cleared_history_at: Date | null
  created_at: Date
  invite_code: string
  invited_by_user_id: number
  last_active_at: Date | null
  unread_count: number
  user_id: number
}
export interface ChatMessageRow {
  chat_id: string
  ciphertext: string
  created_at: Date
  message_id: string
  user_id: number
}
export interface ChatMessageReactionRow {
  created_at: Date
  message_id: string
  reaction: string
  updated_at: Date
  user_id: number
}
export interface ChatPermissionRow {
  permits: string | null
  updated_at: Date
  user_id: number
}
export interface CidDataRow {
  cid: string
  data: any | null
  type: string | null
}
export interface DashboardWalletUserRow {
  blockhash: string | null
  blocknumber: number | null
  created_at: Date
  is_delete: boolean
  txhash: string
  updated_at: Date
  user_id: number
  wallet: string
}
export interface DelistStatusCursorRow {
  created_at: Date
  entity: delist_entity
  host: string
}
export interface DeveloperAppRow {
  address: string
  blockhash: string | null
  blocknumber: number | null
  created_at: Date
  description: string | null
  is_current: boolean
  is_delete: boolean
  is_personal_access: boolean
  name: string
  txhash: string
  updated_at: Date
  user_id: number | null
}
export interface EthBlockRow {
  created_at: Date
  last_scanned_block: number
  updated_at: Date
}
export interface FollowRow {
  blockhash: string | null
  blocknumber: number | null
  created_at: Date
  followee_user_id: number
  follower_user_id: number
  is_current: boolean
  is_delete: boolean
  slot: number | null
  txhash: string
}
export interface GrantRow {
  blockhash: string | null
  blocknumber: number | null
  created_at: Date
  grantee_address: string
  is_approved: boolean
  is_current: boolean
  is_revoked: boolean
  txhash: string
  updated_at: Date
  user_id: number
}
export interface HourlyPlayCountRow {
  hourly_timestamp: Date
  play_count: number
}
export interface IndexingCheckpointRow {
  last_checkpoint: number
  signature: string | null
  tablename: string
}
export interface MilestoneRow {
  blocknumber: number | null
  id: number
  name: string
  slot: number | null
  threshold: number
  timestamp: Date
}
export interface NotificationRow {
  blocknumber: number | null
  data: any | null
  group_id: string
  id: number
  slot: number | null
  specifier: string
  timestamp: Date
  type: string
  type_v2: string | null
  user_ids: any | null
}
export interface NotificationSeenRow {
  blockhash: string | null
  blocknumber: number | null
  seen_at: Date
  txhash: string | null
  user_id: number
}
export interface PaymentRouterTxRow {
  created_at: Date
  signature: string
  slot: number
}
export interface PgStatStatementRow {
  blk_read_time: number | null
  blk_write_time: number | null
  calls: string | null
  dbid: any | null
  jit_emission_count: string | null
  jit_emission_time: number | null
  jit_functions: string | null
  jit_generation_time: number | null
  jit_inlining_count: string | null
  jit_inlining_time: number | null
  jit_optimization_count: string | null
  jit_optimization_time: number | null
  local_blks_dirtied: string | null
  local_blks_hit: string | null
  local_blks_read: string | null
  local_blks_written: string | null
  max_exec_time: number | null
  max_plan_time: number | null
  mean_exec_time: number | null
  mean_plan_time: number | null
  min_exec_time: number | null
  min_plan_time: number | null
  plans: string | null
  query: string | null
  queryid: string | null
  rows: string | null
  shared_blks_dirtied: string | null
  shared_blks_hit: string | null
  shared_blks_read: string | null
  shared_blks_written: string | null
  stddev_exec_time: number | null
  stddev_plan_time: number | null
  temp_blk_read_time: number | null
  temp_blk_write_time: number | null
  temp_blks_read: string | null
  temp_blks_written: string | null
  toplevel: boolean | null
  total_exec_time: number | null
  total_plan_time: number | null
  userid: any | null
  wal_bytes: string | null
  wal_fpi: string | null
  wal_records: string | null
}
export interface PgStatStatementsInfoRow {
  dealloc: string | null
  stats_reset: Date | null
}
export interface PlaylistRouteRow {
  blockhash: string
  blocknumber: number
  collision_id: number
  is_current: boolean
  owner_id: number
  playlist_id: number
  slug: string
  title_slug: string
  txhash: string
}
export interface PlaylistSeenRow {
  blockhash: string | null
  blocknumber: number | null
  is_current: boolean
  playlist_id: number
  seen_at: Date
  txhash: string | null
  user_id: number
}
export interface PlaylistRow {
  blockhash: string | null
  blocknumber: number | null
  created_at: Date
  description: string | null
  is_album: boolean
  is_current: boolean
  is_delete: boolean
  is_image_autogenerated: boolean
  is_private: boolean
  last_added_to: Date | null
  metadata_multihash: string | null
  playlist_contents: any
  playlist_id: number
  playlist_image_multihash: string | null
  playlist_image_sizes_multihash: string | null
  playlist_name: string | null
  playlist_owner_id: number
  slot: number | null
  txhash: string
  upc: string | null
  updated_at: Date
  ddex_app?: string | null
  ddex_release_ids?: any | null
  artists?: any | null
  copyright_line?: any | null
  producer_copyright_line?: any | null
  parental_warning_type?: string | null
}
export interface PlayRow {
  city: string | null
  country: string | null
  created_at: Date
  id: number
  play_item_id: number
  region: string | null
  signature: string | null
  slot: number | null
  source: string | null
  updated_at: Date
  user_id: number | null
}
export interface PubkeyRow {
  pubkey: string | null
  wallet: string
}
export interface ReactionRow {
  id: number
  reacted_to: string
  reaction_type: string
  reaction_value: number
  sender_wallet: string
  slot: number
  timestamp: Date
  tx_signature: string | null
}
export interface RelatedArtistRow {
  created_at: Date
  related_artist_user_id: number
  score: number
  user_id: number
}
export interface RemixeRow {
  child_track_id: number
  parent_track_id: number
}
export interface RepostRow {
  blockhash: string | null
  blocknumber: number | null
  created_at: Date
  is_current: boolean
  is_delete: boolean
  is_repost_of_repost: boolean
  repost_item_id: number
  repost_type: reposttype
  slot: number | null
  txhash: string
  user_id: number
}
export interface RevertBlockRow {
  blocknumber: number
  prev_records: any
}
export interface RewardManagerTxRow {
  created_at: Date
  signature: string
  slot: number
}
export interface RewardsManagerBackfillTxRow {
  created_at: Date
  signature: string
  slot: number
}
export interface RouteMetricRow {
  count: number
  created_at: Date
  id: string
  ip: string | null
  query_string: string
  route_path: string
  timestamp: Date
  updated_at: Date
  version: string
}
export interface RouteMetricsAllTimeRow {
  count: string | null
  unique_count: string | null
}
export interface RouteMetricsDayBucketRow {
  count: string | null
  time: Date | null
  unique_count: string | null
}
export interface RouteMetricsMonthBucketRow {
  count: string | null
  time: Date | null
  unique_count: string | null
}
export interface RouteMetricsTrailingMonthRow {
  count: string | null
  unique_count: string | null
}
export interface RouteMetricsTrailingWeekRow {
  count: string | null
  unique_count: string | null
}
export interface RpcCursorRow {
  relayed_at: Date
  relayed_by: string
}
export interface RpcErrorRow {
  error_count: number
  error_text: string
  last_attempt: Date
  rpc_log_json: any
  sig: string
}
export interface RpcLogRow {
  applied_at: Date
  from_wallet: string
  relayed_at: Date
  relayed_by: string
  rpc: Object
  sig: string
}
export interface RpclogRow {
  cuid: string
  jetstream_seq: number | null
  method: string | null
  params: any | null
  wallet: string | null
}
export interface SaveRow {
  blockhash: string | null
  blocknumber: number | null
  created_at: Date
  is_current: boolean
  is_delete: boolean
  is_save_of_repost: boolean
  save_item_id: number
  save_type: savetype
  slot: number | null
  txhash: string
  user_id: number
}
export interface SchemaMigrationRow {
  version: string
}
export interface SchemaVersionRow {
  applied_at: Date
  file_name: string
  md5: string | null
}
export interface SequelizeMetaRow {
  name: string
}
export interface SkippedTransactionRow {
  blockhash: string
  blocknumber: number
  created_at: Date
  id: number
  level: skippedtransactionlevel | null
  txhash: string
  updated_at: Date
}
export interface SplTokenBackfillTxRow {
  created_at: Date
  last_scanned_slot: number
  signature: string
  updated_at: Date
}
export interface SplTokenTxRow {
  created_at: Date
  last_scanned_slot: number
  signature: string
  updated_at: Date
}
export interface StemRow {
  child_track_id: number
  parent_track_id: number
}
export interface SubscriptionRow {
  blockhash: string | null
  blocknumber: number | null
  created_at: Date
  is_current: boolean
  is_delete: boolean
  subscriber_id: number
  txhash: string
  user_id: number
}
export interface SupporterRankUpRow {
  rank: number
  receiver_user_id: number
  sender_user_id: number
  slot: number
}
export interface TagTrackUserRow {
  owner_id: number | null
  tag: string | null
  track_id: number | null
}
export interface TrackDelistStatuseRow {
  created_at: Date
  delisted: boolean
  owner_id: number
  reason: delist_track_reason
  track_cid: string
  track_id: number
}
export interface TrackPriceHistoryRow {
  block_timestamp: Date
  blocknumber: number
  created_at: Date
  splits: any
  total_price_cents: string
  track_id: number
}
export interface TrackRouteRow {
  blockhash: string
  blocknumber: number
  collision_id: number
  is_current: boolean
  owner_id: number
  slug: string
  title_slug: string
  track_id: number
  txhash: string
}
export interface TrackTrendingScoreRow {
  created_at: Date
  genre: string | null
  score: number
  time_range: string
  track_id: number
  type: string
  version: string
}
export interface TrackRow {
  ai_attribution_user_id: number | null
  audio_upload_id: string | null
  blockhash: string | null
  blocknumber: number | null
  cover_art: string | null
  cover_art_sizes: string | null
  create_date: string | null
  created_at: Date
  credits_splits: string | null
  description: string | null
  download: any | null
  duration: number | null
  field_visibility: any | null
  file_type: string | null
  genre: string | null
  is_available: boolean
  is_current: boolean
  is_delete: boolean
  is_playlist_upload: boolean
  is_unlisted: boolean
  is_stream_gated: boolean
  stream_conditions: any | null
  is_download_gated: boolean
  download_conditions: any | null
  isrc: string | null
  iswc: string | null
  license: string | null
  metadata_multihash: string | null
  mood: string | null
  owner_id: number
  release_date: Date | null
  remix_of: any | null
  route_id: string | null
  slot: number | null
  stem_of: any | null
  tags: string | null
  title: string | null
  track_id: number
  track_cid: string | null
  preview_cid: string | null
  preview_start_seconds: number | null
  orig_file_cid: string | null
  orig_filename: string | null
  is_downloadable: boolean
  is_original_available: boolean
  track_segments: any
  txhash: string
  updated_at: Date
  ddex_app?: string | null
  ddex_release_ids?: any | null
  artists?: any | null
  resource_contributors?: any | null
  indirect_resource_contributors?: any | null
  rights_controller?: any | null
  copyright_line?: any | null
  producer_copyright_line?: any | null
  parental_warning_type?: string | null
  bpm: number | null
  musical_key: string | null
}
export interface TrendingParamRow {
  genre: string | null
  karma: string | null
  owner_follower_count: string | null
  owner_id: number | null
  play_count: string | null
  repost_count: number | null
  repost_month_count: string | null
  repost_week_count: string | null
  repost_year_count: string | null
  save_count: number | null
  save_month_count: string | null
  save_week_count: string | null
  save_year_count: string | null
  track_id: number | null
}
export interface TrendingResultRow {
  id: string | null
  rank: number
  type: string
  user_id: number
  version: string
  week: Date
}
export interface UsdcPurchaseRow {
  amount: string
  buyer_user_id: number
  content_id: number
  content_type: usdc_purchase_content_type
  created_at: Date
  extra_amount: string
  seller_user_id: number
  signature: string
  slot: number
  updated_at: Date
}
export interface UsdcTransactionsHistoryRow {
  balance: string
  change: string
  created_at: Date
  method: string
  signature: string
  slot: number
  transaction_created_at: Date
  transaction_type: string
  tx_metadata: string | null
  updated_at: Date
  user_bank: string
}
export interface UsdcUserBankAccountRow {
  bank_account: string
  created_at: Date
  ethereum_address: string
  signature: string
}
export interface UserBalanceChangeRow {
  blocknumber: number
  created_at: Date
  current_balance: string
  previous_balance: string
  updated_at: Date
  user_id: number
}
export interface UserBalanceRow {
  associated_sol_wallets_balance: string
  associated_wallets_balance: string
  balance: string
  created_at: Date
  updated_at: Date
  user_id: number
  waudio: string | null
}
export interface UserBankAccountRow {
  bank_account: string
  created_at: Date
  ethereum_address: string
  signature: string
}
export interface UserBankBackfillTxRow {
  created_at: Date
  signature: string
  slot: number
}
export interface UserBankTxRow {
  created_at: Date
  signature: string
  slot: number
}
export interface UserChallengeRow {
  amount: number
  challenge_id: string
  completed_blocknumber: number | null
  created_at: Date
  current_step_count: number | null
  is_complete: boolean
  specifier: string
  user_id: number
}
export interface UserDelistStatuseRow {
  created_at: Date
  delisted: boolean
  reason: delist_user_reason
  user_id: number
}
export interface UserEventRow {
  blockhash: string | null
  blocknumber: number | null
  id: number
  is_current: boolean
  is_mobile_user: boolean
  referrer: number | null
  slot: number | null
  user_id: number
}
export interface UserListeningHistoryRow {
  listening_history: any
  user_id: number
}
export interface UserPubkeyRow {
  pubkey_base64: string
  user_id: number
}
export interface UserTipRow {
  amount: string
  created_at: Date
  receiver_user_id: number
  sender_user_id: number
  signature: string
  slot: number
  updated_at: Date
}
export interface UserRow {
  allow_ai_attribution: boolean
  artist_pick_track_id: number | null
  bio: string | null
  blockhash: string | null
  blocknumber: number | null
  cover_photo: string | null
  cover_photo_sizes: string | null
  created_at: Date
  creator_node_endpoint: string | null
  handle: string | null
  handle_lc: string | null
  has_collectibles: boolean
  is_available: boolean
  is_current: boolean
  is_deactivated: boolean
  is_storage_v2: boolean
  is_verified: boolean
  location: string | null
  metadata_multihash: string | null
  name: string | null
  playlist_library: any | null
  primary_id: number | null
  profile_picture: string | null
  profile_picture_sizes: string | null
  replica_set_update_signer: string | null
  secondary_ids: any | null
  slot: number | null
  txhash: string
  updated_at: Date
  user_authority_account: string | null
  user_id: number
  user_storage_account: string | null
  wallet: string | null
}
export enum wallet_chain {
  'eth' = 'eth',
  'sol' = 'sol',
}
export enum usdc_purchase_content_type {
  'track' = 'track',
  'playlist' = 'playlist',
  'album' = 'album',
}
export enum skippedtransactionlevel {
  'node' = 'node',
  'network' = 'network',
}
export enum savetype {
  'track' = 'track',
  'playlist' = 'playlist',
  'album' = 'album',
}
export enum reposttype {
  'track' = 'track',
  'playlist' = 'playlist',
  'album' = 'album',
}
export enum delist_user_reason {
  'STRIKE_THRESHOLD' = 'STRIKE_THRESHOLD',
  'COPYRIGHT_SCHOOL' = 'COPYRIGHT_SCHOOL',
  'MANUAL' = 'MANUAL',
}
export enum delist_track_reason {
  'DMCA' = 'DMCA',
  'ACR' = 'ACR',
  'MANUAL' = 'MANUAL',
  'ACR_COUNTER_NOTICE' = 'ACR_COUNTER_NOTICE',
  'DMCA_RETRACTION' = 'DMCA_RETRACTION',
  'DMCA_COUNTER_NOTICE' = 'DMCA_COUNTER_NOTICE',
  'DMCA_AND_ACR_COUNTER_NOTICE' = 'DMCA_AND_ACR_COUNTER_NOTICE',
}
export enum delist_entity {
  'TRACKS' = 'TRACKS',
  'USERS' = 'USERS',
}
export enum challengetype {
  'boolean' = 'boolean',
  'numeric' = 'numeric',
  'aggregate' = 'aggregate',
  'trending' = 'trending',
}
export interface SaveRow {
  blockhash: string | null
  blocknumber: number | null
  created_at: Date | null
  is_current: boolean | null
  is_delete: boolean | null
  is_save_of_repost: boolean | null
  save_item_id: number | null
  save_type: savetype | null
  slot: number | null
  txhash: string | null
  user_id: number | null
}
