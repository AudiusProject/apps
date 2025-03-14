import logging
from datetime import datetime, timedelta

from sqlalchemy.orm.session import Session

from src.challenges.challenge_event_bus import ChallengeEvent, ChallengeEventBus
from src.challenges.listen_streak_endless_challenge import (
    listen_streak_endless_challenge_manager,
)
from src.models.indexing.block import Block
from src.models.rewards.challenge import Challenge
from src.models.social.play import Play
from src.models.users.user import User
from src.utils.config import shared_config
from src.utils.db_session import get_db
from src.utils.redis_connection import get_redis

logger = logging.getLogger(__name__)

REDIS_URL = shared_config["redis"]["url"]
BLOCK_NUMBER = 10


def create_play_day_offset(day_offset: int, hour_offset: int = 0) -> Play:
    delta = timedelta(hours=hour_offset) + timedelta(days=day_offset)

    return Play(
        id=day_offset * 24 + hour_offset,
        user_id=1,
        source=None,
        play_item_id=1,
        slot=1,
        signature=None,
        updated_at=datetime.now() + delta,
        created_at=datetime.now() + delta,
    )


def dispatch_play(
    day_offset: int,
    session: Session,
    bus: ChallengeEventBus,
    hour_offset: int = 0,
):
    play = create_play_day_offset(day_offset, hour_offset)
    session.add(play)
    session.flush()
    bus.dispatch(
        ChallengeEvent.track_listen,
        BLOCK_NUMBER,
        datetime.now(),
        1,
        {"created_at": play.created_at.timestamp()},
    )


def setup_challenges(session):
    block = Block(blockhash="0x1", number=BLOCK_NUMBER)
    user = User(
        blockhash="0x1",
        blocknumber=BLOCK_NUMBER,
        txhash="xyz",
        user_id=1,
        is_current=True,
        handle="TestHandle",
        handle_lc="testhandle",
        wallet="0x1",
        is_verified=False,
        name="test_name",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    session.add(block)
    session.flush()
    session.add(user)
    session.flush()
    session.query(Challenge).filter(Challenge.id == "e").update(
        {"active": True, "starting_block": BLOCK_NUMBER}
    )


# Wrapper function to call use_scoped_dispatch_queue,
# and then process when it goes out of scope
def make_scope_and_process(bus, session):
    def inner(fn):
        with bus.use_scoped_dispatch_queue():
            fn()
        bus.process_events(session)

    return inner


def test_listen_streak_challenge(app):
    redis_conn = get_redis()
    bus = ChallengeEventBus(redis_conn)
    # Register events with the bus
    bus.register_listener(
        ChallengeEvent.track_listen, listen_streak_endless_challenge_manager
    )

    with app.app_context():
        db = get_db()

    with db.scoped_session() as session:
        setup_challenges(session)

        # wrapped dispatch play
        def dp(offset):
            return dispatch_play(offset, session, bus)

        scope_and_process = make_scope_and_process(bus, session)

        # Make sure plays increment the step count
        scope_and_process(lambda: dp(0))

        state = listen_streak_endless_challenge_manager.get_user_challenge_state(
            session
        )[0]
        assert state.current_step_count == 1 and not state.is_complete

        scope_and_process(lambda: dp(1))
        state = listen_streak_endless_challenge_manager.get_user_challenge_state(
            session
        )[0]
        assert state.current_step_count == 2 and not state.is_complete

        # Make sure the step count resets if the user missed a day
        scope_and_process(lambda: dp(3))
        state = listen_streak_endless_challenge_manager.get_user_challenge_state(
            session
        )
        assert len(state) == 2
        assert state[0].current_step_count == 2 and state[0].is_complete == False
        assert state[1].current_step_count == 1 and state[1].is_complete == False

        # Add more plays to increment the step count
        scope_and_process(lambda: dp(4))
        scope_and_process(lambda: dp(5))
        scope_and_process(lambda: dp(6))
        scope_and_process(lambda: dp(7))
        scope_and_process(lambda: dp(8))
        state = listen_streak_endless_challenge_manager.get_user_challenge_state(
            session
        )
        assert len(state) == 2
        assert state[0].current_step_count == 2 and state[0].is_complete == False
        assert state[1].current_step_count == 6 and state[1].is_complete == False

        # Make sure that is_complete is set when step count hits 7
        scope_and_process(lambda: dp(9))
        state = listen_streak_endless_challenge_manager.get_user_challenge_state(
            session
        )
        assert len(state) == 2
        assert state[0].current_step_count == 2 and state[0].is_complete == False
        assert state[1].current_step_count == 7 and state[1].is_complete == True


def test_multiple_listens(app):
    redis_conn = get_redis()
    bus = ChallengeEventBus(redis_conn)
    # Register events with the bus
    bus.register_listener(
        ChallengeEvent.track_listen, listen_streak_endless_challenge_manager
    )

    with app.app_context():
        db = get_db()

    with db.scoped_session() as session:
        setup_challenges(session)
        state = listen_streak_endless_challenge_manager.get_user_challenge_state(
            session
        )
        # make sure empty to start
        assert len(state) == 0

        def dp(offset):
            return dispatch_play(offset, session, bus)

        scope_and_process = make_scope_and_process(bus, session)
        scope_and_process(lambda: dp(1))
        state = listen_streak_endless_challenge_manager.get_user_challenge_state(
            session
        )
        assert len(state) == 1
        assert state[0].current_step_count == 1
        scope_and_process(lambda: (dp(2), dp(3), dp(4), dp(5)))
        state = listen_streak_endless_challenge_manager.get_user_challenge_state(
            session
        )
        # This will actually "reset" the listen count, because
        # we dedupe multiple play events in a single call to process
        # and in this case, we pick the one with the greatest timestamp
        # which is > 2 days, thus resetting.
        # Not the greatest behavior, but shouldn't have user facing
        # impact.

        # we really want to just ensure that this doesn't crash
        assert len(state) == 2
        assert state[0].current_step_count == 2
        assert state[1].current_step_count == 2


def test_listen_streak_endless_challenge(app):
    redis_conn = get_redis()
    bus = ChallengeEventBus(redis_conn)
    # Register events with the bus
    bus.register_listener(
        ChallengeEvent.track_listen, listen_streak_endless_challenge_manager
    )

    with app.app_context():
        db = get_db()

    with db.scoped_session() as session:
        setup_challenges(session)

        # wrapped dispatch play
        def dp(offset):
            return dispatch_play(offset, session, bus)

        scope_and_process = make_scope_and_process(bus, session)

        # Make sure plays increment the step count
        scope_and_process(lambda: dp(0))

        state = listen_streak_endless_challenge_manager.get_user_challenge_state(
            session
        )[0]
        assert state.current_step_count == 1 and not state.is_complete

        # Add more plays to increment the step count
        scope_and_process(lambda: dp(1))
        scope_and_process(lambda: dp(2))
        scope_and_process(lambda: dp(3))
        scope_and_process(lambda: dp(4))
        scope_and_process(lambda: dp(5))
        scope_and_process(lambda: dp(6))
        state = listen_streak_endless_challenge_manager.get_user_challenge_state(
            session
        )
        assert len(state) == 1
        assert state[0].current_step_count == 7 and state[0].is_complete == True

        scope_and_process(lambda: dp(7))
        state = listen_streak_endless_challenge_manager.get_user_challenge_state(
            session
        )
        assert len(state) == 2
        assert state[0].is_complete == True
        assert state[1].is_complete == True

        scope_and_process(lambda: dp(8))
        state = listen_streak_endless_challenge_manager.get_user_challenge_state(
            session
        )
        assert len(state) == 3
        assert state[0].is_complete == True
        assert state[1].is_complete == True
        assert state[2].is_complete == True


def test_multiple_listen_streak_challenges(app):
    redis_conn = get_redis()
    bus = ChallengeEventBus(redis_conn)
    # Register events with the bus
    bus.register_listener(
        ChallengeEvent.track_listen, listen_streak_endless_challenge_manager
    )

    with app.app_context():
        db = get_db()

    with db.scoped_session() as session:
        setup_challenges(session)

        # wrapped dispatch play
        def dp(offset):
            return dispatch_play(offset, session, bus)

        scope_and_process = make_scope_and_process(bus, session)

        # Make sure plays increment the step count
        scope_and_process(lambda: dp(0))

        state = listen_streak_endless_challenge_manager.get_user_challenge_state(
            session
        )[0]
        assert state.current_step_count == 1 and not state.is_complete

        # Add more plays to increment the step count
        scope_and_process(lambda: dp(1))
        scope_and_process(lambda: dp(2))

        state = listen_streak_endless_challenge_manager.get_user_challenge_state(
            session
        )
        assert len(state) == 1
        assert state[0].current_step_count == 3 and not state[0].is_complete

        # break the streak
        scope_and_process(lambda: dp(5))
        state = listen_streak_endless_challenge_manager.get_user_challenge_state(
            session
        )
        assert len(state) == 2
        assert state[0].current_step_count == 3 and not state[0].is_complete
        assert state[1].current_step_count == 1 and not state[1].is_complete

        # complete the new streak
        scope_and_process(lambda: dp(6))
        scope_and_process(lambda: dp(7))
        scope_and_process(lambda: dp(8))
        scope_and_process(lambda: dp(9))
        scope_and_process(lambda: dp(10))
        scope_and_process(lambda: dp(11))
        state = listen_streak_endless_challenge_manager.get_user_challenge_state(
            session
        )
        assert len(state) == 2
        assert state[0].current_step_count == 3 and not state[0].is_complete
        assert state[1].current_step_count == 7 and state[1].is_complete == True

        # keep it going
        scope_and_process(lambda: dp(12))
        state = listen_streak_endless_challenge_manager.get_user_challenge_state(
            session
        )
        assert len(state) == 3
        assert state[0].current_step_count == 3 and state[0].is_complete == False
        assert state[1].current_step_count == 7 and state[1].is_complete == True
        assert state[2].current_step_count == 1 and state[2].is_complete == True

        # break it again
        scope_and_process(lambda: dp(15))
        scope_and_process(lambda: dp(16))
        state = listen_streak_endless_challenge_manager.get_user_challenge_state(
            session
        )
        assert len(state) == 4
        assert state[0].current_step_count == 3 and state[0].is_complete == False
        assert state[1].current_step_count == 7 and state[1].is_complete == True
        assert state[2].current_step_count == 1 and state[2].is_complete == True
        assert state[3].current_step_count == 2 and state[3].is_complete == False


def test_multiple_listens_in_one_day(app):
    redis_conn = get_redis()
    bus = ChallengeEventBus(redis_conn)
    # Register events with the bus
    bus.register_listener(
        ChallengeEvent.track_listen, listen_streak_endless_challenge_manager
    )

    with app.app_context():
        db = get_db()

    with db.scoped_session() as session:
        setup_challenges(session)

        def dp_day(offset):
            return dispatch_play(offset, session, bus)

        def dp_hour(offset, hour_offset):
            return dispatch_play(offset, session, bus, hour_offset=hour_offset)

        scope_and_process = make_scope_and_process(bus, session)

        # Get to 6 plays over 6 days
        scope_and_process(lambda: dp_day(0))
        scope_and_process(lambda: dp_day(1))
        scope_and_process(lambda: dp_day(2))
        scope_and_process(lambda: dp_day(3))
        scope_and_process(lambda: dp_day(4))
        scope_and_process(lambda: dp_day(5))

        # On the 7th day, dispatch 2 plays in the same day
        scope_and_process(lambda: dp_day(6))
        scope_and_process(lambda: dp_hour(6, 1))
        scope_and_process(lambda: dp_hour(6, 2))

        state = listen_streak_endless_challenge_manager.get_user_challenge_state(
            session
        )
        assert len(state) == 1
        assert state[0].current_step_count == 7 and state[0].is_complete == True


def test_anon_listen(app):
    redis_conn = get_redis()
    bus = ChallengeEventBus(redis_conn)
    # Register events with the bus
    bus.register_listener(
        ChallengeEvent.track_listen, listen_streak_endless_challenge_manager
    )

    with app.app_context():
        db = get_db()

    with db.scoped_session() as session:
        setup_challenges(session)
        with bus.use_scoped_dispatch_queue():
            bus.dispatch(
                ChallengeEvent.track_listen,
                BLOCK_NUMBER,
                None,
                {"created_at": datetime.now()},
            )
        (num_processed, error) = bus.process_events(session)
        assert not error
        assert num_processed == 0
