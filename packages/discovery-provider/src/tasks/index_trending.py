import logging
import time
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from redis import Redis
from sqlalchemy import bindparam, text
from sqlalchemy.orm.session import Session

from src.challenges.challenge_event_bus import ChallengeEventBus
from src.models.core.core_indexed_blocks import CoreIndexedBlocks
from src.models.indexing.block import Block
from src.models.notifications.notification import Notification
from src.models.tracks.track import Track
from src.queries.get_trending_playlists import _get_trending_playlists_with_session
from src.queries.get_trending_tracks import _get_trending_tracks_with_session
from src.queries.get_underground_trending import _get_underground_trending_with_session
from src.tasks.celery_app import celery
from src.tasks.core.core_client import CoreClient, get_core_instance
from src.tasks.index_tastemaker import index_tastemaker
from src.trending_strategies.trending_strategy_factory import TrendingStrategyFactory
from src.trending_strategies.trending_type_and_version import TrendingType
from src.utils.config import shared_config
from src.utils.hardcoded_data import genre_allowlist
from src.utils.prometheus_metric import (
    PrometheusMetric,
    PrometheusMetricNames,
    save_duration_metric,
)
from src.utils.redis_constants import trending_tracks_last_completion_redis_key
from src.utils.session_manager import SessionManager

logger = logging.getLogger(__name__)
time_ranges = ["week", "month", "year"]

# Time in seconds between trending updates
UPDATE_TRENDING_DURATION_DIFF_SEC = int(
    shared_config["discprov"]["trending_refresh_seconds"]
)


def get_genres(session: Session) -> List[str]:
    """Returns all genres"""
    genres: List[Tuple[str]] = (session.query(Track.genre).distinct(Track.genre)).all()
    genres = filter(  # type: ignore
        lambda x: x[0] is not None and x[0] != "" and x[0] in genre_allowlist, genres
    )
    return list(map(lambda x: x[0], genres))


trending_strategy_factory = TrendingStrategyFactory()

AGGREGATE_INTERVAL_PLAYS = "aggregate_interval_plays"
TRENDING_PARAMS = "trending_params"


def update_view(session: Session, mat_view_name: str):
    start_time = time.time()
    metric = PrometheusMetric(
        PrometheusMetricNames.UPDATE_TRENDING_VIEW_DURATION_SECONDS
    )
    session.execute(f"REFRESH MATERIALIZED VIEW {mat_view_name}")
    update_time = time.time() - start_time
    metric.save_time({"mat_view_name": mat_view_name})
    logger.info(
        f"index_trending.py | Finished updating {mat_view_name} in: {time.time()-start_time} sec",
        extra={
            "job": "index_trending",
            "update_time": update_time,
            "mat_view_name": mat_view_name,
        },
    )


def index_trending(
    self,
    db: SessionManager,
    redis: Redis,
    timestamp,
    challenge_event_bus: ChallengeEventBus,
):
    logger.debug("index_trending.py | starting indexing")
    update_start = time.time()
    metric = PrometheusMetric(PrometheusMetricNames.INDEX_TRENDING_DURATION_SECONDS)
    with db.scoped_session() as session:
        genres = get_genres(session)

        # Make sure to cache empty genre
        genres.append(None)  # type: ignore

        trending_track_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.TRACKS
        ).keys()

        trending_playlist_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.PLAYLISTS
        ).keys()

        update_view(session, AGGREGATE_INTERVAL_PLAYS)
        update_view(session, TRENDING_PARAMS)

        # Update trending tracks (used for underground as well)
        for version in trending_track_versions:
            strategy = trending_strategy_factory.get_strategy(
                TrendingType.TRACKS, version
            )
            strategy.update_track_score_query(session)

        # Update trending playlists
        for version in trending_playlist_versions:
            strategy = trending_strategy_factory.get_strategy(
                TrendingType.PLAYLISTS, version
            )
            strategy.update_playlist_score_query(session)

    update_end = time.time()
    update_total = update_end - update_start
    metric.save_time()
    logger.debug(
        f"index_trending.py | Finished indexing trending in {update_total} seconds",
        extra={"job": "index_trending", "total_time": update_total},
    )
    # Update cache key to track the last time trending finished indexing
    redis.set(trending_tracks_last_completion_redis_key, int(update_end))
    set_last_trending_datetime(redis, timestamp)

    top_trending_tracks = get_top_trending_to_notify(db)

    index_trending_notifications(db, timestamp, top_trending_tracks)
    # Tastemaker reward is still awarded based on the original top 5 trending
    # tracks, even though notifications and the weekly rewards now cover top 10.
    index_tastemaker(
        db, top_trending_tracks[:TASTEMAKER_TRACK_LIMIT], challenge_event_bus
    )
    index_trending_underground_notifications(db, timestamp)
    index_trending_playlist_notifications(db, timestamp)


# Tastemaker eligibility stays scoped to the top 5 trending tracks — the
# original criterion for awarding the tastemaker challenge.
TASTEMAKER_TRACK_LIMIT = 5


def get_top_trending_to_notify(db):
    # The number of tracks to notify for in the top
    NOTIFICATIONS_TRACK_LIMIT = 10
    with db.scoped_session() as session:
        trending_tracks = _get_trending_tracks_with_session(
            session,
            {"time": "week", "exclude_gated": True},
            trending_strategy_factory.get_strategy(TrendingType.TRACKS),
        )
        top_trending = trending_tracks[:NOTIFICATIONS_TRACK_LIMIT]
        return top_trending


def index_trending_notifications(
    db: SessionManager, timestamp: int, top_trending: List[dict]
):
    # Get the top 10 trending tracks from the new trending calculations
    # Get the most recent trending tracks notifications
    # Calculate any diff and write the new notifications if the trending track has moved up in rank
    # Skip if the user was notified of the trending track within the last TRENDING_INTERVAL_HOURS
    # Skip If the new rank is not less than the old rank, skip
    #   ie. Skip if track moved from #2 trending to #3 trending or stayed the same
    # The number of tracks to notify for in the top
    with db.scoped_session() as session:
        top_trending_track_ids = [str(t["track_id"]) for t in top_trending]

        previous_trending_notifications = (
            session.query(Notification)
            .filter(
                Notification.type == "trending",
                Notification.specifier.in_(top_trending_track_ids),
            )
            .all()
        )

        latest_notification_query = text(
            """
                SELECT
                    DISTINCT ON (specifier) specifier,
                    timestamp,
                    data
                FROM notification
                WHERE
                    type=:type AND
                    specifier in :track_ids
                ORDER BY
                    specifier desc,
                    timestamp desc
            """
        )
        latest_notification_query = latest_notification_query.bindparams(
            bindparam("track_ids", expanding=True)
        )

        previous_trending_notifications = session.execute(
            latest_notification_query,
            {"track_ids": top_trending_track_ids, "type": "trending"},
        )
        previous_trending = {
            n[0]: {"timestamp": n[1], **n[2]} for n in previous_trending_notifications
        }

        notifications = []

        # Do not send notifications for the same track trending within 24 hours
        NOTIFICATION_INTERVAL_SEC = 60 * 60 * 24

        for index, track in enumerate(top_trending):
            track_id = track["track_id"]
            rank = index + 1
            previous_track_notification = previous_trending.get(str(track["track_id"]))
            if previous_track_notification is not None:
                current_datetime = datetime.fromtimestamp(timestamp)
                prev_notification_datetime = datetime.fromtimestamp(
                    previous_track_notification["timestamp"].timestamp()
                )
                if (
                    current_datetime - prev_notification_datetime
                ).total_seconds() < NOTIFICATION_INTERVAL_SEC:
                    continue
                prev_rank = previous_track_notification["rank"]
                if prev_rank <= rank:
                    continue
            notifications.append(
                {
                    "owner_id": track["owner_id"],
                    "group_id": f"trending:time_range:week:genre:all:rank:{rank}:track_id:{track_id}:timestamp:{timestamp}",
                    "track_id": track_id,
                    "rank": rank,
                }
            )

        session.bulk_save_objects(
            [
                Notification(
                    user_ids=[n["owner_id"]],
                    timestamp=datetime.fromtimestamp(timestamp),
                    type="trending",
                    group_id=n["group_id"],
                    specifier=n["track_id"],
                    data={
                        "time_range": "week",
                        "genre": "all",
                        "rank": n["rank"],
                        "track_id": n["track_id"],
                    },
                )
                for n in notifications
            ]
        )
        logger.debug(
            "index_trending.py | Created trending notifications",
            extra={"job": "index_trending", "subtask": "trending notification"},
        )
        return top_trending


last_trending_timestamp = "last_trending_timestamp"


def index_trending_underground_notifications(db: SessionManager, timestamp: int):
    # Get the top 10 trending tracks from the new trending calculations
    # Get the most recent trending tracks notifications
    # Calculate any diff and write the new notifications if the trending track has moved up in rank
    # Skip if the user was notified of the trending track within the last TRENDING_INTERVAL_HOURS
    # Skip If the new rank is not less than the old rank, skip
    #   ie. Skip if track moved from #2 trending to #3 trending or stayed the same
    trending_strategy_factory = TrendingStrategyFactory()
    # The number of tracks to notify for in the top
    NOTIFICATIONS_TRACK_LIMIT = 10
    with db.scoped_session() as session:
        top_trending = _get_underground_trending_with_session(
            session,
            {"offset": 0, "limit": NOTIFICATIONS_TRACK_LIMIT},
            trending_strategy_factory.get_strategy(TrendingType.UNDERGROUND_TRACKS),
            False,
        )
        top_trending_track_ids = [str(t["track_id"]) for t in top_trending]

        previous_trending_notifications = (
            session.query(Notification)
            .filter(
                Notification.type == "trending_underground",
                Notification.specifier.in_(top_trending_track_ids),
            )
            .all()
        )

        latest_notification_query = text(
            """
                SELECT
                    DISTINCT ON (specifier) specifier,
                    timestamp,
                    data
                FROM notification
                WHERE
                    type=:type AND
                    specifier in :track_ids
                ORDER BY
                    specifier desc,
                    timestamp desc
            """
        )
        latest_notification_query = latest_notification_query.bindparams(
            bindparam("track_ids", expanding=True)
        )

        previous_trending_notifications = session.execute(
            latest_notification_query,
            {"track_ids": top_trending_track_ids, "type": "trending_underground"},
        )
        previous_trending = {
            n[0]: {"timestamp": n[1], **n[2]} for n in previous_trending_notifications
        }

        notifications = []

        # Do not send notifications for the same track trending within 24 hours
        NOTIFICATION_INTERVAL_SEC = 60 * 60 * 24

        for index, track in enumerate(top_trending):
            track_id = track["track_id"]
            rank = index + 1
            previous_track_notification = previous_trending.get(str(track["track_id"]))
            if previous_track_notification is not None:
                current_datetime = datetime.fromtimestamp(timestamp)
                prev_notification_datetime = datetime.fromtimestamp(
                    previous_track_notification["timestamp"].timestamp()
                )
                if (
                    current_datetime - prev_notification_datetime
                ).total_seconds() < NOTIFICATION_INTERVAL_SEC:
                    continue
                prev_rank = previous_track_notification["rank"]
                if prev_rank <= rank:
                    continue
            notifications.append(
                {
                    "owner_id": track["owner_id"],
                    "group_id": f"trending_underground:time_range:week:genre:all:rank:{rank}:track_id:{track_id}:timestamp:{timestamp}",
                    "track_id": track_id,
                    "rank": rank,
                }
            )

        session.bulk_save_objects(
            [
                Notification(
                    user_ids=[n["owner_id"]],
                    timestamp=datetime.fromtimestamp(timestamp),
                    type="trending_underground",
                    group_id=n["group_id"],
                    specifier=n["track_id"],
                    data={
                        "time_range": "week",
                        "genre": "all",
                        "rank": n["rank"],
                        "track_id": n["track_id"],
                    },
                )
                for n in notifications
            ]
        )
        logger.debug(
            "index_trending.py | Created underground-trending notifications",
            extra={"job": "index_trending", "subtask": "trending notification"},
        )


def index_trending_playlist_notifications(db: SessionManager, timestamp: int):
    trending_strategy_factory = TrendingStrategyFactory()
    # The number of playlists to notify for in the top
    NOTIFICATIONS_PLAYLIST_LIMIT = 5
    current_datetime = datetime.fromtimestamp(timestamp)
    with db.scoped_session() as session:
        top_trending_playlists = _get_trending_playlists_with_session(
            session,
            {
                "time": "week",
                "offset": 0,
                "limit": NOTIFICATIONS_PLAYLIST_LIMIT,
                "with_tracks": True,
            },
            trending_strategy_factory.get_strategy(TrendingType.PLAYLISTS),
            False,
        )
        top_trending_playlist_ids = [
            str(t["playlist_id"]) for t in top_trending_playlists
        ]

        previous_trending_notifications = (
            session.query(Notification)
            .filter(
                Notification.type == "trending_playlist",
                Notification.specifier.in_(top_trending_playlist_ids),
            )
            .all()
        )

        latest_notification_query = text(
            """
                SELECT
                    DISTINCT ON (specifier) specifier,
                    timestamp,
                    data
                FROM notification
                WHERE
                    type=:type AND
                    specifier in :playlist_ids
                ORDER BY
                    specifier desc,
                    timestamp desc
            """
        )
        latest_notification_query = latest_notification_query.bindparams(
            bindparam("playlist_ids", expanding=True)
        )

        previous_trending_notifications = session.execute(
            latest_notification_query,
            {"playlist_ids": top_trending_playlist_ids, "type": "trending_playlist"},
        )
        previous_trending = {
            n[0]: {"timestamp": n[1], **n[2]} for n in previous_trending_notifications
        }

        notifications = []

        # Do not send notifications for the same track trending within 24 hours
        NOTIFICATION_INTERVAL_SEC = 60 * 60 * 24

        for index, playlist in enumerate(top_trending_playlists):
            playlist_id = playlist["playlist_id"]
            rank = index + 1
            previous_playlist_notification = previous_trending.get(str(playlist_id))

            if previous_playlist_notification is not None:
                prev_notification_datetime = datetime.fromtimestamp(
                    previous_playlist_notification["timestamp"].timestamp()
                )
                if (
                    current_datetime - prev_notification_datetime
                ).total_seconds() < NOTIFICATION_INTERVAL_SEC:
                    continue
                prev_rank = previous_playlist_notification["rank"]
                if prev_rank <= rank:
                    continue

            notifications.append(
                {
                    "playlist_owner_id": playlist["playlist_owner_id"],
                    "group_id": f"trending_playlist:time_range:week:genre:all:rank:{rank}:playlist_id:{playlist_id}:timestamp:{timestamp}",
                    "playlist_id": playlist_id,
                    "rank": rank,
                }
            )

        session.bulk_save_objects(
            [
                Notification(
                    user_ids=[n["playlist_owner_id"]],
                    timestamp=current_datetime,
                    type="trending_playlist",
                    group_id=n["group_id"],
                    specifier=n["playlist_id"],
                    data={
                        "time_range": "week",
                        "genre": "all",
                        "rank": n["rank"],
                        "playlist_id": n["playlist_id"],
                    },
                )
                for n in notifications
            ]
        )

        logger.debug(
            "index_trending.py | Created trending playlist notifications",
            extra={
                "job": "cache_trending_playlists",
                "subtask": "trending playlist notification",
            },
        )


def get_last_trending_datetime(redis: Redis):
    dt = redis.get(last_trending_timestamp)
    if dt:
        return datetime.fromtimestamp(int(dt.decode()))
    return None


def set_last_trending_datetime(redis: Redis, timestamp: int):
    redis.set(last_trending_timestamp, timestamp)


def floor_time(dt: datetime, interval_seconds: int):
    """
    Floor a datetime object to a time-span in seconds
    interval_seconds: Closest number of seconds to floor to

    For example, if floor_time is invoked with `interval_seconds` of 15,
    the provided datetime is rounded down to the nearest 15 minute interval.
    E.g. 10:48 rounds to 10:45, 11:02 rounds to 11:00, etc.
    """
    seconds = (dt.replace(tzinfo=None) - dt.min).seconds
    rounding = seconds // interval_seconds * interval_seconds
    return dt + timedelta(0, rounding - seconds, -dt.microsecond)


def find_min_block_above_timestamp(
    block_number: int, min_timestamp: datetime, core: CoreClient
):
    """
    finds the minimum block number above a timestamp
    This is needed to ensure consistency across discovery nodes on the timestamp/blocknumber
    of a notification for updates to trending track
    returns a tuple of the blocknumber and timestamp
    """
    curr_block_number = block_number
    block = core.get_block(block_number)
    block_ts = block.timestamp.ToDatetime()
    greater_than_min = block_ts > min_timestamp
    while greater_than_min:
        prev_block = core.get_block(curr_block_number - 1)
        prev_timestamp = prev_block.timestamp.ToDatetime()
        if prev_timestamp >= min_timestamp:
            block = prev_block
            curr_block_number -= 1
        else:
            return block

    return block


def get_should_update_trending(
    db: SessionManager, core: CoreClient, redis: Redis, interval_seconds: int
) -> Tuple[Optional[int], Optional[int]]:
    """
    Checks if the trending job should re-run based off the last trending run's timestamp and
    the most recently indexed block's timestamp.
    If the most recently indexed block (rounded down to the nearest interval) is `interval_seconds`
    ahead of the last trending job run, then the job should re-run.
    The function returns the an int, representing the timestamp, if the jobs should re-run, else None
    """
    with db.scoped_session() as session:
        current_datetime = None
        current_db_block = (
            session.query(Block.number).filter(Block.is_current == True).first()
        )
        current_db_block_number = current_db_block[0]

        node_info = core.get_node_info()
        core_chain_id = node_info.chainid

        latest_indexed_block: Optional[CoreIndexedBlocks] = (
            session.query(CoreIndexedBlocks)
            .filter(CoreIndexedBlocks.chain_id == core_chain_id)
            .order_by(CoreIndexedBlocks.height.desc())
            .first()
        )

        if latest_indexed_block:
            block = core.get_block(int(latest_indexed_block.height))
            if block:
                current_datetime = block.timestamp.ToDatetime()

        if not current_datetime:
            logger.error("no timestamp")
            return None, None

        min_block_datetime = floor_time(current_datetime, interval_seconds)

        # Handle base case of not having run last trending
        last_trending_datetime = get_last_trending_datetime(redis)
        if not last_trending_datetime:
            # Base case where there is no previous trending calculation in redis
            min_block = find_min_block_above_timestamp(
                current_db_block_number, min_block_datetime, core
            )
            return min_block, int(min_block_datetime.timestamp())

        # Handle base case of not having run last trending
        duration_since_last_index = current_datetime - last_trending_datetime
        if duration_since_last_index.total_seconds() >= interval_seconds:
            min_block = find_min_block_above_timestamp(
                current_db_block_number, min_block_datetime, core
            )

            return min_block, int(min_block_datetime.timestamp())
    return None, None


# ####### CELERY TASKS ####### #
@celery.task(name="index_trending", bind=True)
@save_duration_metric(metric_group="celery_task")
def index_trending_task(self):
    """Caches all trending combination of time-range and genre (including no genre)."""
    db = index_trending_task.db
    redis = index_trending_task.redis
    challenge_event_bus = index_trending_task.challenge_event_bus
    have_lock = False
    timeout = 60 * 60 * 2
    update_lock = redis.lock("index_trending_lock", timeout=timeout)
    try:
        have_lock = update_lock.acquire(blocking=False)
        if have_lock:
            core = get_core_instance()
            min_block, min_timestamp = get_should_update_trending(
                db, core, redis, UPDATE_TRENDING_DURATION_DIFF_SEC
            )
            if min_block is not None and min_timestamp is not None:
                index_trending(self, db, redis, min_timestamp, challenge_event_bus)
            else:
                logger.debug("index_trending.py | skip indexing: not min block")
        else:
            logger.debug(
                f"index_trending.py | \
                skip indexing: without lock {have_lock}"
            )
    except Exception as e:
        logger.error("index_trending.py | Fatal error in main loop", exc_info=True)
        raise e
    finally:
        if have_lock:
            update_lock.release()
