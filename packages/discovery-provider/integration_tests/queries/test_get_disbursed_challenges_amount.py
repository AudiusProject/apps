from datetime import datetime, timedelta

from integration_tests.utils import populate_mock_db
from src.queries.get_disbursed_challenges_amount import (
    get_disbursed_challenges_amount,
    get_weekly_pool_window_start,
)
from src.utils.db_session import get_db


def test_get_disbursed_challenges_amount(app):
    with app.app_context():
        db = get_db()

    entities = {
        "challenge_disbursements": [
            {
                "challenge_id": "profile-completion",
                "specifier": "1",
                "user_id": 1,
                "amount": "5",
            },
            {
                "challenge_id": "profile-completion",
                "specifier": "2",
                "user_id": 2,
                "amount": "10",
            },
            {
                "challenge_id": "profile-completion",
                "specifier": "3",
                "user_id": 3,
                "amount": "20",
                "created_at": datetime.now() - timedelta(days=8),
            },
            {
                "challenge_id": "listen-streak",
                "specifier": "1",
                "user_id": 1,
                "amount": "4",
            },
            {
                "challenge_id": "listen-streak",
                "specifier": "2",
                "user_id": 2,
                "amount": "12",
            },
        ],
    }
    populate_mock_db(db, entities)
    with db.scoped_session() as session:
        amount_disbursed = get_disbursed_challenges_amount(
            session, "profile-completion", datetime.now() - timedelta(days=7)
        )
        assert amount_disbursed == 15


def test_get_weekly_pool_window_start():
    d1 = get_weekly_pool_window_start(datetime(year=2023, month=10, day=10, hour=10))
    assert d1 == datetime(year=2023, month=10, day=9, hour=16)

    d2 = get_weekly_pool_window_start(datetime(year=2023, month=10, day=13, hour=5))
    assert d2 == datetime(year=2023, month=10, day=9, hour=16)

    d3 = get_weekly_pool_window_start(datetime(year=2023, month=10, day=9, hour=10))
    assert d3 == datetime(year=2023, month=10, day=2, hour=16)
