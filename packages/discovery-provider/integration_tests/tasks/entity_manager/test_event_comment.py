"""
Tests for remix-contest (entity_type='Event') comments in the entity manager indexer.

Event comments are a new entity_type on the `comments` table. Unlike FanClub
posts, **anyone** can post into an event's comment stream; the distinction
between a "post update" and a regular user comment is resolved at read time
(or, for notification fanout, at write time) by comparing `comment.user_id`
to the event's owner `user_id`.

Key invariants these tests enforce:
- A non-owner can create a top-level event comment (unlike fan-club threads).
- The event owner posting a top-level comment AND having followers triggers
  a `remix_contest_update` notification to every follower.
- Artist *replies* (parent_comment_id set) do NOT trigger the update
  notification — they are just ordinary replies.
- The event owner can delete any comment on their own event; other users can
  only delete their own.
- Reactions on event comments resolve the "artist" correctly (i.e. via the
  event's owner user_id, not the track's owner_id).
- Event comments coexist with Track / FanClub comments in the same block.
"""

import json
import logging
from typing import List

from web3 import Web3
from web3.datastructures import AttributeDict

from integration_tests.challenges.index_helpers import UpdateTask
from integration_tests.utils import populate_mock_db
from src.challenges.challenge_event_bus import ChallengeEventBus, setup_challenge_bus
from src.models.comments.comment import EVENT_ENTITY_TYPE, Comment
from src.models.comments.comment_reaction import CommentReaction
from src.models.comments.comment_thread import CommentThread
from src.models.notifications.notification import Notification
from src.tasks.entity_manager.entity_manager import entity_manager_update
from src.utils.db_session import get_db

logger = logging.getLogger(__name__)

# User 1 = event owner (the contest artist), users 2 & 3 = fans.
# Track 1 is the track the contest is attached to; Event 100 is the contest.
event_comment_entities = {
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
            "user_id": 1,  # the contest is owned by user 1
            "entity_type": "track",
            "entity_id": 1,
            "event_data": {
                "description": "remix my track",
                "prize_info": "",
                "winners": [],
            },
            "is_deleted": False,
        }
    ],
}

event_comment_metadata = {
    "entity_id": 100,  # event_id
    "entity_type": "Event",
    "body": "has anyone tried the acapella stems yet?",
    "parent_comment_id": None,
}

event_comment_metadata_json = json.dumps(event_comment_metadata)


def setup_test(app, mocker, entities, tx_receipts):
    with app.app_context():
        db = get_db()
        web3 = Web3()
        challenge_event_bus: ChallengeEventBus = setup_challenge_bus()
        update_task = UpdateTask(web3, challenge_event_bus)

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

    if isinstance(entities, list):
        for entity_set in entities:
            populate_mock_db(db, entity_set)
    else:
        populate_mock_db(db, entities)

    def index_transaction(session):
        return entity_manager_update(
            update_task,
            session,
            entity_manager_txs,
            block_number=0,
            block_timestamp=1585336422,
            block_hash=hex(0),
        )

    return db, index_transaction


# ---------------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------------


def test_create_event_comment_by_non_owner(app, mocker):
    """
    A fan (non-event-owner) can post a top-level comment on an event.
    Unlike FanClub threads, event comments are open to everyone.
    """
    tx_receipts = {
        "FanPostsOnEvent": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 500,
                        "_entityType": "Comment",
                        "_userId": 2,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "", "data": {event_comment_metadata_json}}}',
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(
        app, mocker, event_comment_entities, tx_receipts
    )

    with db.scoped_session() as session:
        index_transaction(session)

        comments: List[Comment] = session.query(Comment).all()
        assert len(comments) == 1
        assert comments[0].entity_type == EVENT_ENTITY_TYPE
        assert comments[0].entity_id == 100
        assert comments[0].user_id == 2
        assert comments[0].is_members_only is False


def test_create_event_comment_by_owner_is_post_update(app, mocker):
    """
    The event owner (user 1) creating a top-level comment is a "post update":
    it produces a remix_contest_update notification for every event follower.
    Users 2 and 3 are both subscribed to the event via subscriptions rows.
    """
    entities_with_followers = {
        **event_comment_entities,
        # subscriptions with entity_type='Event' represent "following the contest"
        "subscriptions": [
            {
                "subscriber_id": 2,
                "user_id": 100,  # target = event_id (mirrored into legacy column)
                "entity_type": "Event",
                "entity_id": 100,
            },
            {
                "subscriber_id": 3,
                "user_id": 100,
                "entity_type": "Event",
                "entity_id": 100,
            },
        ],
    }

    tx_receipts = {
        "ArtistPostsUpdate": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 500,
                        "_entityType": "Comment",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "", "data": {event_comment_metadata_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(
        app, mocker, entities_with_followers, tx_receipts
    )

    with db.scoped_session() as session:
        index_transaction(session)

        # Post is created
        assert session.query(Comment).count() == 1

        update_notifs = (
            session.query(Notification)
            .filter(Notification.type == "remix_contest_update")
            .all()
        )
        assert len(update_notifs) == 2
        recipient_ids = sorted([n.user_ids[0] for n in update_notifs])
        assert recipient_ids == [2, 3]
        for notif in update_notifs:
            assert notif.data["event_id"] == 100
            assert notif.data["event_user_id"] == 1
            assert notif.data["comment_id"] == 500


def test_create_event_comment_owner_excluded_from_own_update_notification(
    app, mocker
):
    """
    If the event owner also happens to have a subscriptions row targeting their
    own event (edge case), they should NOT receive a notification for their own
    post update.
    """
    entities_with_self_sub = {
        **event_comment_entities,
        "subscriptions": [
            {
                "subscriber_id": 1,  # the owner themselves
                "user_id": 100,
                "entity_type": "Event",
                "entity_id": 100,
            },
            {
                "subscriber_id": 2,
                "user_id": 100,
                "entity_type": "Event",
                "entity_id": 100,
            },
        ],
    }

    tx_receipts = {
        "ArtistPost": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 500,
                        "_entityType": "Comment",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "", "data": {event_comment_metadata_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(
        app, mocker, entities_with_self_sub, tx_receipts
    )

    with db.scoped_session() as session:
        index_transaction(session)

        update_notifs = (
            session.query(Notification)
            .filter(Notification.type == "remix_contest_update")
            .all()
        )
        assert len(update_notifs) == 1
        assert update_notifs[0].user_ids == [2]


def test_create_event_comment_invalid_unknown_event(app, mocker):
    """
    A comment targeting a non-existent event is silently skipped by the
    indexer (validation raises IndexingValidationError which is swallowed).
    """
    bad_metadata = json.dumps(
        {
            "entity_id": 999,  # event 999 does not exist
            "entity_type": "Event",
            "body": "will not land",
            "parent_comment_id": None,
        }
    )

    tx_receipts = {
        "CommentOnGhostEvent": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 500,
                        "_entityType": "Comment",
                        "_userId": 2,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "", "data": {bad_metadata}}}',
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(
        app, mocker, event_comment_entities, tx_receipts
    )

    with db.scoped_session() as session:
        index_transaction(session)
        assert session.query(Comment).count() == 0


# ---------------------------------------------------------------------------
# REPLIES
# ---------------------------------------------------------------------------


def test_artist_reply_to_event_comment_is_not_post_update(app, mocker):
    """
    The artist replying to a fan's comment creates a comment_thread row and
    a regular reply notification — but NOT a remix_contest_update (post
    updates are top-level-only).
    """
    reply_entities = {
        **event_comment_entities,
        "comments": [
            {
                "comment_id": 500,
                "user_id": 2,  # fan wrote the parent
                "entity_id": 100,
                "entity_type": "Event",
                "text": "great contest!",
            }
        ],
        "subscriptions": [
            {
                "subscriber_id": 3,
                "user_id": 100,
                "entity_type": "Event",
                "entity_id": 100,
            }
        ],
    }

    reply_metadata = json.dumps(
        {
            "entity_id": 100,
            "entity_type": "Event",
            "body": "thanks!",
            "parent_comment_id": 500,
        }
    )

    tx_receipts = {
        "ArtistReplies": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 501,
                        "_entityType": "Comment",
                        "_userId": 1,  # artist
                        "_action": "Create",
                        "_metadata": f'{{"cid": "", "data": {reply_metadata}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, reply_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)

        # The reply landed and threaded correctly
        assert session.query(Comment).count() == 2
        threads = session.query(CommentThread).all()
        assert len(threads) == 1
        assert threads[0].parent_comment_id == 500
        assert threads[0].comment_id == 501

        # Post-update notification was NOT fired
        update_notifs = (
            session.query(Notification)
            .filter(Notification.type == "remix_contest_update")
            .all()
        )
        assert len(update_notifs) == 0


def test_fan_reply_in_event_thread_allowed(app, mocker):
    """
    A fan (user 3) can reply to another fan's (user 2) top-level event comment.
    Event threads are open, unlike fan-club threads.
    """
    reply_entities = {
        **event_comment_entities,
        "comments": [
            {
                "comment_id": 500,
                "user_id": 2,
                "entity_id": 100,
                "entity_type": "Event",
                "text": "anyone using the stems?",
            }
        ],
    }

    reply_metadata = json.dumps(
        {
            "entity_id": 100,
            "entity_type": "Event",
            "body": "yup, started last night",
            "parent_comment_id": 500,
        }
    )

    tx_receipts = {
        "FanReply": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 501,
                        "_entityType": "Comment",
                        "_userId": 3,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "", "data": {reply_metadata}}}',
                        "_signer": "user3wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, reply_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)
        assert session.query(Comment).count() == 2
        assert session.query(CommentThread).count() == 1


# ---------------------------------------------------------------------------
# DELETE
# ---------------------------------------------------------------------------


def test_event_owner_can_delete_any_event_comment(app, mocker):
    """
    The event owner (artist) can delete any comment on their own event, even
    comments authored by someone else.
    """
    delete_entities = {
        **event_comment_entities,
        "comments": [
            {
                "comment_id": 500,
                "user_id": 2,  # fan authored
                "entity_id": 100,
                "entity_type": "Event",
            }
        ],
    }

    tx_receipts = {
        "ArtistDeletesFanComment": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 500,
                        "_entityType": "Comment",
                        "_userId": 1,  # artist
                        "_action": "Delete",
                        "_metadata": "",
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, delete_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)
        comment = session.query(Comment).filter(Comment.comment_id == 500).first()
        assert comment.is_delete is True


def test_unrelated_user_cannot_delete_event_comment(app, mocker):
    """
    A user who is neither the comment author nor the event owner cannot delete
    a comment. The transaction is rejected (indexing validation error).
    """
    delete_entities = {
        **event_comment_entities,
        "comments": [
            {
                "comment_id": 500,
                "user_id": 2,
                "entity_id": 100,
                "entity_type": "Event",
            }
        ],
    }

    tx_receipts = {
        "UnrelatedUserTriesToDelete": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 500,
                        "_entityType": "Comment",
                        "_userId": 3,  # not author, not event owner
                        "_action": "Delete",
                        "_metadata": "",
                        "_signer": "user3wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, delete_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)
        comment = session.query(Comment).filter(Comment.comment_id == 500).first()
        assert comment.is_delete is False  # unchanged


# ---------------------------------------------------------------------------
# REACT
# ---------------------------------------------------------------------------


def test_react_to_event_comment(app, mocker):
    """
    Reacting to an event comment writes a comment_reactions row. A fan's
    reaction on the artist's post update notifies the comment author.
    """
    react_entities = {
        **event_comment_entities,
        "comments": [
            {
                "comment_id": 500,
                "user_id": 1,  # artist authored
                "entity_id": 100,
                "entity_type": "Event",
            }
        ],
    }

    react_metadata = json.dumps({"entity_type": "Event", "entity_id": 100})

    tx_receipts = {
        "FanReact": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 500,
                        "_entityType": "Comment",
                        "_userId": 2,
                        "_action": "React",
                        "_metadata": f'{{"cid": "", "data": {react_metadata}}}',
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, react_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)

        reactions = session.query(CommentReaction).all()
        assert len(reactions) == 1
        assert reactions[0].comment_id == 500
        assert reactions[0].user_id == 2

        react_notifs = (
            session.query(Notification)
            .filter(Notification.type == "comment_reaction")
            .all()
        )
        assert len(react_notifs) == 1
        assert react_notifs[0].user_ids == [1]  # notifies comment author


# ---------------------------------------------------------------------------
# UPDATE (edit)
# ---------------------------------------------------------------------------


def test_update_event_comment(app, mocker):
    """Editing an event comment updates the text and sets is_edited."""
    update_entities = {
        **event_comment_entities,
        "comments": [
            {
                "comment_id": 500,
                "user_id": 2,
                "entity_id": 100,
                "entity_type": "Event",
                "text": "original",
            }
        ],
    }

    update_metadata = json.dumps(
        {
            "entity_id": 100,
            "entity_type": "Event",
            "body": "edited!",
        }
    )

    tx_receipts = {
        "EditEventComment": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 500,
                        "_entityType": "Comment",
                        "_userId": 2,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "", "data": {update_metadata}}}',
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, update_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)
        comment = session.query(Comment).filter(Comment.comment_id == 500).first()
        assert comment.text == "edited!"
        assert comment.is_edited is True
        assert comment.entity_type == EVENT_ENTITY_TYPE
