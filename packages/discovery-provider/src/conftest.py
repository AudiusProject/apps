"""
Test fixtures to support unit testing
"""

from unittest.mock import MagicMock

import fakeredis
import pytest
import requests

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
def mock_requests(monkeypatch):
    real_get = requests.get

    def mock_relay_health(*args, **kwargs):
        url = args[0]

        # Check if the URL and endpoint match the ones you want to mock
        if url == "http://relay:6001/relay/health":
            # Create a dictionary representing the JSON response
            json_response = {"status": "up"}

            class MockResponse:
                def __init__(self, json_data, status_code):
                    self.json_data = json_data
                    self.status_code = status_code

                def json(self):
                    return self.json_data

            # Replace requests.get with a function that returns a mocked response with JSON
            return MockResponse(json_response, 200)

        # For all other URLs and endpoints, perform the actual request using requests.get
        return real_get(*args, **kwargs)  # Call the original requests.get

    # Apply the mock_get function to requests.get
    monkeypatch.setattr(requests, "get", mock_relay_health)
