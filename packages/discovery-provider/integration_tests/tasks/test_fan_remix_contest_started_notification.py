import json
import logging
from datetime import datetime, timedelta

from web3 import Web3
from web3.datastructures import AttributeDict

from integration_tests.challenges.index_helpers import UpdateTask
from integration_tests.tasks.publish_scheduled_releases_helpers import (
    publish_scheduled_releases_session,
)
from integration_tests.utils import populate_mock_db
from src.challenges.challenge_event_bus import ChallengeEventBus, setup_challenge_bus
from src.models.notifications.notification import Notification
from src.models.tracks.track import Track
from src.queries.get_notifications import NotificationType
from src.tasks.entity_manager.entity_manager import entity_manager_update
from src.utils.db_session import get_db

logger = logging.getLogger(__name__)

TEST_EVENT_CREATOR_ID = 1
TEST_TRACK_ID = 100
TEST_PRIVATE_TRACK_ID = 101
TEST_FOLLOWER_ID = 2
TEST_FAVORITER_ID = 3

default_metadata = {
    "cover_art": None,
    "cover_art_sizes": "QmdxhDiRUC3zQEKqwnqksaSsSSeHiRghjwKzwoRvm77yaZ",
    "tags": "realmagic,theroom",
    "genre": "R&B/Soul",
    "mood": "Empowering",
    "credits_splits": None,
    "created_at": "2020-07-11 08:22:15",
    "create_date": None,
    "updated_at": "2020-07-11 08:22:15",
    "release_date": "2020-07-11 08:22:15",
    "file_type": None,
    "is_playlist_upload": True,
    "track_segments": [
        {
            "duration": 6.016,
            "multihash": "QmabM5svgDgcRdQZaEKSMBCpSZrrYy2y87L8Dx8EQ3T2jp",
        }
    ],
    "has_current_user_reposted": False,
    "is_current": True,
    "field_visibility": {
        "mood": True,
        "tags": True,
        "genre": True,
        "share": True,
        "play_count": True,
        "remixes": True,
    },
    "remix_of": None,
    "repost_count": 12,
    "save_count": 21,
    "description": "some description",
    "license": "All rights reserved",
    "isrc": None,
    "iswc": None,
    "stem_of": None,
    "ai_attribution_user_id": None,
    "orig_file_cid": "original-file-cid",
    "orig_filename": "original-filename",
    "is_original_available": False,
}


def test_fan_remix_contest_started_notification_for_followers_and_favoriters(app):
    """Test that remix contest started notification is created for followers and users who favorited the track,
    but not for private tracks even if they have followers/favoriters. See handle_event.sql for the logic.
    """
    with app.app_context():
        db = get_db()

    now = datetime.now()

    # First: insert all entities except events
    entities = {
        "users": [
            {
                "user_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "user_id": TEST_FOLLOWER_ID,
                "is_current": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "user_id": TEST_FAVORITER_ID,
                "is_current": True,
                "created_at": now,
                "updated_at": now,
            },
        ],
        "tracks": [
            {
                "track_id": TEST_TRACK_ID,
                "owner_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "is_delete": False,
                "is_unlisted": False,
                "created_at": now,
                "updated_at": now,
            },
            {
                "track_id": TEST_PRIVATE_TRACK_ID,
                "owner_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "is_delete": False,
                "is_unlisted": True,  # Private track
                "created_at": now,
                "updated_at": now,
            },
        ],
        "follows": [
            {
                "follower_user_id": TEST_FOLLOWER_ID,
                "followee_user_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "is_delete": False,
                "created_at": now,
            }
        ],
        "saves": [
            {
                "user_id": TEST_FAVORITER_ID,
                "save_item_id": TEST_TRACK_ID,
                "save_type": "track",
                "is_current": True,
                "is_delete": False,
                "created_at": now,
            },
            {
                "user_id": TEST_FAVORITER_ID,
                "save_item_id": TEST_PRIVATE_TRACK_ID,
                "save_type": "track",
                "is_current": True,
                "is_delete": False,
                "created_at": now,
            },
        ],
        # no "events"
    }
    populate_mock_db(db, entities)

    # Second: insert events for both tracks
    event_entities = {
        "events": [
            {
                "event_type": "remix_contest",
                "user_id": TEST_EVENT_CREATOR_ID,
                "entity_id": TEST_TRACK_ID,
                "entity_type": "track",
                "is_deleted": False,
                "created_at": now,
                "updated_at": now,
            },
            {
                "event_type": "remix_contest",
                "user_id": TEST_EVENT_CREATOR_ID,
                "entity_id": TEST_PRIVATE_TRACK_ID,
                "entity_type": "track",
                "is_deleted": False,
                "created_at": now,
                "updated_at": now,
            },
        ]
    }
    populate_mock_db(db, event_entities)

    with db.scoped_session() as session:
        notifications = (
            session.query(Notification)
            .filter(Notification.type == NotificationType.FAN_REMIX_CONTEST_STARTED)
            .all()
        )
        notified_user_ids = set()
        for notification in notifications:
            notified_user_ids.update(notification.user_ids)
            assert notification.data["entity_user_id"] == TEST_EVENT_CREATOR_ID
            assert notification.data["entity_id"] == TEST_TRACK_ID
            assert notification.type == NotificationType.FAN_REMIX_CONTEST_STARTED
            assert notification.group_id.startswith("fan_remix_contest_started:")
            # Ensure no notifications were created for the private track
            assert notification.data["entity_id"] != TEST_PRIVATE_TRACK_ID
        # Should notify both the follower and the favoriter
        assert TEST_FOLLOWER_ID in notified_user_ids
        assert TEST_FAVORITER_ID in notified_user_ids
        assert len(notified_user_ids) == 2


def test_fan_remix_contest_started_notification_no_duplicate_for_follower_and_favoriter(
    app,
):
    """Test that a user who both follows the creator and saved the track only gets one notification"""
    with app.app_context():
        db = get_db()

    now = datetime.now()
    BOTH_ID = 4

    # First: insert all entities except events
    entities = {
        "users": [
            {
                "user_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "user_id": BOTH_ID,
                "is_current": True,
                "created_at": now,
                "updated_at": now,
            },
        ],
        "tracks": [
            {
                "track_id": TEST_TRACK_ID,
                "owner_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "is_delete": False,
                "created_at": now,
                "updated_at": now,
            }
        ],
        "follows": [
            {
                "follower_user_id": BOTH_ID,
                "followee_user_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "is_delete": False,
                "created_at": now,
            }
        ],
        "saves": [
            {
                "user_id": BOTH_ID,
                "save_item_id": TEST_TRACK_ID,
                "save_type": "track",
                "is_current": True,
                "is_delete": False,
                "created_at": now,
            }
        ],
        # no "events"
    }
    populate_mock_db(db, entities)

    # Second: insert just the event
    event_entities = {
        "events": [
            {
                "event_type": "remix_contest",
                "user_id": TEST_EVENT_CREATOR_ID,
                "entity_id": TEST_TRACK_ID,
                "entity_type": "track",
                "is_deleted": False,
                "created_at": now,
                "updated_at": now,
            }
        ]
    }
    populate_mock_db(db, event_entities)

    with db.scoped_session() as session:
        notifications = (
            session.query(Notification)
            .filter(Notification.type == NotificationType.FAN_REMIX_CONTEST_STARTED)
            .all()
        )
        # There should be only one notification for BOTH_ID
        notif_count = 0
        for notification in notifications:
            if BOTH_ID in notification.user_ids:
                notif_count += 1
                assert notification.data["entity_user_id"] == TEST_EVENT_CREATOR_ID
                assert notification.data["entity_id"] == TEST_TRACK_ID
                assert notification.type == NotificationType.FAN_REMIX_CONTEST_STARTED
                assert notification.specifier == str(BOTH_ID)
                assert notification.group_id.startswith("fan_remix_contest_started:")
        assert notif_count == 1


def test_fan_remix_contest_started_notification_on_track_update(app, mocker):
    """Test that notifications are created when a private track with a remix contest becomes public via update"""
    with app.app_context():
        db = get_db()
        web3 = Web3()
        challenge_event_bus: ChallengeEventBus = setup_challenge_bus()
        update_task = UpdateTask(web3, challenge_event_bus)

    now = datetime.now()

    # First: insert all entities including a private track
    entities = {
        "users": [
            {
                "user_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "created_at": now,
                "updated_at": now,
                "handle": "creator",
                "wallet": "creator_wallet",
            },
            {
                "user_id": TEST_FOLLOWER_ID,
                "is_current": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "user_id": TEST_FAVORITER_ID,
                "is_current": True,
                "created_at": now,
                "updated_at": now,
            },
        ],
        "tracks": [
            {
                "track_id": TEST_TRACK_ID,
                "owner_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "is_delete": False,
                "is_unlisted": True,  # Track starts as private
                "created_at": now,
                "updated_at": now,
            }
        ],
        "follows": [
            {
                "follower_user_id": TEST_FOLLOWER_ID,
                "followee_user_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "is_delete": False,
                "created_at": now,
            }
        ],
        "saves": [
            {
                "user_id": TEST_FAVORITER_ID,
                "save_item_id": TEST_TRACK_ID,
                "save_type": "track",
                "is_current": True,
                "is_delete": False,
                "created_at": now,
            }
        ],
        "events": [
            {
                "event_type": "remix_contest",
                "user_id": TEST_EVENT_CREATOR_ID,
                "entity_id": TEST_TRACK_ID,
                "entity_type": "track",
                "is_deleted": False,
                "created_at": now,
                "updated_at": now,
            }
        ],
    }
    populate_mock_db(db, entities)

    # Create update metadata to make track public
    update_track_metadata = {
        **default_metadata,
        "owner_id": TEST_EVENT_CREATOR_ID,
        "track_id": TEST_TRACK_ID,
        "title": "Public Track NEW NEW NEW",
        "is_unlisted": False,  # Make track public
    }

    update_track_json = json.dumps(update_track_metadata)
    update_track_receipt = [
        {
            "args": AttributeDict(
                {
                    "_entityId": TEST_TRACK_ID,
                    "_entityType": "Track",
                    "_userId": TEST_EVENT_CREATOR_ID,
                    "_action": "Update",
                    "_metadata": f'{{"cid": "QmUpdateTrack", "data": {update_track_json}}}',
                    "_signer": "creator_wallet",
                }
            )
        }
    ]

    def get_events_side_effect(_, tx_receipt):
        return update_track_receipt

    mocker.patch(
        "src.tasks.entity_manager.entity_manager.get_entity_manager_events_tx",
        side_effect=get_events_side_effect,
        autospec=True,
    )

    # Verify no notifications exist before update
    with db.scoped_session() as session:
        notifications = (
            session.query(Notification)
            .filter(Notification.type == NotificationType.FAN_REMIX_CONTEST_STARTED)
            .all()
        )
        assert len(notifications) == 0

    # Process the update that makes the track public
    with db.scoped_session() as session:
        entity_manager_update(
            update_task,
            session,
            entity_manager_txs=[
                AttributeDict({"transactionHash": web3.to_bytes(text="UpdateTrack")})
            ],
            block_number=1,
            block_timestamp=int(now.timestamp()),
            block_hash=hex(1),
        )

        # Verify notifications were created after update
        notifications = (
            session.query(Notification)
            .filter(Notification.type == NotificationType.FAN_REMIX_CONTEST_STARTED)
            .all()
        )
        notified_user_ids = set()
        for notification in notifications:
            notified_user_ids.update(notification.user_ids)
            assert notification.data["entity_user_id"] == TEST_EVENT_CREATOR_ID
            assert notification.data["entity_id"] == TEST_TRACK_ID
            assert notification.type == NotificationType.FAN_REMIX_CONTEST_STARTED
            assert notification.group_id.startswith("fan_remix_contest_started:")

        # Should notify both the follower and the favoriter
        assert TEST_FOLLOWER_ID in notified_user_ids
        assert TEST_FAVORITER_ID in notified_user_ids
        assert len(notified_user_ids) == 2


def test_fan_remix_contest_started_notification_on_scheduled_release(app):
    """Test that notifications are created when a scheduled track with a remix contest becomes public"""
    with app.app_context():
        db = get_db()

    now = datetime.now()
    past_release_date = now - timedelta(
        days=1
    )  # Release date in the past to trigger publish

    # First: insert all entities including a scheduled private track
    entities = {
        "users": [
            {
                "user_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "user_id": TEST_FOLLOWER_ID,
                "is_current": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "user_id": TEST_FAVORITER_ID,
                "is_current": True,
                "created_at": now,
                "updated_at": now,
            },
        ],
        "tracks": [
            {
                "track_id": TEST_TRACK_ID,
                "owner_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "is_delete": False,
                "is_unlisted": True,  # Track starts as private
                "is_scheduled_release": True,  # This is a scheduled release
                "release_date": past_release_date,  # Release date in the past
                "created_at": now,
                "updated_at": now,
                "blocknumber": 1,
            }
        ],
        "follows": [
            {
                "follower_user_id": TEST_FOLLOWER_ID,
                "followee_user_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "is_delete": False,
                "created_at": now,
            }
        ],
        "saves": [
            {
                "user_id": TEST_FAVORITER_ID,
                "save_item_id": TEST_TRACK_ID,
                "save_type": "track",
                "is_current": True,
                "is_delete": False,
                "created_at": now,
            }
        ],
        "events": [
            {
                "event_type": "remix_contest",
                "user_id": TEST_EVENT_CREATOR_ID,
                "entity_id": TEST_TRACK_ID,
                "entity_type": "track",
                "is_deleted": False,
                "created_at": now,
                "updated_at": now,
            }
        ],
    }
    populate_mock_db(db, entities)

    # Verify no notifications exist before publishing
    with db.scoped_session() as session:
        notifications = (
            session.query(Notification)
            .filter(Notification.type == NotificationType.FAN_REMIX_CONTEST_STARTED)
            .all()
        )
        assert len(notifications) == 0

        # Run the scheduled release publish
        publish_scheduled_releases_session(session)

        # Verify track was made public
        track = session.query(Track).filter_by(track_id=TEST_TRACK_ID).first()
        assert track.is_unlisted == False

        # Verify notifications were created
        notifications = (
            session.query(Notification)
            .filter(Notification.type == NotificationType.FAN_REMIX_CONTEST_STARTED)
            .all()
        )
        notified_user_ids = set()
        for notification in notifications:
            notified_user_ids.update(notification.user_ids)
            assert notification.data["entity_user_id"] == TEST_EVENT_CREATOR_ID
            assert notification.data["entity_id"] == TEST_TRACK_ID
            assert notification.type == NotificationType.FAN_REMIX_CONTEST_STARTED
            assert notification.group_id.startswith("fan_remix_contest_started:")

        # Should notify both the follower and the favoriter
        assert TEST_FOLLOWER_ID in notified_user_ids
        assert TEST_FAVORITER_ID in notified_user_ids
        assert len(notified_user_ids) == 2


def test_fan_remix_contest_started_notification_no_duplicate_on_track_update(
    app, mocker
):
    """Test that a user who both follows the creator and saved the track only gets one notification
    when a private track becomes public via update"""
    with app.app_context():
        db = get_db()
        web3 = Web3()
        challenge_event_bus: ChallengeEventBus = setup_challenge_bus()
        update_task = UpdateTask(web3, challenge_event_bus)

    now = datetime.now()
    BOTH_ID = 4

    # First: insert all entities including a private track
    entities = {
        "users": [
            {
                "user_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "created_at": now,
                "updated_at": now,
                "handle": "creator",
                "wallet": "creator_wallet",
            },
            {
                "user_id": BOTH_ID,
                "is_current": True,
                "created_at": now,
                "updated_at": now,
            },
        ],
        "tracks": [
            {
                "track_id": TEST_TRACK_ID,
                "owner_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "is_delete": False,
                "is_unlisted": True,  # Track starts as private
                "created_at": now,
                "updated_at": now,
            }
        ],
        "follows": [
            {
                "follower_user_id": BOTH_ID,
                "followee_user_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "is_delete": False,
                "created_at": now,
            }
        ],
        "saves": [
            {
                "user_id": BOTH_ID,
                "save_item_id": TEST_TRACK_ID,
                "save_type": "track",
                "is_current": True,
                "is_delete": False,
                "created_at": now,
            }
        ],
        "events": [
            {
                "event_type": "remix_contest",
                "user_id": TEST_EVENT_CREATOR_ID,
                "entity_id": TEST_TRACK_ID,
                "entity_type": "track",
                "is_deleted": False,
                "created_at": now,
                "updated_at": now,
            }
        ],
    }
    populate_mock_db(db, entities)

    # Create update metadata to make track public
    update_track_metadata = {
        **default_metadata,
        "owner_id": TEST_EVENT_CREATOR_ID,
        "track_id": TEST_TRACK_ID,
        "title": "Public Track NEW NEW NEW",
        "is_unlisted": False,  # Make track public
    }

    update_track_json = json.dumps(update_track_metadata)
    update_track_receipt = [
        {
            "args": AttributeDict(
                {
                    "_entityId": TEST_TRACK_ID,
                    "_entityType": "Track",
                    "_userId": TEST_EVENT_CREATOR_ID,
                    "_action": "Update",
                    "_metadata": f'{{"cid": "QmUpdateTrack", "data": {update_track_json}}}',
                    "_signer": "creator_wallet",
                }
            )
        }
    ]

    def get_events_side_effect(_, tx_receipt):
        return update_track_receipt

    mocker.patch(
        "src.tasks.entity_manager.entity_manager.get_entity_manager_events_tx",
        side_effect=get_events_side_effect,
        autospec=True,
    )

    # Process the update that makes the track public
    with db.scoped_session() as session:
        entity_manager_update(
            update_task,
            session,
            entity_manager_txs=[
                AttributeDict({"transactionHash": web3.to_bytes(text="UpdateTrack")})
            ],
            block_number=1,
            block_timestamp=int(now.timestamp()),
            block_hash=hex(1),
        )

        # Verify notifications after update
        notifications = (
            session.query(Notification)
            .filter(Notification.type == NotificationType.FAN_REMIX_CONTEST_STARTED)
            .all()
        )
        # There should be only one notification for BOTH_ID
        notif_count = 0
        for notification in notifications:
            if BOTH_ID in notification.user_ids:
                notif_count += 1
                assert notification.data["entity_user_id"] == TEST_EVENT_CREATOR_ID
                assert notification.data["entity_id"] == TEST_TRACK_ID
                assert notification.type == NotificationType.FAN_REMIX_CONTEST_STARTED
                assert notification.specifier == str(BOTH_ID)
                assert notification.group_id.startswith("fan_remix_contest_started:")
        assert notif_count == 1


def test_fan_remix_contest_started_notification_no_duplicate_on_scheduled_release(app):
    """Test that a user who both follows the creator and saved the track only gets one notification
    when a scheduled private track becomes public"""
    with app.app_context():
        db = get_db()

    now = datetime.now()
    past_release_date = now - timedelta(
        days=1
    )  # Release date in the past to trigger publish
    BOTH_ID = 4

    # First: insert all entities including a scheduled private track
    entities = {
        "users": [
            {
                "user_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "user_id": BOTH_ID,
                "is_current": True,
                "created_at": now,
                "updated_at": now,
            },
        ],
        "tracks": [
            {
                "track_id": TEST_TRACK_ID,
                "owner_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "is_delete": False,
                "is_unlisted": True,  # Track starts as private
                "is_scheduled_release": True,  # This is a scheduled release
                "release_date": past_release_date,  # Release date in the past
                "created_at": now,
                "updated_at": now,
                "blocknumber": 1,
            }
        ],
        "follows": [
            {
                "follower_user_id": BOTH_ID,
                "followee_user_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "is_delete": False,
                "created_at": now,
            }
        ],
        "saves": [
            {
                "user_id": BOTH_ID,
                "save_item_id": TEST_TRACK_ID,
                "save_type": "track",
                "is_current": True,
                "is_delete": False,
                "created_at": now,
            }
        ],
        "events": [
            {
                "event_type": "remix_contest",
                "user_id": TEST_EVENT_CREATOR_ID,
                "entity_id": TEST_TRACK_ID,
                "entity_type": "track",
                "is_deleted": False,
                "created_at": now,
                "updated_at": now,
            }
        ],
    }
    populate_mock_db(db, entities)

    with db.scoped_session() as session:
        # Run the scheduled release publish
        publish_scheduled_releases_session(session)

        # Verify track was made public
        track = session.query(Track).filter_by(track_id=TEST_TRACK_ID).first()
        assert track.is_unlisted == False

        # Verify notifications
        notifications = (
            session.query(Notification)
            .filter(Notification.type == NotificationType.FAN_REMIX_CONTEST_STARTED)
            .all()
        )
        # There should be only one notification for BOTH_ID
        notif_count = 0
        for notification in notifications:
            if BOTH_ID in notification.user_ids:
                notif_count += 1
                assert notification.data["entity_user_id"] == TEST_EVENT_CREATOR_ID
                assert notification.data["entity_id"] == TEST_TRACK_ID
                assert notification.type == NotificationType.FAN_REMIX_CONTEST_STARTED
                assert notification.specifier == str(BOTH_ID)
                assert notification.group_id.startswith("fan_remix_contest_started:")
        assert notif_count == 1


def test_fan_remix_contest_started_notification_no_duplicate_with_existing_on_track_update(
    app, mocker
):
    """Test that we don't create duplicate notifications when making a track public via update
    if an identical notification already exists"""
    with app.app_context():
        db = get_db()
        web3 = Web3()
        challenge_event_bus: ChallengeEventBus = setup_challenge_bus()
        update_task = UpdateTask(web3, challenge_event_bus)

    now = datetime.now()
    FOLLOWER_ID = 4

    # First: insert all entities including a private track
    entities = {
        "users": [
            {
                "user_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "created_at": now,
                "updated_at": now,
                "handle": "creator",
                "wallet": "creator_wallet",
            },
            {
                "user_id": FOLLOWER_ID,
                "is_current": True,
                "created_at": now,
                "updated_at": now,
            },
        ],
        "tracks": [
            {
                "track_id": TEST_TRACK_ID,
                "owner_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "is_delete": False,
                "is_unlisted": True,  # Track starts as private
                "created_at": now,
                "updated_at": now,
                "blocknumber": 1,
            }
        ],
        "follows": [
            {
                "follower_user_id": FOLLOWER_ID,
                "followee_user_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "is_delete": False,
                "created_at": now,
            }
        ],
        "events": [
            {
                "event_type": "remix_contest",
                "user_id": TEST_EVENT_CREATOR_ID,
                "entity_id": TEST_TRACK_ID,
                "entity_type": "track",
                "is_deleted": False,
                "created_at": now,
                "updated_at": now,
            }
        ],
        # Add an existing notification
        "notification": [
            {
                "blocknumber": 1,
                "user_ids": [FOLLOWER_ID],
                "timestamp": now,
                "type": NotificationType.FAN_REMIX_CONTEST_STARTED,
                "specifier": str(FOLLOWER_ID),
                "group_id": f"fan_remix_contest_started:{TEST_TRACK_ID}:user:{TEST_EVENT_CREATOR_ID}",
                "data": {
                    "entity_user_id": TEST_EVENT_CREATOR_ID,
                    "entity_id": TEST_TRACK_ID,
                },
            }
        ],
    }
    populate_mock_db(db, entities)

    # Create update metadata to make track public
    update_track_metadata = {
        **default_metadata,
        "owner_id": TEST_EVENT_CREATOR_ID,
        "track_id": TEST_TRACK_ID,
        "title": "Public Track NEW NEW NEW",
        "is_unlisted": False,  # Make track public
    }

    update_track_json = json.dumps(update_track_metadata)
    update_track_receipt = [
        {
            "args": AttributeDict(
                {
                    "_entityId": TEST_TRACK_ID,
                    "_entityType": "Track",
                    "_userId": TEST_EVENT_CREATOR_ID,
                    "_action": "Update",
                    "_metadata": f'{{"cid": "QmUpdateTrack", "data": {update_track_json}}}',
                    "_signer": "creator_wallet",
                }
            )
        }
    ]

    def get_events_side_effect(_, tx_receipt):
        return update_track_receipt

    mocker.patch(
        "src.tasks.entity_manager.entity_manager.get_entity_manager_events_tx",
        side_effect=get_events_side_effect,
        autospec=True,
    )

    # Process the update that makes the track public
    with db.scoped_session() as session:
        # Count notifications before update
        notifications_before = (
            session.query(Notification)
            .filter(
                Notification.type == NotificationType.FAN_REMIX_CONTEST_STARTED,
            )
            .all()
        )
        assert len(notifications_before) == 1
        assert notifications_before[0].user_ids == [FOLLOWER_ID]

        entity_manager_update(
            update_task,
            session,
            entity_manager_txs=[
                AttributeDict({"transactionHash": web3.to_bytes(text="UpdateTrack")})
            ],
            block_number=1,
            block_timestamp=int(now.timestamp()),
            block_hash=hex(1),
        )

        # Verify no new notifications were created
        notifications_after = (
            session.query(Notification)
            .filter(
                Notification.type == NotificationType.FAN_REMIX_CONTEST_STARTED,
            )
            .all()
        )
        assert len(notifications_after) == 1
        assert notifications_after[0].user_ids == [FOLLOWER_ID]


def test_fan_remix_contest_started_notification_no_duplicate_with_existing_on_scheduled_release(
    app,
):
    """Test that we don't create duplicate notifications when making a track public via scheduled release
    if an identical notification already exists"""
    with app.app_context():
        db = get_db()

    now = datetime.now()
    past_release_date = now - timedelta(
        days=1
    )  # Release date in the past to trigger publish
    FOLLOWER_ID = 4

    # First: insert all entities including a scheduled private track
    entities = {
        "users": [
            {
                "user_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "user_id": FOLLOWER_ID,
                "is_current": True,
                "created_at": now,
                "updated_at": now,
            },
        ],
        "tracks": [
            {
                "track_id": TEST_TRACK_ID,
                "owner_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "is_delete": False,
                "is_unlisted": True,  # Track starts as private
                "is_scheduled_release": True,  # This is a scheduled release
                "release_date": past_release_date,  # Release date in the past
                "created_at": now,
                "updated_at": now,
                "blocknumber": 1,
            }
        ],
        "follows": [
            {
                "follower_user_id": FOLLOWER_ID,
                "followee_user_id": TEST_EVENT_CREATOR_ID,
                "is_current": True,
                "is_delete": False,
                "created_at": now,
            }
        ],
        "events": [
            {
                "event_type": "remix_contest",
                "user_id": TEST_EVENT_CREATOR_ID,
                "entity_id": TEST_TRACK_ID,
                "entity_type": "track",
                "is_deleted": False,
                "created_at": now,
                "updated_at": now,
            }
        ],
        # Add an existing notification
        "notification": [
            {
                "blocknumber": 1,
                "user_ids": [FOLLOWER_ID],
                "timestamp": now,
                "type": NotificationType.FAN_REMIX_CONTEST_STARTED,
                "specifier": str(FOLLOWER_ID),
                "group_id": f"fan_remix_contest_started:{TEST_TRACK_ID}:user:{TEST_EVENT_CREATOR_ID}",
                "data": {
                    "entity_user_id": TEST_EVENT_CREATOR_ID,
                    "entity_id": TEST_TRACK_ID,
                },
            }
        ],
    }
    populate_mock_db(db, entities)

    with db.scoped_session() as session:
        # Count notifications before publish
        notifications_before = (
            session.query(Notification)
            .filter(
                Notification.type == NotificationType.FAN_REMIX_CONTEST_STARTED,
            )
            .all()
        )
        assert len(notifications_before) == 1
        assert notifications_before[0].user_ids == [FOLLOWER_ID]

        # Run the scheduled release publish
        publish_scheduled_releases_session(session)

        # Verify track was made public
        track = session.query(Track).filter_by(track_id=TEST_TRACK_ID).first()
        assert track.is_unlisted == False

        # Verify no new notifications were created
        notifications_after = (
            session.query(Notification)
            .filter(
                Notification.type == NotificationType.FAN_REMIX_CONTEST_STARTED,
            )
            .all()
        )
        logger.info(f"notifications_after: {notifications_after}")
        assert len(notifications_after) == 1
        assert notifications_after[0].user_ids == [FOLLOWER_ID]
