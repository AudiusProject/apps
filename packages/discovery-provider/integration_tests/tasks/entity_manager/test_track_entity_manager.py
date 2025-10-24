import json
import logging  # pylint: disable=C0302
from datetime import datetime
from typing import List

from web3 import Web3
from web3.datastructures import AttributeDict

from integration_tests.challenges.index_helpers import UpdateTask
from integration_tests.utils import populate_mock_db
from src.challenges.challenge_event_bus import ChallengeEventBus, setup_challenge_bus
from src.models.notifications.notification import Notification
from src.models.tracks.track import Track
from src.models.tracks.track_route import TrackRoute
from src.tasks.entity_manager.entity_manager import (
    ENABLE_DEVELOPMENT_FEATURES,
    entity_manager_update,
)
from src.tasks.entity_manager.utils import CHARACTER_LIMIT_DESCRIPTION, TRACK_ID_OFFSET
from src.utils.db_session import get_db

logger = logging.getLogger(__name__)

default_metadata = {
    "cover_art": None,
    "cover_art_sizes": "QmdxhDiRUC3zQEKqwnqksaSsSSeHiRghjwKzwoRvm77yaZ",
    "tags": "realmagic,rickyreed,theroom",
    "genre": "R&B/Soul",
    "mood": "Empowering",
    "credits_splits": None,
    "created_at": "2020-07-11 08:22:15",
    "create_date": None,
    "updated_at": "2020-07-11 08:22:15",
    "release_date": "2020-07-11 08:22:15",
    "file_type": None,
    "is_playlist_upload": True,
    "track_segments": [
        {
            "duration": 6.016,
            "multihash": "QmabM5svgDgcRdQZaEKSMBCpSZrrYy2y87L8Dx8EQ3T2jp",
        }
    ],
    "has_current_user_reposted": False,
    "is_current": True,
    "is_unlisted": False,
    "field_visibility": {
        "mood": True,
        "tags": True,
        "genre": True,
        "share": True,
        "play_count": True,
        "remixes": True,
    },
    "remix_of": None,
    "repost_count": 12,
    "save_count": 21,
    "description": "some description",
    "license": "All rights reserved",
    "isrc": None,
    "iswc": None,
    "track_id": 77955,
    "stem_of": None,
    "ai_attribution_user_id": None,
    "orig_file_cid": "original-file-cid",
    "orig_filename": "original-filename",
    "is_original_available": False,
}


def test_index_valid_track(app, mocker):
    "Tests valid batch of tracks create/update/delete actions"

    if not ENABLE_DEVELOPMENT_FEATURES:
        logger.info("Skipping entity manager track testing")
        return

    # setup db and mocked txs
    with app.app_context():
        db = get_db()
        web3 = Web3()
        challenge_event_bus: ChallengeEventBus = setup_challenge_bus()
        update_task = UpdateTask(web3, challenge_event_bus)

    test_metadata = {
        "QmCreateTrack1": {
            "owner_id": 1,
            "track_cid": "some-track-cid",
            "title": "track 1",
            "cover_art": None,
            "cover_art_sizes": "QmdxhDiRUC3zQEKqwnqksaSsSSeHiRghjwKzwoRvm77yaZ",
            "tags": "realmagic,rickyreed,theroom",
            "genre": "R&B/Soul",
            "mood": "Empowering",
            "credits_splits": None,
            "created_at": "2020-07-11 08:22:15",
            "create_date": None,
            "updated_at": "2020-07-11 08:22:15",
            "release_date": "2020-07-11 08:22:15",
            "file_type": None,
            "is_playlist_upload": True,
            "duration": 100,
            "track_segments": [
                {
                    "duration": 6.016,
                    "multihash": "QmabM5svgDgcRdQZaEKSMBCpSZrrYy2y87L8Dx8EQ3T2jp",
                }
            ],
            "has_current_user_reposted": False,
            "is_current": True,
            "is_unlisted": True,
            "is_stream_gated": False,
            "stream_conditions": None,
            "is_download_gated": False,
            "download_conditions": None,
            "field_visibility": {
                "mood": True,
                "tags": True,
                "genre": True,
                "share": True,
                "play_count": True,
                "remixes": True,
            },
            "remix_of": {"tracks": [{"parent_track_id": 75808}]},
            "repost_count": 12,
            "save_count": 21,
            "description": None,
            "license": "All rights reserved",
            "isrc": None,
            "iswc": None,
            "track_id": 77955,
            "stem_of": None,
            "ai_attribution_user_id": 2,
            "orig_file_cid": "original-file-cid",
            "orig_filename": "original-filename",
            "is_downloadable": False,
            "is_original_available": False,
            "allowed_api_keys": ["0xApiKey"],
        },
        "QmCreateTrack2": {
            "owner_id": 1,
            "track_cid": "some-track-cid-2",
            "title": "track 2",
            "cover_art": None,
            "cover_art_sizes": "QmQKXkVxGBbCFjcnhgxftzYDhph1CT8PJCuPEsRpffjjGC",
            "tags": None,
            "genre": "Electronic",
            "mood": None,
            "credits_splits": None,
            "created_at": None,
            "create_date": None,
            "updated_at": None,
            "release_date": None,
            "file_type": None,
            "track_segments": [],
            "has_current_user_reposted": False,
            "is_current": True,
            "is_unlisted": False,
            "is_stream_gated": False,
            "stream_conditions": None,
            "is_download_gated": False,
            "download_conditions": None,
            "field_visibility": {
                "genre": True,
                "mood": True,
                "tags": True,
                "share": True,
                "play_count": True,
                "remixes": True,
            },
            "remix_of": None,
            "repost_count": 0,
            "save_count": 0,
            "description": "",
            "license": "",
            "isrc": "",
            "iswc": "",
            "is_playlist_upload": True,
            "duration": 200,
            "orig_file_cid": "original-file-cid-2",
            "orig_filename": "original-filename-2",
            "is_downloadable": False,
            "is_original_available": False,
        },
        "QmCreateTrack3": {  # scheduled release
            "owner_id": 1,
            "track_cid": "some-track-cid-3",
            "title": "track 3",
            "cover_art": None,
            "cover_art_sizes": "QmQKXkVxGBbCFjcnhgxftzYDhph1CT8PJCuPEsRpffjjGC",
            "tags": None,
            "genre": "Rock",
            "mood": None,
            "credits_splits": None,
            "created_at": None,
            "create_date": None,
            "updated_at": None,
            "release_date": "2030-11-30T08:00:00.000Z",
            "file_type": None,
            "track_segments": [],
            "has_current_user_reposted": False,
            "is_current": True,
            "is_scheduled_release": True,
            "is_unlisted": False,  # is_unlisted is overriden by is_scheduled_release
            "is_stream_gated": False,
            "stream_conditions": None,
            "is_download_gated": False,
            "download_conditions": None,
            "field_visibility": {
                "genre": True,
                "mood": True,
                "tags": True,
                "share": True,
                "play_count": True,
                "remixes": True,
            },
            "remix_of": None,
            "repost_count": 0,
            "save_count": 0,
            "description": "",
            "license": "",
            "isrc": "",
            "iswc": "",
            "is_playlist_upload": False,
            "orig_file_cid": "original-file-cid-3",
            "orig_filename": "original-filename-3",
            "is_downloadable": False,
            "is_original_available": False,
        },
        "QmCreateTrack4": {
            "owner_id": 2,
            "track_cid": "some-track-cid-4",
            "title": "track 4",
            "cover_art": None,
            "cover_art_sizes": "QmQKXkVxGBbCFjcnhgxftzYDhph1CT8PJCuPEsRpffjjGC",
            "tags": None,
            "genre": "Rock",
            "mood": None,
            "credits_splits": None,
            "created_at": None,
            "create_date": None,
            "updated_at": None,
            "release_date": None,
            "file_type": None,
            "track_segments": [],
            "has_current_user_reposted": False,
            "is_current": True,
            "is_unlisted": False,
            "is_stream_gated": False,
            "stream_conditions": None,
            "is_download_gated": False,
            "download_conditions": None,
            "field_visibility": {
                "genre": True,
                "mood": True,
                "tags": True,
                "share": True,
                "play_count": True,
                "remixes": True,
            },
            "remix_of": None,
            "repost_count": 0,
            "save_count": 0,
            "description": "",
            "license": "",
            "isrc": "",
            "iswc": "",
            "is_playlist_upload": False,
            "orig_file_cid": "original-file-cid-4",
            "orig_filename": "original-filename-4",
            "is_downloadable": False,
            "is_original_available": False,
            "placement_hosts": "https://host1.com,https://host2.com,https://host3.com,https://host4.com",
        },
        "QmCreateTrack5": {
            "owner_id": 2,
            "track_cid": "some-track-cid-5",
            "title": "track 5",
            "cover_art": None,
            "cover_art_sizes": "QmQKXkVxGBbCFjcnhgxftzYDhph1CT8PJCuPEsRpffjjGC",
            "tags": None,
            "genre": "Rock",
            "mood": None,
            "credits_splits": None,
            "created_at": None,
            "create_date": None,
            "updated_at": None,
            "release_date": None,
            "file_type": None,
            "track_segments": [],
            "has_current_user_reposted": False,
            "is_current": True,
            "is_unlisted": False,
            "is_stream_gated": False,
            "stream_conditions": None,
            "is_download_gated": False,
            "download_conditions": None,
            "field_visibility": {
                "genre": True,
                "mood": True,
                "tags": True,
                "share": True,
                "play_count": True,
                "remixes": True,
            },
            "remix_of": None,
            "repost_count": 0,
            "save_count": 0,
            "description": "",
            "license": "",
            "isrc": "",
            "iswc": "",
            "is_playlist_upload": False,
            "orig_file_cid": "original-file-cid-5",
            "orig_filename": "original-filename-5",
            "is_downloadable": False,
            "is_original_available": False,
            "placement_hosts": "https://host1.com,https://host2.com,https://host3.com,https://host4.com",
        },
        "QmUpdateTrack1": {
            "title": "track 1 2",
            "description": "updated description",
        },
        "QmUpdateTrack2": {"is_unlisted": False},
    }

    create_track1_json = json.dumps(test_metadata["QmCreateTrack1"])
    create_track2_json = json.dumps(test_metadata["QmCreateTrack2"])
    create_track3_json = json.dumps(test_metadata["QmCreateTrack3"])
    create_track4_json = json.dumps(test_metadata["QmCreateTrack4"])
    create_track5_json = json.dumps(test_metadata["QmCreateTrack5"])
    update_track1_json = json.dumps(test_metadata["QmUpdateTrack1"])
    update_track2_json = json.dumps(test_metadata["QmUpdateTrack2"])
    tx_receipts = {
        "CreateTrack1Tx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "QmCreateTrack1", "data": {create_track1_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "UpdateTrack1Tx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "QmUpdateTrack1", "data": {update_track1_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "DeleteTrack1Tx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Delete",
                        "_metadata": "",
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "CreateTrack2Tx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET + 1,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "QmCreateTrack2", "data": {create_track2_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "UpdateTrack2Tx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET + 1,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "QmUpdateTrack2", "data": {update_track2_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "CreateTrack3Tx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET + 2,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "QmCreateTrack3", "data": {create_track3_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        # Delegated track write (user to app)
        "CreateTrack4Tx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET + 3,
                        "_entityType": "Track",
                        "_userId": 2,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "QmCreateTrack4", "data": {create_track4_json}}}',
                        "_signer": "0x3a388671bb4D6E1Ea08D79Ee191b40FB45A8F4C4",
                    }
                )
            },
        ],
        # Delegated track write (user to user)
        "CreateTrack5Tx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET + 4,
                        "_entityType": "Track",
                        "_userId": 2,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "QmCreateTrack5", "data": {create_track5_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
    }

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

    entities = {
        "users": [
            {"user_id": 1, "handle": "user-1", "wallet": "user1wallet"},
            {
                "user_id": 2,
                "handle": "user-2",
                "wallet": "user2wallet",
                "allow_ai_attribution": True,
            },
        ],
        "developer_apps": [
            {
                "user_id": 1,
                "name": "My App",
                "address": "0x3a388671bb4D6E1Ea08D79Ee191b40FB45A8F4C4",
            },
        ],
        "grants": [
            {
                "user_id": 2,
                "grantee_address": "0x3a388671bb4D6E1Ea08D79Ee191b40FB45A8F4C4",
            },
            {"user_id": 2, "grantee_address": "user1wallet", "is_approved": True},
            {"user_id": 1, "grantee_address": "user2wallet", "is_approved": None},
        ],
    }
    populate_mock_db(db, entities)

    with db.scoped_session() as session:
        # index transactions
        entity_manager_update(
            update_task,
            session,
            entity_manager_txs,
            block_number=0,
            block_timestamp=1585336422,
            block_hash=hex(0),
        )

        # validate db records
        all_tracks: List[Track] = session.query(Track).all()
        assert len(all_tracks) == 5

        track_1: Track = (
            session.query(Track)
            .filter(Track.is_current == True, Track.track_id == TRACK_ID_OFFSET)
            .first()
        )
        assert track_1.description == "updated description"
        assert track_1.ai_attribution_user_id == 2
        assert track_1.is_unlisted
        assert track_1.is_delete == True
        assert track_1.duration == 100
        assert track_1.allowed_api_keys == ["0xapikey"]

        track_2: Track = (
            session.query(Track)
            .filter(
                Track.is_current == True,
                Track.track_id == TRACK_ID_OFFSET + 1,
            )
            .first()
        )
        assert track_2.title == "track 2"
        assert track_2.is_delete == False
        assert track_2.duration == 200
        assert track_2.is_unlisted == False

        track_3: Track = (
            session.query(Track)
            .filter(
                Track.is_current == True,
                Track.track_id == TRACK_ID_OFFSET + 2,
            )
            .first()
        )
        assert track_3.title == "track 3"
        assert track_3.is_delete == False
        assert track_3.is_unlisted == True

        track_4: Track = (
            session.query(Track)
            .filter(
                Track.is_current == True,
                Track.track_id == TRACK_ID_OFFSET + 3,
            )
            .first()
        )
        assert track_4.title == "track 4"
        assert track_4.is_delete == False
        assert (
            track_4.placement_hosts
            == "https://host1.com,https://host2.com,https://host3.com,https://host4.com"
        )

        track_5: Track = (
            session.query(Track)
            .filter(
                Track.is_current == True,
                Track.track_id == TRACK_ID_OFFSET + 4,
            )
            .first()
        )
        assert track_5.title == "track 5"
        assert track_5.is_delete == False
        assert (
            track_5.placement_hosts
            == "https://host1.com,https://host2.com,https://host3.com,https://host4.com"
        )

        # Check that track routes are updated appropriately
        track_routes = (
            session.query(TrackRoute)
            .filter(TrackRoute.track_id == TRACK_ID_OFFSET)
            .all()
        )
        # Should have the two routes created on track creation as well as two more for the update
        assert len(track_routes) == 2, "Has two total routes after a track name update"
        assert (
            len(
                [
                    route
                    for route in track_routes
                    if route.is_current is True and route.slug == "track-1-2"
                ]
            )
            == 1
        ), "The current route is 'track-1-2'"
        assert (
            len([route for route in track_routes if route.is_current is False]) == 1
        ), "One route is marked non-current"
        assert (
            len(
                [
                    route
                    for route in track_routes
                    if route.slug in ("track-1-2", "track-1")
                ]
            )
            == 2
        ), "Has both of the 'new-style' routes"


def test_index_invalid_tracks(app, mocker):
    "Tests invalid batch of playlists create/update/delete actions"

    # setup db and mocked txs
    with app.app_context():
        db = get_db()
        web3 = Web3()
        challenge_event_bus: ChallengeEventBus = setup_challenge_bus()
        update_task = UpdateTask(web3, challenge_event_bus)

    test_metadata = {
        "QmAIDisabled": {"ai_attribution_user_id": 2},
        "QmInvalidUpdateTrack1": {
            "owner_id": 1,
            "track_cid": "some-track-cid",
            "title": "track 1 2",
            "cover_art": None,
            "cover_art_sizes": "QmdxhDiRUC3zQEKqwnqksaSsSSeHiRghjwKzwoRvm77yaZ",
            "tags": "realmagic,rickyreed,theroom",
            "genre": "R&B/Soul",
            "mood": "Empowering",
            "credits_splits": None,
            "created_at": "2020-07-11 08:22:15",
            "create_date": None,
            "updated_at": "2020-07-11 08:22:15",
            "release_date": "2020-07-11 08:22:15",
            "file_type": None,
            "track_segments": [
                {
                    "duration": 6.016,
                    "multihash": "QmabM5svgDgcRdQZaEKSMBCpSZrrYy2y87L8Dx8EQ3T2jp",
                }
            ],
            "has_current_user_reposted": False,
            "is_current": True,
            "is_unlisted": False,
            "is_stream_gated": False,
            "stream_conditions": None,
            "is_download_gated": False,
            "download_conditions": None,
            "field_visibility": {
                "mood": True,
                "tags": True,
                "genre": True,
                "share": True,
                "play_count": True,
                "remixes": True,
            },
            "remix_of": {"tracks": [{"parent_track_id": 75808}]},
            "repost_count": 12,
            "save_count": 21,
            "description": "updated description",
            "license": "All rights reserved",
            "isrc": None,
            "iswc": None,
            "track_id": 77955,
            "stem_of": None,
            "is_playlist_upload": False,
            "ai_attribution_user_id": 2,
            "orig_file_cid": "original-file-cid",
            "orig_filename": "original-filename",
            "is_downloadable": False,
            "is_original_available": False,
        },
        "QmInvalidUnlistTrack1Update": {"is_unlisted": True},
        "InvalidTrackIdUpdate": {"track_id": 1234, "bogus_field": "bogus"},
    }
    valid_track_metadata = json.dumps(
        {
            "owner_id": 2,
            "track_cid": "some-track-cid-5",
            "title": "track 5",
            "cover_art": None,
            "cover_art_sizes": "QmQKXkVxGBbCFjcnhgxftzYDhph1CT8PJCuPEsRpffjjGC",
            "tags": None,
            "genre": "Rock",
            "mood": None,
            "credits_splits": None,
            "created_at": None,
            "create_date": None,
            "updated_at": None,
            "release_date": None,
            "file_type": None,
            "track_segments": [],
            "has_current_user_reposted": False,
            "is_current": True,
            "is_unlisted": False,
            "is_stream_gated": False,
            "stream_conditions": None,
            "is_download_gated": False,
            "download_conditions": None,
            "field_visibility": {
                "genre": True,
                "mood": True,
                "tags": True,
                "share": True,
                "play_count": True,
                "remixes": True,
            },
            "remix_of": None,
            "repost_count": 0,
            "save_count": 0,
            "description": "",
            "license": "",
            "isrc": "",
            "iswc": "",
            "is_playlist_upload": False,
            "orig_file_cid": "original-file-cid-5",
            "orig_filename": "original-filename-5",
            "is_downloadable": False,
            "is_original_available": False,
            "placement_hosts": "https://host1.com,https://host2.com,https://host3.com,https://host4.com",
        }
    )
    invalid_metadata_json = json.dumps(test_metadata["QmAIDisabled"])
    invalid_update_track1_json = json.dumps(test_metadata["QmInvalidUpdateTrack1"])
    invalid_unlist_track1_json = json.dumps(
        test_metadata["QmInvalidUnlistTrack1Update"]
    )
    invalid_track_id_update = json.dumps(test_metadata["InvalidTrackIdUpdate"])

    tx_receipts = {
        # invalid create
        "CreateTrackBelowOffset": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 1,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": "",
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "CreateTrackUserDoesNotExist": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET + 1,
                        "_entityType": "Track",
                        "_userId": 2,
                        "_action": "Create",
                        "_metadata": "",
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "CreateTrackUserDoesNotMatchSigner": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET + 1,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": "",
                        "_signer": "InvalidWallet",
                    }
                )
            },
        ],
        "CreateTrackAlreadyExists": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": "",
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "CreateTrackAIDisabled": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET + 1,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "QmAIDisabled", "data": {invalid_metadata_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "CreateTrackInvalidDeletedApp": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET + 1,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": "",
                        "_signer": "0xdB384D555480214632D08609848BbFB54CCeb76c",
                    }
                )
            },
        ],
        "CreateTrackInvalidRevokedGrant": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET + 1,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": "",
                        "_signer": "0x3a388671bb4D6E1Ea08D79Ee191b40FB45A8F4ZZ",
                    }
                )
            },
        ],
        "CreateTrackInvalidWrongUserGrant": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET + 1,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": "",
                        "_signer": "0xdB384D555480214632D08609848BbFB54CCeb7CC",
                    }
                )
            },
        ],
        "CreateTrackInvalidUserGrantNotApproved": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET + 6,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "QmCreateTrack6", "data": {valid_track_metadata}}}',
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
        # invalid updates
        "UpdateTrackInvalidSigner": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Update",
                        "_metadata": "",
                        "_signer": "InvalidWallet",
                    }
                )
            },
        ],
        "UpdateTrackInvalidOwner": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 2,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "QmInvalidUpdateTrack1", "data": {invalid_update_track1_json}}}',
                        "_signer": "User2Wallet",
                    }
                )
            },
        ],
        "UpdateTrackInvalidDeletedApp": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Update",
                        "_metadata": "",
                        "_signer": "0xdB384D555480214632D08609848BbFB54CCeb76c",
                    }
                )
            },
        ],
        "UpdateTrackInvalidRevokedGrant": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Update",
                        "_metadata": "",
                        "_signer": "0xdB384D555480214632D08609848BbFB54CCeb7AA",
                    }
                )
            },
        ],
        "UpdateTrackInvalidWrongUserGrant": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Update",
                        "_metadata": "",
                        "_signer": "0xdB384D555480214632D08609848BbFB54CCeb7CC",
                    }
                )
            },
        ],
        "InvalidTrackUnlist": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "QmInvalidUnlistTrack1Update", "data": {invalid_unlist_track1_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "InvalidTrackIdUpdate": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "InvalidTrackIdUpdate", "data": {invalid_track_id_update}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        # invalid deletes
        "DeleteTrackInvalidSigner": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Delete",
                        "_metadata": "",
                        "_signer": "InvalidWallet",
                    }
                )
            },
        ],
        "DeleteTrackDoesNotExist": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET + 1,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "QmInvalidUpdateTrack1", "data": {invalid_update_track1_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "DeleteTrackInvalidOwner": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET + 1,
                        "_entityType": "Track",
                        "_userId": 2,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "QmInvalidUpdateTrack1", "data": {invalid_update_track1_json}}}',
                        "_signer": "User2Wallet",
                    }
                )
            },
        ],
        "DeleteTrackInvalidDeletedApp": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Delete",
                        "_metadata": "",
                        "_signer": "0xdB384D555480214632D08609848BbFB54CCeb76c",
                    }
                )
            },
        ],
        "DeleteTrackInvalidRevokedGrant": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Delete",
                        "_metadata": "",
                        "_signer": "0xdB384D555480214632D08609848BbFB54CCeb7AA",
                    }
                )
            },
        ],
        "DeleteTrackInvalidWrongUserGrant": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Delete",
                        "_metadata": "",
                        "_signer": "0xdB384D555480214632D08609848BbFB54CCeb7CC",
                    }
                )
            },
        ],
    }

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

    entities = {
        "users": [
            {"user_id": 1, "handle": "user-1", "wallet": "user1wallet"},
            {"user_id": 2, "handle": "user-1", "wallet": "User2Wallet"},
        ],
        "tracks": [
            {"track_id": TRACK_ID_OFFSET, "owner_id": 1},
        ],
        "developer_apps": [
            {
                "user_id": 2,
                "name": "My App",
                "address": "0x3a388671bb4D6E1Ea08D79Ee191b40FB45A8F4C4",
                "is_delete": True,
            },
            {
                "user_id": 2,
                "name": "My App",
                "address": "0x3a388671bb4D6E1Ea08D79Ee191b40FB45A8F4ZZ",
            },
        ],
        "grants": [
            {
                "user_id": 1,
                "grantee_address": "0x3a388671bb4D6E1Ea08D79Ee191b40FB45A8F4C4",
            },
            {
                "user_id": 1,
                "grantee_address": "0x3a388671bb4D6E1Ea08D79Ee191b40FB45A8F4ZZ",
                "is_revoked": True,
            },
            {
                "user_id": 2,
                "grantee_address": "0x3a388671bb4D6E1Ea08D79Ee191b40FB45A8F4ZZ",
            },
            {"user_id": 1, "grantee_address": "user2wallet", "is_approved": None},
        ],
    }
    populate_mock_db(db, entities)

    with db.scoped_session() as session:
        # index transactions
        entity_manager_update(
            update_task,
            session,
            entity_manager_txs,
            block_number=0,
            block_timestamp=1585336422,
            block_hash=hex(0),
        )

        # validate db records
        all_tracks: List[Track] = session.query(Track).all()
        assert len(all_tracks) == 1
        current_track: List[Track] = (
            session.query(Track).filter(Track.is_current == True).first()
        )
        assert current_track.track_id == TRACK_ID_OFFSET


def test_invalid_track_description(app, mocker):
    "Tests that playlists cant have a description that's too long"
    with app.app_context():
        db = get_db()
        web3 = Web3()
        challenge_event_bus: ChallengeEventBus = setup_challenge_bus()
        update_task = UpdateTask(web3, challenge_event_bus)

    metadata = {
        "CreateInvalidTrackDescriptionMetadata": {
            "owner_id": 1,
            "track_cid": "some-track-cid",
            "title": "track 1",
            "cover_art": None,
            "cover_art_sizes": "QmdxhDiRUC3zQEKqwnqksaSsSSeHiRghjwKzwoRvm77yaZ",
            "tags": "realmagic,rickyreed,theroom",
            "genre": "R&B/Soul",
            "mood": "Empowering",
            "credits_splits": None,
            "created_at": "2020-07-11 08:22:15",
            "create_date": None,
            "updated_at": "2020-07-11 08:22:15",
            "release_date": "2020-07-11 08:22:15",
            "file_type": None,
            "is_playlist_upload": True,
            "track_segments": [
                {
                    "duration": 6.016,
                    "multihash": "QmabM5svgDgcRdQZaEKSMBCpSZrrYy2y87L8Dx8EQ3T2jp",
                }
            ],
            "has_current_user_reposted": False,
            "is_current": True,
            "is_unlisted": False,
            "is_stream_gated": False,
            "stream_conditions": None,
            "is_download_gated": False,
            "download_conditions": None,
            "field_visibility": {
                "mood": True,
                "tags": True,
                "genre": True,
                "share": True,
                "play_count": True,
                "remixes": True,
            },
            "remix_of": {"tracks": [{"parent_track_id": 75808}]},
            "repost_count": 12,
            "save_count": 21,
            "description": "xtralargeplz" * CHARACTER_LIMIT_DESCRIPTION,
            "license": "All rights reserved",
            "isrc": None,
            "iswc": None,
            "track_id": 77955,
            "stem_of": None,
            "ai_attribution_user_id": None,
            "orig_file_cid": "original-file-cid",
            "orig_filename": "original-filename",
            "is_downloadable": False,
            "is_original_available": False,
        },
    }

    track_metadata = json.dumps(metadata["CreateInvalidTrackDescriptionMetadata"])

    tx_receipts = {
        "CreateInvalidTrackDescription": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "CreateUserInvalidBioMetadata", "data": {track_metadata}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
    }

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

    entities = {
        "users": [
            {"user_id": 1, "handle": "user-1", "wallet": "user1wallet"},
        ],
    }
    populate_mock_db(db, entities)

    with db.scoped_session() as session:
        total_changes, _ = entity_manager_update(
            update_task,
            session,
            entity_manager_txs,
            block_number=0,
            block_timestamp=1585336422,
            block_hash=hex(0),
        )

        assert total_changes == 0


def test_access_conditions(app, mocker):
    "Tests that tracks cannot have invalid access stream/download conditions"
    with app.app_context():
        db = get_db()
        web3 = Web3()
        challenge_event_bus: ChallengeEventBus = setup_challenge_bus()
        update_task = UpdateTask(web3, challenge_event_bus)

    default_metadata = {
        "cover_art": None,
        "cover_art_sizes": "QmdxhDiRUC3zQEKqwnqksaSsSSeHiRghjwKzwoRvm77yaZ",
        "tags": "realmagic,rickyreed,theroom",
        "genre": "R&B/Soul",
        "mood": "Empowering",
        "credits_splits": None,
        "created_at": "2020-07-11 08:22:15",
        "create_date": None,
        "updated_at": "2020-07-11 08:22:15",
        "release_date": "2020-07-11 08:22:15",
        "file_type": None,
        "is_playlist_upload": True,
        "track_segments": [
            {
                "duration": 6.016,
                "multihash": "QmabM5svgDgcRdQZaEKSMBCpSZrrYy2y87L8Dx8EQ3T2jp",
            }
        ],
        "has_current_user_reposted": False,
        "is_current": True,
        "is_unlisted": False,
        "field_visibility": {
            "mood": True,
            "tags": True,
            "genre": True,
            "share": True,
            "play_count": True,
            "remixes": True,
        },
        "remix_of": None,
        "repost_count": 12,
        "save_count": 21,
        "description": "some description",
        "license": "All rights reserved",
        "isrc": None,
        "iswc": None,
        "track_id": 77955,
        "stem_of": None,
        "ai_attribution_user_id": None,
        "orig_file_cid": "original-file-cid",
        "orig_filename": "original-filename",
        "is_original_available": False,
    }

    metadatas = {
        "InvalidStreamGatedNoConditions": {
            **default_metadata,
            "track_id": TRACK_ID_OFFSET,
            "owner_id": 1,
            "track_cid": "some-track-cid",
            "title": "track 1",
            "is_stream_gated": True,
            "stream_conditions": None,
            "is_download_gated": False,
            "download_conditions": None,
            "is_downloadable": False,
        },
        "InvalidStreamGatedMultipleConditions": {
            **default_metadata,
            "track_id": TRACK_ID_OFFSET + 1,
            "owner_id": 1,
            "track_cid": "some-track-cid",
            "title": "track 2",
            "is_stream_gated": True,
            "stream_conditions": {"tip_user_id": 1, "follow_user_id": 1},
            "is_download_gated": False,
            "download_conditions": None,
            "is_downloadable": False,
        },
        "InvalidStreamGatedNotDownloadGated": {
            **default_metadata,
            "track_id": TRACK_ID_OFFSET + 2,
            "owner_id": 1,
            "track_cid": "some-track-cid",
            "title": "track 3",
            "is_stream_gated": True,
            "stream_conditions": {"tip_user_id": 1},
            "is_download_gated": False,
            "download_conditions": None,
            "is_downloadable": True,
        },
        "InvalidStreamGatedDifferentDownloadConditions": {
            **default_metadata,
            "track_id": TRACK_ID_OFFSET + 3,
            "owner_id": 1,
            "track_cid": "some-track-cid",
            "title": "track 4",
            "is_stream_gated": True,
            "stream_conditions": {"tip_user_id": 1},
            "is_download_gated": True,
            "download_conditions": {"follow_user_id": 1},
            "is_downloadable": True,
        },
        "InvalidDownloadGatedNoConditions": {
            **default_metadata,
            "track_id": TRACK_ID_OFFSET + 5,
            "owner_id": 1,
            "track_cid": "some-track-cid",
            "title": "track 6",
            "is_stream_gated": False,
            "stream_conditions": None,
            "is_download_gated": True,
            "download_conditions": None,
            "is_downloadable": True,
        },
        "InvalidDownloadGatedMultipleConditions": {
            **default_metadata,
            "track_id": TRACK_ID_OFFSET + 6,
            "owner_id": 1,
            "track_cid": "some-track-cid",
            "title": "track 7",
            "is_stream_gated": False,
            "stream_conditions": None,
            "is_download_gated": True,
            "download_conditions": {"tip_user_id": 1, "follow_user_id": 1},
            "is_downloadable": True,
        },
        "InvalidStemTrack": {
            **default_metadata,
            "track_id": TRACK_ID_OFFSET + 7,
            "owner_id": 1,
            "track_cid": "some-track-cid",
            "title": "track 8",
            "is_stream_gated": True,
            "stream_conditions": {"tip_user_id": 1},
            "is_download_gated": True,
            "download_conditions": {"tip_user_id": 1},
            "is_downloadable": True,
            "stem_of": {"parent_track_id": 1},
        },
        "ValidGated": {
            **default_metadata,
            "track_id": TRACK_ID_OFFSET + 8,
            "owner_id": 1,
            "track_cid": "some-track-cid",
            "title": "track 9",
            "is_stream_gated": True,
            "stream_conditions": {"tip_user_id": 1},
            "is_download_gated": True,
            "download_conditions": {"tip_user_id": 1},
            "is_downloadable": True,
        },
        "InvalidTokenGatedNoTokenMint": {
            **default_metadata,
            "track_id": TRACK_ID_OFFSET + 9,
            "owner_id": 1,
            "track_cid": "some-track-cid",
            "title": "track 10",
            "is_stream_gated": True,
            "stream_conditions": {"token_amount": 100},
            "is_download_gated": False,
            "download_conditions": None,
            "is_downloadable": False,
        },
        "InvalidTokenGatedNoTokenAmount": {
            **default_metadata,
            "track_id": TRACK_ID_OFFSET + 10,
            "owner_id": 1,
            "track_cid": "some-track-cid",
            "title": "track 11",
            "is_stream_gated": True,
            "stream_conditions": {
                "token_gate": {
                    "token_mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                }
            },
            "is_download_gated": False,
            "download_conditions": None,
            "is_downloadable": False,
        },
        "InvalidTokenGatedMultipleConditions": {
            **default_metadata,
            "track_id": TRACK_ID_OFFSET + 11,
            "owner_id": 1,
            "track_cid": "some-track-cid",
            "title": "track 12",
            "is_stream_gated": True,
            "stream_conditions": {
                "token_gate": {
                    "token_mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                    "token_amount": 100,
                },
                "follow_user_id": 1,
            },
            "is_download_gated": False,
            "download_conditions": None,
            "is_downloadable": False,
        },
        "InvalidTokenGatedInvalidTokenAmount": {
            **default_metadata,
            "track_id": TRACK_ID_OFFSET + 12,
            "owner_id": 1,
            "track_cid": "some-track-cid",
            "title": "track 13",
            "is_stream_gated": True,
            "stream_conditions": {
                "token_gate": {
                    "token_mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                    "token_amount": -1,
                }
            },
            "is_download_gated": False,
            "download_conditions": None,
            "is_downloadable": False,
        },
        "ValidTokenGated": {
            **default_metadata,
            "track_id": TRACK_ID_OFFSET + 13,
            "owner_id": 1,
            "track_cid": "some-track-cid",
            "title": "track 14",
            "is_stream_gated": True,
            "stream_conditions": {
                "token_gate": {
                    "token_mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                    "token_amount": 100,
                }
            },
            "is_download_gated": True,
            "download_conditions": {
                "token_gate": {
                    "token_mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                    "token_amount": 100,
                }
            },
            "is_downloadable": True,
        },
    }

    metadata_keys = list(metadatas.keys())
    tx_receipts = {
        ("Create" + key): [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET + metadata_keys.index(key),
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "", "data": {json.dumps(value)}}}',
                        "_signer": "user1wallet",
                    }
                )
            }
        ]
        for key, value in metadatas.items()
    }

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

    entities = {
        "users": [
            {"user_id": 1, "handle": "user-1", "wallet": "user1wallet"},
        ],
    }
    populate_mock_db(db, entities)

    with db.scoped_session() as session:
        entity_manager_update(
            update_task,
            session,
            entity_manager_txs,
            block_number=0,
            block_timestamp=1585336422,
            block_hash=hex(0),
        )

        all_tracks: List[Track] = session.query(Track).all()
        assert len(all_tracks) == 2

        track = all_tracks[0]
        assert track.is_current == True
        assert track.track_id == TRACK_ID_OFFSET + 7

        track2 = all_tracks[1]
        assert track2.is_current == True
        assert track2.track_id == TRACK_ID_OFFSET + 12


def test_update_access_conditions(app, mocker):
    "Tests that update track transactions modifying access conditions will pass"
    with app.app_context():
        db = get_db()
        web3 = Web3()
        challenge_event_bus: ChallengeEventBus = setup_challenge_bus()
        update_task = UpdateTask(web3, challenge_event_bus)

    collectible_gate = {
        "nft_collection": {
            "chain": "eth",
            "standard": "ERC721",
            "address": "some-nft-collection-address",
            "name": "some nft collection name",
            "slug": "some-nft-collection",
            "imageUrl": "some-nft-collection-image-url",
            "externalLink": "some-nft-collection-external-link",
        }
    }
    follow_gate = {"follow_user_id": 1}
    usdc_gate_1 = {
        "usdc_purchase": {"price": 100, "splits": [{"percentage": 100.0, "user_id": 1}]}
    }
    token_gate_1 = {
        "token_gate": {
            "token_mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "token_amount": 100,
        }
    }
    token_gate_2 = {
        "token_gate": {
            "token_mint": "So11111111111111111111111111111111111111112",
            "token_amount": 50,
        }
    }

    metadatas = {
        "UpdateToFollowGated": {
            "track_id": TRACK_ID_OFFSET,
            "is_stream_gated": True,
            "stream_conditions": follow_gate,
            "is_download_gated": True,
            "download_conditions": follow_gate,
        },
        "UpdateToUSDCGated": {
            "track_id": TRACK_ID_OFFSET + 1,
            "owner_id": 1,
            "is_stream_gated": True,
            "stream_conditions": usdc_gate_1,
            "is_download_gated": True,
            "download_conditions": usdc_gate_1,
        },
        "FollowGatedToFree": {
            "track_id": TRACK_ID_OFFSET + 2,
            "is_stream_gated": False,
            "stream_conditions": None,
            "is_download_gated": False,
            "download_conditions": None,
        },
        "HiddenUpdateToFollowGated": {
            "track_id": TRACK_ID_OFFSET + 3,
            "is_stream_gated": True,
            "stream_conditions": collectible_gate,
            "is_download_gated": True,
            "download_conditions": collectible_gate,
        },
        "UpdateToTokenGated": {
            "track_id": TRACK_ID_OFFSET + 4,
            "owner_id": 1,
            "is_stream_gated": True,
            "stream_conditions": token_gate_1,
            "is_download_gated": True,
            "download_conditions": token_gate_1,
        },
        "TokenGatedToFree": {
            "track_id": TRACK_ID_OFFSET + 5,
            "is_stream_gated": False,
            "stream_conditions": None,
            "is_download_gated": False,
            "download_conditions": None,
        },
        "TokenGatedToTokenGated": {
            "track_id": TRACK_ID_OFFSET + 6,
            "owner_id": 1,
            "is_stream_gated": True,
            "stream_conditions": token_gate_2,
            "is_download_gated": True,
            "download_conditions": token_gate_2,
        },
    }

    metadata_keys = list(metadatas.keys())
    tx_receipts = {
        (key): [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET + metadata_keys.index(key),
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "", "data": {json.dumps(value)}}}',
                        "_signer": "user1wallet",
                    }
                )
            }
        ]
        for key, value in metadatas.items()
    }

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

    entities = {
        "users": [
            {"user_id": 1, "handle": "user-1", "wallet": "user1wallet"},
        ],
        "tracks": [
            {  # non-gated
                "track_id": TRACK_ID_OFFSET,
                "owner_id": 1,
                "is_stream_gated": False,
                "stream_conditions": None,
                "is_download_gated": False,
                "download_conditions": None,
            },
            {  # follow-gated
                "track_id": TRACK_ID_OFFSET + 1,
                "owner_id": 1,
                "is_stream_gated": True,
                "stream_conditions": follow_gate,
                "is_download_gated": True,
                "download_conditions": follow_gate,
            },
            {  # follow-gated (to be changed to free)
                "track_id": TRACK_ID_OFFSET + 2,
                "owner_id": 1,
                "is_stream_gated": True,
                "stream_conditions": follow_gate,
                "is_download_gated": True,
                "download_conditions": follow_gate,
            },
            {  # hidden non-gated
                "track_id": TRACK_ID_OFFSET + 3,
                "owner_id": 1,
                "is_unlisted": True,
                "is_stream_gated": False,
                "stream_conditions": None,
                "is_download_gated": False,
                "download_conditions": None,
            },
            {  # non-gated (to be changed to token-gated)
                "track_id": TRACK_ID_OFFSET + 4,
                "owner_id": 1,
                "is_stream_gated": False,
                "stream_conditions": None,
                "is_download_gated": False,
                "download_conditions": None,
            },
            {  # token-gated (to be changed to free)
                "track_id": TRACK_ID_OFFSET + 5,
                "owner_id": 1,
                "is_stream_gated": True,
                "stream_conditions": token_gate_1,
                "is_download_gated": True,
                "download_conditions": token_gate_1,
            },
            {  # token-gated (to be changed to different token-gated)
                "track_id": TRACK_ID_OFFSET + 6,
                "owner_id": 1,
                "is_stream_gated": True,
                "stream_conditions": token_gate_1,
                "is_download_gated": True,
                "download_conditions": token_gate_1,
            },
        ],
    }
    populate_mock_db(db, entities)

    with db.scoped_session() as session:
        entity_manager_update(
            update_task,
            session,
            entity_manager_txs,
            block_number=0,
            block_timestamp=1585336422,
            block_hash=hex(0),
        )

        follow_gated: Track = (
            session.query(Track).filter(Track.track_id == TRACK_ID_OFFSET).first()
        )
        assert follow_gated.is_stream_gated == True
        assert follow_gated.stream_conditions == follow_gate
        assert follow_gated.is_download_gated == True
        assert follow_gated.download_conditions == follow_gate

        usdc_gated: Track = (
            session.query(Track).filter(Track.track_id == TRACK_ID_OFFSET + 1).first()
        )
        assert usdc_gated.is_stream_gated == True
        assert usdc_gated.stream_conditions == usdc_gate_1
        assert usdc_gated.is_download_gated == True
        assert usdc_gated.download_conditions == usdc_gate_1

        free: Track = (
            session.query(Track).filter(Track.track_id == TRACK_ID_OFFSET + 2).first()
        )
        assert free.is_stream_gated == False
        assert free.stream_conditions == None
        assert free.is_download_gated == False
        assert free.download_conditions == None

        hidden_follow_gated: Track = (
            session.query(Track).filter(Track.track_id == TRACK_ID_OFFSET + 3).first()
        )
        assert hidden_follow_gated.is_unlisted == True
        assert hidden_follow_gated.is_stream_gated == True
        assert hidden_follow_gated.stream_conditions == collectible_gate
        assert hidden_follow_gated.is_download_gated == True
        assert hidden_follow_gated.download_conditions == collectible_gate

        token_gated: Track = (
            session.query(Track).filter(Track.track_id == TRACK_ID_OFFSET + 4).first()
        )
        assert token_gated.is_stream_gated == True
        assert token_gated.stream_conditions == token_gate_1
        assert token_gated.is_download_gated == True
        assert token_gated.download_conditions == token_gate_1

        token_to_free: Track = (
            session.query(Track).filter(Track.track_id == TRACK_ID_OFFSET + 5).first()
        )
        assert token_to_free.is_stream_gated == False
        assert token_to_free.stream_conditions == None
        assert token_to_free.is_download_gated == False
        assert token_to_free.download_conditions == None

        token_to_token: Track = (
            session.query(Track).filter(Track.track_id == TRACK_ID_OFFSET + 6).first()
        )
        assert token_to_token.is_stream_gated == True
        assert token_to_token.stream_conditions == token_gate_2
        assert token_to_token.is_download_gated == True
        assert token_to_token.download_conditions == token_gate_2


def test_remixability(app, mocker):
    "Tests that tracks cannot have invalid access stream/download conditions"
    with app.app_context():
        db = get_db()
        web3 = Web3()
        challenge_event_bus: ChallengeEventBus = setup_challenge_bus()
        update_task = UpdateTask(web3, challenge_event_bus)

    default_metadata = {
        "cover_art": None,
        "cover_art_sizes": "QmdxhDiRUC3zQEKqwnqksaSsSSeHiRghjwKzwoRvm77yaZ",
        "tags": "realmagic,rickyreed,theroom",
        "genre": "R&B/Soul",
        "mood": "Empowering",
        "credits_splits": None,
        "created_at": "2020-07-11 08:22:15",
        "create_date": None,
        "updated_at": "2020-07-11 08:22:15",
        "release_date": "2020-07-11 08:22:15",
        "file_type": None,
        "is_playlist_upload": True,
        "track_segments": [
            {
                "duration": 6.016,
                "multihash": "QmabM5svgDgcRdQZaEKSMBCpSZrrYy2y87L8Dx8EQ3T2jp",
            }
        ],
        "has_current_user_reposted": False,
        "is_current": True,
        "is_unlisted": False,
        "field_visibility": {
            "mood": True,
            "tags": True,
            "genre": True,
            "share": True,
            "play_count": True,
            "remixes": True,
        },
        "remix_of": None,
        "repost_count": 12,
        "save_count": 21,
        "description": "some description",
        "license": "All rights reserved",
        "isrc": None,
        "iswc": None,
        "track_id": 77955,
        "stem_of": None,
        "ai_attribution_user_id": None,
        "orig_file_cid": "original-file-cid",
        "orig_filename": "original-filename",
        "is_original_available": False,
    }

    metadatas = {
        "ParentTrack1": {
            **default_metadata,
            "track_id": TRACK_ID_OFFSET,
            "owner_id": 1,
            "track_cid": "some-track-cid",
            "title": "parent track 1",
            "is_stream_gated": True,
            "stream_conditions": {"tip_user_id": 1},
            "is_download_gated": True,
            "download_conditions": {"tip_user_id": 1},
            "is_downloadable": True,
        },
        "ParentTrack2": {
            **default_metadata,
            "track_id": TRACK_ID_OFFSET + 1,
            "owner_id": 1,
            "track_cid": "some-track-cid",
            "title": "parent track 2",
            "is_stream_gated": False,
            "stream_conditions": None,
            "is_download_gated": False,
            "download_conditions": None,
            "is_downloadable": False,
        },
        "RemixTrack1": {
            **default_metadata,
            "track_id": TRACK_ID_OFFSET + 2,
            "owner_id": 2,
            "track_cid": "some-track-cid",
            "title": "remix track 1",
            "is_stream_gated": False,
            "stream_conditions": None,
            "is_download_gated": False,
            "download_conditions": None,
            "is_downloadable": False,
            "remix_of": {"tracks": [{"parent_track_id": TRACK_ID_OFFSET}]},
        },
        "RemixTrack2": {
            **default_metadata,
            "track_id": TRACK_ID_OFFSET + 3,
            "owner_id": 2,
            "track_cid": "some-track-cid",
            "title": "remix track 2",
            "is_stream_gated": False,
            "stream_conditions": None,
            "is_download_gated": False,
            "download_conditions": None,
            "is_downloadable": False,
            "remix_of": {"tracks": [{"parent_track_id": TRACK_ID_OFFSET + 1}]},
        },
    }

    create_parent_track1_json = json.dumps(metadatas["ParentTrack1"])
    create_parent_track2_json = json.dumps(metadatas["ParentTrack2"])
    invalid_create_remix_track1_json = json.dumps(metadatas["RemixTrack1"])
    valid_create_remix_track2_json = json.dumps(metadatas["RemixTrack2"])

    create_parent_track_1_receipt = [
        {
            "args": AttributeDict(
                {
                    "_entityId": TRACK_ID_OFFSET,
                    "_entityType": "Track",
                    "_userId": 1,
                    "_action": "Create",
                    "_metadata": f'{{"cid": "", "data": {create_parent_track1_json}}}',
                    "_signer": "user1wallet",
                }
            )
        }
    ]
    create_parent_track_2_receipt = [
        {
            "args": AttributeDict(
                {
                    "_entityId": TRACK_ID_OFFSET + 1,
                    "_entityType": "Track",
                    "_userId": 1,
                    "_action": "Create",
                    "_metadata": f'{{"cid": "", "data": {create_parent_track2_json}}}',
                    "_signer": "user1wallet",
                }
            )
        }
    ]
    invalid_create_remix_track_1_receipt = [
        {
            "args": AttributeDict(
                {
                    "_entityId": TRACK_ID_OFFSET + 2,
                    "_entityType": "Track",
                    "_userId": 2,
                    "_action": "Create",
                    "_metadata": f'{{"cid": "", "data": {invalid_create_remix_track1_json}}}',
                    "_signer": "user2wallet",
                }
            )
        }
    ]
    valid_create_remix_track_2_receipt = [
        {
            "args": AttributeDict(
                {
                    "_entityId": TRACK_ID_OFFSET + 3,
                    "_entityType": "Track",
                    "_userId": 2,
                    "_action": "Create",
                    "_metadata": f'{{"cid": "", "data": {valid_create_remix_track2_json}}}',
                    "_signer": "user2wallet",
                }
            )
        }
    ]

    tx_receipts = {
        "CreateParentTrack1": create_parent_track_1_receipt,
        "CreateParentTrack2": create_parent_track_2_receipt,
        "InvalidCreateRemixTrack1": invalid_create_remix_track_1_receipt,
        "ValidCreateRemixTrack2": valid_create_remix_track_2_receipt,
    }

    def get_events_side_effect(_, tx_receipt):
        return tx_receipts[tx_receipt["transactionHash"].decode("utf-8")]

    mocker.patch(
        "src.tasks.entity_manager.entity_manager.get_entity_manager_events_tx",
        side_effect=get_events_side_effect,
        autospec=True,
    )

    entities = {
        "users": [
            {"user_id": 1, "handle": "user-1", "wallet": "user1wallet"},
            {"user_id": 2, "handle": "user-2", "wallet": "user2wallet"},
        ],
    }
    populate_mock_db(db, entities)

    with db.scoped_session() as session:
        entity_manager_update(
            update_task,
            session,
            entity_manager_txs=[
                AttributeDict(
                    {"transactionHash": update_task.web3.to_bytes(text=tx_receipt)}
                )
                for tx_receipt in {
                    "CreateParentTrack1": create_parent_track_1_receipt,
                    "CreateParentTrack2": create_parent_track_2_receipt,
                }
            ],
            block_number=0,
            block_timestamp=1585336422,
            block_hash=hex(0),
        )

        all_tracks: List[Track] = session.query(Track).all()
        assert len(all_tracks) == 2

    with db.scoped_session() as session:
        entity_manager_update(
            update_task,
            session,
            entity_manager_txs=[
                AttributeDict(
                    {"transactionHash": update_task.web3.to_bytes(text=tx_receipt)}
                )
                for tx_receipt in {
                    "InvalidCreateRemixTrack1": invalid_create_remix_track_1_receipt,
                    "ValidCreateRemixTrack2": valid_create_remix_track_2_receipt,
                }
            ],
            block_number=0,
            block_timestamp=1585336422,
            block_hash=hex(0),
        )

        all_tracks: List[Track] = session.query(Track).all()
        assert len(all_tracks) == 3

        track1 = all_tracks[0]
        assert track1.track_id == TRACK_ID_OFFSET

        track2 = all_tracks[1]
        assert track2.track_id == TRACK_ID_OFFSET + 1

        track3 = all_tracks[2]
        assert track3.track_id == TRACK_ID_OFFSET + 3


def test_release_date(app, mocker):
    "Tests track release dates"
    with app.app_context():
        db = get_db()
        web3 = Web3()
        challenge_event_bus: ChallengeEventBus = setup_challenge_bus()
        update_task = UpdateTask(web3, challenge_event_bus)

    default_metadata = {
        "cover_art": None,
        "cover_art_sizes": "QmdxhDiRUC3zQEKqwnqksaSsSSeHiRghjwKzwoRvm77yaZ",
        "tags": "realmagic,rickyreed,theroom",
        "genre": "R&B/Soul",
        "mood": "Empowering",
        "credits_splits": None,
        "created_at": "2020-07-11 08:22:15",
        "create_date": None,
        "updated_at": "2020-07-11 08:22:15",
        "release_date": "2020-07-11 08:22:15",
        "file_type": None,
        "title": "title",
        "is_playlist_upload": True,
        "track_segments": [
            {
                "duration": 6.016,
                "multihash": "QmabM5svgDgcRdQZaEKSMBCpSZrrYy2y87L8Dx8EQ3T2jp",
            }
        ],
        "has_current_user_reposted": False,
        "is_current": True,
        "is_unlisted": False,
        "field_visibility": {
            "mood": True,
            "tags": True,
            "genre": True,
            "share": True,
            "play_count": True,
            "remixes": True,
        },
        "remix_of": None,
        "repost_count": 12,
        "save_count": 21,
        "description": "some description",
        "license": "All rights reserved",
        "isrc": None,
        "iswc": None,
        "track_id": 77955,
        "stem_of": None,
        "ai_attribution_user_id": None,
        "orig_file_cid": "original-file-cid",
        "orig_filename": "original-filename",
        "is_original_available": False,
    }

    metadatas = {
        "PublicTrackFutureReleaseDate": {
            **default_metadata,
            "track_id": TRACK_ID_OFFSET,
            "release_date": "Fri Jan 26 2100 00:00:00 GMT+0000",
            "owner_id": 1,
        },
        "UpdatePublicTrackFutureReleaseDate": {
            **default_metadata,
            "track_id": TRACK_ID_OFFSET,
            "title": "updated",
            "release_date": "Fri Jan 26 2100 00:00:00 GMT+0000",
            "owner_id": 1,
        },
    }

    public_track_future_release_date = json.dumps(
        metadatas["PublicTrackFutureReleaseDate"]
    )
    update_public_track_future_release_date = json.dumps(
        metadatas["UpdatePublicTrackFutureReleaseDate"]
    )

    tx_receipts = {
        "PublicTrackFutureReleaseDate": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "", "data": {public_track_future_release_date}}}',
                        "_signer": "user1wallet",
                    }
                )
            }
        ],
        "UpdatePublicTrackFutureReleaseDate": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "", "data": {update_public_track_future_release_date}}}',
                        "_signer": "user1wallet",
                    }
                )
            }
        ],
    }

    def get_events_side_effect(_, tx_receipt):
        return tx_receipts[tx_receipt["transactionHash"].decode("utf-8")]

    mocker.patch(
        "src.tasks.entity_manager.entity_manager.get_entity_manager_events_tx",
        side_effect=get_events_side_effect,
        autospec=True,
    )

    entities = {
        "users": [
            {"user_id": 1, "handle": "user-1", "wallet": "user1wallet"},
        ],
    }
    populate_mock_db(db, entities)

    with db.scoped_session() as session:
        entity_manager_update(
            update_task,
            session,
            entity_manager_txs=[
                AttributeDict(
                    {"transactionHash": update_task.web3.to_bytes(text=tx_receipt)}
                )
                for tx_receipt in tx_receipts
            ],
            block_number=0,
            block_timestamp=1585336422,
            block_hash=hex(0),
        )

        all_tracks: List[Track] = session.query(Track).all()
        assert len(all_tracks) == 1
        all_tracks[0].release_date != datetime(2100, 1, 26, 0, 0)
        all_tracks[0].title == "update"


def test_publish_track(app, mocker):
    "Tests publishing a track should generate a notification and update track fields"
    with app.app_context():
        db = get_db()
        web3 = Web3()
        challenge_event_bus: ChallengeEventBus = setup_challenge_bus()
        update_task = UpdateTask(web3, challenge_event_bus)

    metadatas = {
        "CreateHiddenTrack": {
            **default_metadata,
            "title": "track 1",
            "track_id": TRACK_ID_OFFSET,
            "owner_id": 1,
            "is_unlisted": True,
            "is_playlist_upload": False,
            "is_scheduled_release": True,
            "release_date": "Fri Jan 26 2100 00:00:00 GMT+0000",
        },
        "PublishTrack": {
            **default_metadata,
            "title": "track 1",
            "owner_id": 1,
            "track_id": TRACK_ID_OFFSET,
            "is_unlisted": False,
            "is_playlist_upload": False,
        },
    }

    create_hidden_track = json.dumps(metadatas["CreateHiddenTrack"])
    publish_track = json.dumps(metadatas["PublishTrack"])

    create_receipt = {
        "CreateHiddenTrack": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "", "data": {create_hidden_track}}}',
                        "_signer": "user1wallet",
                    }
                )
            }
        ]
    }
    update_receipt = {
        "PublishTrack": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": TRACK_ID_OFFSET,
                        "_entityType": "Track",
                        "_userId": 1,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "", "data": {publish_track}}}',
                        "_signer": "user1wallet",
                    }
                )
            }
        ],
    }

    def get_events_side_effect(_, tx_receipt):
        tx_receipts = create_receipt | update_receipt
        return tx_receipts[tx_receipt["transactionHash"].decode("utf-8")]

    mocker.patch(
        "src.tasks.entity_manager.entity_manager.get_entity_manager_events_tx",
        side_effect=get_events_side_effect,
        autospec=True,
    )

    entities = {
        "users": [
            {"user_id": 1, "handle": "user-1", "wallet": "user1wallet"},
            {"user_id": 2, "handle": "user-2", "wallet": "user2wallet"},
        ],
        "subscriptions": [
            {"subscriber_id": 2, "user_id": 1},
        ],
    }
    populate_mock_db(db, entities)

    with db.scoped_session() as session:
        entity_manager_update(
            update_task,
            session,
            entity_manager_txs=[
                AttributeDict(
                    {"transactionHash": update_task.web3.to_bytes(text=tx_receipt)}
                )
                for tx_receipt in create_receipt
            ],
            block_number=0,
            block_timestamp=1585336000,
            block_hash=hex(0),
        )
        all_tracks: List[Track] = session.query(Track).all()
        track = all_tracks[0]
        assert track.is_unlisted == True
        assert track.is_scheduled_release == True
        assert track.release_date == datetime(2100, 1, 26, 0, 0)

    with db.scoped_session() as session:
        entity_manager_update(
            update_task,
            session,
            entity_manager_txs=[
                AttributeDict(
                    {"transactionHash": update_task.web3.to_bytes(text=tx_receipt)}
                )
                for tx_receipt in update_receipt
            ],
            block_number=1,
            block_timestamp=1585337000,
            block_hash=hex(1),
        )

        all_tracks: List[Track] = session.query(Track).all()
        assert len(all_tracks) == 1
        track = all_tracks[0]
        assert track.is_unlisted == False

        # Protocol should update these fields when publishing track
        assert track.is_scheduled_release == False
        assert track.release_date != datetime(2100, 1, 26, 0, 0)

        all_notifications: List[Notification] = session.query(Notification).all()
        assert len(all_notifications) == 1
        assert all_notifications[0].group_id == "create:track:user_id:1"
        assert all_notifications[0].specifier == str(TRACK_ID_OFFSET)
