import logging
from typing import Set, TypedDict, Tuple
from datetime import datetime

import base58
from eth_account.messages import defunct_hash_message
from nacl.encoding import HexEncoder
from nacl.signing import VerifyKey
from sqlalchemy.orm.session import Session, make_transient

from src.app import get_contract_addresses
from src.challenges.challenge_event import ChallengeEvent
from src.challenges.challenge_event_bus import ChallengeEventBus
from src.database_task import DatabaseTask
from src.models import AssociatedWallet, User, UserEvents
from src.queries.get_balances import enqueue_immediate_balance_refresh
from src.tasks.ipld_blacklist import is_blacklisted_ipld
from src.tasks.metadata import user_metadata_format
from src.utils import helpers
from src.utils.indexing_errors import IndexingError
from src.utils.user_event_constants import user_event_types_arr, user_event_types_lookup

logger = logging.getLogger(__name__)


def user_state_update(
    self,
    update_task: DatabaseTask,
    session: Session,
    ipfs_metadata,
    blacklisted_cids,
    user_factory_txs,
    block_number,
    block_timestamp,
    block_hash,
) -> Tuple[int, Set]:
    """Return int representing number of User model state changes found in transaction."""

    num_total_changes = 0
    user_ids: Set[int] = set()
    if not user_factory_txs:
        return num_total_changes, user_ids

    user_abi = update_task.abi_values["UserFactory"]["abi"]
    user_contract = update_task.web3.eth.contract(
        address=get_contract_addresses()["user_factory"], abi=user_abi
    )
    challenge_bus = update_task.challenge_event_bus

    # This stores the state of the user object along with all the events applied to it
    # before it gets committed to the db
    # Data format is {"user_id": {"user", "events": []}}
    # NOTE - events are stored only for debugging purposes and not used or persisted anywhere
    user_events_lookup = {}

    # for each user factory transaction, loop through every tx
    # loop through all audius event types within that tx and get all event logs
    # for each event, apply changes to the user in user_events_lookup
    for tx_receipt in user_factory_txs:
        txhash = update_task.web3.toHex(tx_receipt.transactionHash)
        for event_type in user_event_types_arr:
            user_events_tx = getattr(user_contract.events, event_type)().processReceipt(
                tx_receipt
            )
            # if record does not get added, do not count towards num_total_changes
            processedEntries = 0
            for entry in user_events_tx:
                user_id = entry["args"]._userId
                try:
                    user_id = entry["args"]._userId
                    user_ids.add(user_id)

                    # if the user id is not in the lookup object, it hasn't been initialized yet
                    # first, get the user object from the db(if exists or create a new one)
                    # then set the lookup object for user_id with the appropriate props
                    if user_id not in user_events_lookup:
                        ret_user = lookup_user_record(
                            update_task,
                            session,
                            entry,
                            block_number,
                            block_timestamp,
                            txhash,
                        )
                        user_events_lookup[user_id] = {"user": ret_user, "events": []}

                    # Add or update the value of the user record for this block in user_events_lookup,
                    # ensuring that multiple events for a single user result in only 1 row insert operation
                    # (even if multiple operations are present)

                    if event_type == user_event_types_lookup["update_multihash"]:
                        metadata_multihash = helpers.multihash_digest_to_cid(
                            entry["args"]._multihashDigest
                        )
                        user_record = (
                            parse_user_event(
                                self,
                                user_contract,
                                update_task,
                                session,
                                tx_receipt,
                                block_number,
                                entry,
                                event_type,
                                user_events_lookup[user_id]["user"],
                                ipfs_metadata[metadata_multihash],
                                block_timestamp,
                            )
                            if metadata_multihash not in blacklisted_cids
                            else None
                        )
                    else:
                        user_record = parse_user_event(
                            self,
                            user_contract,
                            update_task,
                            session,
                            tx_receipt,
                            block_number,
                            entry,
                            event_type,
                            user_events_lookup[user_id]["user"],
                            None,
                            block_timestamp,
                        )

                    if user_record is not None:
                        user_events_lookup[user_id]["events"].append(event_type)
                        user_events_lookup[user_id]["user"] = user_record
                        processedEntries += 1
                except Exception as e:
                    logger.error("Error in parse user transaction")
                    event_blockhash = update_task.web3.toHex(block_hash)
                    raise IndexingError(
                        "user", block_number, event_blockhash, txhash, str(e)
                    ) from e

            num_total_changes += processedEntries

    logger.info(
        f"index.py | users.py | There are {num_total_changes} events processed."
    )

    # for each record in user_events_lookup, invalidate the old record and add the new record
    # we do this after all processing has completed so the user record is atomic by block, not tx
    for user_id, value_obj in user_events_lookup.items():
        logger.info(f"index.py | users.py | Adding {value_obj['user']}")
        if value_obj["events"]:
            invalidate_old_user(session, user_id)
            challenge_bus.dispatch(ChallengeEvent.profile_update, block_number, user_id)
            session.add(value_obj["user"])

    return num_total_changes, user_ids


def lookup_user_record(
    update_task, session, entry, block_number, block_timestamp, txhash
):
    event_blockhash = update_task.web3.toHex(entry.blockHash)
    event_args = entry["args"]
    user_id = event_args._userId

    # Check if the userId is in the db
    user_exists = session.query(User).filter_by(user_id=event_args._userId).count() > 0

    user_record = None  # will be set in this if/else
    if user_exists:
        user_record = (
            session.query(User)
            .filter(User.user_id == user_id, User.is_current == True)
            .first()
        )

        # expunge the result from sqlalchemy so we can modify it without UPDATE statements being made
        # https://stackoverflow.com/questions/28871406/how-to-clone-a-sqlalchemy-db-object-with-new-primary-key
        session.expunge(user_record)
        make_transient(user_record)
    else:
        user_record = User(
            is_current=True,
            user_id=user_id,
            created_at=datetime.utcfromtimestamp(block_timestamp),
        )

    # update these fields regardless of type
    user_record.blocknumber = block_number
    user_record.blockhash = event_blockhash
    user_record.txhash = txhash

    return user_record


def invalidate_old_user(session, user_id):
    # Check if the userId is in the db
    logger.info(f"index.py | invalid date user with id {user_id}")

    user_exists = session.query(User).filter_by(user_id=user_id).count() > 0

    if user_exists:
        # Update existing record in db to is_current = False
        num_invalidated_users = (
            session.query(User)
            .filter(User.user_id == user_id, User.is_current == True)
            .update({"is_current": False})
        )
        assert (
            num_invalidated_users > 0
        ), "Update operation requires a current user to be invalidated"


def parse_user_event(
    self,
    user_contract,
    update_task: DatabaseTask,
    session: Session,
    tx_receipt,
    block_number,
    entry,
    event_type,
    user_record,
    ipfs_metadata,
    block_timestamp,
):
    event_args = entry["args"]

    # type specific field changes
    if event_type == user_event_types_lookup["add_user"]:
        handle_str = helpers.bytes32_to_str(event_args._handle)
        user_record.handle = handle_str
        user_record.handle_lc = handle_str.lower()
        user_record.wallet = event_args._wallet.lower()
    elif event_type == user_event_types_lookup["update_multihash"]:
        metadata_multihash = helpers.multihash_digest_to_cid(
            event_args._multihashDigest
        )
        user_record.metadata_multihash = metadata_multihash
    elif event_type == user_event_types_lookup["update_name"]:
        user_record.name = helpers.bytes32_to_str(event_args._name)
    elif event_type == user_event_types_lookup["update_location"]:
        user_record.location = helpers.bytes32_to_str(event_args._location)
    elif event_type == user_event_types_lookup["update_bio"]:
        user_record.bio = event_args._bio
    elif event_type == user_event_types_lookup["update_profile_photo"]:
        profile_photo_multihash = helpers.multihash_digest_to_cid(
            event_args._profilePhotoDigest
        )
        is_blacklisted = is_blacklisted_ipld(session, profile_photo_multihash)
        if is_blacklisted:
            logger.info(
                f"index.py | users.py | Encountered blacklisted CID:"
                f"{profile_photo_multihash} in indexing update user profile photo"
            )
            return None
        user_record.profile_picture = profile_photo_multihash
    elif event_type == user_event_types_lookup["update_cover_photo"]:
        cover_photo_multihash = helpers.multihash_digest_to_cid(
            event_args._coverPhotoDigest
        )
        is_blacklisted = is_blacklisted_ipld(session, cover_photo_multihash)
        if is_blacklisted:
            logger.info(
                f"index.py | users.py | Encountered blacklisted CID:"
                f"{cover_photo_multihash} in indexing update user cover photo"
            )
            return None
        user_record.cover_photo = cover_photo_multihash
    elif event_type == user_event_types_lookup["update_is_creator"]:
        user_record.is_creator = event_args._isCreator
    elif event_type == user_event_types_lookup["update_is_verified"]:
        user_record.is_verified = event_args._isVerified
        if user_record.is_verified:
            update_task.challenge_event_bus.dispatch(
                ChallengeEvent.connect_verified,
                block_number,
                user_record.user_id,
            )

    elif event_type == user_event_types_lookup["update_creator_node_endpoint"]:
        # Ensure any user consuming the new UserReplicaSetManager contract does not process
        # legacy `creator_node_endpoint` changes
        # Reference user_replica_set.py for the updated indexing flow around this field
        replica_set_upgraded = user_replica_set_upgraded(user_record)
        logger.info(
            f"index.py | users.py | {user_record.handle} Replica set upgraded: {replica_set_upgraded}"
        )
        if not replica_set_upgraded:
            user_record.creator_node_endpoint = event_args._creatorNodeEndpoint

    # New updated_at timestamp
    user_record.updated_at = datetime.utcfromtimestamp(block_timestamp)

    # If the multihash is updated, fetch the metadata (if not fetched) and update the associated wallets column
    if event_type == user_event_types_lookup["update_multihash"]:
        # Look up metadata multihash in IPFS and override with metadata fields
        if ipfs_metadata:
            # ipfs_metadata properties are defined in get_ipfs_metadata

            # Fields also stored on chain
            if "profile_picture" in ipfs_metadata and ipfs_metadata["profile_picture"]:
                user_record.profile_picture = ipfs_metadata["profile_picture"]

            if "cover_photo" in ipfs_metadata and ipfs_metadata["cover_photo"]:
                user_record.cover_photo = ipfs_metadata["cover_photo"]

            if "bio" in ipfs_metadata and ipfs_metadata["bio"]:
                user_record.bio = ipfs_metadata["bio"]

            if "name" in ipfs_metadata and ipfs_metadata["name"]:
                user_record.name = ipfs_metadata["name"]

            if "location" in ipfs_metadata and ipfs_metadata["location"]:
                user_record.location = ipfs_metadata["location"]

            # Fields with no on-chain counterpart
            if (
                "profile_picture_sizes" in ipfs_metadata
                and ipfs_metadata["profile_picture_sizes"]
            ):
                user_record.profile_picture = ipfs_metadata["profile_picture_sizes"]

            if (
                "cover_photo_sizes" in ipfs_metadata
                and ipfs_metadata["cover_photo_sizes"]
            ):
                user_record.cover_photo = ipfs_metadata["cover_photo_sizes"]

            if (
                "collectibles" in ipfs_metadata
                and ipfs_metadata["collectibles"]
                and isinstance(ipfs_metadata["collectibles"], dict)
                and ipfs_metadata["collectibles"].items()
            ):
                user_record.has_collectibles = True
            else:
                user_record.has_collectibles = False

            if "associated_wallets" in ipfs_metadata:
                update_user_associated_wallets(
                    session,
                    update_task,
                    user_record,
                    ipfs_metadata["associated_wallets"],
                    "eth",
                )

            if "associated_sol_wallets" in ipfs_metadata:
                update_user_associated_wallets(
                    session,
                    update_task,
                    user_record,
                    ipfs_metadata["associated_sol_wallets"],
                    "sol",
                )

            if (
                "playlist_library" in ipfs_metadata
                and ipfs_metadata["playlist_library"]
            ):
                user_record.playlist_library = ipfs_metadata["playlist_library"]

            if "is_deactivated" in ipfs_metadata:
                user_record.is_deactivated = ipfs_metadata["is_deactivated"]

            if "events" in ipfs_metadata and ipfs_metadata["events"]:
                update_user_events(
                    session,
                    user_record,
                    ipfs_metadata["events"],
                    update_task.challenge_event_bus,
                )

    # All incoming profile photos intended to be a directory
    # Any write to profile_picture field is replaced by profile_picture_sizes
    if user_record.profile_picture:
        logger.info(
            f"index.py | users.py | Processing user profile_picture {user_record.profile_picture}"
        )
        user_record.profile_picture_sizes = user_record.profile_picture
        user_record.profile_picture = None

    # All incoming cover photos intended to be a directory
    # Any write to cover_photo field is replaced by cover_photo_sizes
    if user_record.cover_photo:
        logger.info(
            f"index.py | users.py | Processing user cover photo {user_record.cover_photo}"
        )
        user_record.cover_photo_sizes = user_record.cover_photo
        user_record.cover_photo = None
    return user_record


def update_user_associated_wallets(
    session, update_task, user_record, associated_wallets, chain
):
    """Updates the user associated wallets table"""
    try:
        if not isinstance(associated_wallets, dict):
            # With malformed associated wallets, we update the associated wallets
            # to be an empty dict. This has the effect of generating new rows for the
            # already associated wallets and marking them as deleted.
            associated_wallets = {}

        prev_user_associated_wallets_response = (
            session.query(AssociatedWallet.wallet)
            .filter_by(
                user_id=user_record.user_id,
                is_current=True,
                is_delete=False,
                chain=chain,
            )
            .all()
        )

        previous_wallets = [
            wallet for [wallet] in prev_user_associated_wallets_response
        ]
        added_associated_wallets = set()

        session.query(AssociatedWallet).filter_by(
            user_id=user_record.user_id, chain=chain
        ).update({"is_current": False})

        # Verify the wallet signatures and create the user id to wallet associations
        for associated_wallet, wallet_metadata in associated_wallets.items():
            if not "signature" in wallet_metadata or not isinstance(
                wallet_metadata["signature"], str
            ):
                continue
            is_valid_signature = validate_signature(
                chain,
                update_task.web3,
                user_record.user_id,
                associated_wallet,
                wallet_metadata["signature"],
            )

            if is_valid_signature:
                # Check that the wallet doesn't already exist
                wallet_exists = (
                    session.query(AssociatedWallet)
                    .filter_by(
                        wallet=associated_wallet,
                        is_current=True,
                        is_delete=False,
                        chain=chain,
                    )
                    .count()
                    > 0
                )
                if not wallet_exists:
                    added_associated_wallets.add(associated_wallet)
                    associated_wallet_entry = AssociatedWallet(
                        user_id=user_record.user_id,
                        wallet=associated_wallet,
                        chain=chain,
                        is_current=True,
                        is_delete=False,
                        blocknumber=user_record.blocknumber,
                        blockhash=user_record.blockhash,
                    )
                    session.add(associated_wallet_entry)

        # Mark the previously associated wallets as deleted
        for previously_associated_wallet in previous_wallets:
            if not previously_associated_wallet in added_associated_wallets:
                associated_wallet_entry = AssociatedWallet(
                    user_id=user_record.user_id,
                    wallet=previously_associated_wallet,
                    chain=chain,
                    is_current=True,
                    is_delete=True,
                    blocknumber=user_record.blocknumber,
                    blockhash=user_record.blockhash,
                )
                session.add(associated_wallet_entry)

        is_updated_wallets = set(previous_wallets) != added_associated_wallets
        if is_updated_wallets:
            enqueue_immediate_balance_refresh(update_task.redis, [user_record.user_id])
    except Exception as e:
        logger.error(
            f"index.py | users.py | Fatal updating user associated wallets while indexing {e}",
            exc_info=True,
        )


def validate_signature(
    chain: str, web3, user_id: int, associated_wallet: str, signature: str
):
    if chain == "eth":
        signed_wallet = recover_user_id_hash(web3, user_id, signature)
        return signed_wallet == associated_wallet
    if chain == "sol":
        try:
            message = f"AudiusUserID:{user_id}"
            verify_key = VerifyKey(base58.b58decode(bytes(associated_wallet, "utf-8")))
            # Verify raises an error if the message is tampered w/ else returns the original msg
            verify_key.verify(str.encode(message), HexEncoder.decode(signature))
            return True
        except Exception as e:
            logger.error(
                f"index.py | users.py | Verifying SPL validation signature for user_id {user_id} {e}",
                exc_info=True,
            )
            return False
    return False


class UserEventsMetadata(TypedDict):
    referrer: int
    is_mobile_user: bool


def update_user_events(
    session: Session,
    user_record: User,
    events: UserEventsMetadata,
    bus: ChallengeEventBus,
) -> None:
    """Updates the user events table"""
    try:
        if not isinstance(events, dict):
            # There is something wrong with events, don't process it
            return

        # Get existing UserEvents entry
        existing_user_events = session.query(UserEvents).filter_by(
            user_id=user_record.user_id, is_current=True
        ).one_or_none()

        # Mark existing UserEvents entries as not current
        session.query(UserEvents).filter_by(
            user_id=user_record.user_id, is_current=True
        ).update({"is_current": False})

        user_events = UserEvents(
            user_id=user_record.user_id,
            is_current=True,
            blocknumber=user_record.blocknumber,
            blockhash=user_record.blockhash,
            referrer=existing_user_events.referrer if existing_user_events else None,
            is_mobile_user=existing_user_events.is_mobile_user if existing_user_events else False
        )
        for event, value in events.items():
            if event == "referrer" and isinstance(value, int):
                user_events.referrer = value
                bus.dispatch(
                    ChallengeEvent.referral_signup,
                    user_record.blocknumber,
                    value,
                    {"referred_user_id": user_record.user_id},
                )
                bus.dispatch(
                    ChallengeEvent.referred_signup,
                    user_record.blocknumber,
                    user_record.user_id,
                )
            elif event == "is_mobile_user" and isinstance(value, bool):
                user_events.is_mobile_user = value
                if value:
                    bus.dispatch(
                        ChallengeEvent.mobile_install,
                        user_record.blocknumber,
                        user_record.user_id,
                    )

        session.add(user_events)

    except Exception as e:
        logger.error(
            f"index.py | users.py | Fatal updating user events while indexing {e}",
            exc_info=True,
        )


def recover_user_id_hash(web3, user_id, signature):
    message_hash = defunct_hash_message(text=f"AudiusUserID:{user_id}")
    wallet_address: str = web3.eth.account.recoverHash(
        message_hash, signature=signature
    )
    return wallet_address


def get_ipfs_metadata(update_task, metadata_multihash, creator_node_endpoint):
    user_metadata = user_metadata_format
    if metadata_multihash:
        user_metadata = update_task.ipfs_client.get_metadata(
            metadata_multihash,
            user_metadata_format,
            creator_node_endpoint,
        )
        logger.info(f"index.py | users.py | {user_metadata}")
    return user_metadata


# Determine whether this user has identity established on the UserReplicaSetManager contract
def user_replica_set_upgraded(user_record):
    primary_replica_set_configured = (
        user_record.primary_id is not None and user_record.primary_id > 0
    )
    return primary_replica_set_configured
