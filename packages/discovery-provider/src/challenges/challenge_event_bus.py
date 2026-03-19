import json
from collections import defaultdict
from contextlib import contextmanager
from datetime import datetime
from typing import Any, DefaultDict, Dict, List, Optional, Tuple, TypedDict

from sqlalchemy.orm.session import Session

from src.challenges.audio_matching_challenge import (
    audio_matching_buyer_challenge_manager,
    audio_matching_seller_challenge_manager,
)
from src.challenges.challenge import ChallengeManager, EventMetadata
from src.challenges.challenge_event import ChallengeEvent
from src.challenges.connect_verified_challenge import connect_verified_challenge_manager
from src.challenges.cosign_challenge import cosign_challenge_manager
from src.challenges.first_playlist_challenge import first_playlist_challenge_manager
from src.challenges.first_weekly_comment_challenge import (
    first_weekly_comment_challenge_manager,
)
from src.challenges.listen_streak_endless_challenge import (
    listen_streak_endless_challenge_manager,
)
from src.challenges.mobile_install_challenge import mobile_install_challenge_manager
from src.challenges.one_shot_challenge import one_shot_challenge_manager
from src.challenges.pinned_comment_challenge import pinned_comment_challenge_manager
from src.challenges.play_count_milestone_250_challenge import (
    play_count_250_milestone_challenge_manager,
)
from src.challenges.play_count_milestone_1000_challenge import (
    play_count_1000_milestone_challenge_manager,
)
from src.challenges.play_count_milestone_10000_challenge import (
    play_count_10000_milestone_challenge_manager,
)
from src.challenges.profile_challenge import profile_challenge_manager
from src.challenges.referral_challenge import (
    referral_challenge_manager,
    referred_challenge_manager,
    verified_referral_challenge_manager,
)
from src.challenges.remix_contest_winner_challenge import (
    remix_contest_winner_challenge_manager,
)
from src.challenges.send_first_tip_challenge import send_first_tip_challenge_manager
from src.challenges.tastemaker_challenge import tastemaker_challenge_manager
from src.challenges.track_upload_challenge import track_upload_challenge_manager
from src.challenges.trending_challenge import (
    trending_track_challenge_manager,
    trending_underground_track_challenge_manager,
)
from src.utils.redis_connection import get_redis
from src.utils.structured_logger import StructuredLogger

logger = StructuredLogger(__name__)
REDIS_QUEUE_PREFIX = "challenges-event-queue"


class InternalEvent(TypedDict):
    event: ChallengeEvent
    block_number: int
    block_datetime: datetime
    user_id: int
    extra: Dict


class ChallengeEventBus:
    """`ChallengeEventBus` supports:
    - dispatching challenge events to a Redis queue
    - registering challenge managers to listen to the events.
    - consuming items from the Redis queue
    - fetching the manager for a given challenge
    """

    _listeners: DefaultDict[ChallengeEvent, List[ChallengeManager]]
    _redis: Any
    _managers: Dict[str, ChallengeManager]
    _in_memory_queue: List[InternalEvent]

    def __init__(self, redis):
        self._listeners = defaultdict(lambda: [])
        self._redis = redis
        self._managers = {}
        self._in_memory_queue: List[Dict] = []

    def register_listener(self, event: ChallengeEvent, listener: ChallengeManager):
        """Registers a listener (`ChallengeManager`) to listen for a particular event type."""
        self._listeners[event].append(listener)
        if listener.challenge_id not in self._managers:
            self._managers[listener.challenge_id] = listener

    def get_manager(self, challenge_id: str) -> ChallengeManager:
        """Gets a manager for a given challenge_id"""
        return self._managers[challenge_id]

    def does_manager_exist(self, challenge_id: str) -> bool:
        """Returns whether or not a manager exists for a given challenge_id"""
        return challenge_id in self._managers

    @contextmanager
    def use_scoped_dispatch_queue(self):
        """Makes the bus only dispatch the events once out of the new scope created with 'with'"""
        if len(self._in_memory_queue) > 0:
            logger.warning("ChallengeEventBus: Already using in-memory queue")
        try:
            yield self._in_memory_queue
        finally:
            self.flush()

    def dispatch(
        self,
        event: ChallengeEvent,
        block_number: int,
        block_datetime: datetime,
        user_id: int,
        extra: Optional[Dict] = None,
    ):
        """Dispatches an event + block_number + user_id to an in memory queue.

        Does not dispatch to Redis until flush is called or a scoped dispatch queue goes out of scope
        """
        if extra is None:
            extra = {}
        # Sanitize input, drop the event if it's malformed
        valid_event = event is not None and isinstance(event, str)
        valid_block = block_number is not None and isinstance(block_number, int)
        valid_block_datetime = block_datetime is not None and isinstance(
            block_datetime, datetime
        )
        valid_user = user_id is not None and isinstance(user_id, int)
        valid_extra = extra is not None and isinstance(extra, dict)
        if not (
            valid_event
            and valid_block
            and valid_block_datetime
            and valid_user
            and valid_extra
        ):
            logger.warning(
                f"ChallengeEventBus: ignoring invalid event: {(event, block_number, block_datetime, user_id, extra)}"
            )
            return

        self._in_memory_queue.append(
            {
                "event": event,
                "block_number": block_number,
                "block_datetime": block_datetime,
                "user_id": user_id,
                "extra": extra,
            }
        )

    def flush(self):
        """Flushes the in-memory queue of events and enqueues them to Redis"""
        if len(self._in_memory_queue) != 0:
            logger.debug(
                f"ChallengeEventBus: Flushing {len(self._in_memory_queue)} events from in-memory queue"
            )
        for event in self._in_memory_queue:
            try:
                event_json = self._event_to_json(
                    event["event"],
                    event["block_number"],
                    event["block_datetime"],
                    event["user_id"],
                    event.get("extra", {}),
                )
                logger.debug(f"ChallengeEventBus: dispatch {event_json}")
                self._redis.rpush(REDIS_QUEUE_PREFIX, event_json)
            except Exception as e:
                logger.warning(f"ChallengeEventBus: error enqueuing to Redis: {e}")
        self._in_memory_queue.clear()

    def process_events(self, session: Session, max_events=1) -> Tuple[int, bool]:
        """Dequeues `max_events` from Redis queue and processes them, forwarding to listening ChallengeManagers.
        Returns (num_processed_events, did_error).
        Will return -1 as num_processed_events if an error prevented any events from
        being processed (i.e. some error deserializing from Redis)
        """
        try:
            # get the first max_events elements.
            events_json = self._redis.lrange(REDIS_QUEUE_PREFIX, 0, max_events)
            # logger.debug(f"ChallengeEventBus: dequeued {len(events_json)} events")
            # trim the first from the front of the list
            self._redis.ltrim(REDIS_QUEUE_PREFIX, len(events_json), -1)
            events_dicts = list(map(self._json_to_event, events_json))
            # Consolidate event types for processing
            # map of {"event_type": [{ user_id: number, block_number: number, extra: {} }]}}
            event_user_dict: DefaultDict[
                ChallengeEvent, List[EventMetadata]
            ] = defaultdict(list)
            for event_dict in events_dicts:
                event_type = event_dict["event"]
                event_user_dict[event_type].append(
                    {
                        "user_id": event_dict["user_id"],
                        "block_number": event_dict["block_number"],
                        "block_datetime": event_dict["block_datetime"],
                        "extra": event_dict.get(  # use .get to be safe since prior versions didn't have `extra`
                            "extra", {}
                        ),
                    }
                )
        except Exception as e:
            logger.warning(f"ChallengeEventBus: error processing from Redis: {e}")
            return (-1, True)

        did_error = False
        for event_type, event_dicts in event_user_dict.items():
            listeners = self._listeners[event_type]
            for listener in listeners:
                try:
                    listener.process(session, event_type, event_dicts)
                except Exception as e:
                    # We really shouldn't see errors from a ChallengeManager (they should handle on their own),
                    # but in case we do, swallow it and continue on
                    logger.warning(
                        f"ChallengeEventBus: manager [{listener.challenge_id} unexpectedly propogated error: [{e}]"
                    )
                    did_error = True

        return (len(events_json), did_error)

    # Helpers

    def _event_to_json(
        self,
        event: str,
        block_number: int,
        block_datetime: datetime,
        user_id: int,
        extra: Dict,
    ):
        event_dict = {
            "event": event,
            "user_id": user_id,
            "block_number": block_number,
            "block_datetime": block_datetime.timestamp(),
            "extra": extra,
        }
        return json.dumps(event_dict)

    def _json_to_event(self, event_json) -> InternalEvent:
        event = json.loads(event_json)
        event["block_datetime"] = datetime.fromtimestamp(event["block_datetime"])
        return event


def setup_challenge_bus():
    redis = get_redis()
    bus = ChallengeEventBus(redis)

    # register listeners

    # profile_challenge_mananger listeners
    bus.register_listener(ChallengeEvent.profile_update, profile_challenge_manager)
    bus.register_listener(ChallengeEvent.repost, profile_challenge_manager)
    bus.register_listener(ChallengeEvent.follow, profile_challenge_manager)
    bus.register_listener(ChallengeEvent.favorite, profile_challenge_manager)
    # listen_streak_endless_challenge_manager listeners
    bus.register_listener(
        ChallengeEvent.track_listen, listen_streak_endless_challenge_manager
    )
    # Play count milestones challenge manager listeners
    bus.register_listener(
        ChallengeEvent.track_played, play_count_250_milestone_challenge_manager
    )
    bus.register_listener(
        ChallengeEvent.track_played, play_count_1000_milestone_challenge_manager
    )
    bus.register_listener(
        ChallengeEvent.track_played, play_count_10000_milestone_challenge_manager
    )
    # track_upload_challenge_manager listeners
    bus.register_listener(ChallengeEvent.track_upload, track_upload_challenge_manager)
    # referral challenge managers
    bus.register_listener(ChallengeEvent.referral_signup, referral_challenge_manager)
    bus.register_listener(
        ChallengeEvent.referral_signup, verified_referral_challenge_manager
    )
    bus.register_listener(ChallengeEvent.referred_signup, referred_challenge_manager)
    # connect_verified_challenge_manager listeners
    bus.register_listener(
        ChallengeEvent.connect_verified, connect_verified_challenge_manager
    )
    bus.register_listener(
        ChallengeEvent.mobile_install, mobile_install_challenge_manager
    )
    bus.register_listener(
        ChallengeEvent.trending_track, trending_track_challenge_manager
    )
    bus.register_listener(
        ChallengeEvent.trending_underground,
        trending_underground_track_challenge_manager,
    )
    bus.register_listener(ChallengeEvent.send_tip, send_first_tip_challenge_manager)
    bus.register_listener(
        ChallengeEvent.first_playlist, first_playlist_challenge_manager
    )
    bus.register_listener(
        ChallengeEvent.audio_matching_buyer, audio_matching_buyer_challenge_manager
    )
    bus.register_listener(
        ChallengeEvent.audio_matching_seller, audio_matching_seller_challenge_manager
    )
    bus.register_listener(ChallengeEvent.one_shot, one_shot_challenge_manager)
    bus.register_listener(
        ChallengeEvent.first_weekly_comment, first_weekly_comment_challenge_manager
    )
    bus.register_listener(ChallengeEvent.tastemaker, tastemaker_challenge_manager)
    bus.register_listener(
        ChallengeEvent.pinned_comment, pinned_comment_challenge_manager
    )
    bus.register_listener(ChallengeEvent.cosign, cosign_challenge_manager)
    bus.register_listener(
        ChallengeEvent.remix_contest_winner, remix_contest_winner_challenge_manager
    )

    return bus
