"""
Tests for "follow event" — the Subscribe/Event + Unsubscribe/Event path
through the entity-manager indexer.

Phase 2 of the remix-contest feature reuses the `subscriptions` table as a
generic "watch this thing" primitive by adding `entity_type` and `entity_id`
columns (see migration 0176_subscriptions_generic_entity.sql). A user
"follows a contest" by emitting a ManageEntity transaction with
`Action=Subscribe, EntityType=Event, EntityId=<event_id>`. The indexer's
`create_social_record` in `social_features.py` writes a row into
subscriptions with:

    subscriber_id = params.user_id          # the follower
    user_id       = params.entity_id        # = event_id, mirrored into the
                                            #   legacy column so the existing
                                            #   (subscriber_id, user_id) PK
                                            #   stays collision-free across kinds
    entity_type   = 'Event'
    entity_id     = event_id

Unsubscribe/Event marks the row is_delete=True.

These tests enforce:
- subscribe writes the right columns
- unsubscribe flips is_delete
- event subscriptions and user subscriptions coexist without stomping each other
- non-existent events are rejected
- the "cannot follow self" check does NOT fire on event targets (user/event
  ID spaces are independent, so a numeric collision is NOT a self-reference)
- duplicate subscribes/unsubscribes are idempotent
"""

import logging
from datetime import datetime
from typing import List

from web3 import Web3
from web3.datastructures import AttributeDict

from integration_tests.challenges.index_helpers import UpdateTask
from integration_tests.utils import populate_mock_db
from src.models.social.subscription import (
    SUBSCRIPTION_EVENT_ENTITY_TYPE,
    SUBSCRIPTION_USER_ENTITY_TYPE,
    Subscription,
)
from src.tasks.entity_manager.entity_manager import entity_manager_update
from src.utils.db_session import get_db

logger = logging.getLogger(__name__)

BLOCK_DATETIME = datetime.now()


# User 1 is the contest owner, users 2 and 3 are fans who will follow events.
# Track 1 hosts event 100 (the contest).
base_entities = {
    "users": [
        {"user_id": 1, "wallet": "user1wallet"},
        {"user_id": 2, "wallet": "user2wallet"},
        {"user_id": 3, "wallet": "user3wallet"},
    ],
    "tracks": [{"track_id": 1, "owner_id": 1}],
    "events": [
        {
            "event_id": 100,
            "event_type": "remix_contest",
            "user_id": 1,
            "entity_type": "track",
            "entity_id": 1,
            "event_data": {"description": "remix my track", "winners": []},
            "is_deleted": False,
        }
    ],
}


def setup_test(app, mocker, entities, tx_receipts):
    with app.app_context():
        db = get_db()
        web3 = Web3()
        bus_mock = mocker.patch(
            "src.challenges.challenge_event_bus.ChallengeEventBus", autospec=True
        )
        update_task = UpdateTask(web3, challenge_event_bus=bus_mock)

    entity_manager_txs = [
        AttributeDict({"transactionHash": update_task.web3.to_bytes(text=tx_receipt)})
        for tx_receipt in tx_receipts
    ]

    def get_events_side_effect(_, tx_receipt):
        return tx_receipts[tx_receipt["transactionHash"].decode("utf-8")]

    mocker.patch(
        "src.tasks.entity_manager.entity_manager.get_entity_manager_events_tx",
        side_effect=get_events_side_effect,
        autospec=True,
    )

    populate_mock_db(db, entities)

    def index_transaction(session):
        return entity_manager_update(
            update_task,
            session,
            entity_manager_txs,
            block_number=1,
            block_timestamp=BLOCK_DATETIME.timestamp(),
            block_hash=hex(0),
        )

    return db, index_transaction


# ---------------------------------------------------------------------------
# SUBSCRIBE
# ---------------------------------------------------------------------------


def test_subscribe_event_writes_row_with_entity_type(app, mocker):
    """
    A Subscribe/Event tx for user 2 → event 100 writes exactly one subscriptions
    row with entity_type='Event', entity_id=100, user_id=100 (mirrored), and
    subscriber_id=2.
    """
    tx_receipts = {
        "FanFollowsContest": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 100,
                        "_entityType": "Event",
                        "_userId": 2,
                        "_action": "Subscribe",
                        "_metadata": "",
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, base_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)

        rows: List[Subscription] = session.query(Subscription).all()
        assert len(rows) == 1
        row = rows[0]
        assert row.subscriber_id == 2
        assert row.user_id == 100  # legacy column mirrors event_id
        assert row.entity_type == SUBSCRIPTION_EVENT_ENTITY_TYPE
        assert row.entity_id == 100
        assert row.is_current is True
        assert row.is_delete is False


def test_subscribe_to_unknown_event_rejected(app, mocker):
    """
    Subscribing to an event that does not exist is silently skipped by the
    indexer (the validation error is swallowed by entity_manager_update).
    """
    tx_receipts = {
        "SubscribeGhostEvent": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 999,  # does not exist
                        "_entityType": "Event",
                        "_userId": 2,
                        "_action": "Subscribe",
                        "_metadata": "",
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, base_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)
        assert session.query(Subscription).count() == 0


def test_event_self_follow_check_does_not_fire_on_numeric_id_collision(
    app, mocker
):
    """
    The indexer's "cannot follow self" check is scoped to entity_type=User.
    event_id and user_id live in separate ID spaces, so a numeric collision
    (user N happens to follow event N) MUST be allowed through.
    """
    # User 3 subscribes to event 3 (same numeric id). Should succeed.
    collision_entities = {
        **base_entities,
        "events": [
            {
                "event_id": 3,
                "event_type": "remix_contest",
                "user_id": 1,
                "entity_type": "track",
                "entity_id": 1,
                "event_data": {"description": "edge-case", "winners": []},
                "is_deleted": False,
            }
        ],
    }

    tx_receipts = {
        "NumericCollisionSubscribe": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 3,
                        "_entityType": "Event",
                        "_userId": 3,
                        "_action": "Subscribe",
                        "_metadata": "",
                        "_signer": "user3wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, collision_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)
        rows = session.query(Subscription).all()
        assert len(rows) == 1
        assert rows[0].subscriber_id == 3
        assert rows[0].entity_type == SUBSCRIPTION_EVENT_ENTITY_TYPE
        assert rows[0].entity_id == 3
        assert rows[0].is_delete is False


def test_duplicate_subscribe_event_is_idempotent(app, mocker):
    """
    A second Subscribe/Event tx for an already-current subscription is a no-op:
    no new row, no flipping of is_delete. (`validate_duplicate_social_feature`
    short-circuits when the existing row is live.)
    """
    seed_entities = {
        **base_entities,
        "subscriptions": [
            {
                "subscriber_id": 2,
                "user_id": 100,
                "entity_type": SUBSCRIPTION_EVENT_ENTITY_TYPE,
                "entity_id": 100,
                "is_current": True,
                "is_delete": False,
            }
        ],
    }

    tx_receipts = {
        "DuplicateSubscribe": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 100,
                        "_entityType": "Event",
                        "_userId": 2,
                        "_action": "Subscribe",
                        "_metadata": "",
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, seed_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)
        live_rows = (
            session.query(Subscription)
            .filter(
                Subscription.is_current == True,
                Subscription.is_delete == False,
                Subscription.subscriber_id == 2,
                Subscription.user_id == 100,
            )
            .all()
        )
        assert len(live_rows) == 1


# ---------------------------------------------------------------------------
# UNSUBSCRIBE
# ---------------------------------------------------------------------------


def test_unsubscribe_event_marks_row_deleted(app, mocker):
    """
    An Unsubscribe/Event tx flips is_delete to True on the existing live
    subscription row.
    """
    seed_entities = {
        **base_entities,
        "subscriptions": [
            {
                "subscriber_id": 2,
                "user_id": 100,
                "entity_type": SUBSCRIPTION_EVENT_ENTITY_TYPE,
                "entity_id": 100,
                "is_current": True,
                "is_delete": False,
            }
        ],
    }

    tx_receipts = {
        "FanUnfollowsContest": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 100,
                        "_entityType": "Event",
                        "_userId": 2,
                        "_action": "Unsubscribe",
                        "_metadata": "",
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, seed_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)
        rows = (
            session.query(Subscription)
            .filter(Subscription.is_current == True)
            .all()
        )
        # Exactly one current row — the original (now marked deleted) or a new
        # deleted copy; either way there should be at most one live row left
        # and it must be is_delete=True
        assert len(rows) >= 1
        # At least one of the live rows must have is_delete=True (the unfollow)
        assert any(r.is_delete for r in rows)
        # And none of the live rows should still look "followed"
        still_followed = [
            r
            for r in rows
            if r.subscriber_id == 2
            and r.entity_type == SUBSCRIPTION_EVENT_ENTITY_TYPE
            and r.entity_id == 100
            and not r.is_delete
        ]
        assert still_followed == []


def test_duplicate_unsubscribe_event_is_idempotent(app, mocker):
    """Unsubscribing when already unsubscribed is a no-op."""
    seed_entities = {
        **base_entities,
        "subscriptions": [
            {
                "subscriber_id": 2,
                "user_id": 100,
                "entity_type": SUBSCRIPTION_EVENT_ENTITY_TYPE,
                "entity_id": 100,
                "is_current": True,
                "is_delete": True,  # already unsubscribed
            }
        ],
    }

    tx_receipts = {
        "RedundantUnsubscribe": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 100,
                        "_entityType": "Event",
                        "_userId": 2,
                        "_action": "Unsubscribe",
                        "_metadata": "",
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, seed_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)
        # Still exactly one current row, still marked deleted.
        rows = session.query(Subscription).filter(Subscription.is_current == True).all()
        assert len(rows) == 1
        assert rows[0].is_delete is True


# ---------------------------------------------------------------------------
# COEXISTENCE WITH USER SUBSCRIPTIONS
# ---------------------------------------------------------------------------


def test_user_and_event_subscriptions_coexist_without_stomping(app, mocker):
    """
    A user subscribing to both another user AND an event should produce two
    independent rows in subscriptions — one with entity_type='User' and one
    with entity_type='Event'. Adding the entity_type discriminator must not
    break the existing user-subscribe path.
    """
    # User 2 subscribes to user 1 (classic user-follow path) AND to event 100.
    tx_receipts = {
        "FollowArtistUser": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 1,
                        "_entityType": "User",
                        "_userId": 2,
                        "_action": "Follow",
                        "_metadata": "",
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
        "SubscribeEvent": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 100,
                        "_entityType": "Event",
                        "_userId": 2,
                        "_action": "Subscribe",
                        "_metadata": "",
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, base_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)

        all_subs: List[Subscription] = (
            session.query(Subscription)
            .filter(
                Subscription.is_current == True,
                Subscription.is_delete == False,
            )
            .all()
        )
        # Follow/User produces a User subscription (legacy auto-subscribe), and
        # the explicit Subscribe/Event produces an Event subscription. Two rows.
        assert len(all_subs) == 2
        by_type = {s.entity_type: s for s in all_subs}
        assert SUBSCRIPTION_USER_ENTITY_TYPE in by_type
        assert SUBSCRIPTION_EVENT_ENTITY_TYPE in by_type

        user_sub = by_type[SUBSCRIPTION_USER_ENTITY_TYPE]
        assert user_sub.subscriber_id == 2
        assert user_sub.user_id == 1
        # For User subs we leave entity_id NULL (legacy row shape preserved)
        assert user_sub.entity_id is None

        event_sub = by_type[SUBSCRIPTION_EVENT_ENTITY_TYPE]
        assert event_sub.subscriber_id == 2
        assert event_sub.user_id == 100  # mirrored event_id
        assert event_sub.entity_id == 100


def test_same_subscriber_can_follow_multiple_events(app, mocker):
    """
    One user following several different events should produce one row per
    (subscriber, event) pair, all with entity_type='Event'.
    """
    multi_event_entities = {
        **base_entities,
        "events": [
            {
                "event_id": 100,
                "event_type": "remix_contest",
                "user_id": 1,
                "entity_type": "track",
                "entity_id": 1,
                "event_data": {"description": "first", "winners": []},
                "is_deleted": False,
            },
            {
                "event_id": 101,
                "event_type": "remix_contest",
                "user_id": 1,
                "entity_type": "track",
                "entity_id": 1,
                "event_data": {"description": "second", "winners": []},
                "is_deleted": False,
            },
        ],
    }

    tx_receipts = {
        "FollowContest100": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 100,
                        "_entityType": "Event",
                        "_userId": 2,
                        "_action": "Subscribe",
                        "_metadata": "",
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
        "FollowContest101": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 101,
                        "_entityType": "Event",
                        "_userId": 2,
                        "_action": "Subscribe",
                        "_metadata": "",
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, multi_event_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)
        rows = (
            session.query(Subscription)
            .filter(
                Subscription.is_current == True,
                Subscription.is_delete == False,
                Subscription.subscriber_id == 2,
                Subscription.entity_type == SUBSCRIPTION_EVENT_ENTITY_TYPE,
            )
            .all()
        )
        event_ids = sorted([r.entity_id for r in rows])
        assert event_ids == [100, 101]
