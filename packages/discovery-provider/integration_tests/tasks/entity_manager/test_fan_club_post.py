"""
Tests for fan club text posts (entity_type FanClub) in the entity manager indexer.

entity_id is the artist's user_id; artist_coins must exist for validation.
"""

import json
import logging
from typing import List

from sqlalchemy import text
from web3.datastructures import AttributeDict

from integration_tests.challenges.index_helpers import UpdateTask
from integration_tests.utils import populate_mock_db
from src.challenges.challenge_event_bus import ChallengeEventBus, setup_challenge_bus
from src.models.comments.comment import FAN_CLUB_ENTITY_TYPE, Comment
from src.models.comments.comment_mention import CommentMention
from src.models.comments.comment_reaction import CommentReaction
from src.models.comments.comment_thread import CommentThread
from src.models.notifications.notification import Notification
from src.tasks.entity_manager.entity_manager import entity_manager_update
from src.utils.db_session import get_db

from web3 import Web3

logger = logging.getLogger(__name__)

# Base entities shared across fan club post (text post) tests.
# User 1 = artist / coin owner, User 2 = fan, User 3 = another fan.
fan_club_post_entities = {
    "users": [
        {"user_id": 1, "wallet": "user1wallet"},
        {"user_id": 2, "wallet": "user2wallet"},
        {"user_id": 3, "wallet": "user3wallet"},
    ],
    "tracks": [{"track_id": 1, "owner_id": 1}],
}

COIN_MINT = "CoinMintTestXXXXXXXXXXXXXXXXXXXXXXXXXX"

fan_club_post_metadata = {
    "entity_id": 1,  # artist user_id
    "entity_type": "FanClub",
    "body": "gm fan club",
    "parent_comment_id": None,
}

fan_club_post_metadata_json = json.dumps(fan_club_post_metadata)


def _seed_artist_coin(session, user_id=1, mint=COIN_MINT):
    """Insert an artist_coins row so the indexer's validation passes."""
    session.execute(
        text(
            "INSERT INTO artist_coins (mint, ticker, user_id, decimals) "
            "VALUES (:mint, :ticker, :user_id, :decimals) "
            "ON CONFLICT DO NOTHING"
        ),
        {"mint": mint, "ticker": "TEST", "user_id": user_id, "decimals": 6},
    )
    session.flush()


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

    # Seed artist_coins after populate_mock_db so the table exists from migrations.
    with db.scoped_session() as session:
        _seed_artist_coin(session)

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


def test_create_fan_club_post(app, mocker):
    """
    Non-owner fan club create is skipped; only the artist (entity owner) may post.
    Owner self-post does not trigger a root comment notification.
    """
    tx_receipts = {
        "FanPostRejected": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 1,
                        "_entityType": "Comment",
                        "_userId": 2,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "", "data": {fan_club_post_metadata_json}}}',
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
        "ArtistPost": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 2,
                        "_entityType": "Comment",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "", "data": {fan_club_post_metadata_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, fan_club_post_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)

        comments: List[Comment] = session.query(Comment).all()
        assert len(comments) == 1
        assert comments[0].entity_type == FAN_CLUB_ENTITY_TYPE
        assert comments[0].entity_id == 1
        assert comments[0].user_id == 1

        notifications = session.query(Notification).filter(
            Notification.type == "comment"
        ).all()
        assert len(notifications) == 0


def test_create_fan_club_post_invalid_no_artist_coin(app, mocker):
    """
    Creating a fan club post for a user_id that has no artist coin should be
    silently skipped (validation error).
    """
    bad_metadata = json.dumps({
        "entity_id": 99,  # user 99 doesn't exist and has no coin
        "entity_type": "FanClub",
        "body": "should fail",
        "parent_comment_id": None,
    })

    tx_receipts = {
        "BadFanClubPost": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 10,
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

    db, index_transaction = setup_test(app, mocker, fan_club_post_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)
        comments = session.query(Comment).all()
        assert len(comments) == 0


# ---------------------------------------------------------------------------
# REPLY
# ---------------------------------------------------------------------------


def test_fan_club_post_reply(app, mocker):
    """
    Only the fan club owner may reply. Owner replying to their own root post
    creates a thread row but no comment_thread notification (self-reply).
    """
    reply_entities = {
        **fan_club_post_entities,
        "comments": [
            {
                "comment_id": 1,
                "user_id": 1,
                "entity_id": 1,
                "entity_type": "FanClub",
            }
        ],
    }

    reply_metadata = json.dumps({
        **fan_club_post_metadata,
        "body": "replying to your post",
        "parent_comment_id": 1,
    })

    tx_receipts = {
        "FanClubPostReply": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 2,
                        "_entityType": "Comment",
                        "_userId": 1,
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

        assert session.query(Comment).count() == 2

        threads = session.query(CommentThread).all()
        assert len(threads) == 1
        assert threads[0].comment_id == 2
        assert threads[0].parent_comment_id == 1

        thread_notifs = (
            session.query(Notification)
            .filter(Notification.type == "comment_thread")
            .all()
        )
        assert len(thread_notifs) == 0


def test_fan_club_post_reply_non_owner_rejected(app, mocker):
    """
    A non-owner cannot create a fan club comment (including replies).
    """
    # Parent exists but replier is not the fan club owner; indexing skips the tx.
    reply_entities = {
        **fan_club_post_entities,
        "comments": [
            {
                "comment_id": 1,
                "user_id": 2,
                "entity_id": 1,
                "entity_type": "Track",
            }
        ],
    }

    cross_thread_metadata = json.dumps({
        "entity_id": 1,
        "entity_type": "FanClub",
        "body": "cross-thread reply",
        "parent_comment_id": 1,  # parent is a Track comment, not fan club
    })

    tx_receipts = {
        "CrossThreadReply": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 2,
                        "_entityType": "Comment",
                        "_userId": 3,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "", "data": {cross_thread_metadata}}}',
                        "_signer": "user3wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, reply_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)
        # Only the pre-existing comment should remain; the invalid reply is skipped
        assert session.query(Comment).count() == 1
        assert session.query(CommentThread).count() == 0


# ---------------------------------------------------------------------------
# DELETE
# ---------------------------------------------------------------------------


def test_delete_fan_club_post_by_author(app, mocker):
    """Fan club owner (author) can delete their own fan club text post."""
    delete_entities = {
        **fan_club_post_entities,
        "comments": [
            {
                "comment_id": 1,
                "user_id": 1,
                "entity_id": 1,
                "entity_type": "FanClub",
            }
        ],
    }

    tx_receipts = {
        "DeleteOwnComment": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 1,
                        "_entityType": "Comment",
                        "_userId": 1,
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
        comment = session.query(Comment).filter(Comment.comment_id == 1).first()
        assert comment.is_delete is True


def test_delete_fan_club_post_by_artist(app, mocker):
    """
    The artist (entity owner / entity_id) can delete any fan club text post in their
    thread, even if they didn't author it.
    """
    delete_entities = {
        **fan_club_post_entities,
        "comments": [
            {
                "comment_id": 1,
                "user_id": 2,  # fan authored
                "entity_id": 1,  # artist's fan club thread
                "entity_type": "FanClub",
            }
        ],
    }

    tx_receipts = {
        "ArtistDeletesFanPost": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 1,
                        "_entityType": "Comment",
                        "_userId": 1,  # artist deletes
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
        comment = session.query(Comment).filter(Comment.comment_id == 1).first()
        assert comment.is_delete is True


def test_delete_fan_club_post_by_other_fan_rejected(app, mocker):
    """
    A fan who is not the artist cannot delete the owner's fan club post
    (seeded row simulates legacy or direct DB; delete still denied for user 3).
    """
    delete_entities = {
        **fan_club_post_entities,
        "comments": [
            {
                "comment_id": 1,
                "user_id": 1,
                "entity_id": 1,
                "entity_type": "FanClub",
            }
        ],
    }

    tx_receipts = {
        "OtherFanTriesToDelete": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 1,
                        "_entityType": "Comment",
                        "_userId": 3,  # user 3 is neither author nor artist
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
        comment = session.query(Comment).filter(Comment.comment_id == 1).first()
        assert comment.is_delete is False  # unchanged


# ---------------------------------------------------------------------------
# REACT
# ---------------------------------------------------------------------------


def test_react_to_fan_club_post(app, mocker):
    """
    Reacting to a fan club text post creates a reaction record and notifies the
    comment author. Self-reactions do not notify.
    """
    react_entities = {
        **fan_club_post_entities,
        "comments": [
            {
                "comment_id": 1,
                "user_id": 1,
                "entity_id": 1,
                "entity_type": "FanClub",
            }
        ],
    }

    react_metadata = json.dumps({"entity_type": "FanClub", "entity_id": 1})

    tx_receipts = {
        "OwnerSelfReact": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 1,
                        "_entityType": "Comment",
                        "_userId": 1,
                        "_action": "React",
                        "_metadata": f'{{"cid": "", "data": {react_metadata}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "FanReact": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 1,
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
        assert len(reactions) == 2

        # Owner self-react does not notify; fan reaction notifies comment author (owner).
        react_notifs = (
            session.query(Notification)
            .filter(Notification.type == "comment_reaction")
            .all()
        )
        assert len(react_notifs) == 1
        assert react_notifs[0].user_ids == [1]


# ---------------------------------------------------------------------------
# UPDATE (edit)
# ---------------------------------------------------------------------------


def test_update_fan_club_post(app, mocker):
    """Editing a fan club text post updates the message and sets is_edited."""
    update_entities = {
        **fan_club_post_entities,
        "comments": [
            {
                "comment_id": 1,
                "user_id": 1,
                "entity_id": 1,
                "entity_type": "FanClub",
                "text": "original",
            }
        ],
    }

    update_metadata = json.dumps({
        "entity_id": 1,
        "entity_type": "FanClub",
        "body": "edited text",
    })

    tx_receipts = {
        "EditFanClubPost": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 1,
                        "_entityType": "Comment",
                        "_userId": 1,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "", "data": {update_metadata}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, update_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)

        comment = session.query(Comment).filter(Comment.comment_id == 1).first()
        assert comment.text == "edited text"
        assert comment.is_edited is True
        assert comment.entity_type == FAN_CLUB_ENTITY_TYPE


# ---------------------------------------------------------------------------
# MENTION
# ---------------------------------------------------------------------------


def test_fan_club_post_with_mention(app, mocker):
    """Mentions in a fan club text post generate mention notifications."""
    mention_metadata = json.dumps({
        **fan_club_post_metadata,
        "body": "hey @user3 check this out",
        "mentions": [3],
    })

    tx_receipts = {
        "FanClubPostMention": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 1,
                        "_entityType": "Comment",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "", "data": {mention_metadata}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, fan_club_post_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)

        mentions = session.query(CommentMention).all()
        assert len(mentions) == 1
        assert mentions[0].user_id == 3

        mention_notifs = (
            session.query(Notification)
            .filter(Notification.type == "comment_mention")
            .all()
        )
        assert len(mention_notifs) == 1
        assert mention_notifs[0].user_ids == [3]


# ---------------------------------------------------------------------------
# MIXED: Fan club post + Track comments don't interfere
# ---------------------------------------------------------------------------


def test_fan_club_post_and_track_comments_coexist(app, mocker):
    """
    Creating both a fan club post and a Track comment in the same block
    produces the correct entity_type on each and independent notifications.
    """
    track_comment_metadata = json.dumps({
        "entity_id": 1,
        "entity_type": "Track",
        "body": "great track!",
        "parent_comment_id": None,
    })

    tx_receipts = {
        "FanClubPost": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 1,
                        "_entityType": "Comment",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "", "data": {fan_club_post_metadata_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "TrackComment": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 2,
                        "_entityType": "Comment",
                        "_userId": 3,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "", "data": {track_comment_metadata}}}',
                        "_signer": "user3wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, fan_club_post_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)

        comments = session.query(Comment).order_by(Comment.comment_id).all()
        assert len(comments) == 2

        fan_club_post = comments[0]
        assert fan_club_post.entity_type == FAN_CLUB_ENTITY_TYPE
        assert fan_club_post.entity_id == 1

        track_comment = comments[1]
        assert track_comment.entity_type == "Track"
        assert track_comment.entity_id == 1

        # Fan club owner self-post does not notify; track comment notifies track owner.
        notifs = session.query(Notification).filter(
            Notification.type == "comment"
        ).all()
        assert len(notifs) == 1
        assert notifs[0].group_id == "comment:1:type:Track"


# ---------------------------------------------------------------------------
# FAN CLUB TEXT POST NOTIFICATION
# ---------------------------------------------------------------------------


def _seed_coin_holders(session, artist_user_id=1, holder_user_ids=None, mint=COIN_MINT):
    """Insert sol_user_balances rows so coin holders are discoverable."""
    if holder_user_ids is None:
        holder_user_ids = []
    for uid in holder_user_ids:
        session.execute(
            text(
                "INSERT INTO sol_user_balances (user_id, mint, balance) "
                "VALUES (:user_id, :mint, :balance) "
                "ON CONFLICT DO NOTHING"
            ),
            {"user_id": uid, "mint": mint, "balance": 1000000},
        )
    session.flush()


def test_fan_club_text_post_notification_sent_to_followers_and_coin_holders(app, mocker):
    """
    When an artist creates a root-level fan club text post, both followers
    and coin holders receive a fan_club_text_post notification (deduplicated).
    """
    # User 2 is a follower, User 3 is a coin holder, both should get notified
    entities_with_follows = {
        **fan_club_post_entities,
        "follows": [
            {"follower_user_id": 2, "followee_user_id": 1},
        ],
    }

    tx_receipts = {
        "ArtistFanClubPost": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 1,
                        "_entityType": "Comment",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "", "data": {fan_club_post_metadata_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, entities_with_follows, tx_receipts)

    with db.scoped_session() as session:
        # User 3 is a coin holder (not a follower)
        _seed_coin_holders(session, artist_user_id=1, holder_user_ids=[3])
        index_transaction(session)

        notifs = (
            session.query(Notification)
            .filter(Notification.type == "fan_club_text_post")
            .all()
        )
        assert len(notifs) == 2

        notif_user_ids = sorted([n.user_ids[0] for n in notifs])
        assert notif_user_ids == [2, 3]

        # Verify notification data
        for notif in notifs:
            assert notif.data["entity_user_id"] == 1
            assert notif.data["comment_id"] == 1
            assert notif.group_id == "fan_club_text_post:1:user:1"

        # No "comment" notification since artist is posting on their own fan club
        comment_notifs = (
            session.query(Notification)
            .filter(Notification.type == "comment")
            .all()
        )
        assert len(comment_notifs) == 0


def test_fan_club_text_post_notification_deduplicates(app, mocker):
    """
    A user who is both a follower and a coin holder receives only one notification.
    """
    entities_with_follows = {
        **fan_club_post_entities,
        "follows": [
            {"follower_user_id": 2, "followee_user_id": 1},
        ],
    }

    tx_receipts = {
        "ArtistFanClubPost": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 1,
                        "_entityType": "Comment",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "", "data": {fan_club_post_metadata_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, entities_with_follows, tx_receipts)

    with db.scoped_session() as session:
        # User 2 is both a follower AND a coin holder
        _seed_coin_holders(session, artist_user_id=1, holder_user_ids=[2])
        index_transaction(session)

        notifs = (
            session.query(Notification)
            .filter(Notification.type == "fan_club_text_post")
            .all()
        )
        assert len(notifs) == 1
        assert notifs[0].user_ids == [2]


def test_fan_club_text_post_notification_not_sent_for_replies(app, mocker):
    """
    Replies within a fan club thread should NOT send fan_club_text_post
    notifications (only root-level posts do).
    """
    reply_entities = {
        **fan_club_post_entities,
        "comments": [
            {
                "comment_id": 1,
                "user_id": 1,
                "entity_id": 1,
                "entity_type": "FanClub",
            }
        ],
    }

    reply_metadata = json.dumps({
        **fan_club_post_metadata,
        "body": "replying to my own post",
        "parent_comment_id": 1,
    })

    tx_receipts = {
        "ArtistReply": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 2,
                        "_entityType": "Comment",
                        "_userId": 1,
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
        _seed_coin_holders(session, artist_user_id=1, holder_user_ids=[2])
        index_transaction(session)

        # No fan_club_text_post notifications for replies
        notifs = (
            session.query(Notification)
            .filter(Notification.type == "fan_club_text_post")
            .all()
        )
        assert len(notifs) == 0


def test_fan_club_text_post_notification_no_followers_or_coin_holders(app, mocker):
    """
    If the artist has no followers or coin holders, no fan_club_text_post
    notifications are created (but the post itself is still indexed).
    """
    tx_receipts = {
        "ArtistPostNoFollowers": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 1,
                        "_entityType": "Comment",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "", "data": {fan_club_post_metadata_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
    }

    db, index_transaction = setup_test(app, mocker, fan_club_post_entities, tx_receipts)

    with db.scoped_session() as session:
        index_transaction(session)

        # Post is created
        comments = session.query(Comment).all()
        assert len(comments) == 1

        # No notifications
        notifs = (
            session.query(Notification)
            .filter(Notification.type == "fan_club_text_post")
            .all()
        )
        assert len(notifs) == 0
