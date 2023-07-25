import json
from datetime import datetime
from typing import List
from unittest import mock

from integration_tests.challenges.index_helpers import UpdateTask
from integration_tests.utils import populate_mock_db
from sqlalchemy import asc
from src.challenges.challenge_event import ChallengeEvent
from src.models.indexing.cid_data import CIDData
from src.models.users.user import User
from src.tasks.entity_manager.entities.user import UserEventMetadata, update_user_events
from src.tasks.entity_manager.entity_manager import entity_manager_update
from src.tasks.entity_manager.utils import (
    CHARACTER_LIMIT_USER_BIO,
    TRACK_ID_OFFSET,
    USER_ID_OFFSET,
)
from src.utils.db_session import get_db
from src.utils.redis_connection import get_redis
from web3 import Web3
from web3.datastructures import AttributeDict


def set_patches(mocker):
    mocker.patch(
        "src.tasks.entity_manager.entities.user.get_endpoint_string_from_sp_ids",
        return_value="https://cn.io,https://cn2.io,https://cn3.io",
        autospec=True,
    )

    mocker.patch(
        "src.tasks.entity_manager.entities.user.get_verifier_address",
        return_value="0x",
        autospec=True,
    )

    def fetch_node_info(self, sp_id, sp_type, redis):
        return {
            "operator_wallet": "wallet1",
            "endpoint": "http://endpoint.io",
            "block_number": sp_id,
            "delegator_wallet": f"spid{sp_id}",
        }

    mocker.patch(
        "src.utils.eth_manager.EthManager.fetch_node_info",
        side_effect=fetch_node_info,
        autospec=True,
    )

    event_bus = mocker.patch(
        "src.challenges.challenge_event_bus.ChallengeEventBus", autospec=True
    )
    return event_bus


def test_index_valid_user(app, mocker):
    "Tests valid batch of users create/update/delete actions"

    bus_mock = set_patches(mocker)

    # setup db and mocked txs
    with app.app_context():
        db = get_db()
        web3 = Web3()
        update_task = UpdateTask(web3, bus_mock)

    test_metadata = {
        "QmUpdateUser2": {
            "is_verified": False,
            "is_deactivated": False,
            "name": "Forrest",
            "handle": "forrest",
            "profile_picture": None,
            "profile_picture_sizes": "QmNmzMoiLYSAgrLbAAnaPW9q3YZwZvHybbbs59QamzUQxg",
            "cover_photo": None,
            "cover_photo_sizes": "QmR2fSFvtpWg7nfdYtoJ3KgDNf4YgcuSzKjwZjansW9wcj",
            "bio": "On the lookout for that next breakout track...   ðŸ‘€",
            "location": "Los Angeles, CA",
            "creator_node_endpoint": "https://creatornode2.audius.co,https://creatornode3.audius.co,https://content-node.audius.co",
            "associated_wallets": None,
            "associated_sol_wallets": None,
            "playlist_library": {
                "contents": [
                    {"playlist_id": "Audio NFTs", "type": "explore_playlist"},
                    {"playlist_id": 11363, "type": "playlist"},
                    {"playlist_id": 129218, "type": "playlist"},
                ]
            },
            "events": None,
            "user_id": USER_ID_OFFSET + 1,
        },
        "QmUpdateUser1": {
            "allow_ai_attribution": True,
            "is_verified": False,
            "is_deactivated": False,
            "name": "raymont updated",
            "handle": "rayjacobsonupdated",
            "profile_picture": None,
            "profile_picture_sizes": "QmYRHAJ4YuLjT4fLLRMg5STnQA4yDpiBmzk5R3iCDTmkmk",
            "cover_photo": None,
            "cover_photo_sizes": "QmUk61QDUTzhNqjnCAWipSp3jnMmXBmtTUC2mtF5F6VvUy",
            "bio": "ðŸŒžðŸ‘„ðŸŒž",
            "location": "chik fil yay!!",
            "artist_pick_track_id": None,
            "creator_node_endpoint": "https://creatornode.audius.co,https://content-node.audius.co,https://blockdaemon-audius-content-06.bdnodes.net",
            "associated_wallets": None,
            "associated_sol_wallets": None,
            "playlist_library": {
                "contents": [
                    {"playlist_id": "Audio NFTs", "type": "explore_playlist"},
                    {"playlist_id": 4327, "type": "playlist"},
                    {"playlist_id": 52792, "type": "playlist"},
                    {"playlist_id": 63949, "type": "playlist"},
                    {
                        "contents": [
                            {"playlist_id": 6833, "type": "playlist"},
                            {"playlist_id": 4735, "type": "playlist"},
                            {"playlist_id": 114799, "type": "playlist"},
                            {"playlist_id": 115049, "type": "playlist"},
                            {"playlist_id": 89495, "type": "playlist"},
                        ],
                        "id": "d515f4db-1db2-41df-9e0c-0180302a24f9",
                        "name": "WIP",
                        "type": "folder",
                    },
                    {
                        "contents": [
                            {"playlist_id": 9616, "type": "playlist"},
                            {"playlist_id": 112826, "type": "playlist"},
                        ],
                        "id": "a0da6552-ddc4-4d13-a19e-ecc63ca23e90",
                        "name": "Community",
                        "type": "folder",
                    },
                    {
                        "contents": [
                            {"playlist_id": 128608, "type": "playlist"},
                            {"playlist_id": 90778, "type": "playlist"},
                            {"playlist_id": 94395, "type": "playlist"},
                            {"playlist_id": 97193, "type": "playlist"},
                        ],
                        "id": "1163fbab-e710-4d33-8769-6fcb02719d7b",
                        "name": "Actually Albums",
                        "type": "folder",
                    },
                    {"playlist_id": 131423, "type": "playlist"},
                    {"playlist_id": 40151, "type": "playlist"},
                ]
            },
            "events": {"is_mobile_user": True},
            "user_id": USER_ID_OFFSET,
        },
        "QmUpdateUser1ArtistPick": {
            "allow_ai_attribution": True,
            "is_verified": False,
            "is_deactivated": False,
            "name": "raymont updated",
            "handle": "rayjacobsonupdated",
            "profile_picture": None,
            "profile_picture_sizes": "QmYRHAJ4YuLjT4fLLRMg5STnQA4yDpiBmzk5R3iCDTmkmk",
            "cover_photo": None,
            "cover_photo_sizes": "QmUk61QDUTzhNqjnCAWipSp3jnMmXBmtTUC2mtF5F6VvUy",
            "bio": "ðŸŒžðŸ‘„ðŸŒž",
            "location": "chik fil yay!!",
            "artist_pick_track_id": TRACK_ID_OFFSET,
            "creator_node_endpoint": "https://creatornode.audius.co,https://content-node.audius.co,https://blockdaemon-audius-content-06.bdnodes.net",
            "associated_wallets": None,
            "associated_sol_wallets": None,
            "playlist_library": {
                "contents": [
                    {"playlist_id": "Audio NFTs", "type": "explore_playlist"},
                    {"playlist_id": 4327, "type": "playlist"},
                    {"playlist_id": 52792, "type": "playlist"},
                    {"playlist_id": 63949, "type": "playlist"},
                    {
                        "contents": [
                            {"playlist_id": 6833, "type": "playlist"},
                            {"playlist_id": 4735, "type": "playlist"},
                            {"playlist_id": 114799, "type": "playlist"},
                            {"playlist_id": 115049, "type": "playlist"},
                            {"playlist_id": 89495, "type": "playlist"},
                        ],
                        "id": "d515f4db-1db2-41df-9e0c-0180302a24f9",
                        "name": "WIP",
                        "type": "folder",
                    },
                    {
                        "contents": [
                            {"playlist_id": 9616, "type": "playlist"},
                            {"playlist_id": 112826, "type": "playlist"},
                        ],
                        "id": "a0da6552-ddc4-4d13-a19e-ecc63ca23e90",
                        "name": "Community",
                        "type": "folder",
                    },
                    {
                        "contents": [
                            {"playlist_id": 128608, "type": "playlist"},
                            {"playlist_id": 90778, "type": "playlist"},
                            {"playlist_id": 94395, "type": "playlist"},
                            {"playlist_id": 97193, "type": "playlist"},
                        ],
                        "id": "1163fbab-e710-4d33-8769-6fcb02719d7b",
                        "name": "Actually Albums",
                        "type": "folder",
                    },
                    {"playlist_id": 131423, "type": "playlist"},
                    {"playlist_id": 40151, "type": "playlist"},
                ]
            },
            "events": {"is_mobile_user": True},
            "user_id": USER_ID_OFFSET,
        },
        "QmCreateUser3": {
            "is_verified": False,
            "is_deactivated": False,
            "name": "Isaac",
            "handle": "isaac",
            "profile_picture": None,
            "profile_picture_sizes": "QmIsaacProfile",
            "cover_photo": None,
            "cover_photo_sizes": "QmIsaacCoverPhoto",
            "bio": "this is isaac",
            "location": "Los Angeles, CA",
            "creator_node_endpoint": "https://creatornode2.audius.co,https://creatornode3.audius.co,https://content-node.audius.co",
            "associated_wallets": None,
            "associated_sol_wallets": None,
            "playlist_library": {"contents": []},
            "events": None,
            "user_id": USER_ID_OFFSET + 3,
        },
    }

    update_user1_artist_pick_json = json.dumps(test_metadata["QmUpdateUser1ArtistPick"])
    update_user1_json = json.dumps(test_metadata["QmUpdateUser1"])
    update_user2_json = json.dumps(test_metadata["QmUpdateUser2"])
    create_user3_json = json.dumps(test_metadata["QmCreateUser3"])

    tx_receipts = {
        "CreateUser1Tx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET,
                        "_entityType": "User",
                        "_userId": USER_ID_OFFSET,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "QmCreateUser1", "data": {update_user1_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "UpdateUser1Tx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET,
                        "_entityType": "User",
                        "_userId": USER_ID_OFFSET,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "QmUpdateUser1", "data": {update_user1_json}}}',
                        "_signer": "0x3a388671bb4D6E1Ea08D79Ee191b40FB45A8F4C4",
                    }
                )
            },
        ],
        "UpdateUser1ArtistPickTx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET,
                        "_entityType": "User",
                        "_userId": USER_ID_OFFSET,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "QmUpdateUser1ArtistPick", "data": {update_user1_artist_pick_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "CreateUser2Tx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET + 1,
                        "_entityType": "User",
                        "_userId": USER_ID_OFFSET + 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "QmCreateUser2", "data": {update_user1_json}}}',
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
        "UpdateUser2Tx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET + 1,
                        "_entityType": "User",
                        "_userId": USER_ID_OFFSET + 1,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "QmUpdateUser2", "data": {update_user2_json}}}',
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
        "CreateUser3Tx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET + 3,
                        "_entityType": "User",
                        "_userId": USER_ID_OFFSET + 3,
                        "_action": "Create",
                        "_metadata": f'{{"cid":"QmCreateUser3", "data": {create_user3_json}}}',
                        "_signer": "user3wallet",
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
        return tx_receipts[tx_receipt.transactionHash.decode("utf-8")]

    mocker.patch(
        "src.tasks.entity_manager.entity_manager.get_entity_manager_events_tx",
        side_effect=get_events_side_effect,
        autospec=True,
    )

    entities = {
        "users": [
            {
                "user_id": 1,
                "handle": "user-1",
                "wallet": "user1wallet",
                "metadata_multihash": "QmCreateUser1",
            },
            {
                "user_id": 2,
                "handle": "user-1",
                "wallet": "User2Wallet",
                "metadata_multihash": "QmCreateUser2",
            },
        ],
        "tracks": [
            {
                "track_id": TRACK_ID_OFFSET,
                "title": "track 1",
                "owner_id": USER_ID_OFFSET,
                "release_date": "Fri Dec 20 2019 12:00:00 GMT-0800",
                "created_at": datetime(2018, 5, 17),
            }
        ],
        "developer_apps": [
            {
                "user_id": 1,
                "name": "My App",
                "address": "0x3a388671bb4D6E1Ea08D79Ee191b40FB45A8F4C4",
                "is_delete": False,
            },
        ],
        "grants": [
            {
                "user_id": USER_ID_OFFSET,
                "grantee_address": "0x3a388671bb4D6E1Ea08D79Ee191b40FB45A8F4C4",
            },
        ],
        "cid_datas": [
            {
                "cid": "QmCreateUser1",
                "type": "user",
                "data": {},
            },
            {
                "cid": "QmCreateUser2",
                "type": "user",
                "data": {},
            },
        ],
    }
    populate_mock_db(db, entities)

    with db.scoped_session() as session:
        # index transactions
        entity_manager_update(
            update_task,
            session,
            entity_manager_txs,
            block_number=1,
            block_timestamp=1585336422,
            block_hash=0,
        )

    with db.scoped_session() as session:
        # validate db records
        all_users: List[User] = session.query(User).all()
        assert len(all_users) == 8

        user_1: User = (
            session.query(User)
            .filter(User.is_current == True, User.user_id == USER_ID_OFFSET)
            .first()
        )
        assert user_1.name == "raymont updated"
        assert user_1.handle == "rayjacobsonupdated"
        assert user_1.artist_pick_track_id == TRACK_ID_OFFSET
        assert user_1.allow_ai_attribution == True

        user_2: User = (
            session.query(User)
            .filter(
                User.is_current == True,
                User.user_id == USER_ID_OFFSET + 1,
            )
            .first()
        )
        assert user_2.name == "Forrest"
        assert user_2.handle == "forrest"

        user_3: User = (
            session.query(User)
            .filter(
                User.is_current == True,
                User.user_id == USER_ID_OFFSET + 3,
            )
            .first()
        )
        assert user_3.name == "Isaac"
        assert user_3.handle == "isaac"

        all_cid: List[CIDData] = session.query(CIDData).all()
        assert len(all_cid) == 6

        calls = [
            mock.call.dispatch(ChallengeEvent.profile_update, 1, USER_ID_OFFSET),
            mock.call.dispatch(ChallengeEvent.profile_update, 1, USER_ID_OFFSET + 1),
            mock.call.dispatch(ChallengeEvent.mobile_install, 1, USER_ID_OFFSET),
        ]
        bus_mock.assert_has_calls(calls, any_order=True)


def test_index_invalid_users(app, mocker):
    "Tests invalid batch of users create/update/delete actions"
    set_patches(mocker)

    # setup db and mocked txs
    with app.app_context():
        db = get_db()
        web3 = Web3()
        update_task = UpdateTask(web3, None)

    test_metadata = {
        "QmCreateUser1": {
            "is_verified": False,
            "is_deactivated": False,
            "name": "raymont",
            "handle": "rayjacobson",
            "profile_picture": None,
            "profile_picture_sizes": "QmYRHAJ4YuLjT4fLLRMg5STnQA4yDpiBmzk5R3iCDTmkmk",
            "cover_photo": None,
            "cover_photo_sizes": "QmUk61QDUTzhNqjnCAWipSp3jnMmXBmtTUC2mtF5F6VvUy",
            "bio": "ðŸŒžðŸ‘„ðŸŒž",
            "location": "chik fil yay!!",
            "creator_node_endpoint": "https://creatornode.audius.co,https://content-node.audius.co,https://blockdaemon-audius-content-06.bdnodes.net",
            "associated_wallets": None,
            "associated_sol_wallets": None,
            "playlist_library": {
                "contents": [
                    {"playlist_id": "Audio NFTs", "type": "explore_playlist"},
                    {"playlist_id": 4327, "type": "playlist"},
                    {"playlist_id": 52792, "type": "playlist"},
                    {"playlist_id": 63949, "type": "playlist"},
                    {
                        "contents": [
                            {"playlist_id": 6833, "type": "playlist"},
                            {"playlist_id": 4735, "type": "playlist"},
                            {"playlist_id": 114799, "type": "playlist"},
                            {"playlist_id": 115049, "type": "playlist"},
                            {"playlist_id": 89495, "type": "playlist"},
                        ],
                        "id": "d515f4db-1db2-41df-9e0c-0180302a24f9",
                        "name": "WIP",
                        "type": "folder",
                    },
                    {
                        "contents": [
                            {"playlist_id": 9616, "type": "playlist"},
                            {"playlist_id": 112826, "type": "playlist"},
                        ],
                        "id": "a0da6552-ddc4-4d13-a19e-ecc63ca23e90",
                        "name": "Community",
                        "type": "folder",
                    },
                    {
                        "contents": [
                            {"playlist_id": 128608, "type": "playlist"},
                            {"playlist_id": 90778, "type": "playlist"},
                            {"playlist_id": 94395, "type": "playlist"},
                            {"playlist_id": 97193, "type": "playlist"},
                        ],
                        "id": "1163fbab-e710-4d33-8769-6fcb02719d7b",
                        "name": "Actually Albums",
                        "type": "folder",
                    },
                    {"playlist_id": 131423, "type": "playlist"},
                    {"playlist_id": 40151, "type": "playlist"},
                ]
            },
            "events": {"is_mobile_user": True},
            "user_id": USER_ID_OFFSET,
        },
        "QmInvalidUserMetadataFields": {
            "is_verified": False,
            "is_deactivated": False,
            "name": "raymont",
            "handle": "rayjacobson",
            "profile_picture": None,
            "profile_picture_sizes": "QmYRHAJ4YuLjT4fLLRMg5STnQA4yDpiBmzk5R3iCDTmkmk",
            "cover_photo": None,
            "cover_photo_sizes": "QmUk61QDUTzhNqjnCAWipSp3jnMmXBmtTUC2mtF5F6VvUy",
            "bio": "ðŸŒžðŸ‘„ðŸŒž",
            "location": "chik fil yay!!",
            "artist_pick_track_id": TRACK_ID_OFFSET + 1,
            "creator_node_endpoint": "https://creatornode.audius.co,https://content-node.audius.co,https://blockdaemon-audius-content-06.bdnodes.net",
            "associated_wallets": None,
            "associated_sol_wallets": None,
            "playlist_library": {
                "contents": [
                    {"playlist_id": "Audio NFTs", "type": "explore_playlist"},
                    {"playlist_id": 4327, "type": "playlist"},
                    {"playlist_id": 52792, "type": "playlist"},
                    {"playlist_id": 63949, "type": "playlist"},
                    {
                        "contents": [
                            {"playlist_id": 6833, "type": "playlist"},
                            {"playlist_id": 4735, "type": "playlist"},
                            {"playlist_id": 114799, "type": "playlist"},
                            {"playlist_id": 115049, "type": "playlist"},
                            {"playlist_id": 89495, "type": "playlist"},
                        ],
                        "id": "d515f4db-1db2-41df-9e0c-0180302a24f9",
                        "name": "WIP",
                        "type": "folder",
                    },
                    {
                        "contents": [
                            {"playlist_id": 9616, "type": "playlist"},
                            {"playlist_id": 112826, "type": "playlist"},
                        ],
                        "id": "a0da6552-ddc4-4d13-a19e-ecc63ca23e90",
                        "name": "Community",
                        "type": "folder",
                    },
                    {
                        "contents": [
                            {"playlist_id": 128608, "type": "playlist"},
                            {"playlist_id": 90778, "type": "playlist"},
                            {"playlist_id": 94395, "type": "playlist"},
                            {"playlist_id": 97193, "type": "playlist"},
                        ],
                        "id": "1163fbab-e710-4d33-8769-6fcb02719d7b",
                        "name": "Actually Albums",
                        "type": "folder",
                    },
                    {"playlist_id": 131423, "type": "playlist"},
                    {"playlist_id": 40151, "type": "playlist"},
                ]
            },
            "events": {"is_mobile_user": True},
            "user_id": USER_ID_OFFSET,
        },
        "QmInvalidArtistPick": {
            "artist_pick_track_id": TRACK_ID_OFFSET + 1,
        },
    }

    create_user1_json = json.dumps(test_metadata["QmCreateUser1"])
    invalid_update_user_json = json.dumps(test_metadata["QmInvalidUserMetadataFields"])
    invalid_update_artist_pick_json = json.dumps(test_metadata["QmInvalidArtistPick"])

    tx_receipts = {
        # invalid create
        "CreateUserBelowOffset": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 1,
                        "_entityType": "User",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": "",
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "CreateUserWithBadMetadataDoesNotExist": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET + 1,
                        "_entityType": "User",
                        "_userId": 2,
                        "_action": "Create",
                        "_metadata": "{}",
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "CreateUserDoesNotMatchSigner": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET + 1,
                        "_entityType": "User",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": "",
                        "_signer": "InvalidWallet",
                    }
                )
            },
        ],
        "CreateUser": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET,
                        "_entityType": "User",
                        "_userId": USER_ID_OFFSET,
                        "_action": "Create",
                        "_metadata": "3,4,5",
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "CreateUserAlreadyExists": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET,
                        "_entityType": "User",
                        "_userId": USER_ID_OFFSET,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "QmCreateUser1", "data": {create_user1_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        # invalid updates
        "UpdateUserInvalidSigner": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET,
                        "_entityType": "User",
                        "_userId": 1,
                        "_action": "Update",
                        "_metadata": "",
                        "_signer": "InvalidWallet",
                    }
                )
            },
        ],
        "UpdateUserInvalidAuthorizedApp": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 1,
                        "_entityType": "User",
                        "_userId": 1,
                        "_action": "Update",
                        "_metadata": "",
                        "_signer": "0x3a388671bb4D6E1Ea08D79Ee191b40FB45A8F4C4",
                    }
                )
            },
        ],
        "UpdateUserDoesNotExist": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 322,
                        "_entityType": "User",
                        "_userId": 322,
                        "_action": "Update",
                        "_metadata": "",
                        "_signer": "0x3a388671bb4D6E1Ea08D79Ee191b40FB45A8F4C4",
                    }
                )
            },
        ],
        "UpdateUserBadMetadata": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET,
                        "_entityType": "User",
                        "_userId": USER_ID_OFFSET,
                        "_action": "Update",
                        "_metadata": "",
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "UpdateUserInvalidOwner": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET,
                        "_entityType": "User",
                        "_userId": 2,
                        "_action": "Update",
                        "_metadata": "",
                        "_signer": "User2Wallet",
                    }
                )
            },
        ],
        "UpdateUserWithInvalidMetadataFields": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET,
                        "_entityType": "User",
                        "_userId": USER_ID_OFFSET,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "QmInvalidUserMetadataFields", "data": {invalid_update_user_json}}}',
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "UpdateUserInvalidArtistPick": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 1,  # existing user
                        "_entityType": "User",
                        "_userId": 1,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "QmInvalidArtistPick", "data": {invalid_update_artist_pick_json}}}',
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
        return tx_receipts[tx_receipt.transactionHash.decode("utf-8")]

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
            {
                "track_id": TRACK_ID_OFFSET,
                "title": "track 1",
                "owner_id": USER_ID_OFFSET,
                "release_date": "Fri Dec 20 2019 12:00:00 GMT-0800",
                "created_at": datetime(2018, 5, 17),
            }
        ],
    }
    populate_mock_db(db, entities)

    with db.scoped_session() as session:
        existing_user: List[User] = session.query(User).filter(User.is_current).first()

        # index transactions
        entity_manager_update(
            update_task,
            session,
            entity_manager_txs,
            block_number=0,
            block_timestamp=1585336422,
            block_hash=0,
        )

        # validate db records
        all_users: List[User] = session.query(User).filter(User.is_current).all()
        assert len(all_users) == 2  # no new users indexed

        existing_user_after_index: List[User] = (
            session.query(User).filter(User.user_id == 1).first()
        )

        assert existing_user == existing_user_after_index


def test_index_verify_users(app, mocker):
    "Tests user verify actions"
    bus_mock = set_patches(mocker)

    # setup db and mocked txs
    with app.app_context():
        db = get_db()
        web3 = Web3()
        update_task = UpdateTask(
            web3,
            challenge_event_bus=bus_mock,
        )

        tx_receipts = {
            "VerifyUser": [
                {
                    "args": AttributeDict(
                        {
                            "_entityId": 1,
                            "_entityType": "User",
                            "_userId": 1,
                            "_action": "Verify",
                            "_metadata": "",
                            "_signer": "0x",
                        }
                    )
                },
            ],
            "InvalidVerifyUser": [
                {
                    "args": AttributeDict(
                        {
                            "_entityId": 2,
                            "_entityType": "User",
                            "_userId": 2,
                            "_action": "Verify",
                            "_metadata": "",
                            "_signer": "user1wallet",
                        }
                    )
                },
            ],
        }

        entity_manager_txs = [
            AttributeDict(
                {"transactionHash": update_task.web3.to_bytes(text=tx_receipt)}
            )
            for tx_receipt in tx_receipts
        ]

        def get_events_side_effect(_, tx_receipt):
            return tx_receipts[tx_receipt.transactionHash.decode("utf-8")]

        mocker.patch(
            "src.tasks.entity_manager.entity_manager.get_entity_manager_events_tx",
            side_effect=get_events_side_effect,
            autospec=True,
        )
        entities = {
            "users": [
                {"user_id": 1, "handle": "user-1", "wallet": "user1wallet"},
                {"user_id": 2, "handle": "user-1", "wallet": "user2wallet"},
            ]
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
                block_hash=0,
            )
            # validate db records
            all_users: List[User] = (
                session.query(User)
                .filter(User.is_current)
                .order_by(asc(User.user_id))
                .all()
            )
            assert len(all_users) == 2  # no new users indexed
            assert all_users[0].is_verified  # user 1 is verified
            assert not all_users[1].is_verified  # user 2 is not verified
            calls = [mock.call.dispatch(ChallengeEvent.connect_verified, 0, 1)]
            bus_mock.assert_has_calls(calls, any_order=True)


def test_invalid_user_bio(app, mocker):
    "Tests that users cant add a bio that's too long"
    bus_mock = set_patches(mocker)
    with app.app_context():
        db = get_db()
        web3 = Web3()
        update_task = UpdateTask(web3, bus_mock, None, None)
        metadata = {
            "CreateUserInvalidBioMetadata": {
                "bio": "xtralarge" * CHARACTER_LIMIT_USER_BIO
            }
        }

        user_metadata = json.dumps(metadata["CreateUserInvalidBioMetadata"])
        tx_receipts = {
            "CreateUserInvalidBio": [
                {
                    "args": AttributeDict(
                        {
                            "_entityId": 1,
                            "_entityType": "User",
                            "_userId": USER_ID_OFFSET + 1,
                            "_action": "Create",
                            "_metadata": f'{{"cid": "CreateUserInvalidBioMetadata", "data": {user_metadata}}}',
                            "_signer": "user1wallet",
                        }
                    )
                },
            ],
        }

        entity_manager_txs = [
            AttributeDict(
                {"transactionHash": update_task.web3.to_bytes(text=tx_receipt)}
            )
            for tx_receipt in tx_receipts
        ]

        def get_events_side_effect(_, tx_receipt):
            return tx_receipts[tx_receipt.transactionHash.decode("utf-8")]

        mocker.patch(
            "src.tasks.entity_manager.entity_manager.get_entity_manager_events_tx",
            side_effect=get_events_side_effect,
            autospec=True,
        )

        with db.scoped_session() as session:
            total_changes, _ = entity_manager_update(
                update_task,
                session,
                entity_manager_txs,
                block_number=0,
                block_timestamp=1585336422,
                block_hash=0,
            )

            assert total_changes == 0


@mock.patch("src.challenges.challenge_event_bus.ChallengeEventBus", autospec=True)
def test_self_referrals(bus_mock: mock.MagicMock, app):
    """Test that users can't refer themselves"""
    block_hash = b"0x8f19da326900d171642af08e6770eedd83509c6c44f6855c98e6a752844e2521"
    with app.app_context():
        db = get_db()
        redis = get_redis()
        bus_mock(redis)
    with db.scoped_session() as session, bus_mock.use_scoped_dispatch_queue():
        user = User(user_id=1, blockhash=str(block_hash), blocknumber=1)
        events: UserEventMetadata = {"referrer": 1}
        update_user_events(session, user, events, bus_mock)
        mock_call = mock.call.dispatch(
            ChallengeEvent.referral_signup, 1, 1, {"referred_user_id": 1}
        )
        assert mock_call not in bus_mock.method_calls


def test_index_empty_bio(app, mocker):
    "Tests empty bio gets saved"

    bus_mock = set_patches(mocker)

    # setup db and mocked txs
    with app.app_context():
        db = get_db()
        web3 = Web3()
        update_task = UpdateTask(web3, bus_mock)

    test_metadata = {
        "QmUpdateUser2a": {
            "is_verified": False,
            "is_deactivated": False,
            "name": "Forrest",
            "handle": "forrest",
            "profile_picture": None,
            "profile_picture_sizes": "QmNmzMoiLYSAgrLbAAnaPW9q3YZwZvHybbbs59QamzUQxg",
            "cover_photo": None,
            "cover_photo_sizes": "QmR2fSFvtpWg7nfdYtoJ3KgDNf4YgcuSzKjwZjansW9wcj",
            "bio": "heres a fake bioooo",
            "location": "Los Angeles, CA",
            "creator_node_endpoint": "https://creatornode2.audius.co,https://creatornode3.audius.co,https://content-node.audius.co",
            "associated_wallets": None,
            "associated_sol_wallets": None,
            "playlist_library": {
                "contents": [
                    {"playlist_id": "Audio NFTs", "type": "explore_playlist"},
                    {"playlist_id": 11363, "type": "playlist"},
                    {"playlist_id": 129218, "type": "playlist"},
                ]
            },
            "events": None,
            "user_id": USER_ID_OFFSET + 1,
        },
        "QmUpdateUser2b": {
            "is_verified": False,
            "is_deactivated": False,
            "name": "Forrest",
            "handle": "forrest",
            "profile_picture": None,
            "profile_picture_sizes": "QmNmzMoiLYSAgrLbAAnaPW9q3YZwZvHybbbs59QamzUQxg",
            "cover_photo": None,
            "cover_photo_sizes": "QmR2fSFvtpWg7nfdYtoJ3KgDNf4YgcuSzKjwZjansW9wcj",
            "bio": "",
            "location": "Los Angeles, CA",
            "creator_node_endpoint": "https://creatornode2.audius.co,https://creatornode3.audius.co,https://content-node.audius.co",
            "associated_wallets": None,
            "associated_sol_wallets": None,
            "playlist_library": {
                "contents": [
                    {"playlist_id": "Audio NFTs", "type": "explore_playlist"},
                    {"playlist_id": 11363, "type": "playlist"},
                    {"playlist_id": 129218, "type": "playlist"},
                ]
            },
            "events": None,
            "user_id": USER_ID_OFFSET + 1,
        },
        "QmCreateUser3": {
            "is_verified": False,
            "is_deactivated": False,
            "name": "Isaac",
            "handle": "isaac",
            "profile_picture": None,
            "profile_picture_sizes": "QmIsaacProfile",
            "cover_photo": None,
            "cover_photo_sizes": "QmIsaacCoverPhoto",
            "bio": "",
            "location": "Los Angeles, CA",
            "creator_node_endpoint": "https://creatornode2.audius.co,https://creatornode3.audius.co,https://content-node.audius.co",
            "associated_wallets": None,
            "associated_sol_wallets": None,
            "playlist_library": {"contents": []},
            "events": None,
            "user_id": USER_ID_OFFSET + 3,
        },
    }

    update_user2a_json = json.dumps(test_metadata["QmUpdateUser2a"])
    update_user2b_json = json.dumps(test_metadata["QmUpdateUser2b"])
    create_user3_json = json.dumps(test_metadata["QmCreateUser3"])

    tx_receipts = {
        "CreateUser2Tx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET + 1,
                        "_entityType": "User",
                        "_userId": USER_ID_OFFSET + 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "QmCreateUser2", "data": {update_user2a_json}}}',
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
        "UpdateUser2aTx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET + 1,
                        "_entityType": "User",
                        "_userId": USER_ID_OFFSET + 1,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "QmUpdateUser2a", "data": {update_user2a_json}}}',
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
        "UpdateUser2bTx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET + 1,
                        "_entityType": "User",
                        "_userId": USER_ID_OFFSET + 1,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "QmUpdateUser2b", "data": {update_user2b_json}}}',
                        "_signer": "user2wallet",
                    }
                )
            },
        ],
        "CreateUser3Tx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET + 3,
                        "_entityType": "User",
                        "_userId": USER_ID_OFFSET + 3,
                        "_action": "Create",
                        "_metadata": f'{{"cid":"QmCreateUser3", "data": {create_user3_json}}}',
                        "_signer": "user3wallet",
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
        return tx_receipts[tx_receipt.transactionHash.decode("utf-8")]

    mocker.patch(
        "src.tasks.entity_manager.entity_manager.get_entity_manager_events_tx",
        side_effect=get_events_side_effect,
        autospec=True,
    )

    entities = {
        "users": [
            {
                "user_id": 2,
                "handle": "user-1",
                "wallet": "User2Wallet",
                "metadata_multihash": "QmCreateUser2",
            },
        ],
        "cid_datas": [
            {
                "cid": "QmCreateUser2",
                "type": "user",
                "data": {},
            },
        ],
    }

    populate_mock_db(db, entities)

    with db.scoped_session() as session:
        # index transactions
        entity_manager_update(
            update_task,
            session,
            entity_manager_txs,
            block_number=1,
            block_timestamp=1585336422,
            block_hash=0,
        )

    with db.scoped_session() as session:
        # validate db records
        all_users: List[User] = session.query(User).all()
        assert len(all_users) == 5

        user_2: User = (
            session.query(User)
            .filter(
                User.is_current == True,
                User.user_id == USER_ID_OFFSET + 1,
            )
            .first()
        )
        assert user_2.name == "Forrest"
        assert user_2.handle == "forrest"
        assert user_2.bio == ""

        user_3: User = (
            session.query(User)
            .filter(
                User.is_current == True,
                User.user_id == USER_ID_OFFSET + 3,
            )
            .first()
        )
        assert user_3.name == "Isaac"
        assert user_3.handle == "isaac"
        assert user_3.bio == ""
