from datetime import datetime

from src.models.comments.comment import Comment
from src.models.comments.comment_mention import CommentMention
from src.models.comments.comment_notification_setting import CommentNotificationSetting
from src.models.comments.comment_reaction import CommentReaction
from src.models.comments.comment_report import CommentReport
from src.models.comments.comment_thread import CommentThread
from src.models.core.core_indexed_blocks import CoreIndexedBlocks
from src.models.dashboard_wallet_user.dashboard_wallet_user import DashboardWalletUser
from src.models.events.event import Event, EventEntityType, EventType
from src.models.grants.developer_app import DeveloperApp
from src.models.grants.grant import Grant
from src.models.indexing.block import Block
from src.models.indexing.cid_data import CIDData
from src.models.indexing.indexing_checkpoints import IndexingCheckpoint
from src.models.moderation.muted_user import MutedUser
from src.models.notifications.notification import (
    Notification,
    NotificationSeen,
    PlaylistSeen,
)
from src.models.playlists.album_price_history import AlbumPriceHistory
from src.models.playlists.playlist import Playlist
from src.models.playlists.playlist_route import PlaylistRoute
from src.models.playlists.playlist_track import PlaylistTrack
from src.models.playlists.playlist_trending_score import PlaylistTrendingScore
from src.models.rewards.challenge import Challenge
from src.models.rewards.challenge_disbursement import ChallengeDisbursement
from src.models.rewards.listen_streak_challenge import ChallengeListenStreak
from src.models.rewards.reward_manager import RewardManagerTransaction
from src.models.rewards.user_challenge import UserChallenge
from src.models.social.aggregate_monthly_plays import AggregateMonthlyPlay
from src.models.social.aggregate_plays import AggregatePlay
from src.models.social.follow import Follow
from src.models.social.hourly_play_counts import HourlyPlayCount
from src.models.social.play import Play
from src.models.social.reaction import Reaction
from src.models.social.repost import Repost
from src.models.social.save import Save
from src.models.social.subscription import Subscription
from src.models.tracks.aggregate_track import AggregateTrack
from src.models.tracks.remix import Remix
from src.models.tracks.stem import Stem
from src.models.tracks.track import Track
from src.models.tracks.track_price_history import TrackPriceHistory
from src.models.tracks.track_route import TrackRoute
from src.models.tracks.track_trending_score import TrackTrendingScore
from src.models.users.aggregate_user import AggregateUser
from src.models.users.associated_wallet import AssociatedWallet, WalletChain
from src.models.users.email import EmailAccess, EncryptedEmail
from src.models.users.supporter_rank_up import SupporterRankUp
from src.models.users.usdc_purchase import PurchaseAccessType, USDCPurchase
from src.models.users.usdc_transactions_history import (
    USDCTransactionMethod,
    USDCTransactionsHistory,
    USDCTransactionType,
)
from src.models.users.user import User
from src.models.users.user_balance_change import UserBalanceChange
from src.models.users.user_bank import USDCUserBankAccount, UserBankAccount, UserBankTx
from src.models.users.user_listening_history import UserListeningHistory
from src.models.users.user_payout_wallet_history import UserPayoutWalletHistory
from src.models.users.user_tip import UserTip
from src.tasks.aggregates import get_latest_blocknumber
from src.trending_strategies.pnagD_trending_playlists_strategy import (
    TrendingType,
    TrendingVersion,
)
from src.utils import helpers
from src.utils.db_session import get_db


def query_creator_by_name(app, creator_name=None):
    """Return list of creators filtered by name (if present)"""
    query_results = None
    with app.app_context():
        db = get_db()

        with db.scoped_session() as session:
            if creator_name is not None:
                query_results = (
                    session.query(User)
                    .filter(User.name == creator_name)
                    .order_by(User.user_id)
                    .all()
                )
            else:
                query_results = session.query(User).order_by(User.user_id).all()

            assert query_results is not None
            return_list = helpers.query_result_to_list(query_results)
            return return_list


def to_bytes(val, length=32):
    val = val[:length]
    return bytes(val, "utf-8")


def populate_mock_db_blocks(db, min, max, is_current=0):
    """
    Helper function to populate the mock DB with blocks

    Args:
        db - sqlalchemy db session
        min - min block number
        max - max block number
    """
    with db.scoped_session() as session:
        for i in range(min, max + 1):
            block = Block(
                blockhash=hex(i),
                number=i,
                parenthash="0x01",
                is_current=(i == is_current),
            )
            session.add(block)
            session.flush()


def populate_mock_db(db, entities, block_offset=None):
    """
    Helper function to populate the mock DB with tracks, users, plays, developer apps, grants, and follows

    Args:
        db - sqlalchemy db session
        entities - dict of keys tracks, users, plays of arrays of metadata
    """
    with db.scoped_session() as session:
        # check if blocknumber already exists for longer running tests
        if block_offset is None:
            block_offset = get_latest_blocknumber(session)
            if block_offset:
                block_offset += 1
            else:
                block_offset = 0

        tracks = entities.get("tracks", [])
        events = entities.get("events", [])
        comments = entities.get("comments", [])
        comment_threads = entities.get("comment_threads", [])
        comment_reactions = entities.get("comment_reactions", [])
        comment_mentions = entities.get("comment_mentions", [])
        comment_reports = entities.get("comment_reports", [])
        comment_notification_settings = entities.get(
            "comment_notification_settings", []
        )
        muted_users = entities.get("muted_users", [])
        playlists = entities.get("playlists", [])
        playlist_tracks = entities.get("playlist_tracks", [])
        users = entities.get("users", [])
        developer_apps = entities.get("developer_apps", [])
        grants = entities.get("grants", [])
        dashboard_wallet_users = entities.get("dashboard_wallet_users", [])
        follows = entities.get("follows", [])
        subscriptions = entities.get("subscriptions", [])
        reposts = entities.get("reposts", [])
        saves = entities.get("saves", [])
        track_routes = entities.get("track_routes", [])
        playlist_routes = entities.get("playlist_routes", [])
        remixes = entities.get("remixes", [])
        stems = entities.get("stems", [])
        challenges = entities.get("challenges", [])
        user_challenges = entities.get("user_challenges", [])
        challenge_listen_streaks = entities.get("challenge_listen_streaks", [])
        plays = entities.get("plays", [])
        aggregate_plays = entities.get("aggregate_plays", [])
        aggregate_track = entities.get("aggregate_track", [])
        aggregate_monthly_plays = entities.get("aggregate_monthly_plays", [])
        aggregate_user = entities.get("aggregate_user", [])
        indexing_checkpoints = entities.get("indexing_checkpoints", [])
        user_listening_history = entities.get("user_listening_history", [])
        hourly_play_counts = entities.get("hourly_play_counts", [])
        user_bank_accounts = entities.get("user_bank_accounts", [])
        usdc_user_bank_accounts = entities.get("usdc_user_bank_accounts", [])
        associated_wallets = entities.get("associated_wallets", [])
        reactions = entities.get("reactions", [])
        user_bank_txs = entities.get("user_bank_txs", [])
        user_tips = entities.get("user_tips", [])
        supporter_rank_ups = entities.get("supporter_rank_ups", [])
        reward_manager_txs = entities.get("reward_manager_txs", [])
        challenge_disbursements = entities.get("challenge_disbursements", [])
        notification_seens = entities.get("notification_seens", [])
        notifications = entities.get("notification", [])
        playlist_seens = entities.get("playlist_seens", [])
        user_balance_changes = entities.get("user_balance_changes", [])
        usdc_purchases = entities.get("usdc_purchases", [])
        cid_datas = entities.get("cid_datas", [])
        usdc_transactions_history = entities.get("usdc_transactions_history", [])
        track_price_history = entities.get("track_price_history", [])
        album_price_history = entities.get("album_price_history", [])
        user_payout_wallet_history = entities.get("user_payout_wallet_history", [])
        encrypted_emails = entities.get("encrypted_emails", [])
        email_access = entities.get("email_access", [])
        track_trending_scores = entities.get("track_trending_scores", [])
        playlist_trending_scores = entities.get("playlist_trending_scores", [])

        num_blocks = max(
            len(tracks),
            len(playlists),
            len(events),
            len(comments),
            len(comment_threads),
            len(comment_mentions),
            len(comment_notification_settings),
            len(muted_users),
            len(users),
            len(developer_apps),
            len(grants),
            len(dashboard_wallet_users),
            len(follows),
            len(saves),
            len(reposts),
            len(subscriptions),
            len(playlist_seens),
            len(track_price_history),
            len(album_price_history),
            len(user_payout_wallet_history),
        )
        for i in range(block_offset, block_offset + num_blocks):
            max_block = session.query(Block).filter(Block.number == i).first()
            session.query(Block).filter(Block.is_current == True).update(
                {"is_current": False}
            )
            if not max_block:
                blockhash = hex(i)
                parenthash = "0x01"

                block = Block(
                    blockhash=blockhash,
                    number=i,
                    parenthash=parenthash,
                    is_current=(i == block_offset + num_blocks - 1),
                )
                session.add(block)

                core_block = CoreIndexedBlocks(
                    blockhash=blockhash,
                    parenthash=parenthash,
                    chain_id="audius-devnet",
                    height=i,
                )
                session.add(core_block)

                session.flush()

        for i, aggregate_user_meta in enumerate(aggregate_user):
            user = AggregateUser(
                user_id=aggregate_user_meta.get("user_id", i),
                track_count=aggregate_user_meta.get("track_count", 0),
                playlist_count=aggregate_user_meta.get("playlist_count", 0),
                album_count=aggregate_user_meta.get("album_count", 0),
                follower_count=aggregate_user_meta.get("follower_count", 0),
                following_count=aggregate_user_meta.get("following_count", 0),
                repost_count=aggregate_user_meta.get("repost_count", 0),
                track_save_count=aggregate_user_meta.get("track_save_count", 0),
                dominant_genre=aggregate_user_meta.get("dominant_genre", None),
                dominant_genre_count=aggregate_user_meta.get("dominant_genre_count", 0),
            )
            session.add(user)

        for i, track_meta in enumerate(tracks):
            track_id = track_meta.get("track_id", i)

            # delete previous tracks
            session.query(Track).filter(Track.is_current == True).filter(
                Track.track_id == track_id
            ).delete()
            track_created_at = datetime.now()
            track = Track(
                blockhash=hex(i + block_offset),
                blocknumber=i + block_offset,
                txhash=track_meta.get("txhash", str(i + block_offset)),
                track_id=track_id,
                title=track_meta.get("title", f"track_{i}"),
                is_current=track_meta.get("is_current", True),
                is_delete=track_meta.get("is_delete", False),
                owner_id=track_meta.get("owner_id", 1),
                route_id=track_meta.get("route_id", ""),
                track_segments=track_meta.get(
                    "track_segments",
                    [
                        {
                            "duration": 0,
                            "multihash": "QmURbJr815cnDWwYLJmJtYW8ZiAqMre5QzxpW5kahrNTYE",
                        }
                    ],
                ),
                tags=track_meta.get("tags", None),
                genre=track_meta.get("genre", ""),
                remix_of=track_meta.get("remix_of", None),
                updated_at=track_meta.get("updated_at", track_created_at),
                created_at=track_meta.get("created_at", track_created_at),
                release_date=(
                    str(track_meta.get("release_date"))
                    if track_meta.get("release_date")
                    else track_meta.get("created_at", track_created_at)
                ),
                is_unlisted=track_meta.get("is_unlisted", False),
                is_scheduled_release=track_meta.get("is_scheduled_release", False),
                is_stream_gated=track_meta.get("is_stream_gated", False),
                stream_conditions=track_meta.get("stream_conditions", None),
                is_download_gated=track_meta.get("is_download_gated", False),
                download_conditions=track_meta.get("download_conditions", None),
                is_playlist_upload=track_meta.get("is_playlist_upload", False),
                track_cid=track_meta.get("track_cid", None),
                ai_attribution_user_id=track_meta.get("ai_attribution_user_id", None),
                playlists_containing_track=track_meta.get(
                    "playlists_containing_track", []
                ),
                playlists_previously_containing_track=track_meta.get(
                    "playlists_previously_containing_track", {}
                ),
                comments_disabled=track_meta.get("comments_disabled", False),
                pinned_comment_id=track_meta.get("pinned_comment_id", None),
            )
            session.add(track)
        for i, track_price_history_meta in enumerate(track_price_history):
            track_price_history = TrackPriceHistory(
                blocknumber=i + block_offset,
                track_id=track_price_history_meta.get("track_id", i),
                splits=track_price_history_meta.get("splits", {}),
                block_timestamp=track_price_history_meta.get(
                    "block_timestamp", datetime.now()
                ),
                total_price_cents=track_price_history_meta.get("total_price_cents", 0),
                access=track_price_history_meta.get(
                    "access", PurchaseAccessType.stream
                ),
            )
            session.add(track_price_history)
        for i, album_price_history_meta in enumerate(album_price_history):
            album_price_history = AlbumPriceHistory(
                blocknumber=i + block_offset,
                playlist_id=album_price_history_meta.get("playlist_id", i),
                splits=album_price_history_meta.get("splits", {}),
                block_timestamp=album_price_history_meta.get(
                    "block_timestamp", datetime.now()
                ),
                total_price_cents=album_price_history_meta.get("total_price_cents", 0),
            )
            session.add(album_price_history)
        for i, playlist_meta in enumerate(playlists):
            playlist_created_at = datetime.now()
            playlist = Playlist(
                blockhash=hex(i + block_offset),
                blocknumber=i + block_offset,
                txhash=playlist_meta.get("txhash", str(i + block_offset)),
                playlist_id=playlist_meta.get("playlist_id", i),
                is_current=playlist_meta.get("is_current", True),
                is_delete=playlist_meta.get("is_delete", False),
                playlist_owner_id=playlist_meta.get("playlist_owner_id", 1),
                is_album=playlist_meta.get("is_album", False),
                is_private=playlist_meta.get("is_private", False),
                playlist_name=playlist_meta.get("playlist_name", f"playlist_{i}"),
                playlist_contents=playlist_meta.get(
                    "playlist_contents", {"track_ids": []}
                ),
                playlist_image_multihash=playlist_meta.get(
                    "playlist_image_multihash", ""
                ),
                playlist_image_sizes_multihash=playlist_meta.get(
                    "playlist_image_sizes_multihash", ""
                ),
                description=playlist_meta.get("description", f"description_{i}"),
                upc=playlist_meta.get("upc", f"upc_{i}"),
                updated_at=playlist_meta.get("updated_at", playlist_created_at),
                created_at=playlist_meta.get("created_at", playlist_created_at),
                is_image_autogenerated=playlist_meta.get(
                    "is_image_autogenerated", False
                ),
                is_stream_gated=playlist_meta.get("is_stream_gated", False),
                stream_conditions=playlist_meta.get("stream_conditions", None),
                is_scheduled_release=playlist_meta.get("is_scheduled_release", False),
                release_date=playlist_meta.get(
                    "release_date", playlist_meta.get("created_at", playlist_created_at)
                ),
            )
            session.add(playlist)
        for i, playlist_track_meta in enumerate(playlist_tracks):
            playlist_track = PlaylistTrack(
                playlist_id=playlist_track_meta.get("playlist_id", i),
                track_id=playlist_track_meta.get("track_id", i),
                is_removed=playlist_track_meta.get("is_removed", False),
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
            session.add(playlist_track)

        for i, user_meta in enumerate(users):
            user = User(
                blockhash=hex(i + block_offset),
                blocknumber=i + block_offset,
                txhash=user_meta.get("txhash", str(i + block_offset)),
                user_id=user_meta.get("user_id", i),
                is_current=user_meta.get("is_current", True),
                handle=user_meta.get("handle", str(i)),
                handle_lc=user_meta.get("handle", str(i)).lower(),
                name=user_meta.get("name", str(i)),
                artist_pick_track_id=user_meta.get("artist_pick_track_id"),
                wallet=user_meta.get("wallet", str(i)),
                bio=user_meta.get("bio", str(i)),
                profile_picture=user_meta.get("profile_picture"),
                profile_picture_sizes=user_meta.get("profile_picture_sizes"),
                cover_photo=user_meta.get("cover_photo"),
                cover_photo_sizes=user_meta.get("cover_photo_sizes"),
                updated_at=user_meta.get("updated_at", datetime.now()),
                created_at=user_meta.get("created_at", datetime.now()),
                primary_id=user_meta.get("primary_id"),
                secondary_ids=user_meta.get("secondary_ids"),
                replica_set_update_signer=user_meta.get("replica_set_update_signer"),
                creator_node_endpoint=user_meta.get(
                    "creator_node_endpoint", "https://cn.io"
                ),
                is_available=user_meta.get("is_available", True),
                is_deactivated=user_meta.get("is_deactivated", False),
                allow_ai_attribution=user_meta.get("allow_ai_attribution", False),
                is_verified=user_meta.get("is_verified", False),
            )
            user_bank = UserBankAccount(
                signature=f"0x{i}",
                ethereum_address=user_meta.get("wallet", str(i)),
                bank_account=f"0x{i}",
                created_at=datetime.now(),
            )
            session.add(user)
            session.add(user_bank)

        for i, developer_app_meta in enumerate(developer_apps):
            developer_app = DeveloperApp(
                user_id=developer_app_meta.get("user_id", i),
                name=developer_app_meta.get("name", str(i)),
                address=developer_app_meta.get("address", str(i)),
                is_personal_access=developer_app_meta.get("is_personal_access", False),
                blockhash=hex(i + block_offset),
                blocknumber=(i + block_offset),
                is_delete=developer_app_meta.get("is_delete", False),
                is_current=True,
                txhash=developer_app_meta.get("txhash", str(i + block_offset)),
                updated_at=developer_app_meta.get("updated_at", datetime.now()),
                created_at=developer_app_meta.get("created_at", datetime.now()),
            )
            session.add(developer_app)

        for i, grant_meta in enumerate(grants):
            grant = Grant(
                user_id=grant_meta.get("user_id", i),
                grantee_address=grant_meta.get("grantee_address", str(i)),
                is_approved=grant_meta.get("is_approved", None),
                is_revoked=grant_meta.get("is_revoked", False),
                blockhash=hex(i + block_offset),
                blocknumber=(i + block_offset),
                is_current=True,
                txhash=grant_meta.get("txhash", str(i + block_offset)),
                updated_at=grant_meta.get("updated_at", datetime.now()),
                created_at=grant_meta.get("created_at", datetime.now()),
            )
            session.add(grant)

        for i, dashboard_wallet_user_meta in enumerate(dashboard_wallet_users):
            dashboard_wallet_user = DashboardWalletUser(
                user_id=dashboard_wallet_user_meta.get("user_id", i),
                wallet=dashboard_wallet_user_meta.get("wallet", str(i)),
                is_delete=dashboard_wallet_user_meta.get("is_delete", False),
                blockhash=hex(i + block_offset),
                blocknumber=(i + block_offset),
                txhash=dashboard_wallet_user_meta.get("txhash", str(i + block_offset)),
                updated_at=dashboard_wallet_user_meta.get("updated_at", datetime.now()),
                created_at=dashboard_wallet_user_meta.get("created_at", datetime.now()),
            )
            session.add(dashboard_wallet_user)

        for i, follow_meta in enumerate(follows):
            follow = Follow(
                blockhash=hex(i + block_offset),
                blocknumber=follow_meta.get("blocknumber", i + block_offset),
                follower_user_id=follow_meta.get("follower_user_id", i + 1),
                followee_user_id=follow_meta.get("followee_user_id", i),
                is_current=follow_meta.get("is_current", True),
                is_delete=follow_meta.get("is_delete", False),
                created_at=follow_meta.get("created_at", datetime.now()),
            )
            session.add(follow)
        for i, subscription_meta in enumerate(subscriptions):
            subscription = Subscription(
                blockhash=hex(i + block_offset),
                blocknumber=subscription_meta.get("blocknumber", i + block_offset),
                subscriber_id=subscription_meta.get("subscriber_id", i + 1),
                user_id=subscription_meta.get("user_id", i),
                is_current=subscription_meta.get("is_current", True),
                is_delete=subscription_meta.get("is_delete", False),
                created_at=subscription_meta.get("created_at", datetime.now()),
            )
            session.add(subscription)
        for i, repost_meta in enumerate(reposts):
            repost = Repost(
                blockhash=hex(i + block_offset),
                blocknumber=repost_meta.get("blocknumber", i + block_offset),
                txhash=repost_meta.get("txhash", str(i + block_offset)),
                user_id=repost_meta.get("user_id", i + 1),
                repost_item_id=repost_meta.get("repost_item_id", i),
                repost_type=repost_meta.get("repost_type", "track"),
                is_current=repost_meta.get("is_current", True),
                is_delete=repost_meta.get("is_delete", False),
                created_at=repost_meta.get("created_at", datetime.now()),
                is_repost_of_repost=repost_meta.get("is_repost_of_repost", False),
            )
            session.add(repost)
        for i, save_meta in enumerate(saves):
            save = Save(
                blockhash=hex(i + block_offset),
                blocknumber=save_meta.get("blocknumber", i + block_offset),
                txhash=save_meta.get("txhash", str(i + block_offset)),
                user_id=save_meta.get("user_id", i + 1),
                save_item_id=save_meta.get("save_item_id", i),
                save_type=save_meta.get("save_type", "track"),
                is_current=save_meta.get("is_current", True),
                is_delete=save_meta.get("is_delete", False),
                created_at=save_meta.get("created_at", datetime.now()),
                is_save_of_repost=save_meta.get("is_save_of_repost", False),
            )
            session.add(save)

        for i, play_meta in enumerate(plays):
            play = Play(
                id=play_meta.get("id", i + 1),
                user_id=play_meta.get("user_id", i + 1),
                source=play_meta.get("source", None),
                play_item_id=play_meta.get("item_id", i + 1),
                slot=play_meta.get("slot", i + 1),
                signature=play_meta.get("signature", None),
                created_at=play_meta.get("created_at", datetime.now()),
                updated_at=play_meta.get("updated_at", datetime.now()),
            )
            session.add(play)

        for i, aggregate_play_meta in enumerate(aggregate_plays):
            aggregate_play = AggregatePlay(
                play_item_id=aggregate_play_meta.get("play_item_id", i),
                count=aggregate_play_meta.get("count", 0),
            )
            session.add(aggregate_play)

        for i, aggregate_track_meta in enumerate(aggregate_track):
            aggregate_track = AggregateTrack(
                track_id=aggregate_track_meta.get("track_id", i),
                repost_count=aggregate_track_meta.get("repost_count", 0),
                save_count=aggregate_track_meta.get("save_count", 0),
                comment_count=aggregate_track_meta.get("comment_count", 0),
            )
            session.add(aggregate_track)

        for i, aggregate_monthly_play_meta in enumerate(aggregate_monthly_plays):
            aggregate_monthly_play = AggregateMonthlyPlay(
                play_item_id=aggregate_monthly_play_meta.get("play_item_id", i),
                timestamp=aggregate_monthly_play_meta.get("timestamp", i),
                count=aggregate_monthly_play_meta.get("count", 0),
            )
            session.add(aggregate_monthly_play)

        for i, user_listening_history_meta in enumerate(user_listening_history):
            user_listening_history = UserListeningHistory(
                user_id=user_listening_history_meta.get("user_id", i + 1),
                listening_history=user_listening_history_meta.get(
                    "listening_history", None
                ),
            )
            session.add(user_listening_history)

        for i, hourly_play_count_meta in enumerate(hourly_play_counts):
            hourly_play_count = HourlyPlayCount(
                hourly_timestamp=hourly_play_count_meta.get(
                    "hourly_timestamp", datetime.now()
                ),
                play_count=hourly_play_count_meta.get("play_count", 0),
            )
            session.add(hourly_play_count)

        if indexing_checkpoints:
            session.execute(
                "TRUNCATE TABLE indexing_checkpoints"
            )  # clear primary keys before adding
            for i, indexing_checkpoint_meta in enumerate(indexing_checkpoints):
                indexing_checkpoint = IndexingCheckpoint(
                    tablename=indexing_checkpoint_meta.get("tablename", None),
                    last_checkpoint=indexing_checkpoint_meta.get("last_checkpoint", 0),
                )
                session.add(indexing_checkpoint)

        for i, route_meta in enumerate(track_routes):
            route = TrackRoute(
                slug=route_meta.get("slug", ""),
                title_slug=route_meta.get("title_slug", ""),
                blockhash=hex(i + block_offset),
                blocknumber=route_meta.get("blocknumber", i + block_offset),
                owner_id=route_meta.get("owner_id", i + 1),
                track_id=route_meta.get("track_id", i + 1),
                is_current=route_meta.get("is_current", True),
                txhash=route_meta.get("txhash", str(i + 1)),
                collision_id=route_meta.get("collision_id", 0),
            )
            session.add(route)

        for i, route_meta in enumerate(playlist_routes):
            route = PlaylistRoute(
                slug=route_meta.get("slug", ""),
                title_slug=route_meta.get("title_slug", ""),
                blockhash=hex(i + block_offset),
                blocknumber=route_meta.get("blocknumber", i + block_offset),
                owner_id=route_meta.get("owner_id", i + 1),
                playlist_id=route_meta.get("playlist_id", i + 1),
                is_current=route_meta.get("is_current", True),
                txhash=route_meta.get("txhash", str(i + 1)),
                collision_id=route_meta.get("collision_id", 0),
            )
            session.add(route)

        for i, remix_meta in enumerate(remixes):
            remix = Remix(
                parent_track_id=remix_meta.get("parent_track_id", i),
                child_track_id=remix_meta.get("child_track_id", i + 1),
            )
            session.add(remix)
        for i, stems_meta in enumerate(stems):
            stem = Stem(
                parent_track_id=stems_meta.get("parent_track_id", i),
                child_track_id=stems_meta.get("child_track_id", i + 1),
            )
            session.add(stem)

        for i, challenge_meta in enumerate(challenges):
            challenge = Challenge(
                id=challenge_meta.get("id", ""),
                type=challenge_meta.get("type", "boolean"),
                amount=challenge_meta.get("amount", ""),
                active=challenge_meta.get("active", True),
                step_count=challenge_meta.get("step_count", None),
                starting_block=challenge_meta.get("starting_block", None),
                weekly_pool=challenge_meta.get("weekly_pool", None),
                cooldown_days=challenge_meta.get("cooldown_days", None),
            )
            session.add(challenge)
        for i, user_challenge_meta in enumerate(user_challenges):
            user_challenge = UserChallenge(
                challenge_id=user_challenge_meta.get("challenge_id", ""),
                user_id=user_challenge_meta.get("user_id", 1),
                specifier=user_challenge_meta.get("specifier", ""),
                is_complete=user_challenge_meta.get("is_complete", False),
                completed_blocknumber=user_challenge_meta.get(
                    "completed_blocknumber", 1 + block_offset
                ),
                current_step_count=user_challenge_meta.get("current_step_count", None),
                amount=user_challenge_meta.get("amount", None),
                completed_at=user_challenge_meta.get("completed_at", datetime.now()),
            )
            session.add(user_challenge)
        for i, user_bank_account in enumerate(user_bank_accounts):
            bank = UserBankAccount(
                signature=user_bank_account.get("signature", ""),
                ethereum_address=user_bank_account.get("ethereum_address", ""),
                bank_account=user_bank_account.get("bank_account", ""),
                created_at=user_bank_account.get("created_at", datetime.now()),
            )
            session.add(bank)
        for i, usdc_user_bank_account in enumerate(usdc_user_bank_accounts):
            bank = USDCUserBankAccount(
                signature=usdc_user_bank_account.get("signature", "fake_signature"),
                ethereum_address=usdc_user_bank_account.get("ethereum_address", ""),
                bank_account=usdc_user_bank_account.get("bank_account", ""),
                created_at=usdc_user_bank_account.get("created_at", datetime.now()),
            )
            session.add(bank)
        for i, associated_wallet in enumerate(associated_wallets):
            wallet = AssociatedWallet(
                blockhash=associated_wallet.get("blockhash", hex(i + block_offset)),
                blocknumber=associated_wallet.get("blocknumber", i + block_offset),
                is_current=associated_wallet.get("is_current", True),
                is_delete=associated_wallet.get("is_delete", False),
                user_id=associated_wallet.get("user_id", 1),
                wallet=associated_wallet.get("wallet", str(i)),
                chain=associated_wallet.get("chain", WalletChain.sol),
            )
            session.add(wallet)
        for i, reaction in enumerate(reactions):
            reaction = Reaction(
                id=reaction.get("id", i),
                reaction_value=reaction.get("reaction_value", 1),
                sender_wallet=reaction.get("sender_wallet", "0x"),
                reaction_type=reaction.get("reaction_type", "type"),
                reacted_to=reaction.get("reacted_to", "reaction_to"),
                timestamp=reaction.get("timestamp", datetime.now()),
            )
            session.add(reaction)
        for i, user_bank_tx in enumerate(user_bank_txs):
            ubtx = UserBankTx(
                slot=user_bank_tx.get("slot", i),
                signature=user_bank_tx.get("signature", str(i)),
                created_at=user_bank_tx.get("created_at", datetime.now()),
            )
            session.add(ubtx)
        for i, supporter_rank_up in enumerate(supporter_rank_ups):
            sru = SupporterRankUp(
                slot=supporter_rank_up.get("slot", i),
                sender_user_id=supporter_rank_up.get("sender_user_id", i),
                receiver_user_id=supporter_rank_up.get("receiver_user_id", i),
                rank=supporter_rank_up.get("rank", 1),
            )
            session.add(sru)
        for i, user_tip in enumerate(user_tips):
            ut = UserTip(
                slot=user_tip.get("slot", i),
                signature=user_tip.get("signature", str(i)),
                sender_user_id=user_tip.get("sender_user_id", i),
                receiver_user_id=user_tip.get("receiver_user_id", i),
                amount=user_tip.get("amount", i),
                created_at=user_tip.get("created_at", datetime.now()),
                updated_at=user_tip.get("updated_at", datetime.now()),
            )
            session.add(ut)
        for i, reward_manager_tx in enumerate(reward_manager_txs):
            rmtx = RewardManagerTransaction(
                slot=reward_manager_tx.get("slot", i),
                signature=reward_manager_tx.get("signature", str(i)),
                created_at=reward_manager_tx.get("created_at", datetime.now()),
            )
            session.add(rmtx)
        for i, challenge_disbursement in enumerate(challenge_disbursements):
            cb = ChallengeDisbursement(
                challenge_id=challenge_disbursement.get("challenge_id", str(i)),
                user_id=challenge_disbursement.get("user_id", i),
                specifier=challenge_disbursement.get("specifier", str(i)),
                signature=challenge_disbursement.get("signature", str(i)),
                slot=challenge_disbursement.get("slot", i),
                amount=challenge_disbursement.get("amount", i),
                created_at=challenge_disbursement.get("created_at", datetime.now()),
            )
            session.add(cb)
        for i, playlist_seen in enumerate(playlist_seens):
            ps = PlaylistSeen(
                user_id=playlist_seen.get("user_id", i),
                playlist_id=playlist_seen.get("playlist_id", i),
                is_current=playlist_seen.get("is_current", True),
                seen_at=playlist_seen.get("seen_at", datetime.now()),
                blockhash=playlist_seen.get("blockhash", str(i)),
                blocknumber=playlist_seen.get("blocknumber", str(i)),
                txhash=playlist_seen.get("txhash", str(i)),
            )
            session.add(ps)
        for i, notification in enumerate(notifications):
            n = Notification(
                user_ids=notification.get("user_ids", []),
                blocknumber=notification.get("blocknumber", i),
                timestamp=notification.get("timestamp", datetime.now()),
                type=notification.get("type", "default"),
                group_id=notification.get("group_id", "default_group_id"),
                specifier=notification.get("specifier", str(i)),
                data=notification.get("data", {}),
            )
            session.add(n)
        for i, notification_seen in enumerate(notification_seens):
            ns = NotificationSeen(
                user_id=notification_seen.get("user_id", i),
                blocknumber=notification_seen.get("blocknumber", i),
                blockhash=notification_seen.get("signature", str(i)),
                seen_at=notification_seen.get("seen_at", datetime.now()),
            )
            session.add(ns)
        for i, balance_change in enumerate(user_balance_changes):
            change = UserBalanceChange(
                user_id=balance_change.get("user_id", i),
                blocknumber=balance_change.get("blocknumber", i),
                current_balance=balance_change.get("current_balance", 0),
                previous_balance=balance_change.get("previous_balance", 0),
                created_at=balance_change.get("created_at", datetime.now()),
                updated_at=balance_change.get("updated_at", datetime.now()),
            )
            session.add(change)
        for i, usdc_purchase in enumerate(usdc_purchases):
            purchase = USDCPurchase(
                slot=usdc_purchase.get("slot", i),
                signature=usdc_purchase.get("signature", "fake_signature"),
                buyer_user_id=usdc_purchase.get("buyer_user_id", 1),
                seller_user_id=usdc_purchase.get("seller_user_id", 2),
                amount=usdc_purchase.get("amount", 100),
                content_type=usdc_purchase.get("content_type", "track"),
                content_id=usdc_purchase.get("content_id", 3),
                created_at=usdc_purchase.get("created_at", datetime.now()),
                updated_at=usdc_purchase.get("updated_at", datetime.now()),
                access=usdc_purchase.get("access", PurchaseAccessType.stream),
                splits=usdc_purchase.get(
                    "splits",
                    [
                        {
                            "user_id": 2,
                            "amount": 1000000,
                            "percentage": 100.0,
                            "eth_wallet": "",
                            "payout_wallet": "",
                        }
                    ],
                ),
            )
            session.add(purchase)
        for i, cid_data in enumerate(cid_datas):
            data = CIDData(
                cid=cid_data.get("cid", "fake_cid"),
                type=cid_data.get("type", "user"),
                data=cid_data.get("data", {}),
            )
            session.add(data)
        for i, usdc_transaction in enumerate(usdc_transactions_history):
            transaction = USDCTransactionsHistory(
                user_bank=usdc_transaction.get("user_bank"),
                slot=usdc_transaction.get("slot", i),
                signature=usdc_transaction.get("signature", "fake_signature"),
                transaction_type=usdc_transaction.get(
                    "transaction_type", USDCTransactionType.transfer
                ),
                method=usdc_transaction.get("method", USDCTransactionMethod.send),
                created_at=usdc_transaction.get("created_at", datetime.now()),
                updated_at=usdc_transaction.get("updated_at", datetime.now()),
                transaction_created_at=usdc_transaction.get(
                    "transaction_created_at", datetime.now()
                ),
                change=usdc_transaction.get("change", 0),
                balance=usdc_transaction.get("balance", 0),
                tx_metadata=usdc_transaction.get("tx_metadata"),
            )
            session.add(transaction)
        for i, user_payout_wallet in enumerate(user_payout_wallet_history):
            user_payout_wallet_history_record = UserPayoutWalletHistory(
                user_id=user_payout_wallet.get("user_id", i),
                spl_usdc_payout_wallet=user_payout_wallet.get(
                    "spl_usdc_payout_wallet", None
                ),
                blocknumber=user_payout_wallet.get("blocknumber", i + block_offset),
                block_timestamp=user_payout_wallet.get(
                    "block_timestamp", datetime.now()
                ),
            )
            session.add(user_payout_wallet_history_record)
        for i, event_meta in enumerate(events):
            event_record = Event(
                event_id=event_meta.get("event_id", i),
                event_type=event_meta.get("event_type", EventType.remix_contest),
                user_id=event_meta.get("user_id", i),
                entity_id=event_meta.get("entity_id", i),
                entity_type=event_meta.get("entity_type", EventEntityType.track),
                event_data=event_meta.get("event_data", {}),
                is_deleted=event_meta.get("is_deleted", False),
                end_date=event_meta.get("end_date", datetime.now()),
                created_at=event_meta.get("created_at", datetime.now()),
                updated_at=event_meta.get("updated_at", datetime.now()),
                txhash=event_meta.get("txhash", str(i + block_offset)),
                blockhash=event_meta.get("blockhash", str(i + block_offset)),
                blocknumber=i + block_offset,
            )
            session.add(event_record)
        for i, comment_meta in enumerate(comments):
            comment_record = Comment(
                user_id=comment_meta.get("user_id", i),
                comment_id=comment_meta.get("comment_id", i),
                entity_id=comment_meta.get("entity_id", i),
                entity_type=comment_meta.get("entity_type", "Track"),
                text=comment_meta.get("text", ""),
                is_edited=comment_meta.get("is_edited", False),
                is_delete=comment_meta.get("is_delete", False),
                created_at=comment_meta.get("created_at", datetime.now()),
                updated_at=comment_meta.get("updated_at", datetime.now()),
                track_timestamp_s=comment_meta.get("track_timestamp_s", None),
                txhash=comment_meta.get("txhash", str(i + block_offset)),
                blockhash=comment_meta.get("blockhash", str(i + block_offset)),
            )
            session.add(comment_record)
        for i, comment_threads_meta in enumerate(comment_threads):
            comment_thread_record = CommentThread(
                parent_comment_id=comment_threads_meta.get("parent_comment_id", i),
                comment_id=comment_threads_meta.get("comment_id", i),
            )
            session.add(comment_thread_record)
        for i, comment_reactions_meta in enumerate(comment_reactions):
            comment_reactions_record = CommentReaction(
                comment_id=comment_reactions_meta.get("comment_id", i),
                user_id=comment_reactions_meta.get("user_id", i),
                is_delete=comment_reactions_meta.get("is_delete", False),
                created_at=comment_reactions_meta.get("created_at", datetime.now()),
                updated_at=comment_reactions_meta.get("updated_at", datetime.now()),
                txhash=comment_reactions_meta.get("txhash", str(i + block_offset)),
                blockhash=comment_reactions_meta.get(
                    "blockhash", str(i + block_offset)
                ),
            )
            session.add(comment_reactions_record)
        for i, comment_mentions_meta in enumerate(comment_mentions):
            comment_mention_record = CommentMention(
                comment_id=comment_mentions_meta.get("comment_id", i),
                user_id=comment_mentions_meta.get("user_id", i),
                is_delete=comment_mentions_meta.get("is_delete", False),
                created_at=comment_mentions_meta.get("created_at", datetime.now()),
                updated_at=comment_mentions_meta.get("updated_at", datetime.now()),
                txhash=comment_mentions_meta.get("txhash", str(i + block_offset)),
                blockhash=comment_mentions_meta.get("blockhash", str(i + block_offset)),
                blocknumber=i + block_offset,
            )
            session.add(comment_mention_record)
        for i, comment_report in enumerate(comment_reports):
            comment_report_record = CommentReport(
                comment_id=comment_report.get("comment_id", i),
                user_id=comment_report.get("user_id", i),
                is_delete=comment_report.get("is_delete", False),
                created_at=comment_report.get("created_at", datetime.now()),
                updated_at=comment_report.get("updated_at", datetime.now()),
                txhash=comment_report.get("txhash", str(i + block_offset)),
                blockhash=comment_report.get("blockhash", str(i + block_offset)),
                blocknumber=i + block_offset,
            )
            session.add(comment_report_record)
        for i, comment_notification_setting in enumerate(comment_notification_settings):
            comment_mention_record = CommentNotificationSetting(
                user_id=comment_notification_setting.get("user_id", i),
                entity_id=comment_notification_setting.get("entity_id", i),
                entity_type=comment_notification_setting.get("entity_type", "Track"),
                is_muted=comment_notification_setting.get("is_muted", False),
                created_at=comment_notification_setting.get(
                    "created_at", datetime.now()
                ),
                updated_at=comment_notification_setting.get(
                    "updated_at", datetime.now()
                ),
            )
            session.add(comment_mention_record)
        for i, muted_user in enumerate(muted_users):
            muted_user_record = MutedUser(
                user_id=muted_user.get("user_id", i),
                muted_user_id=muted_user.get("muted_user_id", i),
                is_delete=muted_user.get("is_delete", False),
                created_at=muted_user.get("created_at", datetime.now()),
                updated_at=muted_user.get("updated_at", datetime.now()),
                txhash=muted_user.get("txhash", str(i + block_offset)),
                blockhash=muted_user.get("blockhash", str(i + block_offset)),
                blocknumber=i + block_offset,
            )
            session.add(muted_user_record)

        for i, encrypted_email_meta in enumerate(encrypted_emails):
            encrypted_email = EncryptedEmail(
                email_owner_user_id=encrypted_email_meta.get("email_owner_user_id", i),
                encrypted_email=encrypted_email_meta.get("encrypted_email", ""),
                created_at=encrypted_email_meta.get("created_at", datetime.now()),
                updated_at=encrypted_email_meta.get("updated_at", datetime.now()),
            )
            session.add(encrypted_email)

        for i, email_access_meta in enumerate(email_access):
            email_access = EmailAccess(
                email_owner_user_id=email_access_meta.get("email_owner_user_id", i),
                receiving_user_id=email_access_meta.get("receiving_user_id", i),
                grantor_user_id=email_access_meta.get("grantor_user_id", i),
                encrypted_key=email_access_meta.get("encrypted_key", ""),
                created_at=email_access_meta.get("created_at", datetime.now()),
                updated_at=email_access_meta.get("updated_at", datetime.now()),
            )
            session.add(email_access)

        for i, challenge_listen_streak in enumerate(challenge_listen_streaks):
            streak = ChallengeListenStreak(
                user_id=challenge_listen_streak.get("user_id", i),
                last_listen_date=challenge_listen_streak.get(
                    "last_listen_date", datetime.now()
                ),
                listen_streak=challenge_listen_streak.get("listen_streak", 1),
            )
            session.add(streak)

        for i, track_trending_score in enumerate(track_trending_scores):
            score = TrackTrendingScore(
                track_id=track_trending_score.get("track_id", i),
                type=track_trending_score.get("type", TrendingType.TRACKS.name),
                score=track_trending_score.get("score", 0),
                version=track_trending_score.get("version", TrendingVersion.pnagD.name),
                genre=track_trending_score.get("genre", ""),
                time_range=track_trending_score.get("time_range", "week"),
                created_at=track_trending_score.get("created_at", datetime.now()),
            )
            session.add(score)

        for i, playlist_trending_score in enumerate(playlist_trending_scores):
            score = PlaylistTrendingScore(
                playlist_id=playlist_trending_score.get("playlist_id", i),
                type=playlist_trending_score.get("type", TrendingType.PLAYLISTS.name),
                score=playlist_trending_score.get("score", 0),
                version=playlist_trending_score.get(
                    "version", TrendingVersion.pnagD.value
                ),
                time_range=playlist_trending_score.get("time_range", "week"),
                created_at=playlist_trending_score.get("created_at", datetime.now()),
            )
            session.add(score)

        session.commit()
