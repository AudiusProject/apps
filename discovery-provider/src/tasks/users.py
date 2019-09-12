import logging
from urllib.parse import urljoin
from datetime import datetime
from sqlalchemy.orm.session import make_transient
import requests
from src import contract_addresses
from src.utils import helpers
from src.models import User, BlacklistedIPLD
from src.tasks.metadata import user_metadata_format
from src.utils.user_event_constants import user_event_types_arr, user_event_types_lookup

logger = logging.getLogger(__name__)


def user_state_update(self, update_task, session, user_factory_txs, block_number, block_timestamp):
    """Return int representing number of User model state changes found in transaction."""

    num_total_changes = 0
    if not user_factory_txs:
        return num_total_changes

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
            for entry in user_events_tx:
                user_id = entry["args"]._userId

                # if the user id is not in the lookup object, it hasn't been initialized yet
                # first, get the user object from the db(if exists or create a new one)
                # then set the lookup object for user_id with the appropriate props
                if user_id not in user_events_lookup:
                    ret_user = lookup_user_record(update_task, session, entry, block_number, block_timestamp)
                    user_events_lookup[user_id] = {"user": ret_user, "events": []}

                user_events_lookup[user_id]["events"].append(event_type)

                # Add or update the value of the user record for this block in user_events_lookup,
                # ensuring that multiple events for a single user result in only 1 row insert operation
                # (even if multiple operations are present)
                user_events_lookup[user_id]["user"] = parse_user_event(
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

            num_total_changes += len(user_events_tx)

    # for each record in user_events_lookup, invalidate the old record and add the new record
    # we do this after all processing has completed so the user record is atomic by block, not tx
    for user_id, value_obj in user_events_lookup.items():
        logger.info(f"users.py | Adding {value_obj['user']}")
        invalidate_old_user(session, user_id)
        session.add(value_obj["user"])

    return num_total_changes


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
        metadata_multihash = event_args._multihashDigest
        user_record.metadata_multihash = helpers.multihash_digest_to_cid(metadata_multihash)
    elif event_type == user_event_types_lookup["update_name"]:
        user_record.name = helpers.bytes32_to_str(event_args._name)
    elif event_type == user_event_types_lookup["update_location"]:
        user_record.location = helpers.bytes32_to_str(event_args._location)
    elif event_type == user_event_types_lookup["update_bio"]:
        user_record.bio = event_args._bio
    elif event_type == user_event_types_lookup["update_profile_photo"]:
        user_record.profile_picture = helpers.multihash_digest_to_cid(event_args._profilePhotoDigest)
    elif event_type == user_event_types_lookup["update_cover_photo"]:
        user_record.cover_photo = helpers.multihash_digest_to_cid(event_args._coverPhotoDigest)
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
        logger.warning(metadata_overrides)
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

    # if profile_picture CID is of a dir, store under _sizes field instead
    if user_record.profile_picture:
        ipfs = update_task.ipfs_client._api
        logger.warning(f"catting user profile_picture {user_record.profile_picture}")
        try:
            # attempt to cat single byte from CID to determine if dir or file
            ipfs.cat(user_record.profile_picture, 0, 1)
        except Exception as e:  # pylint: disable=W0703
            if "this dag node is a directory" in str(e):
                user_record.profile_picture_sizes = user_record.profile_picture
                user_record.profile_picture = None
                logger.warning('Successfully processed CID')
            else:
                raise Exception(e)

    # if cover_photo CID is of a dir, store under _sizes field instead
    if user_record.cover_photo:
        ipfs = update_task.ipfs_client._api
        logger.warning(f"catting user over_photo {user_record.cover_photo}")
        try:
            # attempt to cat single byte from CID to determine if dir or file
            ipfs.cat(user_record.cover_photo, 0, 1)
        except Exception as e:  # pylint: disable=W0703
            if "this dag node is a directory" in str(e):
                user_record.cover_photo_sizes = user_record.cover_photo
                user_record.cover_photo = None
                logger.warning('Successfully processed CID')
            else:
                raise Exception(e)

    # Find out if a user is ready to query in the db. If they are, set the is_ready field
    user_record.is_ready = is_user_ready(user_record)

    return user_record


def is_user_ready(user_record):
    # if a user is already a ready, never mark them as false again
    if hasattr(user_record, 'is_ready') and (user_record.is_ready is True):
        return True

    is_ready = False
    if user_record.handle \
            and user_record.wallet \
            and user_record.name:
        is_ready = True
    return is_ready


def get_metadata_overrides_from_ipfs(session, update_task, user_record):
    user_metadata = user_metadata_format

    if user_record.is_creator and user_record.metadata_multihash and user_record.handle:
        ipld_blacklist_entry = (
            session.query(BlacklistedIPLD)
            .filter(BlacklistedIPLD.ipld == user_record.metadata_multihash)
            .first()
        )

        # Early exit if the ipld is in the blacklist table
        if ipld_blacklist_entry:
            return None

        # Manually peer with user creator nodes
        update_ipfs_peers_from_user_endpoint(
            update_task,
            user_record.creator_node_endpoint
        )

        user_metadata = update_task.ipfs_client.get_metadata(
            user_record.metadata_multihash,
            user_metadata_format
        )

    return user_metadata


def get_ipfs_info_from_cnode_endpoint(url):
    id_url = urljoin(url, 'ipfs_peer_info')
    resp = requests.get(id_url, timeout=5)
    json_resp = resp.json()
    if 'addresses' in json_resp and isinstance(json_resp['addresses'], list):
        for multiaddr in json_resp['addresses']:
            if ('127.0.0.1' not in multiaddr) and ('ip6' not in multiaddr):
                return multiaddr
    raise Exception('Failed to find valid multiaddr')


def update_ipfs_peers_from_user_endpoint(update_task, cnode_url_list):
    if cnode_url_list is None:
        return
    redis = update_task.redis
    cnode_entries = cnode_url_list.split(',')
    interval = int(update_task.shared_config["discprov"]["peer_refresh_interval"])
    for cnode_url in cnode_entries:
        if cnode_url == '':
            continue
        try:
            multiaddr = get_ipfs_info_from_cnode_endpoint(cnode_url)
            update_task.ipfs_client.connect_peer(multiaddr)
            redis.set(cnode_url, multiaddr, interval)
        except Exception as e:  # pylint: disable=broad-except
            logger.warning(f"Error retrieving info for {cnode_url}, {e}")
