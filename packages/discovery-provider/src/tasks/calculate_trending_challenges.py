import logging
import time
from datetime import date, datetime
from typing import Optional

from redis import Redis
from sqlalchemy.orm.session import Session

from src.challenges.challenge_event import ChallengeEvent
from src.challenges.challenge_event_bus import ChallengeEventBus
from src.models.core.core_indexed_blocks import CoreIndexedBlocks
from src.queries.get_trending_tracks import _get_trending_tracks_with_session
from src.queries.get_underground_trending import (
    GetUndergroundTrendingTrackArgs,
    _get_underground_trending_with_session,
)
from src.tasks.aggregates import get_latest_blocknumber
from src.tasks.core.core_client import CoreClient
from src.trending_strategies.trending_strategy_factory import TrendingStrategyFactory
from src.trending_strategies.trending_type_and_version import TrendingType
from src.utils.redis_constants import most_recent_indexed_block_redis_key

logger = logging.getLogger(__name__)

trending_strategy_factory = TrendingStrategyFactory()


def date_to_week(date: date) -> str:
    return date.strftime("%Y-%m-%d")


def get_latest_blocknumber_via_redis(session: Session, redis: Redis) -> Optional[int]:
    # get latest db state from redis cache
    latest_indexed_block_num = redis.get(most_recent_indexed_block_redis_key)
    if latest_indexed_block_num is not None:
        return int(latest_indexed_block_num)

    return get_latest_blocknumber(session)


# The number of users to recieve the trending rewards
TRENDING_LIMIT = 5


def dispatch_trending_challenges(
    challenge_bus: ChallengeEventBus,
    challenge_event: ChallengeEvent,
    latest_blocknumber: int,
    latest_block_datetime: datetime,
    tracks,
    version: str,
    date: date,
    type: TrendingType,
):
    for idx, track in enumerate(tracks):
        challenge_bus.dispatch(
            challenge_event,
            latest_blocknumber,
            latest_block_datetime,
            track["owner_id"],
            {
                "id": track["track_id"],
                "user_id": track["owner_id"],
                "rank": idx + 1,
                "type": str(type),
                "version": str(version),
                "week": date_to_week(date),
            },
        )


def enqueue_trending_challenges(
    session: Session,
    core: CoreClient,
    challenge_bus: ChallengeEventBus,
    date: date,
):
    logger.debug(
        "calculate_trending_challenges.py | Start calculating trending challenges"
    )
    update_start = time.time()
    with challenge_bus.use_scoped_dispatch_queue():
        # subtract final poa block because db is final_poa_block + latest_acdc_block
        latest_blocknumber = get_latest_blocknumber(session)
        if latest_blocknumber is None:
            logger.error(
                "calculate_trending_challenges.py | Unable to get latest block number"
            )
            return

        latest_block_datetime = None
        node_info = core.get_node_info()
        core_chain_id = node_info.chainid

        latest_indexed_block: Optional[CoreIndexedBlocks] = (
            session.query(CoreIndexedBlocks)
            .filter(CoreIndexedBlocks.chain_id == core_chain_id)
            .order_by(CoreIndexedBlocks.height.desc())
            .first()
        )
        if latest_indexed_block is None:
            logger.error(
                "calculate_trending_challenges.py | Unable to get latest indexed core block"
            )
            return

        if latest_indexed_block:
            block = core.get_block(int(latest_indexed_block.height))
            if block:
                latest_block_datetime = block.timestamp.ToDatetime()

        if latest_block_datetime is None:
            logger.error(
                "calculate_trending_challenges.py | Unable to get latest block time"
            )
            return

        trending_track_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.TRACKS
        ).keys()

        time_range = "week"
        for version in trending_track_versions:
            strategy = trending_strategy_factory.get_strategy(
                TrendingType.TRACKS, version
            )
            top_tracks = _get_trending_tracks_with_session(
                session, {"time": time_range, "exclude_gated": True}, strategy
            )
            top_tracks = top_tracks[:TRENDING_LIMIT]
            dispatch_trending_challenges(
                challenge_bus,
                ChallengeEvent.trending_track,
                latest_blocknumber,
                latest_block_datetime,
                top_tracks,
                version,
                date,
                TrendingType.TRACKS,
            )

        # Cache underground trending
        underground_trending_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.UNDERGROUND_TRACKS
        ).keys()
        for version in underground_trending_versions:
            strategy = trending_strategy_factory.get_strategy(
                TrendingType.UNDERGROUND_TRACKS, version
            )
            underground_args: GetUndergroundTrendingTrackArgs = {
                "offset": 0,
                "limit": TRENDING_LIMIT,
            }
            top_tracks = _get_underground_trending_with_session(
                session, underground_args, strategy, False
            )

            dispatch_trending_challenges(
                challenge_bus,
                ChallengeEvent.trending_underground,
                latest_blocknumber,
                latest_block_datetime,
                top_tracks,
                version,
                date,
                TrendingType.UNDERGROUND_TRACKS,
            )

    update_end = time.time()
    update_total = update_end - update_start
    logger.debug(
        f"calculate_trending_challenges.py | Finished calculating trending in {update_total} seconds"
    )
