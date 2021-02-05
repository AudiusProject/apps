import logging
from datetime import datetime
from sqlalchemy.orm.session import make_transient
from src import contract_addresses, eth_abi_values
from src.models import USRMContentNode
from src.tasks.users import lookup_user_record, invalidate_old_user
from src.tasks.index_network_peers import content_node_service_type, sp_factory_registry_key
from src.utils.user_event_constants import (
    user_replica_set_manager_event_types_arr,
    user_replica_set_manager_event_types_lookup
)
from src.utils.redis_cache import get_pickled_key, get_sp_id_key

logger = logging.getLogger(__name__)

def user_replica_set_state_update(
        self,
        update_task,
        session,
        user_replica_set_mgr_txs,
        block_number,
        block_timestamp,
        redis
):
    """Return int representing number of User model state changes found in transaction."""

    num_user_replica_set_changes = 0
    user_ids = set()
    if not user_replica_set_mgr_txs:
        return num_user_replica_set_changes, user_ids

    user_replica_set_manager_abi = update_task.abi_values["UserReplicaSetManager"]["abi"]
    user_contract = update_task.web3.eth.contract(
        address=contract_addresses["user_replica_set_manager"], abi=user_replica_set_manager_abi
    )

    # This stores the state of the user object along with all the events applied to it
    # before it gets committed to the db
    # Data format is {"user_id": {"user", "events": []}}
    # NOTE - events are stored only for debugging purposes and not used or persisted anywhere
    user_replica_set_events_lookup = {}

    # This stores the state of the cnode object along with all events applied
    # Data format is {"cnode_sp_id": {"cnode_record", "events":[]}}
    cnode_events_lookup = {}

    for tx_receipt in user_replica_set_mgr_txs:
        for event_type in user_replica_set_manager_event_types_arr:
            user_events_tx = getattr(user_contract.events, event_type)().processReceipt(tx_receipt)
            for entry in user_events_tx:
                args = entry["args"]
                # Check if _userId is present
                # If user id is found in the event args, update the local lookup object
                user_id = args._userId if "_userId" in args else None
                if user_id:
                    user_ids.add(user_id)

                # Check if cnodeId is present
                # If cnode id is found in event args, update local lookup object
                cnode_sp_id = args._cnodeSpId if "_cnodeSpId" in args else None

                # if the user id is not in the lookup object, it hasn't been initialized yet
                # first, get the user object from the db(if exists or create a new one)
                # then set the lookup object for user_id with the appropriate props
                if user_id and (user_id not in user_replica_set_events_lookup):
                    ret_user = lookup_user_record(update_task, session, entry, block_number, block_timestamp)
                    user_replica_set_events_lookup[user_id] = {"user": ret_user, "events": []}

                if cnode_sp_id and (cnode_sp_id not in cnode_events_lookup):
                    ret_cnode = lookup_usrm_cnode(
                        self,
                        update_task,
                        session,
                        entry,
                        block_number,
                        block_timestamp
                    )
                    cnode_events_lookup[cnode_sp_id] = {"content_node": ret_cnode, "events": []}

                # Add or update the value of the user record for this block in user_replica_set_events_lookup,
                # ensuring that multiple events for a single user result in only 1 row insert operation
                # (even if multiple operations are present)
                if event_type == user_replica_set_manager_event_types_lookup['update_replica_set']:
                    primary = args._primaryId
                    secondaries = args._secondaryIds
                    user_record = user_replica_set_events_lookup[user_id]["user"]
                    user_record.updated_at = datetime.utcfromtimestamp(block_timestamp)
                    user_record.primary_id = primary
                    user_record.secondary_ids = secondaries

                    # Update cnode endpoint string reconstructed from sp ID
                    creator_node_endpoint_str = get_endpoint_string_from_sp_ids(
                        self,
                        update_task,
                        primary,
                        secondaries,
                        redis
                    )
                    user_record.creator_node_endpoint = creator_node_endpoint_str
                    user_replica_set_events_lookup[user_id]["user"] = user_record
                    user_replica_set_events_lookup[user_id]["events"].append(event_type)
                # Process L2 Content Node operations
                elif event_type == user_replica_set_manager_event_types_lookup['add_or_update_content_node']:
                    cnode_record = parse_usrm_cnode_record(
                        self,
                        update_task,
                        session,
                        entry,
                        cnode_events_lookup[cnode_sp_id]["content_node"]
                    )
                    if cnode_record is not None:
                        cnode_events_lookup[cnode_sp_id]["content_node"] = cnode_record
                        cnode_events_lookup[cnode_sp_id]["events"].append(event_type)
            num_user_replica_set_changes += len(user_events_tx)

    # for each record in user_replica_set_events_lookup, invalidate the old record and add the new record
    # we do this after all processing has completed so the user record is atomic by block, not tx
    for user_id, value_obj in user_replica_set_events_lookup.items():
        logger.info(f"user_replica_set.py | Replica Set Processing Adding {value_obj['user']}")
        invalidate_old_user(session, user_id)
        session.add(value_obj["user"])

    for content_node_id, value_obj in cnode_events_lookup.items():
        logger.info(f"user_replica_set.py | Content Node Processing Adding {value_obj['content_node']}")
        invalidate_old_cnode_record(session, content_node_id)
        session.add(value_obj["content_node"])

    return num_user_replica_set_changes, user_ids

# Reconstruct endpoint string from primary and secondary IDs
# Attempt to retrieve from cached values populated in index_network_peers.py
# If unavailable, then a fallback to ethereum mainnet contracts will occur
# Note that in the case of an invalid spID - one that is not yet registered on
# the ethereum mainnet contracts, there will be an empty value in the returned
# creator_node_endpoint
# If this discrepancy occurs, a client replica set health check sweep will
# result in a client-initiated failover operation to a valid set of replicas
def get_endpoint_string_from_sp_ids(
        self,
        update_task,
        primary,
        secondaries,
        redis
):
    sp_factory_inst = None
    endpoint_string = None
    primary_endpoint = None
    try:
        sp_factory_inst, primary_endpoint = get_endpoint_from_id(
            self,
            update_task,
            sp_factory_inst,
            primary
        )
        endpoint_string = "{}".format(primary_endpoint)
        for secondary_id in secondaries:
            secondary_endpoint = None
            sp_factory_inst, secondary_endpoint = get_endpoint_from_id(
                self,
                update_task,
                sp_factory_inst,
                secondary_id
            )
            if secondary_endpoint:
                endpoint_string = "{},{}".format(endpoint_string, secondary_endpoint)
            else:
                logger.info(f"user_replica_set.py | Failed to find secondary info for {secondary_endpoint}")
    except Exception as exc:
        logger.error(f"user_replica_set.py | ERROR in get_endpoint_string_from_sp_ids {exc}")
    logger.info(f"user_replica_set.py | constructed {endpoint_string} from {primary},{secondaries}")
    return endpoint_string

# Initializes sp_factory if necessary and retrieves spID
# Returns initialized instance of contract and endpoint
def get_endpoint_from_id(self, update_task, sp_factory_inst, sp_id):
    endpoint = None
    # Get sp_id cache key
    cache_key = get_sp_id_key(sp_id)
    # Attempt to fetch from cache
    sp_info_cached = get_pickled_key(update_task.redis, cache_key)
    if sp_info_cached:
        endpoint = sp_info_cached[1]
        logger.info(f"user_replica_set.py | CACHE HIT FOR {cache_key}, found {sp_info_cached}")
        return sp_factory_inst, endpoint

    if not endpoint:
        logger.info(f"user_replica_set.py | CACHE MISS FOR {cache_key}, found {sp_info_cached}")
        if sp_factory_inst is None:
            sp_factory_inst = get_sp_factory_inst(self, update_task)

        cn_endpoint_info = sp_factory_inst.functions.getServiceEndpointInfo(
            content_node_service_type,
            sp_id
        ).call()
        logger.info(cn_endpoint_info)
        endpoint = cn_endpoint_info[1]

    return sp_factory_inst, endpoint

# Return instance of ServiceProviderFactory initialized with configs
def get_sp_factory_inst(self, update_task):
    shared_config = update_task.shared_config
    eth_web3 = update_task.eth_web3
    eth_registry_address = eth_web3.toChecksumAddress(
        shared_config["eth_contracts"]["registry"]
    )
    eth_registry_instance = eth_web3.eth.contract(
        address=eth_registry_address, abi=eth_abi_values["Registry"]["abi"]
    )
    sp_factory_address = eth_registry_instance.functions.getContract(
        sp_factory_registry_key
    ).call()
    sp_factory_inst = eth_web3.eth.contract(
        address=sp_factory_address, abi=eth_abi_values["ServiceProviderFactory"]["abi"]
    )
    return sp_factory_inst

# Update cnode_record with event arguments
def parse_usrm_cnode_record(self, update_task, session, entry, cnode_record):
    event_args = entry["args"]
    cnode_record.delegate_owner_wallet = event_args._cnodeDelegateOwnerWallet
    cnode_record.proposer_1_address = event_args._proposer1Address
    cnode_record.proposer_2_address = event_args._proposer2Address
    cnode_record.proposer_3_address = event_args._proposer3Address
    cnode_record.proposer_sp_ids = event_args._proposerSpIds
    return cnode_record

# Return or create instance of record pointing to this content_node
def lookup_usrm_cnode(self, update_task, session, entry, block_number, block_timestamp):
    event_blockhash = update_task.web3.toHex(entry.blockHash)
    event_args = entry["args"]

    # Arguments from the event
    cnode_sp_id = event_args._cnodeSpId

    cnode_record_exists = session.query(USRMContentNode).filter_by(cnode_sp_id=cnode_sp_id).count() > 0
    cnode_record = None
    if cnode_record_exists:
        cnode_record = (
            session.query(USRMContentNode)
            .filter(USRMContentNode.cnode_sp_id == cnode_sp_id, USRMContentNode.is_current == True)
            .first()
        )
        # expunge the result from sqlalchemy so we can modify it without UPDATE statements being made
        # https://stackoverflow.com/questions/28871406/how-to-clone-a-sqlalchemy-db-object-with-new-primary-key
        session.expunge(cnode_record)
        make_transient(cnode_record)
    else:
        cnode_record = USRMContentNode(
            is_current=True,
            cnode_sp_id=cnode_sp_id,
            created_at=datetime.utcfromtimestamp(block_timestamp)
        )
    # update these fields regardless of type
    cnode_record.blockhash = event_blockhash
    cnode_record.blocknumber = block_number
    return cnode_record

def invalidate_old_cnode_record(session, cnode_sp_id):
    cnode_record_exists = session.query(USRMContentNode).filter_by(cnode_sp_id=cnode_sp_id).count() > 0
    if cnode_record_exists:
        num_invalidated_records = (
            session.query(USRMContentNode)
            .filter(USRMContentNode.cnode_sp_id == cnode_sp_id, USRMContentNode.is_current == True)
            .update({"is_current": False})
        )
        assert (
            num_invalidated_records > 0
        ), "Update operation requires a current cnode to be invalidated"
