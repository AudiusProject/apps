import logging
from datetime import datetime

from src.challenges.challenge_event_bus import ChallengeEvent, ChallengeEventBus
from src.challenges.play_count_milestone_250_challenge import (
    play_count_250_milestone_challenge_manager,
)
from src.challenges.play_count_milestone_1000_challenge import (
    play_count_1000_milestone_challenge_manager,
)
from src.challenges.play_count_milestone_10000_challenge import (
    play_count_10000_milestone_challenge_manager,
)
from src.models.indexing.block import Block
from src.models.rewards.challenge import Challenge
from src.models.social.aggregate_monthly_plays import AggregateMonthlyPlay
from src.models.tracks.track import Track
from src.models.users.user import User
from src.utils.config import shared_config
from src.utils.db_session import get_db
from src.utils.redis_connection import get_redis

logger = logging.getLogger(__name__)

REDIS_URL = shared_config["redis"]["url"]
BLOCK_NUMBER = 10
CURRENT_YEAR = 2025  # The starting year from which plays are counted onwards

# Challenge IDs for play count milestones
CHALLENGE_IDS = ["p1", "p2", "p3"]  # Challenge IDs
REWARD_VALUES = [25, 100, 1000]  # Corresponding reward amounts


def create_track(user_id: int, track_id: int) -> Track:
    """Create a track with the specified parameters"""
    return Track(
        blockhash="0x1",
        blocknumber=BLOCK_NUMBER,
        txhash="0x1",
        track_id=track_id,
        owner_id=user_id,
        is_current=True,
        is_delete=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )


def setup_challenges(session):
    """Set up the database with the necessary data for testing"""
    # Create a block
    block = Block(blockhash="0x1", number=BLOCK_NUMBER)
    session.add(block)
    session.flush()

    # Create users
    user1 = User(
        blockhash="0x1",
        blocknumber=BLOCK_NUMBER,
        txhash="0x1",
        user_id=1,
        is_current=True,
        handle="user1",
        handle_lc="user1",
        wallet="0x1",
        is_verified=True,
        name="User 1",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    user2 = User(
        blockhash="0x1",
        blocknumber=BLOCK_NUMBER,
        txhash="0x1",
        user_id=2,
        is_current=True,
        handle="user2",
        handle_lc="user2",
        wallet="0x2",
        is_verified=True,
        name="User 2",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    session.add(user1)
    session.add(user2)
    session.flush()

    # Create tracks
    track1 = create_track(user_id=1, track_id=1)
    track2 = create_track(user_id=2, track_id=2)
    session.add(track1)
    session.add(track2)
    session.flush()

    # Set all challenge milestones as active for testing
    for challenge_id in CHALLENGE_IDS:
        session.query(Challenge).filter(Challenge.id == challenge_id).update(
            {"active": True, "starting_block": BLOCK_NUMBER}
        )
    session.flush()

    # Get milestone values from the database
    milestone_challenges = (
        session.query(Challenge).filter(Challenge.id.in_(CHALLENGE_IDS)).all()
    )
    milestone_map = {
        challenge.id: challenge.step_count for challenge in milestone_challenges
    }

    global MILESTONE_VALUES
    MILESTONE_VALUES = [milestone_map["p1"], milestone_map["p2"], milestone_map["p3"]]


def make_scope_and_process(bus, session):
    """Create a function that processes events in a scoped queue"""

    def inner(fn):
        fn()
        bus.flush()
        bus.process_events(session)

    return inner


def test_play_count_milestones_challenge(app):
    """Test the play count milestones challenges"""
    redis_conn = get_redis()
    bus = ChallengeEventBus(redis_conn)

    # Register all milestone challenge managers with the bus
    bus.register_listener(
        ChallengeEvent.track_played, play_count_250_milestone_challenge_manager
    )
    bus.register_listener(
        ChallengeEvent.track_played, play_count_1000_milestone_challenge_manager
    )
    bus.register_listener(
        ChallengeEvent.track_played, play_count_10000_milestone_challenge_manager
    )

    with app.app_context():
        db = get_db()

    with db.scoped_session() as session:
        setup_challenges(session)
        scope_and_process = make_scope_and_process(bus, session)

        # Test each milestone sequentially
        for i, milestone in enumerate(MILESTONE_VALUES):
            challenge_id = CHALLENGE_IDS[i]
            reward_amount = REWARD_VALUES[i]
            challenge_manager = [
                play_count_250_milestone_challenge_manager,
                play_count_1000_milestone_challenge_manager,
                play_count_10000_milestone_challenge_manager,
            ][i]

            # For the first milestone, start from scratch
            # For subsequent milestones, we add plays on top of previous milestones
            if i == 0:
                plays_to_add = milestone
            else:
                # Calculate additional plays needed to reach the current milestone
                previous_milestone = MILESTONE_VALUES[i - 1]
                plays_to_add = milestone - previous_milestone

            # Create an aggregate monthly play for each month to simulate a distributed play count
            # We'll create 5 months with even distribution to reach the target milestone
            months_to_use = 5
            plays_per_month = plays_to_add // months_to_use
            remainder = plays_to_add % months_to_use

            aggregate_plays = []
            for month in range(months_to_use):
                play_date = datetime(
                    CURRENT_YEAR, 1 + month, 1
                ).date()  # First day of each month

                # Add extra plays to the first month if there's a remainder
                count = plays_per_month
                if month == 0:
                    count += remainder

                # Check if an aggregate play for this month already exists
                existing_play = (
                    session.query(AggregateMonthlyPlay)
                    .filter(
                        AggregateMonthlyPlay.play_item_id == 1,
                        AggregateMonthlyPlay.timestamp == play_date,
                        AggregateMonthlyPlay.country == "",
                    )
                    .first()
                )

                if existing_play:
                    # Update existing record
                    existing_play.count += count
                else:
                    # Create new record
                    aggregate_plays.append(
                        AggregateMonthlyPlay(
                            play_item_id=1, timestamp=play_date, country="", count=count
                        )
                    )

            if aggregate_plays:
                session.add_all(aggregate_plays)
            session.flush()

            # Dispatch track_played event
            scope_and_process(
                lambda: bus.dispatch(
                    ChallengeEvent.track_played,
                    BLOCK_NUMBER,
                    datetime.now(),
                    1,  # user_id
                    {},
                )
            )

            # Check that the challenge is created and completed
            challenges = challenge_manager.get_user_challenge_state(session)

            # Find challenges for user 1
            user_challenges = [c for c in challenges if c.user_id == 1]

            assert (
                len(user_challenges) >= 1
            ), f"Expected at least one challenge for user 1 at milestone {milestone}"

            # Find the specific challenge for this milestone
            milestone_challenges = [
                c for c in user_challenges if c.challenge_id == challenge_id
            ]
            assert (
                len(milestone_challenges) == 1
            ), f"Expected one challenge with ID {challenge_id}"

            challenge = milestone_challenges[0]
            assert (
                challenge.is_complete == True
            ), f"Challenge {challenge_id} should be complete"
            assert (
                challenge.amount == reward_amount
            ), f"Challenge {challenge_id} should have reward {reward_amount}"
            assert (
                challenge.current_step_count >= milestone
            ), f"Challenge step count should be at least {milestone}"


def test_challenge_dependencies(app):
    """Test that challenges respect their dependencies (previous milestone must be completed)"""
    redis_conn = get_redis()
    bus = ChallengeEventBus(redis_conn)

    # Register all milestone challenge managers with the bus
    bus.register_listener(
        ChallengeEvent.track_played, play_count_250_milestone_challenge_manager
    )
    bus.register_listener(
        ChallengeEvent.track_played, play_count_1000_milestone_challenge_manager
    )
    bus.register_listener(
        ChallengeEvent.track_played, play_count_10000_milestone_challenge_manager
    )

    with app.app_context():
        db = get_db()

    with db.scoped_session() as session:
        setup_challenges(session)
        scope_and_process = make_scope_and_process(bus, session)

        # Add enough plays to reach the highest milestone immediately
        highest_milestone = max(MILESTONE_VALUES)

        # Create aggregate monthly plays distributed over 12 months
        months_to_use = 12
        plays_per_month = highest_milestone // months_to_use
        remainder = highest_milestone % months_to_use

        aggregate_plays = []
        for month in range(months_to_use):
            play_date = datetime(
                CURRENT_YEAR, 1 + month % 12, 1
            ).date()  # First day of each month

            # Add extra plays to the first month if there's a remainder
            count = plays_per_month
            if month == 0:
                count += remainder + 10  # Add some extra plays

            aggregate_plays.append(
                AggregateMonthlyPlay(
                    play_item_id=1, timestamp=play_date, country="", count=count
                )
            )

        session.add_all(aggregate_plays)
        session.flush()

        # Dispatch track_played event
        scope_and_process(
            lambda: bus.dispatch(
                ChallengeEvent.track_played,
                BLOCK_NUMBER,
                datetime.now(),
                1,  # user_id
                {},
            )
        )

        # Check that all challenges for all milestones are created and completed in sequence
        for i, challenge_id in enumerate(CHALLENGE_IDS):
            challenge_manager = [
                play_count_250_milestone_challenge_manager,
                play_count_1000_milestone_challenge_manager,
                play_count_10000_milestone_challenge_manager,
            ][i]

            challenges = challenge_manager.get_user_challenge_state(session)
            user_challenges = [c for c in challenges if c.user_id == 1]

            # There should be exactly one challenge for this milestone
            milestone_challenges = [
                c for c in user_challenges if c.challenge_id == challenge_id
            ]
            assert (
                len(milestone_challenges) == 1
            ), f"Expected one challenge with ID {challenge_id}"

            challenge = milestone_challenges[0]
            assert (
                challenge.is_complete == True
            ), f"Challenge {challenge_id} should be complete"
            assert (
                challenge.amount == REWARD_VALUES[i]
            ), f"Challenge {challenge_id} should have correct reward"

            # The challenge step count should match the user's total play count
            assert (
                challenge.current_step_count >= MILESTONE_VALUES[i]
            ), f"Challenge step count should be at least {MILESTONE_VALUES[i]}"
