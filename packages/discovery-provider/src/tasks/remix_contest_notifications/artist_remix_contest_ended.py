from datetime import datetime, timedelta

from src.models.events.event import Event, EventType
from src.models.notifications.notification import Notification
from src.models.tracks.track import Track
from src.utils.structured_logger import StructuredLogger

ARTIST_REMIX_CONTEST_ENDED = "artist_remix_contest_ended"
REMIX_CONTEST_ENDED_WINDOW_HOURS = 24

logger = StructuredLogger(__name__)


def get_artist_remix_contest_ended_group_id(event_id):
    return f"{ARTIST_REMIX_CONTEST_ENDED}:{event_id}"


def create_artist_remix_contest_ended_notifications(session, now=None):
    now = now or datetime.now()
    window_start = now - timedelta(hours=REMIX_CONTEST_ENDED_WINDOW_HOURS)
    window_end = now

    ended_contests = (
        session.query(Event)
        .filter(
            Event.event_type == EventType.remix_contest,
            Event.is_deleted == False,
            Event.end_date != None,
            Event.end_date.between(window_start, window_end),
        )
        .all()
    )

    new_notifications = []
    for event in ended_contests:
        group_id = get_artist_remix_contest_ended_group_id(event.event_id)
        parent_track = (
            session.query(Track)
            .filter(
                Track.track_id == event.entity_id,
                Track.is_current == True,
                Track.is_delete == False,
            )
            .first()
        )
        # Skip when the parent track has been deleted or hidden — without
        # this guard, a single dangling event would raise AttributeError
        # ("None has no .is_unlisted") and abort the entire batch, dropping
        # notifications for every other contest in the same window.
        if parent_track is None or parent_track.is_unlisted:
            continue

        exists = (
            session.query(Notification)
            .filter(
                Notification.group_id == group_id,
                Notification.type == ARTIST_REMIX_CONTEST_ENDED,
                Notification.user_ids.any(event.user_id),
            )
            .first()
        )
        if not exists:
            new_notification = Notification(
                specifier=str(event.user_id),
                group_id=group_id,
                blocknumber=None,
                user_ids=[event.user_id],
                type=ARTIST_REMIX_CONTEST_ENDED,
                data={
                    "entity_id": event.entity_id,
                },
                timestamp=now,
            )
            new_notifications.append(new_notification)
    logger.info(
        f"Inserting {len(new_notifications)} artist remix contest ended notifications"
    )
    session.add_all(new_notifications)
    session.commit()
