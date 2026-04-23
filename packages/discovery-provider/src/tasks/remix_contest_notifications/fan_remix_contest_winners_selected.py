from datetime import datetime

from src.models.events.event import Event, EventType
from src.models.notifications.notification import Notification
from src.models.social.follow import Follow
from src.models.social.save import Save, SaveType
from src.models.social.subscription import (
    SUBSCRIPTION_EVENT_ENTITY_TYPE,
    Subscription,
)
from src.models.tracks.track import Track
from src.models.users.user import User
from src.tasks.entity_manager.utils import safe_add_notification
from src.utils.structured_logger import StructuredLogger

logger = StructuredLogger(__name__)

FAN_REMIX_CONTEST_WINNERS_SELECTED = "fan_remix_contest_winners_selected"


def get_fan_remix_contest_winners_selected_group_id(event_id):
    return f"{FAN_REMIX_CONTEST_WINNERS_SELECTED}:{event_id}"


def create_fan_remix_contest_winners_selected_notification(session, event_id, now=None):
    """
    Create notification for fans when winners are selected for a remix contest.
    This should be called when event_data.winners goes from empty to populated.
    """
    now = now or datetime.now()

    # Get the event
    event = (
        session.query(Event)
        .filter(
            Event.event_id == event_id,
            Event.event_type == EventType.remix_contest,
            Event.is_deleted == False,
        )
        .first()
    )

    if not event:
        logger.warning(f"Event {event_id} not found or not a remix contest")
        return

    contest_track_id = event.entity_id
    group_id = get_fan_remix_contest_winners_selected_group_id(event_id)

    # Get the contest track to ensure it exists and is not unlisted
    parent_track = (
        session.query(Track)
        .filter(
            Track.track_id == contest_track_id,
            Track.is_delete == False,
            Track.is_unlisted == False,
        )
        .first()
    )

    if not parent_track:
        logger.info(f"Contest track {contest_track_id} not found or is private")
        return

    # Get the contest host user
    contest_host = (
        session.query(User)
        .filter(
            User.user_id == event.user_id,
            User.is_current == True,
        )
        .first()
    )

    if not contest_host:
        logger.warning(f"Contest host {event.user_id} not found")
        return

    # Find all users who submitted remixes to this contest
    # Only include remixes uploaded after the contest was created
    # Exclude the contest host from notifications
    remixer_user_ids = (
        session.query(Track.owner_id)
        .filter(
            Track.is_delete == False,
            Track.remix_of.isnot(None),
            Track.remix_of.contains(
                {"tracks": [{"parent_track_id": contest_track_id}]}
            ),
            Track.created_at > event.created_at,
            Track.owner_id != event.user_id,  # Exclude contest host
        )
        .distinct()
        .all()
    )

    remixer_user_ids = [user_id[0] for user_id in remixer_user_ids]

    event_follower_user_ids = [
        row[0]
        for row in (
            session.query(Subscription.subscriber_id)
            .filter(
                Subscription.user_id == event_id,
                Subscription.entity_type == SUBSCRIPTION_EVENT_ENTITY_TYPE,
                Subscription.is_current == True,
                Subscription.is_delete == False,
            )
            .all()
        )
    ]

    # Followers of the contest host artist
    host_follower_user_ids = [
        row[0]
        for row in (
            session.query(Follow.follower_user_id)
            .filter(
                Follow.followee_user_id == event.user_id,
                Follow.is_current == True,
                Follow.is_delete == False,
            )
            .all()
        )
    ]

    # Users who favorited the parent contest track
    favoriter_user_ids = [
        row[0]
        for row in (
            session.query(Save.user_id)
            .filter(
                Save.save_item_id == contest_track_id,
                Save.save_type == SaveType.track,
                Save.is_current == True,
                Save.is_delete == False,
            )
            .all()
        )
    ]

    recipient_user_ids = list(
        set(
            remixer_user_ids
            + event_follower_user_ids
            + host_follower_user_ids
            + favoriter_user_ids
        )
    )
    # Exclude the contest host themselves — they have artist_remix_contest_*
    # notifications and shouldn't get the "fan" version.
    recipient_user_ids = [u for u in recipient_user_ids if u != event.user_id]
    if not recipient_user_ids:
        logger.info(
            f"No recipients to notify for contest {event_id}"
        )
        return

    for user_id in recipient_user_ids:
        # Create unique group_id per user to prevent conflicts
        user_group_id = f"{group_id}:user:{user_id}"
        safe_add_notification(
            session,
            Notification(
                specifier=str(event.user_id),
                group_id=user_group_id,
                blocknumber=None,
                user_ids=[user_id],
                type=FAN_REMIX_CONTEST_WINNERS_SELECTED,
                data={
                    "entity_id": contest_track_id,
                    "entity_user_id": event.user_id,
                },
                timestamp=now,
            ),
        )

    logger.info(
        f"Created {len(recipient_user_ids)} winners selected notifications for event {event_id}"
    )
