import logging
from datetime import datetime, timedelta

from google.protobuf.timestamp_pb2 import Timestamp
from sqlalchemy.sql.expression import or_

from integration_tests.utils import populate_mock_db
from src.challenges.challenge_event_bus import ChallengeEvent, ChallengeEventBus
from src.challenges.trending_challenge import (
    should_trending_challenge_update,
    trending_track_challenge_manager,
    trending_underground_track_challenge_manager,
)
from src.models.rewards.challenge import Challenge
from src.models.rewards.user_challenge import UserChallenge
from src.models.tracks.trending_result import TrendingResult
from src.tasks.calculate_trending_challenges import enqueue_trending_challenges
from src.tasks.core.gen.protocol_pb2 import BlockResponse, NodeInfoResponse
from src.trending_strategies.trending_strategy_factory import TrendingStrategyFactory
from src.trending_strategies.trending_type_and_version import TrendingType
from src.utils.config import shared_config
from src.utils.db_session import get_db
from src.utils.redis_connection import get_redis

REDIS_URL = shared_config["redis"]["url"]
BLOCK_NUMBER = 10
logger = logging.getLogger(__name__)

trending_strategy_factory = TrendingStrategyFactory()


class MockEth:
    def get_block(self, *args):
        return {"timestamp": int(datetime.now().timestamp())}


class MockWeb3:
    def __init__(self):
        self.eth = MockEth()


class MockCore:
    def get_node_info(self) -> NodeInfoResponse:
        return NodeInfoResponse(chainid="audius-devnet")

    def get_block(self, height: int) -> BlockResponse:
        timestamp = Timestamp()
        timestamp.FromDatetime(datetime.now())
        return BlockResponse(timestamp=timestamp, height=height)


def test_trending_challenge_should_update(app):
    with app.app_context():
        db = get_db()

    with db.scoped_session() as session:
        # ========== Test timestamp w/out trending result in DB ==========

        # If the timestamp is outside of threshold and nothing in db
        # Wrong time, wrong day
        timestamp = 1629132028
        should_update, timestamp = should_trending_challenge_update(session, timestamp)
        assert not should_update

        # Right time, wrong day
        timestamp = 1629140400
        should_update, timestamp = should_trending_challenge_update(session, timestamp)
        assert not should_update

        # wrong time, right day
        timestamp = 1629496800
        should_update, timestamp = should_trending_challenge_update(session, timestamp)
        assert not should_update

        # Within bounds
        timestamp = 1629486000
        should_update, timestamp = should_trending_challenge_update(session, timestamp)
        assert should_update

        # ========== Test working timestamp with trending result in DB ==========
        session.add(
            TrendingResult(
                user_id=1,
                rank=1,
                id="1",
                type="tracks",
                version="pnagD",
                week="2021-08-20",
            )
        )
        session.flush()

        # Test same date as inserted trending result, so return false
        timestamp = 1629486000
        should_update, timestamp = should_trending_challenge_update(session, timestamp)
        assert not should_update

        # Test week after inserted trending result, so return true
        timestamp = 1630090800
        should_update, timestamp = should_trending_challenge_update(session, timestamp)
        assert should_update


def test_trending_challenge_job(app):
    with app.app_context():
        db = get_db()
    redis_conn = get_redis()

    test_entities = {
        "tracks": [
            {"track_id": 1, "owner_id": 1},
            {"track_id": 2, "owner_id": 2},
            {"track_id": 3, "owner_id": 3},
            {"track_id": 4, "owner_id": 4},
            {"track_id": 5, "owner_id": 5},
            {"track_id": 6, "owner_id": 2},
            {"track_id": 7, "owner_id": 3},
            {"track_id": 8, "owner_id": 3},
            {"track_id": 9, "is_unlisted": True, "owner_id": 3},
            {"track_id": 11, "owner_id": 1},
            {"track_id": 12, "owner_id": 2},
            {"track_id": 13, "owner_id": 3},
            {"track_id": 14, "owner_id": 4},
            {"track_id": 15, "owner_id": 5},
        ],
        "users": [
            {"user_id": 1, "handle": "user1"},
            {"user_id": 2, "handle": "user2"},
            {"user_id": 3, "handle": "user3"},
            {"user_id": 4, "handle": "user4"},
            {"user_id": 5, "handle": "user5"},
        ],
        "follows": [
            {
                "follower_user_id": 1,
                "followee_user_id": 2,
                "created_at": datetime.now() - timedelta(days=8),
            },
            {
                "follower_user_id": 1,
                "followee_user_id": 3,
                "created_at": datetime.now() - timedelta(days=8),
            },
            {
                "follower_user_id": 2,
                "followee_user_id": 3,
                "created_at": datetime.now() - timedelta(days=8),
            },
            {
                "follower_user_id": 2,
                "followee_user_id": 4,
                "created_at": datetime.now() - timedelta(days=8),
            },
            {
                "follower_user_id": 3,
                "followee_user_id": 6,
                "created_at": datetime.now() - timedelta(days=8),
            },
            {
                "follower_user_id": 4,
                "followee_user_id": 5,
                "created_at": datetime.now() - timedelta(days=8),
            },
            {
                "follower_user_id": 5,
                "followee_user_id": 1,
                "created_at": datetime.now() - timedelta(days=8),
            },
            {
                "follower_user_id": 6,
                "followee_user_id": 3,
                "created_at": datetime.now() - timedelta(days=8),
            },
        ],
        "reposts": [
            {"repost_item_id": 1, "repost_type": "track", "user_id": 2},
            {"repost_item_id": 3, "repost_type": "track", "user_id": 3},
            {"repost_item_id": 4, "repost_type": "track", "user_id": 1},
            {"repost_item_id": 5, "repost_type": "track", "user_id": 1},
            {"repost_item_id": 6, "repost_type": "track", "user_id": 1},
        ],
        "saves": [
            {"save_item_id": 1, "save_type": "track", "user_id": 2},
            {"save_item_id": 1, "save_type": "track", "user_id": 3},
            {"save_item_id": 4, "save_type": "track", "user_id": 1},
            {"save_item_id": 5, "save_type": "track", "user_id": 1},
            {"save_item_id": 6, "save_type": "track", "user_id": 1},
        ],
        "plays": [{"item_id": 1} for _ in range(55)]
        + [{"item_id": 2} for _ in range(60)]
        + [{"item_id": 3} for _ in range(70)]
        + [{"item_id": 4} for _ in range(90)]
        + [{"item_id": 5} for _ in range(80)]
        + [{"item_id": 6} for _ in range(40)]
        + [{"item_id": 11} for _ in range(200)]
        + [{"item_id": 12} for _ in range(200)]
        + [{"item_id": 13} for _ in range(200)]
        + [{"item_id": 14} for _ in range(200)]
        + [{"item_id": 15} for _ in range(200)],
    }

    populate_mock_db(db, test_entities, BLOCK_NUMBER + 1)
    bus = ChallengeEventBus(redis_conn)

    # Register events with the bus
    bus.register_listener(
        ChallengeEvent.trending_underground,
        trending_underground_track_challenge_manager,
    )
    bus.register_listener(
        ChallengeEvent.trending_track, trending_track_challenge_manager
    )

    trending_date = datetime.fromisoformat("2021-08-20")

    with db.scoped_session() as session:
        session.execute("REFRESH MATERIALIZED VIEW aggregate_interval_plays")
        session.execute("REFRESH MATERIALIZED VIEW trending_params")
        trending_track_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.TRACKS
        ).keys()

        for version in trending_track_versions:
            strategy = trending_strategy_factory.get_strategy(
                TrendingType.TRACKS, version
            )
            strategy.update_track_score_query(session)

        session.commit()
        core = MockCore()
        enqueue_trending_challenges(session, core, bus, trending_date)

    with db.scoped_session() as session:
        session.query(Challenge).filter(
            or_(
                Challenge.id == "tt",
                Challenge.id == "tut",
            )
        ).update({"active": True, "starting_block": BLOCK_NUMBER})
        bus.process_events(session, 1000)
        session.flush()
        trending_tracks = (
            session.query(TrendingResult)
            .filter(TrendingResult.type == str(TrendingType.TRACKS))
            .all()
        )
        assert len(trending_tracks) == 10

        user_trending_tracks_challenges = (
            session.query(UserChallenge)
            .filter(UserChallenge.challenge_id == "tt")
            .all()
        )
        assert len(user_trending_tracks_challenges) == 10
        # Ranks 1-5 earn 1000 $AUDIO each; ranks 6-10 earn 100 $AUDIO each.
        expected_amount_by_rank = {
            1: 1000,
            2: 1000,
            3: 1000,
            4: 1000,
            5: 1000,
            6: 100,
            7: 100,
            8: 100,
            9: 100,
            10: 100,
        }
        ranks = {f"2021-08-20:{rank}" for rank in expected_amount_by_rank}
        for challenge in user_trending_tracks_challenges:
            assert challenge.specifier in ranks
            rank = int(challenge.specifier.split(":")[1])
            assert int(challenge.amount) == expected_amount_by_rank[rank]
            ranks.remove(challenge.specifier)
