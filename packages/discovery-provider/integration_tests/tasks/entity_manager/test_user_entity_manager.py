import json
from datetime import datetime
from typing import List
from unittest import mock
from unittest.mock import create_autospec

from solders.account import AccountJSON
from sqlalchemy import asc
from web3 import Web3
from web3.datastructures import AttributeDict

from integration_tests.challenges.index_helpers import UpdateTask
from integration_tests.utils import populate_mock_db, populate_mock_db_blocks
from src.challenges.challenge_event import ChallengeEvent
from src.challenges.challenge_event_bus import ChallengeEventBus, setup_challenge_bus
from src.models.users.associated_wallet import AssociatedWallet
from src.models.users.user import User
from src.queries.get_balances import IMMEDIATE_REFRESH_REDIS_PREFIX
from src.solana.solana_client_manager import SolanaClientManager
from src.tasks.entity_manager.entities.user import UserEventMetadata, update_user_events
from src.tasks.entity_manager.entity_manager import entity_manager_update
from src.tasks.entity_manager.utils import (
    CHARACTER_LIMIT_USER_BIO,
    TRACK_ID_OFFSET,
    USER_ID_OFFSET,
)
from src.utils.config import shared_config
from src.utils.db_session import get_db
from src.utils.redis_connection import get_redis

BLOCK_DATETIME = datetime.now()


def set_patches(mocker):
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
        "QmCreateUser2": {
            "is_verified": False,
            "is_deactivated": False,
            "name": "Forrest",
            "handle": "forrest",
            "profile_picture": None,
            "profile_picture_sizes": "QmForrestProfile",
            "cover_photo": None,
            "cover_photo_sizes": "QmForrestProfile",
            "bio": "this is forrest",
            "location": "Los Angeles, CA",
            "creator_node_endpoint": "https://creatornode2.audius.co,https://creatornode3.audius.co,https://content-node.audius.co",
            "wallet": "user2wallet",
            "associated_wallets": None,
            "associated_sol_wallets": None,
            "playlist_library": {"contents": []},
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
            "bio": "this is isaac",
            "location": "Los Angeles, CA",
            "creator_node_endpoint": "https://creatornode2.audius.co,https://creatornode3.audius.co,https://content-node.audius.co",
            "wallet": "user3wallet",
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
    create_user2_json = json.dumps(test_metadata["QmCreateUser2"])
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
                        "_metadata": f'{{"cid": "QmCreateUser2", "data": {create_user2_json}}}',
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
        return tx_receipts[tx_receipt["transactionHash"].decode("utf-8")]

    mocker.patch(
        "src.tasks.entity_manager.entity_manager.get_entity_manager_events_tx",
        side_effect=get_events_side_effect,
        autospec=True,
    )

    entities = {
        "users": [
            {"user_id": 1, "handle": "user-1"},
            {"user_id": 2, "handle": "user-1"},
        ],
        "tracks": [
            {
                "track_id": TRACK_ID_OFFSET,
                "title": "track 1",
                "owner_id": USER_ID_OFFSET,
                "release_date": datetime(2019, 12, 20),
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
    }
    populate_mock_db(db, entities)

    with db.scoped_session() as session:
        # index transactions
        entity_manager_update(
            update_task,
            session,
            entity_manager_txs,
            block_number=1,
            block_timestamp=BLOCK_DATETIME.timestamp(),
            block_hash=hex(0),
        )

    with db.scoped_session() as session:
        # validate db records
        all_users: List[User] = session.query(User).all()
        assert len(all_users) == 5

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

        calls = [
            mock.call.dispatch(
                ChallengeEvent.profile_update, 1, BLOCK_DATETIME, USER_ID_OFFSET
            ),
            mock.call.dispatch(
                ChallengeEvent.profile_update, 1, BLOCK_DATETIME, USER_ID_OFFSET + 1
            ),
            mock.call.dispatch(
                ChallengeEvent.mobile_install, 1, BLOCK_DATETIME, USER_ID_OFFSET
            ),
        ]
        bus_mock.assert_has_calls(calls, any_order=True)


def test_index_invalid_users(app, mocker):
    "Tests invalid batch of users create/update/delete actions"
    set_patches(mocker)

    # setup db and mocked txs
    with app.app_context():
        db = get_db()
        web3 = Web3()
        challenge_event_bus: ChallengeEventBus = setup_challenge_bus()
        update_task = UpdateTask(web3, challenge_event_bus)

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
            "wallet": "user1wallet",
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
        "QmInvalidVerified": {
            "is_verified": True,
            "is_deactivated": False,
            "name": "verified name",
            "handle": "verifiedhandle",
            "profile_picture": None,
            "profile_picture_sizes": "QmYRHAJ4YuLjT4fLLRMg5STnQA4yDpiBmzk5R3iCDTmkmk",
            "cover_photo": None,
            "cover_photo_sizes": "QmUk61QDUTzhNqjnCAWipSp3jnMmXBmtTUC2mtF5F6VvUy",
            "bio": "ðŸŒžðŸ‘„ðŸŒž",
            "location": "verified location",
            "creator_node_endpoint": "https://creatornode2.audius.co,https://creatornode3.audius.co,https://content-node.audius.co",
            "associated_wallets": None,
            "associated_sol_wallets": None,
            "playlist_library": {"contents": []},
            "events": {"is_mobile_user": True},
            "user_id": USER_ID_OFFSET + 1,
        },
    }

    create_user1_json = json.dumps(test_metadata["QmCreateUser1"])
    invalid_update_user_json = json.dumps(test_metadata["QmInvalidUserMetadataFields"])
    invalid_update_artist_pick_json = json.dumps(test_metadata["QmInvalidArtistPick"])
    invalid_verified_user = json.dumps(test_metadata["QmInvalidVerified"])

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
        "CreateUserInvalidVerified": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET + 1,
                        "_entityType": "User",
                        "_userId": USER_ID_OFFSET + 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "QmUpdateUser2", "data": {invalid_verified_user}}}',
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
        return tx_receipts[tx_receipt["transactionHash"].decode("utf-8")]

    mocker.patch(
        "src.tasks.entity_manager.entity_manager.get_entity_manager_events_tx",
        side_effect=get_events_side_effect,
        autospec=True,
    )
    entities = {
        "users": [
            {"user_id": 1, "handle": "user-1"},
        ],
        "tracks": [
            {
                "track_id": TRACK_ID_OFFSET,
                "title": "track 1",
                "owner_id": USER_ID_OFFSET,
                "release_date": datetime(2019, 12, 20),
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
            block_timestamp=BLOCK_DATETIME.timestamp(),
            block_hash=hex(0),
        )

        # validate db records
        all_users: List[User] = session.query(User).filter(User.is_current).all()
        assert len(all_users) == 3

        existing_user_after_index: List[User] = (
            session.query(User).filter(User.user_id == 1).first()
        )

        assert existing_user == existing_user_after_index

        invalid_verified_user: List[User] = (
            session.query(User).filter(User.user_id == USER_ID_OFFSET + 1).first()
        )
        assert invalid_verified_user.is_verified == False  # ignored invalid metadata


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

        verified_metadata = {
            "is_verified": True,
            "twitter_handle": "twitter handle",
        }
        unverified_metadata = {
            "is_verified": False,
            "twitter_handle": "twitter handle",
        }

        tx_receipts = {
            "VerifyUser": [
                {
                    "args": AttributeDict(
                        {
                            "_entityId": 1,
                            "_entityType": "User",
                            "_userId": 1,
                            "_action": "Verify",
                            "_metadata": f'{{"cid": "VerifyUserCid", "data": {json.dumps(verified_metadata)}}}',
                            "_signer": "0x",
                        }
                    )
                },
            ],
            "InvalidVerifyUserWrongSigner": [
                {
                    "args": AttributeDict(
                        {
                            "_entityId": 2,
                            "_entityType": "User",
                            "_userId": 2,
                            "_action": "Verify",
                            "_metadata": f'{{"cid": "InvalidVerifyUserCid", "data": {json.dumps(verified_metadata)}}}',
                            "_signer": "user1wallet",  # wrong wallet
                        }
                    )
                },
            ],
            "InvalidVerifyUserNoChallenge": [
                {
                    "args": AttributeDict(
                        {
                            "_entityId": 2,
                            "_entityType": "User",
                            "_userId": 2,
                            "_action": "Verify",
                            "_metadata": f'{{"cid": "UpdateSocialHandle", "data": {json.dumps(unverified_metadata)}}}',  # should not dispatch challenge
                            "_signer": "0x",
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
                block_timestamp=BLOCK_DATETIME.timestamp(),
                block_hash=hex(0),
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
            verify_user_1_calls = [
                mock.call.dispatch(
                    ChallengeEvent.connect_verified, 0, BLOCK_DATETIME, 1
                )
            ]
            bus_mock.assert_has_calls(verify_user_1_calls, any_order=True)

            unwanted_call = mock.call.dispatch(
                ChallengeEvent.connect_verified, 0, BLOCK_DATETIME, 2
            )

            assert unwanted_call not in bus_mock.mock_calls, "The user is not verified."


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
            return tx_receipts[tx_receipt["transactionHash"].decode("utf-8")]

        mocker.patch(
            "src.tasks.entity_manager.entity_manager.get_entity_manager_events_tx",
            side_effect=get_events_side_effect,
            autospec=True,
        )
        populate_mock_db_blocks(db, 0, 1)
        with db.scoped_session() as session:
            total_changes, _ = entity_manager_update(
                update_task,
                session,
                entity_manager_txs,
                block_number=0,
                block_timestamp=BLOCK_DATETIME.timestamp(),
                block_hash=hex(0),
            )

            assert total_changes == 0


@mock.patch("src.challenges.challenge_event_bus.ChallengeEventBus", autospec=True)
def test_self_referrals(bus_mock: mock.MagicMock, app, mocker):
    """Test that users can't refer themselves"""
    block_hash = b"0x8f19da326900d171642af08e6770eedd83509c6c44f6855c98e6a752844e2521"
    with app.app_context():
        db = get_db()
        redis = get_redis()
        bus_mock(redis)
    with db.scoped_session(), bus_mock.use_scoped_dispatch_queue():
        user = User(user_id=1, blockhash=str(block_hash), blocknumber=1)
        events: UserEventMetadata = {"referrer": 1}
        params = mocker.Mock()
        params.existing_records = {}
        update_user_events(user, events, bus_mock, params)
        mock_call = mock.call.dispatch(
            ChallengeEvent.referral_signup,
            1,
            BLOCK_DATETIME,
            1,
            {"referred_user_id": 1},
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
        return tx_receipts[tx_receipt["transactionHash"].decode("utf-8")]

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
            },
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
            block_timestamp=BLOCK_DATETIME.timestamp(),
            block_hash=hex(0),
        )

    with db.scoped_session() as session:
        # validate db records
        all_users: List[User] = session.query(User).all()
        assert len(all_users) == 3

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


def test_index_adding_spl_usdc_payout_wallet(app, mocker):
    bus_mock = set_patches(mocker)

    # setup db and mocked txs
    with app.app_context():
        db = get_db()
        web3 = Web3()
        solana_client_manager_mock = create_autospec(SolanaClientManager)
        solana_client_manager_mock.get_account_info_json_parsed.return_value = AccountJSON.from_json(
            json.dumps(
                {
                    "lamports": 2039280,
                    "data": {
                        "program": "spl-token",
                        "parsed": {
                            "info": {
                                "isNative": False,
                                "mint": shared_config["solana"]["usdc_mint"],
                                "owner": "F1vVY6VtF5oLT2QYEqy6276JGGhgaLEDZMamoFsJWSYk",
                                "state": "initialized",
                                "tokenAmount": {
                                    "amount": "3267791",
                                    "decimals": 6,
                                    "uiAmount": 3.267791,
                                    "uiAmountString": "3.267791",
                                },
                            },
                            "type": "account",
                        },
                        "space": 165,
                    },
                    "owner": [
                        6,
                        221,
                        246,
                        225,
                        215,
                        101,
                        161,
                        147,
                        217,
                        203,
                        225,
                        70,
                        206,
                        235,
                        121,
                        172,
                        28,
                        180,
                        133,
                        237,
                        95,
                        91,
                        55,
                        145,
                        58,
                        140,
                        245,
                        133,
                        126,
                        255,
                        0,
                        169,
                    ],
                    "executable": False,
                    "rentEpoch": 18446744073709551615,
                }
            )
        )
        update_task = UpdateTask(
            web3, bus_mock, solana_client_manager=solana_client_manager_mock
        )

    test_metadata = {
        "QmUpdateUser": {
            "name": "Britney Spores",
            "handle": "britneyspores",
            "profile_picture_sizes": "QmNmzMoiLYSAgrLbAAnaPW9q3YZwZvHybbbs59QamzUQxg",
            "cover_photo_sizes": "QmR2fSFvtpWg7nfdYtoJ3KgDNf4YgcuSzKjwZjansW9wcj",
            "bio": "No but I'm like actually Toxic",
            "location": "McComb, MS",
            "spl_usdc_payout_wallet": "7MjEvdyxduYPYwikWovAJ9TjLkzgdW3DiihysYTTN4up",
            "user_id": 1,
        },
    }

    update_user_json = json.dumps(test_metadata["QmUpdateUser"])

    tx_receipts = {
        "UpdateUserTx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 1,
                        "_entityType": "User",
                        "_userId": 1,
                        "_action": "Update",
                        "_metadata": f'{{"cid": "QmUpdateUser", "data": {update_user_json}}}',
                        "_signer": "wallet",
                    }
                )
            },
        ]
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
            {
                "user_id": 1,
                "handle": "britneyspores",
                "wallet": "wallet",
            },
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
            block_timestamp=BLOCK_DATETIME.timestamp(),
            block_hash=hex(0),
        )

    with db.scoped_session() as session:
        all_users: List[User] = session.query(User).all()
        assert len(all_users) == 1

        user: User = (
            session.query(User)
            .filter(
                User.user_id == 1,
            )
            .first()
        )
        assert user.name == "Britney Spores"
        assert user.handle == "britneyspores"
        assert (
            user.spl_usdc_payout_wallet
            == "7MjEvdyxduYPYwikWovAJ9TjLkzgdW3DiihysYTTN4up"
        )


def test_add_associated_wallet(app, mocker):
    """Tests adding associated wallets with valid and invalid signatures"""
    bus_mock = set_patches(mocker)

    redis_mock = mocker.Mock()
    redis_mock.sadd = mocker.Mock()

    with app.app_context():
        db = get_db()
        web3 = Web3()
        update_task = UpdateTask(web3, bus_mock, redis=redis_mock)

    entities = {
        "users": [
            {
                "user_id": 1,
                "handle": "britneyspores",
                "wallet": "user1wallet",
            },
        ]
    }

    populate_mock_db(db, entities)

    # Test data for adding ETH wallet
    eth_wallet = "0x1234567890123456789012345678901234567890"
    eth_signature = "0xvalid_signature"  # Mock signature
    eth_metadata = {
        "chain": "eth",
        "wallet_address": eth_wallet,
        "signature": eth_signature,
    }

    # Test data for adding SOL wallet
    sol_wallet = "DxMWXrYWxYGgAqNxqzwCd5zyGFn9bGF1pBBCDrQArYox"
    sol_signature = "0xvalid_signature"  # Mock signature
    sol_metadata = {
        "chain": "sol",
        "wallet_address": sol_wallet,
        "signature": sol_signature,
    }

    # Invalid signature test data
    invalid_eth_wallet = "0x2345678901234567890123456789012345678901"
    invalid_eth_metadata = {
        "chain": "eth",
        "wallet_address": invalid_eth_wallet,
        "signature": "0xinvalid_signature",
    }

    tx_receipts = {
        "AddEthWalletTx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": "",
                        "_entityType": "AssociatedWallet",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": json.dumps({"cid": "", "data": eth_metadata}),
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "AddSolWalletTx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": "",
                        "_entityType": "AssociatedWallet",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": json.dumps({"cid": "", "data": sol_metadata}),
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "AddInvalidSignatureTx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": "",
                        "_entityType": "AssociatedWallet",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": json.dumps(
                            {"cid": "", "data": invalid_eth_metadata}
                        ),
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

    # Mock signature validation
    def mock_validate_signature(chain, web3, user_id, wallet, signature):
        if signature == "0xvalid_signature":
            return True
        return False

    mocker.patch(
        "src.tasks.entity_manager.entities.user.validate_signature",
        side_effect=mock_validate_signature,
    )

    with db.scoped_session() as session:
        # Index transactions
        entity_manager_update(
            update_task,
            session,
            entity_manager_txs,
            block_number=0,
            block_timestamp=BLOCK_DATETIME.timestamp(),
            block_hash=hex(0),
        )

        # Verify results
        eth_wallet_record = (
            session.query(AssociatedWallet)
            .filter(
                AssociatedWallet.user_id == 1,
                AssociatedWallet.wallet == eth_wallet,
                AssociatedWallet.chain == "eth",
            )
            .first()
        )
        assert eth_wallet_record is not None
        assert eth_wallet_record.is_current
        assert not eth_wallet_record.is_delete

        sol_wallet_record = (
            session.query(AssociatedWallet)
            .filter(
                AssociatedWallet.user_id == 1,
                AssociatedWallet.wallet == sol_wallet,
                AssociatedWallet.chain == "sol",
            )
            .first()
        )
        assert sol_wallet_record is not None
        assert sol_wallet_record.is_current
        assert not sol_wallet_record.is_delete

        # Invalid signature wallet should not exist
        invalid_wallet_record = (
            session.query(AssociatedWallet)
            .filter(
                AssociatedWallet.user_id == 1,
                AssociatedWallet.wallet == invalid_eth_wallet,
                AssociatedWallet.chain == "eth",
            )
            .first()
        )
        assert invalid_wallet_record is None

        # Verify balance refresh was called
        redis_mock.sadd.assert_called_with(IMMEDIATE_REFRESH_REDIS_PREFIX, 1)


def test_add_existing_associated_wallet(app, mocker):
    """Tests adding a wallet that already exists"""
    bus_mock = set_patches(mocker)

    redis_mock = mocker.Mock()
    redis_mock.sadd = mocker.Mock()

    # setup db and mocked txs
    with app.app_context():
        db = get_db()
        web3 = Web3()
        update_task = UpdateTask(web3, bus_mock, redis=redis_mock)

    eth_wallet = "0x1234567890123456789012345678901234567890"
    eth_signature = "0xvalid_signature"  # Mock signature
    eth_metadata = {
        "chain": "eth",
        "wallet_address": eth_wallet,
        "signature": eth_signature,
    }

    tx_receipts = {
        "AddExistingWalletTx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": "",
                        "_entityType": "AssociatedWallet",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": json.dumps({"cid": "", "data": eth_metadata}),
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
    mocker.patch(
        "src.tasks.entity_manager.entities.user.validate_signature",
        return_value=True,
    )

    # Create existing wallet association
    entities = {
        "users": [
            {
                "user_id": 1,
                "handle": "user-1",
                "wallet": "user1wallet",
            },
        ],
        "associated_wallets": [
            {
                "user_id": 1,
                "wallet": eth_wallet,
                "chain": "eth",
                "is_current": True,
                "is_delete": False,
                "blocknumber": 0,
                "blockhash": hex(0),
            }
        ],
    }
    populate_mock_db(db, entities)

    with db.scoped_session() as session:
        # Verify initial state
        initial_wallet = (
            session.query(AssociatedWallet)
            .filter(
                AssociatedWallet.user_id == 1,
                AssociatedWallet.wallet == eth_wallet,
                AssociatedWallet.chain == "eth",
            )
            .first()
        )
        assert initial_wallet is not None
        assert initial_wallet.is_current
        assert not initial_wallet.is_delete
        initial_blockhash = initial_wallet.blockhash
        initial_blocknumber = initial_wallet.blocknumber

        # Index transactions
        total_changes, _ = entity_manager_update(
            update_task,
            session,
            entity_manager_txs,
            block_number=1,
            block_timestamp=BLOCK_DATETIME.timestamp(),
            block_hash=hex(1),
        )

        # Verify no changes were made
        assert total_changes == 0

        # Verify the wallet was not modified
        updated_wallet = (
            session.query(AssociatedWallet)
            .filter(
                AssociatedWallet.user_id == 1,
                AssociatedWallet.wallet == eth_wallet,
                AssociatedWallet.chain == "eth",
            )
            .first()
        )
        assert updated_wallet is not None
        assert updated_wallet.is_current
        assert not updated_wallet.is_delete
        assert updated_wallet.blockhash == initial_blockhash
        assert updated_wallet.blocknumber == initial_blocknumber

        # Verify balance refresh was not called
        redis_mock.sadd.assert_not_called()


def test_remove_associated_wallet(app, mocker):
    """Tests removing existing associated wallets (ETH and SOL)"""
    bus_mock = set_patches(mocker)

    redis_mock = mocker.Mock()
    redis_mock.sadd = mocker.Mock()

    # setup db and mocked txs
    with app.app_context():
        db = get_db()
        web3 = Web3()
        update_task = UpdateTask(web3, bus_mock, redis=redis_mock)

    eth_wallet = "0x1234567890123456789012345678901234567890"
    sol_wallet = "DxMWXrYWxYGgAqNxqzwCd5zyGFn9bGF1pBBCDrQArYox"

    remove_eth_metadata = {
        "chain": "eth",
        "wallet_address": eth_wallet,
    }

    remove_sol_metadata = {
        "chain": "sol",
        "wallet_address": sol_wallet,
    }

    tx_receipts = {
        "RemoveEthWalletTx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": "",
                        "_entityType": "AssociatedWallet",
                        "_userId": 1,
                        "_action": "Delete",
                        "_metadata": json.dumps(
                            {"cid": "", "data": remove_eth_metadata}
                        ),
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
        "RemoveSolWalletTx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": "",
                        "_entityType": "AssociatedWallet",
                        "_userId": 1,
                        "_action": "Delete",
                        "_metadata": json.dumps(
                            {"cid": "", "data": remove_sol_metadata}
                        ),
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

    # Create existing wallet associations
    entities = {
        "users": [
            {
                "user_id": 1,
                "handle": "user-1",
                "wallet": "user1wallet",
            },
        ],
        "associated_wallets": [
            {
                "user_id": 1,
                "wallet": eth_wallet,
                "chain": "eth",
                "is_current": True,
                "is_delete": False,
                "blocknumber": 0,
                "blockhash": hex(0),
            },
            {
                "user_id": 1,
                "wallet": sol_wallet,
                "chain": "sol",
                "is_current": True,
                "is_delete": False,
                "blocknumber": 0,
                "blockhash": hex(0),
            },
        ],
    }
    populate_mock_db(db, entities)

    with db.scoped_session() as session:
        # Verify initial state
        initial_eth_wallet = (
            session.query(AssociatedWallet)
            .filter(
                AssociatedWallet.user_id == 1,
                AssociatedWallet.wallet == eth_wallet,
                AssociatedWallet.chain == "eth",
            )
            .first()
        )
        assert initial_eth_wallet is not None
        assert initial_eth_wallet.is_current
        assert not initial_eth_wallet.is_delete

        initial_sol_wallet = (
            session.query(AssociatedWallet)
            .filter(
                AssociatedWallet.user_id == 1,
                AssociatedWallet.wallet == sol_wallet,
                AssociatedWallet.chain == "sol",
            )
            .first()
        )
        assert initial_sol_wallet is not None
        assert initial_sol_wallet.is_current
        assert not initial_sol_wallet.is_delete

        # Index transactions
        total_changes, _ = entity_manager_update(
            update_task,
            session,
            entity_manager_txs,
            block_number=1,
            block_timestamp=BLOCK_DATETIME.timestamp(),
            block_hash=hex(1),
        )

        # Verify both wallets were removed
        removed_eth_wallet = (
            session.query(AssociatedWallet)
            .filter(
                AssociatedWallet.user_id == 1,
                AssociatedWallet.wallet == eth_wallet,
                AssociatedWallet.chain == "eth",
            )
            .first()
        )
        assert removed_eth_wallet is None

        removed_sol_wallet = (
            session.query(AssociatedWallet)
            .filter(
                AssociatedWallet.user_id == 1,
                AssociatedWallet.wallet == sol_wallet,
                AssociatedWallet.chain == "sol",
            )
            .first()
        )
        assert removed_sol_wallet is None

        # Verify balance refresh was called exactly once for each removal
        assert redis_mock.sadd.call_count == 2
        redis_mock.sadd.assert_has_calls(
            [
                mock.call(IMMEDIATE_REFRESH_REDIS_PREFIX, 1),
                mock.call(IMMEDIATE_REFRESH_REDIS_PREFIX, 1),
            ]
        )


def test_index_duplicate_wallet_users(app, mocker):
    """Tests that a second user cannot be created with the same wallet"""
    bus_mock = set_patches(mocker)

    # setup db and mocked txs
    with app.app_context():
        db = get_db()
        web3 = Web3()
        redis_mock = mocker.Mock()
        update_task = UpdateTask(web3, bus_mock, redis_mock)

    test_metadata = {
        "QmCreateUser1": {
            "is_verified": False,
            "is_deactivated": False,
            "name": "First User",
            "handle": "firstuser",
            "profile_picture": None,
            "profile_picture_sizes": "QmFirstUserProfile",
            "cover_photo": None,
            "cover_photo_sizes": "QmFirstUserCoverPhoto",
            "bio": "First user with the wallet",
            "location": "Los Angeles, CA",
            "creator_node_endpoint": "https://creatornode2.audius.co,https://creatornode3.audius.co,https://content-node.audius.co",
            "associated_wallets": None,
            "associated_sol_wallets": None,
            "playlist_library": {"contents": []},
            "events": None,
            "user_id": USER_ID_OFFSET + 1,
        },
        "QmCreateUser2": {
            "is_verified": False,
            "is_deactivated": False,
            "name": "Second User",
            "handle": "seconduser",
            "profile_picture": None,
            "profile_picture_sizes": "QmSecondUserProfile",
            "cover_photo": None,
            "cover_photo_sizes": "QmSecondUserCoverPhoto",
            "bio": "Second user trying to use same wallet",
            "location": "New York, NY",
            "creator_node_endpoint": "https://creatornode2.audius.co,https://creatornode3.audius.co,https://content-node.audius.co",
            "associated_wallets": None,
            "associated_sol_wallets": None,
            "playlist_library": {"contents": []},
            "events": None,
            "user_id": USER_ID_OFFSET + 2,
        },
    }

    create_user1_json = json.dumps(test_metadata["QmCreateUser1"])
    create_user2_json = json.dumps(test_metadata["QmCreateUser2"])

    tx_receipts = {
        "CreateUser1Tx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET + 1,
                        "_entityType": "User",
                        "_userId": USER_ID_OFFSET + 1,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "QmCreateUser1", "data": {create_user1_json}}}',
                        "_signer": "samewallet",
                    }
                )
            },
        ],
        "CreateUser2Tx": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": USER_ID_OFFSET + 2,
                        "_entityType": "User",
                        "_userId": USER_ID_OFFSET + 2,
                        "_action": "Create",
                        "_metadata": f'{{"cid": "QmCreateUser2", "data": {create_user2_json}}}',
                        "_signer": "samewallet",
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
    populate_mock_db_blocks(db, 0, 1)

    with db.scoped_session() as session:
        # First, create the first user
        entity_manager_update(
            update_task,
            session,
            [entity_manager_txs[0]],  # CreateUser1Tx
            block_number=1,
            block_timestamp=BLOCK_DATETIME.timestamp(),
            block_hash=hex(1),
        )

        # Verify first user was created successfully
        first_user = (
            session.query(User)
            .filter(
                User.is_current == True,
                User.user_id == USER_ID_OFFSET + 1,
            )
            .first()
        )
        assert first_user is not None
        assert first_user.name == "First User"
        assert first_user.handle == "firstuser"
        assert first_user.wallet == "samewallet"

        # Try to create the second user with the same wallet
        total_changes, _ = entity_manager_update(
            update_task,
            session,
            [entity_manager_txs[1]],  # CreateUser2Tx
            block_number=2,
            block_timestamp=BLOCK_DATETIME.timestamp(),
            block_hash=hex(2),
        )

        # Verify no changes were made when trying to create second user
        assert total_changes == 0

        # Verify second user was not created
        second_user = (
            session.query(User)
            .filter(
                User.is_current == True,
                User.user_id == USER_ID_OFFSET + 2,
            )
            .first()
        )
        assert second_user is None

        # Verify only one user exists with the wallet
        users_with_wallet = (
            session.query(User)
            .filter(
                User.is_current == True,
                User.wallet == "samewallet",
            )
            .all()
        )
        assert len(users_with_wallet) == 1
        assert users_with_wallet[0].user_id == USER_ID_OFFSET + 1
