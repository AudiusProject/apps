import logging
from datetime import datetime
from sqlalchemy.orm.session import make_transient
from src import contract_addresses
from src.utils import helpers
from src.models import User
from src.tasks.ipld_blacklist import is_blacklisted_ipld
from src.tasks.metadata import user_metadata_format
from src.utils.user_event_constants import user_event_types_arr, user_event_types_lookup

logger = logging.getLogger(__name__)


def user_state_update(self, update_task, session, user_factory_txs, block_number, block_timestamp):
    """Return int representing number of User model state changes found in transaction."""

    num_total_changes = 0
    user_ids = set()
    if not user_factory_txs:
        return num_total_changes, user_ids

    user_abi = update_task.abi_values["UserFactory"]["abi"]
    user_contract = update_task.web3.eth.contract(
        address=contract_addresses["user_factory"], abi=user_abi
    )

    # This stores the state of the user object along with all the events applied to it
    # before it gets committed to the db
    # Data format is {"user_id": {"user", "events": []}}
    # NOTE - events are stored only for debugging purposes and not used or persisted anywhere
    user_events_lookup = {}

    # for each user factory transaction, loop through every tx
    # loop through all audius event types within that tx and get all event logs
    # for each event, apply changes to the user in user_events_lookup
    for tx_receipt in user_factory_txs:
        for event_type in user_event_types_arr:
            user_events_tx = getattr(user_contract.events, event_type)().processReceipt(tx_receipt)
            processedEntries = 0 # if record does not get added, do not count towards num_total_changes
            for entry in user_events_tx:
                user_id = entry["args"]._userId
                user_ids.add(user_id)

                # if the user id is not in the lookup object, it hasn't been initialized yet
                # first, get the user object from the db(if exists or create a new one)
                # then set the lookup object for user_id with the appropriate props
                if user_id not in user_events_lookup:
                    ret_user = lookup_user_record(update_task, session, entry, block_number, block_timestamp)
                    user_events_lookup[user_id] = {"user": ret_user, "events": []}

                # Add or update the value of the user record for this block in user_events_lookup,
                # ensuring that multiple events for a single user result in only 1 row insert operation
                # (even if multiple operations are present)
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
                    block_timestamp
                )
                if user_record is not None:
                    user_events_lookup[user_id]["events"].append(event_type)
                    user_events_lookup[user_id]["user"] = user_record
                    processedEntries += 1

            num_total_changes += processedEntries

    logger.info(f"[users indexing] There are {num_total_changes} events processed.")

    # for each record in user_events_lookup, invalidate the old record and add the new record
    # we do this after all processing has completed so the user record is atomic by block, not tx
    for user_id, value_obj in user_events_lookup.items():
        logger.info(f"users.py | Adding {value_obj['user']}")
        if value_obj["events"]:
            invalidate_old_user(session, user_id)
            session.add(value_obj["user"])

    return num_total_changes, user_ids


def lookup_user_record(update_task, session, entry, block_number, block_timestamp):
    event_blockhash = update_task.web3.toHex(entry.blockHash)
    event_args = entry["args"]
    user_id = event_args._userId

    # Check if the userId is in the db
    user_exists = session.query(User).filter_by(user_id=event_args._userId).count() > 0

    user_record = None # will be set in this if/else
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
            created_at=datetime.utcfromtimestamp(block_timestamp)
        )

    # update these fields regardless of type
    user_record.blocknumber = block_number
    user_record.blockhash = event_blockhash

    return user_record


def invalidate_old_user(session, user_id):
    # Check if the userId is in the db
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
        self, user_contract, update_task, session, tx_receipt, block_number, entry, event_type, user_record,
        block_timestamp):
    event_args = entry["args"]

    # type specific field changes
    if event_type == user_event_types_lookup["add_user"]:
        handle_str = helpers.bytes32_to_str(event_args._handle)
        user_record.handle = handle_str
        user_record.handle_lc = handle_str.lower()
        user_record.wallet = event_args._wallet.lower()
    elif event_type == user_event_types_lookup["update_multihash"]:
        metadata_multihash = helpers.multihash_digest_to_cid(event_args._multihashDigest)
        is_blacklisted = is_blacklisted_ipld(session, metadata_multihash)
        # If cid is in blacklist, do not update user
        if is_blacklisted:
            logger.info(f"Encountered blacklisted CID {metadata_multihash} in indexing update user metadata multihash")
            return None
        user_record.metadata_multihash = metadata_multihash
    elif event_type == user_event_types_lookup["update_name"]:
        user_record.name = helpers.bytes32_to_str(event_args._name)
    elif event_type == user_event_types_lookup["update_location"]:
        user_record.location = helpers.bytes32_to_str(event_args._location)
    elif event_type == user_event_types_lookup["update_bio"]:
        user_record.bio = event_args._bio
    elif event_type == user_event_types_lookup["update_profile_photo"]:
        profile_photo_multihash = helpers.multihash_digest_to_cid(event_args._profilePhotoDigest)
        is_blacklisted = is_blacklisted_ipld(session, profile_photo_multihash)
        if is_blacklisted:
            logger.info(f"Encountered blacklisted CID {profile_photo_multihash} in indexing update user profile photo")
            return None
        user_record.profile_picture = profile_photo_multihash
    elif event_type == user_event_types_lookup["update_cover_photo"]:
        cover_photo_multihash = helpers.multihash_digest_to_cid(event_args._coverPhotoDigest)
        is_blacklisted = is_blacklisted_ipld(session, cover_photo_multihash)
        if is_blacklisted:
            logger.info(f"Encountered blacklisted CID {cover_photo_multihash} in indexing update user cover photo")
            return None
        user_record.cover_photo = cover_photo_multihash
    elif event_type == user_event_types_lookup["update_is_creator"]:
        user_record.is_creator = event_args._isCreator
    elif event_type == user_event_types_lookup["update_is_verified"]:
        user_record.is_verified = event_args._isVerified
    elif event_type == user_event_types_lookup["update_creator_node_endpoint"]:
        user_record.creator_node_endpoint = event_args._creatorNodeEndpoint

    # New updated_at timestamp
    user_record.updated_at = datetime.utcfromtimestamp(block_timestamp)

    # If creator, look up metadata multihash in IPFS and override with metadata fields
    metadata_overrides = get_metadata_overrides_from_ipfs(
        session, update_task, user_record
    )

    if metadata_overrides:
        # metadata_overrides properties are defined in get_metadata_overrides_from_ipfs
        if metadata_overrides["profile_picture"]:
            user_record.profile_picture = metadata_overrides["profile_picture"]
        if metadata_overrides["profile_picture_sizes"]:
            user_record.profile_picture = metadata_overrides["profile_picture_sizes"]
        if metadata_overrides["cover_photo"]:
            user_record.cover_photo = metadata_overrides["cover_photo"]
        if metadata_overrides["cover_photo_sizes"]:
            user_record.cover_photo = metadata_overrides["cover_photo_sizes"]
        if metadata_overrides["bio"]:
            user_record.bio = metadata_overrides["bio"]
        if metadata_overrides["name"]:
            user_record.name = metadata_overrides["name"]
        if metadata_overrides["location"]:
            user_record.location = metadata_overrides["location"]

    # Refresh connection for non-creators
    # refresh_user_connection(user_record, update_task)

    # if profile_picture CID is of a dir, store under _sizes field instead
    if user_record.profile_picture:
        logger.info(f"users.py | Processing user profile_picture {user_record.profile_picture}")
        try:
            is_directory = update_task.ipfs_client.multihash_is_directory(user_record.profile_picture)
            if is_directory:
                user_record.profile_picture_sizes = user_record.profile_picture
                user_record.profile_picture = None
        except Exception as e:
            # we are unable to get the profile picture
            if 'invalid multihash' in str(e):
                user_record.profile_picture_sizes = None
                user_record.profile_picture = None
            else:
                raise e

    # if cover_photo CID is of a dir, store under _sizes field instead
    if user_record.cover_photo:
        logger.info(f"users.py | Processing user cover photo {user_record.cover_photo}")
        try:
            is_directory = update_task.ipfs_client.multihash_is_directory(user_record.cover_photo)
            if is_directory:
                user_record.cover_photo_sizes = user_record.cover_photo
                user_record.cover_photo = None
        except Exception as e:
            # we are unable to get the profile picture
            if 'invalid multihash' in str(e):
                user_record.cover_photo_sizes = None
                user_record.cover_photo = None
            else:
                raise e

    return user_record

def get_metadata_overrides_from_ipfs(session, update_task, user_record):
    user_metadata = user_metadata_format

    if user_record.metadata_multihash and user_record.is_creator and user_record.handle:
        user_metadata = update_task.ipfs_client.get_metadata(
            user_record.metadata_multihash,
            user_metadata_format
        )
        logger.warning(f'users.py | {user_metadata}')

    return user_metadata
