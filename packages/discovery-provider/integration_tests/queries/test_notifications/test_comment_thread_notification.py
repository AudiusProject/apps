from integration_tests.utils import populate_mock_db
from src.queries.get_notifications import NotificationType, get_notifications
from src.utils.db_session import get_db

test_entities = {
    "users": [{"user_id": 1}, {"user_id": 2}],
    "tracks": [{"track_id": 1, "owner_id": 1}],
}


def test_get_comment_thread_notification(app):
    with app.app_context():
        db_mock = get_db()
        populate_mock_db(
            db_mock,
            {
                **test_entities,
                "comments": [
                    {"comment_id": 1, "user_id": 2, "entity_id": 1},
                    {"comment_id": 2, "user_id": 1, "entity_id": 1},
                ],
            },
        )

        test_actions = {
            "comment_threads": [{"parent_comment_id": 1, "comment_id": 2}],
        }
        populate_mock_db(db_mock, test_actions)

        with db_mock.scoped_session() as session:
            args = {"user_id": 2, "valid_types": [NotificationType.COMMENT_THREAD]}
            u2_notifications = get_notifications(session, args)
            assert len(u2_notifications) == 1

            notification = u2_notifications[0]
            assert notification["type"] == "comment_thread"
            assert notification["group_id"] == "comment_thread:1"
            assert notification["is_seen"] == False

            notification_data = u2_notifications[0]["actions"][0]["data"]
            assert notification_data["entity_id"] == 1
            assert notification_data["type"] == "Track"
            assert notification_data["entity_user_id"] == 1
            assert notification_data["comment_user_id"] == 1


# If parent comment owner replies on their own comment, they do not receive a notification
def test_get_owner_comment_notifications(app):
    with app.app_context():
        db_mock = get_db()

        populate_mock_db(
            db_mock,
            {
                **test_entities,
                "comments": [
                    {"comment_id": 1, "user_id": 1, "entity_id": 1},
                    {"comment_id": 2, "user_id": 1, "entity_id": 1},
                ],
            },
        )

        test_actions = {
            "comment_threads": [{"parent_comment_id": 1, "comment_id": 2}],
        }
        populate_mock_db(db_mock, test_actions)

        with db_mock.scoped_session() as session:
            args = {"user_id": 1, "valid_types": [NotificationType.COMMENT_THREAD]}
            u1_notifications = get_notifications(session, args)

            assert len(u1_notifications) == 0


# Parent comment owner only gets one notification per replier
def test_prevent_thread_spam(app):
    with app.app_context():
        db_mock = get_db()

        populate_mock_db(
            db_mock,
            {
                **test_entities,
                "comments": [
                    {"comment_id": 1, "user_id": 1, "entity_id": 1},
                    {"comment_id": 2, "user_id": 2, "entity_id": 1},
                    {"comment_id": 3, "user_id": 2, "entity_id": 1},
                ],
            },
        )

        test_actions = {
            "comment_threads": [
                {"parent_comment_id": 1, "comment_id": 2},
                {"parent_comment_id": 1, "comment_id": 3},
            ],
        }
        populate_mock_db(db_mock, test_actions)

        with db_mock.scoped_session() as session:
            args = {"user_id": 1, "valid_types": [NotificationType.COMMENT_THREAD]}
            u1_notifications = get_notifications(session, args)

            assert len(u1_notifications) == 1


def test_thread_priority(app):
    with app.app_context():
        db_mock = get_db()

        populate_mock_db(
            db_mock,
            {
                **test_entities,
                "comments": [
                    {"comment_id": 1, "user_id": 1, "entity_id": 1},
                    {"comment_id": 2, "user_id": 2, "entity_id": 1},
                ],
            },
        )

        test_actions = {
            "comment_threads": [
                {"parent_comment_id": 1, "comment_id": 2},
            ],
        }
        populate_mock_db(db_mock, test_actions)

        with db_mock.scoped_session() as session:
            args = {
                "user_id": 1,
                "valid_types": [
                    NotificationType.COMMENT,
                    NotificationType.COMMENT_THREAD,
                ],
            }
            u1_notifications = get_notifications(session, args)

            assert len(u1_notifications) == 2
            assert u1_notifications[0]["type"] == "comment_thread"
            assert u1_notifications[1]["type"] == "comment"
