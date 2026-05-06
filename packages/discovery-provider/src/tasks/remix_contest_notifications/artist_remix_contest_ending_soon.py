from datetime import datetime, timedelta

from src.models.events.event import Event, EventType
from src.models.notifications.notification import Notification
from src.models.tracks.track import Track
from src.utils.structured_logger import StructuredLogger

logger = StructuredLogger(__name__)


ARTIST_REMIX_CONTEST_ENDING_SOON = "artist_remix_contest_ending_soon"
REMIX_CONTEST_ENDING_SOON_WINDOW_HOURS = 48


def get_artist_remix_contest_ending_soon_group_id(event_id):
    return f"{ARTIST_REMIX_CONTEST_ENDING_SOON}:{event_id}"


def create_artist_remix_contest_ending_soon_notifications(session, now=None):
    now = now or datetime.now()
    window_start = now
    window_end = now + timedelta(hours=REMIX_CONTEST_ENDING_SOON_WINDOW_HOURS)

    ending_soon_contests = (
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
    for event in ending_soon_contests:
        contest_track_id = event.entity_id
        group_id = get_artist_remix_contest_ending_soon_group_id(event.event_id)
        user_id = event.user_id
        parent_track = (
            session.query(Track)
            .filter(
                Track.track_id == contest_track_id,
                Track.is_current == True,
                Track.is_delete == False,
            )
            .first()
        )

        # Guard against the parent track having been deleted/hidden between
        # the event being created and this batch running — otherwise the
        # AttributeError on `parent_track.is_unlisted` would abort the whole
        # batch and drop notifications for every other ending-soon contest.
        if parent_track is None or parent_track.is_unlisted:
            continue
        parent_track_owner_id = parent_track.owner_id
        exists = (
            session.query(Notification)
            .filter(
                Notification.group_id == group_id,
                Notification.type == ARTIST_REMIX_CONTEST_ENDING_SOON,
                Notification.user_ids.any(user_id),
            )
            .first()
        )
        if not exists and parent_track_owner_id is not None:
            new_notification = Notification(
                specifier=str(user_id),
                group_id=group_id,
                blocknumber=None,
                user_ids=[user_id],
                type=ARTIST_REMIX_CONTEST_ENDING_SOON,
                data={
                    "entity_id": contest_track_id,
                    "entity_user_id": parent_track_owner_id,
                },
                timestamp=now,
            )
            new_notifications.append(new_notification)
    logger.info(
        f"Inserting {len(new_notifications)} artist remix contest ending soon notifications"
    )
    session.add_all(new_notifications)
    session.commit()
