from datetime import datetime

from integration_tests.utils import populate_mock_db
from src.queries.get_collection_library import (
    CollectionType,
    GetCollectionLibraryArgs,
    LibraryFilterType,
    _get_collection_library,
)
from src.queries.get_track_library import SortDirection, SortMethod
from src.utils.db_session import get_db


def populate_entries(db):
    test_entities = {
        "playlists": [
            # playlists -----
            {
                "playlist_id": 1,
                "playlist_owner_id": 1,
                "is_album": False,
                "created_at": datetime(2019, 6, 17),
            },
            # reposted
            {
                "playlist_id": 3,
                "playlist_owner_id": 2,
                "is_album": False,
                "created_at": datetime(2019, 6, 15),
            },
            # albums -------
            {
                "playlist_id": 2,
                "playlist_owner_id": 1,
                "is_album": True,
                "created_at": datetime(2019, 6, 17),
                "playlist_name": "asdf",
            },
            # saved
            {
                "playlist_id": 4,
                "playlist_owner_id": 2,
                "is_album": True,
                "created_at": datetime(2019, 6, 15),
                "playlist_name": "xyz",
            },
        ],
        "users": [
            {"user_id": 1},
            {"user_id": 2, "name": "testhandle123"},
            {"user_id": 3},
            {"user_id": 4},
        ],
    }
    test_social_feature_entities = {
        "reposts": [
            {
                "repost_item_id": 3,
                "repost_type": "playlist",
                "user_id": 1,
                "created_at": datetime(2019, 6, 16),
            }
        ],
        "saves": [
            {
                "save_item_id": 4,
                "save_type": "album",
                "user_id": 1,
                "created_at": datetime(2019, 6, 16),
            }
        ],
    }
    populate_mock_db(db, test_entities)
    populate_mock_db(db, test_social_feature_entities)


def with_collection_library_setup(test_fn):
    def wrapper(app):
        with app.app_context():
            db = get_db()
        populate_entries(db)
        with db.scoped_session() as session:
            test_fn(session)

    return wrapper


def assert_correct_collection(collections, index, playlist_id, note):
    assert collections[index]["playlist_id"] == playlist_id, note


@with_collection_library_setup
def test_distinguishes_albums_vs_favorites(session):
    args = GetCollectionLibraryArgs(
        user_id=1,
        limit=10,
        offset=0,
        filter_type=LibraryFilterType.all,
        collection_type=CollectionType.album,
    )

    # Default to descending sort on item_created_at
    res = _get_collection_library(args, session)
    assert len(res) == 2
    assert_correct_collection(res, 0, 2, "should get only albums")
    assert_correct_collection(res, 1, 4, "should get only albums")

    args["collection_type"] = CollectionType.playlist
    res = _get_collection_library(args, session)
    assert len(res) == 2
    assert_correct_collection(res, 0, 1, "should only playlists")
    assert_correct_collection(res, 1, 3, "should only playlists")


@with_collection_library_setup
def test_filter_methods(session):
    args = GetCollectionLibraryArgs(
        user_id=1,
        limit=10,
        offset=0,
        filter_type=LibraryFilterType.favorite,
        collection_type=CollectionType.album,
    )

    # Default to descending sort on item_created_at
    # Favorite should also return 'own' items
    res = _get_collection_library(args, session)
    assert len(res) == 2
    assert_correct_collection(res, 0, 2, "should get only saved albums")
    assert_correct_collection(res, 1, 4, "should get only saved albums")

    args["filter_type"] = LibraryFilterType.repost
    args["collection_type"] = CollectionType.playlist

    res = _get_collection_library(args, session)
    assert len(res) == 1
    assert_correct_collection(res, 0, 3, "should get only reposted albums")


# Distinguishes albums and playlists
@with_collection_library_setup
def test_sort_orders(session):
    # Test by sort method: added_date, reposts, saves

    # Test added date
    args = GetCollectionLibraryArgs(
        user_id=1,
        limit=10,
        offset=0,
        filter_type=LibraryFilterType.all,
        collection_type=CollectionType.album,
        sort_direction=SortDirection.desc,
        sort_method=SortMethod.added_date,
    )

    res = _get_collection_library(args, session)
    assert len(res) == 2
    assert_correct_collection(res, 0, 2, "sort by desc item_created_at")
    assert_correct_collection(res, 1, 4, "sort by desc item_created_at")

    # Test sort by fav count
    args["sort_method"] = SortMethod.saves
    res = _get_collection_library(args, session)
    assert len(res) == 2
    assert_correct_collection(res, 0, 4, "sort by desc save")
    assert_correct_collection(res, 1, 2, "sort by desc save")

    # Test sort by repost count
    args["sort_method"] = SortMethod.reposts
    args["collection_type"] = CollectionType.playlist
    res = _get_collection_library(args, session)
    assert len(res) == 2
    assert_correct_collection(res, 0, 3, "sort by desc repost")
    assert_correct_collection(res, 1, 1, "sort by desc repost")


@with_collection_library_setup
def test_query(session):
    # query by self playlist tile
    args = GetCollectionLibraryArgs(
        user_id=1,
        limit=10,
        offset=0,
        filter_type=LibraryFilterType.all,
        collection_type=CollectionType.album,
        sort_direction=SortDirection.desc,
        sort_method=SortMethod.added_date,
        query="asdf",
    )

    res = _get_collection_library(args, session)
    assert len(res) == 1
    assert_correct_collection(res, 0, 2, "matches track title query for self playlist")

    # By saved playlist title
    args = GetCollectionLibraryArgs(
        user_id=1,
        limit=10,
        offset=0,
        filter_type=LibraryFilterType.all,
        collection_type=CollectionType.album,
        sort_direction=SortDirection.desc,
        sort_method=SortMethod.added_date,
        query="xyz",
    )

    res = _get_collection_library(args, session)
    assert len(res) == 1
    assert_correct_collection(
        res, 0, 4, "matches track title query for saved playlist "
    )

    # query by user handle
    args["sort_method"] = SortMethod.reposts
    args["collection_type"] = CollectionType.playlist
    args["query"] = "testhandle123"
    res = _get_collection_library(args, session)
    assert len(res) == 1
    assert_correct_collection(res, 0, 3, "matches user handle")
