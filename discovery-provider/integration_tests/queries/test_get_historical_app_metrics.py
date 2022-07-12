from datetime import date, timedelta

from src.models.metrics.aggregate_daily_app_name_metrics import (
    AggregateDailyAppNameMetrics,
)
from src.models.metrics.aggregate_monthly_app_name_metrics import (
    AggregateMonthlyAppNameMetrics,
)
from src.queries.get_app_name_metrics import _get_historical_app_metrics
from src.utils.db_session import get_db

limit = 2
today = date.today()
yesterday = today - timedelta(days=1)
day_before_yesterday = today - timedelta(days=2)
thirty_days_ago = today - timedelta(days=30)


def test_get_historical_app_metrics(app):
    with app.app_context():
        db_mock = get_db()

    with db_mock.scoped_session() as session:
        session.bulk_save_objects(
            [
                AggregateDailyAppNameMetrics(
                    application_name="top-app",
                    count=1,
                    timestamp=thirty_days_ago - timedelta(days=1),
                ),
                AggregateDailyAppNameMetrics(
                    application_name="top-app", count=2, timestamp=thirty_days_ago
                ),
                AggregateDailyAppNameMetrics(
                    application_name="best-app", count=1, timestamp=thirty_days_ago
                ),
                AggregateDailyAppNameMetrics(
                    application_name="best-app", count=3, timestamp=yesterday
                ),
                AggregateDailyAppNameMetrics(
                    application_name="best-app", count=4, timestamp=today
                ),
                AggregateMonthlyAppNameMetrics(
                    application_name="top-app",
                    count=2,
                    timestamp=today - timedelta(days=367),
                ),
                AggregateMonthlyAppNameMetrics(
                    application_name="best-app",
                    count=4,
                    timestamp=today - timedelta(days=100),
                ),
                AggregateMonthlyAppNameMetrics(
                    application_name="other-app",
                    count=5,
                    timestamp=today - timedelta(days=100),
                ),
                AggregateMonthlyAppNameMetrics(
                    application_name="top-app", count=6, timestamp=today
                ),
            ]
        )

        aggregate_metrics = _get_historical_app_metrics(session, 0)
        daily_aggregate_metrics = aggregate_metrics["daily"]
        monthly_aggregate_metrics = aggregate_metrics["monthly"]

        assert len(daily_aggregate_metrics.items()) == 2
        assert daily_aggregate_metrics[str(thirty_days_ago)]["top-app"] == 2
        assert daily_aggregate_metrics[str(thirty_days_ago)]["best-app"] == 1
        assert daily_aggregate_metrics[str(yesterday)]["best-app"] == 3

        assert len(daily_aggregate_metrics.items()) == 2
        assert (
            monthly_aggregate_metrics[str(today - timedelta(days=367))]["top-app"] == 2
        )
        assert (
            monthly_aggregate_metrics[str(today - timedelta(days=100))]["best-app"] == 4
        )
        assert (
            monthly_aggregate_metrics[str(today - timedelta(days=100))]["other-app"]
            == 5
        )


def test_get_historical_app_metrics_with_min_count(app):
    with app.app_context():
        db_mock = get_db()

    with db_mock.scoped_session() as session:
        session.bulk_save_objects(
            [
                AggregateDailyAppNameMetrics(
                    application_name="best-app", count=4, timestamp=yesterday
                ),
                AggregateDailyAppNameMetrics(
                    application_name="best-app", count=3, timestamp=day_before_yesterday
                ),
                AggregateDailyAppNameMetrics(
                    application_name="top-app", count=6, timestamp=day_before_yesterday
                ),
                AggregateMonthlyAppNameMetrics(
                    application_name="other-app",
                    count=3,
                    timestamp=today - timedelta(days=100),
                ),
                AggregateMonthlyAppNameMetrics(
                    application_name="top-app",
                    count=6,
                    timestamp=today - timedelta(days=100),
                ),
            ]
        )

        # Min count of 4
        aggregate_metrics = _get_historical_app_metrics(session, 4)
        daily_aggregate_metrics = aggregate_metrics["daily"]
        monthly_aggregate_metrics = aggregate_metrics["monthly"]

        assert len(daily_aggregate_metrics.items()) == 2
        assert daily_aggregate_metrics[str(yesterday)]["best-app"] == 4
        assert daily_aggregate_metrics[str(day_before_yesterday)]["top-app"] == 6

        assert len(monthly_aggregate_metrics.items()) == 1
        assert (
            monthly_aggregate_metrics[str(today - timedelta(days=100))]["top-app"] == 6
        )
