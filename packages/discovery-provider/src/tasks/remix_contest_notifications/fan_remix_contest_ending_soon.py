from datetime import datetime, timedelta

from src.models.events.event import Event, EventType
from src.models.notifications.notification import Notification
from src.models.social.follow import Follow
from src.models.social.save import Save, SaveType
from src.models.social.subscription import (
    SUBSCRIPTION_EVENT_ENTITY_TYPE,
    Subscription,
)
from src.models.tracks.track import Track
from src.utils.structured_logger import StructuredLogger

logger = StructuredLogger(__name__)


FAN_REMIX_CONTEST_ENDING_SOON = "fan_remix_contest_ending_soon"
REMIX_CONTEST_ENDING_SOON_WINDOW_HOURS = 72


def get_fan_remix_contest_ending_soon_group_id(event_id):
    return f"{FAN_REMIX_CONTEST_ENDING_SOON}:{event_id}"


def create_fan_remix_contest_ending_soon_notifications(session, now=None):
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
        parent_track = (
            session.query(Track)
            .filter(
                Track.track_id == contest_track_id,
                Track.is_current == True,
                Track.is_delete == False,
            )
            .first()
        )
        # Guard against a deleted/hidden parent track — without this the
        # AttributeError on `.is_unlisted` would propagate and abort the
        # whole batch, silently dropping every other contest's notifications.
        if parent_track is None or parent_track.is_unlisted:
            continue

        follower_user_ids = set(
            row[0]
            for row in session.query(Follow.follower_user_id)
            .filter(
                Follow.followee_user_id == event.user_id,
                Follow.is_current == True,
                Follow.is_delete == False,
            )
            .all()
        )
        favoriter_user_ids = set(
            row[0]
            for row in session.query(Save.user_id)
            .filter(
                Save.save_item_id == contest_track_id,
                Save.save_type == SaveType.track,
                Save.is_current == True,
                Save.is_delete == False,
            )
            .all()
        )
        event_follower_user_ids = set(
            row[0]
            for row in session.query(Subscription.subscriber_id)
            .filter(
                Subscription.user_id == event.event_id,
                Subscription.entity_type == SUBSCRIPTION_EVENT_ENTITY_TYPE,
                Subscription.is_current == True,
                Subscription.is_delete == False,
            )
            .all()
        )
        notified_user_ids = (
            follower_user_ids | favoriter_user_ids | event_follower_user_ids
        )
        # Exclude the contest host — they have artist_remix_contest_ending_soon.
        notified_user_ids.discard(event.user_id)
        parent_track_owner_id = parent_track.owner_id if parent_track else None
        group_id = get_fan_remix_contest_ending_soon_group_id(event.event_id)
        for user_id in notified_user_ids:
            exists = (
                session.query(Notification)
                .filter(
                    Notification.group_id == group_id,
                    Notification.type == FAN_REMIX_CONTEST_ENDING_SOON,
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
                    type=FAN_REMIX_CONTEST_ENDING_SOON,
                    data={
                        "entity_id": contest_track_id,
                        "entity_user_id": parent_track_owner_id,
                    },
                    timestamp=now,
                )
                new_notifications.append(new_notification)
    logger.info(
        f"Inserting {len(new_notifications)} fan remix contest ending soon notifications"
    )
    session.add_all(new_notifications)
    session.commit()
