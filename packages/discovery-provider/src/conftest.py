"""
Test fixtures to support unit testing
"""

from unittest.mock import MagicMock

import fakeredis
import pytest

import src.utils.db_session
import src.utils.elasticdsl
import src.utils.redis_connection
import src.utils.web3_provider
from src.utils.session_manager import SessionManager


# Test fixture to mock a postgres database using an in-memory alternative
@pytest.fixture()
def db_mock(monkeypatch):
    db = SessionManager("sqlite://", {})

    def get_db_read_replica():
        return db

    monkeypatch.setattr(
        src.utils.db_session, "get_db_read_replica", get_db_read_replica
    )

    return db


# Test fixture to mock a redis connection
@pytest.fixture()
def redis_mock(monkeypatch):
    redis = fakeredis.FakeStrictRedis()

    def get_redis():
        return redis

    monkeypatch.setattr(src.utils.redis_connection, "get_redis", get_redis)
    return redis


# Test fixture to mock an elasticsearch client
@pytest.fixture()
def esclient_mock(monkeypatch):
    esclient = MagicMock()

    def get_esclient():
        return esclient

    monkeypatch.setattr(src.utils.elasticdsl, "get_esclient", get_esclient)
    return esclient


# Test fixture that mocks getting monitor values
@pytest.fixture()
def get_monitors_mock(monkeypatch):
    mock_get_monitors = MagicMock()

    def get_monitors(monitors):
        return mock_get_monitors()

    monkeypatch.setattr(src.monitors.monitors, "get_monitors", get_monitors)
    return mock_get_monitors


@pytest.fixture
def mock_requests():
    """No-op; retained for get_health tests that list this fixture."""
