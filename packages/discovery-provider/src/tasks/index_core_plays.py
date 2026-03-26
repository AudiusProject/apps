import time
from datetime import datetime
from logging import LoggerAdapter
from typing import List, Optional, TypedDict

from sqlalchemy.orm.session import Session

from src.challenges.challenge_event import ChallengeEvent
from src.challenges.challenge_event_bus import ChallengeEventBus
from src.models.social.play import Play
from src.models.tracks.track import Track
from src.tasks.core.gen.protocol_pb2 import BlockResponse, SignedTransaction


class PlayInfo(TypedDict):
    user_id: int | None
    play_item_id: int
    created_at: datetime
    updated_at: datetime
    source: str
    city: str
    region: str
    country: str
    slot: int
    signature: str


class PlayChallengeInfo(TypedDict):
    slot: int
    user_id: int
    created_at: datetime
    track_id: int
    listener_id: Optional[int]


def index_core_plays(
    logger: LoggerAdapter,
    session: Session,
    challenge_bus: ChallengeEventBus,
    latest_indexed_slot: int,
    block: BlockResponse,
) -> Optional[int]:
    indexed_slot: Optional[int] = None
    for tx in block.transaction_responses:
        tx_type = tx.transaction.WhichOneof("transaction")
        if tx_type != "plays":
            continue

        indexed_slot = index_core_play(
            logger=logger,
            session=session,
            challenge_bus=challenge_bus,
            latest_indexed_slot=latest_indexed_slot,
            tx=tx.transaction,
        )
    return indexed_slot


def index_core_play(
    logger: LoggerAdapter,
    session: Session,
    challenge_bus: ChallengeEventBus,
    latest_indexed_slot: int,
    tx: SignedTransaction,
) -> Optional[int]:
    next_slot = latest_indexed_slot + 1

    plays: List[PlayInfo] = []
    challenge_bus_events: List[PlayChallengeInfo] = []

    tx_plays = tx.plays

    for tx_play in tx_plays.plays:
        user_id = None
        try:
            user_id = int(tx_play.user_id)
        except ValueError:
            log = ("Recording anonymous listen {!r}".format(tx_play.user_id),)
            logger.debug(
                log,
                exc_info=False,
            )

        signature = tx_play.signature
        timestamp = tx_play.timestamp.ToDatetime()
        try:
            track_id = int(tx_play.track_id)
        except:
            continue
        user_id = user_id
        slot = next_slot
        city = tx_play.city
        region = tx_play.region
        country = tx_play.country

        plays.append(
            {
                "user_id": user_id,
                "play_item_id": track_id,
                "updated_at": datetime.now(),
                "slot": slot,
                "signature": signature,
                "created_at": timestamp,
                "source": "relay",
                "city": city,
                "region": region,
                "country": country,
            }
        )

        # Only enqueue a challenge event if it's *not*
        # an anonymous listen
        if user_id is not None:
            challenge_bus_events.append(
                {
                    "slot": slot,
                    "user_id": user_id,
                    "created_at": timestamp,
                    "track_id": track_id,
                    "listener_id": user_id,
                }
            )

    if not plays:
        return None

    with challenge_bus.use_scoped_dispatch_queue():
        session.execute(Play.__table__.insert().values(plays))
        logger.debug("index_core_plays.py | Dispatching listen events")
        listen_dispatch_start = time.time()

        # Process all events - both listener and track owner events
        for event in challenge_bus_events:
            created_at = event.get("created_at")
            if not created_at:
                logger.error(
                    f"index_core_plays.py | Skipping event due to created_at for event: {event}"
                )
                continue

            # Dispatch track_listen events (for the listener)
            challenge_bus.dispatch(
                ChallengeEvent.track_listen,
                event["slot"],
                created_at,
                event["user_id"],
                {"created_at": created_at.timestamp()},
            )

            # Get the track owner ID for the track_played event
            track = (
                session.query(Track)
                .filter(
                    Track.track_id == event["track_id"],
                    Track.is_current == True,
                    Track.is_delete == False,
                )
                .first()
            )

            # Dispatch track_played events (for the track owner)
            if track:
                challenge_bus.dispatch(
                    ChallengeEvent.track_played,
                    event["slot"],
                    created_at,
                    track.owner_id,  # This is the track owner's ID
                    {
                        "created_at": created_at.timestamp(),
                        "listener_id": event["listener_id"],
                    },
                )

        listen_dispatch_end = time.time()
        listen_dispatch_diff = listen_dispatch_end - listen_dispatch_start
        logger.debug(f"dispatched listen events in {listen_dispatch_diff}")

    return next_slot
