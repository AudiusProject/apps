from __future__ import absolute_import

import ast
import os
import subprocess
from contextlib import contextmanager

import pytest
from pytest_postgresql import factories
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy_utils import create_database, database_exists, drop_database

from flask import Flask

import src
from src.app import create_celery
from src.challenges.create_new_challenges import create_new_challenges
from src.models.base import Base
from src.utils import helpers
from src.utils.db_session import set_session_managers
from src.utils.redis_connection import get_redis
from src.utils.session_manager import SessionManager

DB_URL = os.getenv(
    "audius_db_url",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/audius_discovery",
)

# set DB_URL in environ for sake of pg_migrate.sh
os.environ["DB_URL"] = DB_URL
os.environ["PG_MIGRATE_TEST_MODE"] = "true"

TEST_BROKER_URL = os.getenv("audius_redis_url", "redis://localhost:5379/0")
ENGINE_ARGS_LITERAL = '{ \
    "pool_size": 10, \
    "max_overflow": 0, \
    "pool_recycle": 3600, \
    "echo": False,\
    "client_encoding": "utf8",\
    "connect_args": {"options": "-c timezone=utc"},}'

TEST_CONFIG_OVERRIDE = {
    "db": {
        "url": DB_URL,
        "url_read_replica": DB_URL,
        "engine_args_literal": ENGINE_ARGS_LITERAL,
        "run_migrations": "true",
    },
}


template_db_ready = False


def pg_migrate_sh():
    template_db_url = DB_URL + "_template"

    global template_db_ready
    if not template_db_ready:
        # Drop DB, ensuring migration performed at start
        if database_exists(template_db_url):
            drop_database(template_db_url)
        create_database(template_db_url)

        subprocess.run(
            "./pg_migrate.sh",
            shell=True,
            cwd=os.getcwd() + "/ddl",
            env={
                **os.environ,
                "DB_URL": template_db_url,
                "PG_MIGRATE_TEST_MODE": "true",
            },
            check=True,
        )

        template_db_ready = True

    # recreate database from template for each test
    if database_exists(DB_URL):
        drop_database(DB_URL)

    tempalte_name = template_db_url[template_db_url.rindex("/") + 1 :]
    create_database(DB_URL, template=tempalte_name)


class _TestApp:
    """A minimal stand-in for the Flask app fixture.

    Provides a no-op `app_context()` so existing tests can keep using
    `with app.app_context():` while the underlying db session managers are
    populated via the global `set_session_managers` mechanism. Wraps a real
    Flask app so tests that need `test_request_context()` (for code paths
    that read `flask.request.args`, e.g. `paginate_query`) keep working.
    """

    def __init__(self):
        self._flask_app = Flask(__name__)

    @contextmanager
    def app_context(self):
        with self._flask_app.app_context():
            yield self

    def test_request_context(self, *args, **kwargs):
        return self._flask_app.test_request_context(*args, **kwargs)


@contextmanager
def app_impl():
    pg_migrate_sh()

    # Clear any existing logging config
    helpers.reset_logging()

    # Drop redis
    redis = get_redis()
    redis.flushall()

    engine_args = ast.literal_eval(ENGINE_ARGS_LITERAL)
    db = SessionManager(DB_URL, engine_args)
    db_read_replica = SessionManager(DB_URL, engine_args)
    set_session_managers(db, db_read_replica)

    # Seed the challenges table from challenges.json. In production this is
    # done by `configure_celery` at celery startup; in tests we must do it
    # explicitly so challenge/notification tests have the rows they expect.
    with db.scoped_session() as session:
        create_new_challenges(session)

    yield _TestApp()


@pytest.fixture
def app():
    with app_impl() as app:
        yield app


@pytest.fixture(scope="module")
def app_module():
    with app_impl() as app:
        yield app


@pytest.fixture(scope="session")
def celery_config():
    return {
        "broker_url": TEST_BROKER_URL,
        "imports": [],
        "task_serializer": "json",
        "accept_content": ["json"],
        "task_always_eager": True,
    }


@pytest.fixture(scope="module")
def celery_app():
    """
    Configures a test fixture for celery.
    Usage:
    ```
    def test_something(celery_app):
        task = celery_app.celery.tasks["update_something"]
        db = task.db
        with db.scoped_session():
            pass
    ```

    Note: This fixture must be at module scope because celery
    works by autodiscovering tasks with a decorator at import time of a module.
    If you try to use celery as a fixture at the function scope,
    you will run into mysterious errors as some task context may be stale!
    """
    # Drop DB, ensuring migration performed at start
    pg_migrate_sh()

    # Drop redis
    redis = get_redis()
    redis.flushall()

    # Clear any existing logging config
    helpers.reset_logging()

    # Call to create_celery returns an object containing the following:
    # 'Celery' - base Celery application
    # 'celery' - src.tasks.celery_app
    # Hence, references to the discovery provider celery application
    # Are formatted as:
    #   'celery_app.celery._some_res_or_func'
    celery_app = create_celery(TEST_CONFIG_OVERRIDE)

    yield celery_app
    if database_exists(DB_URL):
        drop_database(DB_URL)
    redis.flushall()


postgresql_my = factories.postgresql("postgresql_nooproc")


# Returns Postgres DB session, and configures
# SQLAlchemy to use said connection.
# This fixture is primarily used by the
# `postgres_mock_db` fixture, and probably shouldn't
# be consumed directly by a test.
#
# More or less follows steps here:
# https://medium.com/@geoffreykoh/fun-with-fixtures-for-database-applications-8253eaf1a6d
# pylint: disable=W0621
@pytest.fixture(scope="function")
def setup_database(postgresql_my):
    def dbcreator():
        return postgresql_my.cursor().connection

    engine = create_engine("postgresql+psycopg2://", creator=dbcreator)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # pytest allows you to yield a value as
    # a return, and any code following the yield
    # is run as cleanup after test execution
    yield session
    session.close()


# Returns a mocked db instance.
#
# Calls setup_database
# to set up SQLAlchemy with Postgres.
#
# Monkeypatches get_db_read_replica
# to return this mocked db instance.
# pylint: disable=W0621
@pytest.fixture(scope="function")
def postgres_mock_db(monkeypatch, setup_database):
    # A mock Session, with __enter__ and __exit
    # methods so we can follow the standard
    # `with db.scoped_session() as session`
    # process.
    class MockSession:
        def __enter__(self):
            return setup_database

        def __exit__(self, type, value, tb):
            pass

        def scoped_session(self):
            return setup_database

    # A mock DB, which just returns
    # the MockSession.
    class MockDb:
        def scoped_session(self):
            return MockSession()

    mock = MockDb()

    def get_db_read_replica():
        return mock

    monkeypatch.setattr(
        src.utils.db_session, "get_db_read_replica", get_db_read_replica
    )

    return mock
