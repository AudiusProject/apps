from __future__ import absolute_import

import ast
import logging
from collections import defaultdict
from typing import Any, Dict

from celery.schedules import timedelta
from web3 import Web3

from src.challenges.challenge_event_bus import setup_challenge_bus
from src.challenges.create_new_challenges import create_new_challenges
from src.database_task import DatabaseTask
from src.eth_indexing.event_scanner import eth_indexing_last_scanned_block_key
from src.solana.solana_client_manager import SolanaClientManager
from src.tasks import celery_app
from src.tasks.index_core import index_core_lock_key
from src.tasks.repair_audio_analyses import REPAIR_AUDIO_ANALYSES_LOCK
from src.tasks.update_delist_statuses import UPDATE_DELIST_STATUSES_LOCK
from src.utils import helpers, web3_provider
from src.utils.config import shared_config
from src.utils.db_session import set_session_managers
from src.utils.constants import CONTRACT_NAMES_ON_CHAIN, CONTRACT_TYPES
from src.utils.eth_contracts_helpers import fetch_trusted_notifier_info
from src.utils.eth_manager import EthManager
from src.utils.redis_connection import get_redis
from src.utils.redis_constants import final_poa_block_redis_key
from src.utils.redis_metrics import METRICS_INTERVAL, SYNCHRONIZE_METRICS_INTERVAL
from src.utils.session_manager import SessionManager

ENTITY_MANAGER = CONTRACT_TYPES.ENTITY_MANAGER.value

ENTITY_MANAGER_CONTRACT_NAME = CONTRACT_NAMES_ON_CHAIN[CONTRACT_TYPES.ENTITY_MANAGER]

# these global vars will be set in create_celery function
web3endpoint = None
web3 = None
abi_values = None

eth_web3 = None
eth_abi_values = None

trusted_notifier_manager = None
solana_client_manager = None
entity_manager = None
contract_addresses: Dict[str, Any] = defaultdict()

logger = logging.getLogger(__name__)


environment = shared_config["discprov"]["env"]


def get_contract_addresses():
    return contract_addresses


def get_eth_abi_values():
    return eth_abi_values


def init_contracts():
    entity_manager_address = None
    entity_manager_inst = None
    if shared_config["contracts"]["entity_manager_address"]:
        entity_manager_address = Web3.to_checksum_address(
            shared_config["contracts"]["entity_manager_address"]
        )
        entity_manager_inst = web3.eth.contract(
            address=entity_manager_address, abi=abi_values["EntityManager"]["abi"]
        )

    contract_address_dict = {
        "entity_manager": entity_manager_address,
    }

    return (
        entity_manager_inst,
        contract_address_dict,
    )


def create_celery(test_config=None):
    # pylint: disable=W0603
    global web3endpoint, abi_values, eth_abi_values, eth_web3
    global trusted_notifier_manager
    global solana_client_manager

    abi_values = helpers.load_abi_values()
    # Initialize eth_web3 with MultiProvider
    # We use multiprovider to allow for multiple web3 providers and additional resiliency.
    # However, we do not use multiprovider in data web3 because of the effect of disparate block status reads.
    eth_web3 = web3_provider.get_eth_web3()
    eth_abi_values = helpers.load_eth_abi_values()

    # Initialize trusted notifier manager info
    trusted_notifier_manager = fetch_trusted_notifier_info(
        eth_web3, shared_config, eth_abi_values
    )

    # Initialize Solana web3 provider
    solana_client_manager = SolanaClientManager(shared_config["solana"]["endpoint"])

    helpers.configure_logging()
    configure_celery(celery_app.celery, test_config)
    return celery_app


def configure_celery(celery, test_config=None):
    database_url = shared_config["db"]["url"]
    database_url_read_replica = shared_config["db"]["url_read_replica"]
    redis_url = shared_config["redis"]["url"]

    if test_config is not None:
        if "db" in test_config:
            if "url" in test_config["db"]:
                database_url = test_config["db"]["url"]
            if "url_read_replica" in test_config["db"]:
                database_url_read_replica = test_config["db"]["url_read_replica"]

    # Update celery configuration
    celery.conf.update(
        imports=[
            "src.tasks.index_metrics",
            "src.tasks.index_hourly_play_counts",
            "src.tasks.vacuum_db",
            "src.tasks.update_clique_signers",
            "src.tasks.index_trending",
            "src.tasks.cache_user_balance",
            "src.monitors.monitoring_queue",
            "src.tasks.index_challenges",
            "src.tasks.index_user_bank",
            "src.tasks.index_payment_router",
            "src.tasks.index_eth",
            "src.tasks.index_oracles",
            "src.tasks.index_rewards_manager",
            "src.tasks.user_listening_history.index_user_listening_history",
            "src.tasks.prune_plays",
            "src.tasks.index_spl_token",
            "src.tasks.index_aggregate_tips",
            "src.tasks.update_delist_statuses",
            "src.tasks.repair_audio_analyses",
            "src.tasks.cache_current_nodes",
            "src.tasks.update_aggregates",
            "src.tasks.cache_entity_counts",
            "src.tasks.publish_scheduled_releases",
            "src.tasks.create_engagement_notifications",
            "src.tasks.create_listen_streak_reminder_notifications",
            "src.tasks.create_remix_contest_notifications",
            "src.tasks.index_core",
        ],
        beat_schedule={
            "aggregate_metrics": {
                "task": "aggregate_metrics",
                "schedule": timedelta(minutes=METRICS_INTERVAL),
            },
            "synchronize_metrics": {
                "task": "synchronize_metrics",
                "schedule": timedelta(minutes=SYNCHRONIZE_METRICS_INTERVAL),
            },
            "index_hourly_play_counts": {
                "task": "index_hourly_play_counts",
                "schedule": timedelta(seconds=30),
            },
            "vacuum_db": {
                "task": "vacuum_db",
                "schedule": timedelta(days=1),
            },
            "update_clique_signers": {
                "task": "update_clique_signers",
                "schedule": timedelta(seconds=10),
            },
            "index_trending": {
                "task": "index_trending",
                "schedule": timedelta(seconds=10),
            },
            "update_user_balances": {
                "task": "update_user_balances",
                "schedule": timedelta(seconds=60),
            },
            "monitoring_queue": {
                "task": "monitoring_queue",
                "schedule": timedelta(seconds=60),
            },
            "index_eth": {
                "task": "index_eth",
                "schedule": timedelta(seconds=30),
            },
            "index_oracles": {
                "task": "index_oracles",
                "schedule": timedelta(minutes=5),
            },
            "index_user_listening_history": {
                "task": "index_user_listening_history",
                "schedule": timedelta(seconds=5),
            },
            "prune_plays": {
                "task": "prune_plays",
                "schedule": timedelta(seconds=30),
            },
            "index_spl_token": {
                "task": "index_spl_token",
                "schedule": timedelta(seconds=5),
            },
            "index_aggregate_tips": {
                "task": "index_aggregate_tips",
                "schedule": timedelta(seconds=5),
            },
            "index_profile_challenge_backfill": {
                "task": "index_profile_challenge_backfill",
                "schedule": timedelta(minutes=1),
            },
            "cache_current_nodes": {
                "task": "cache_current_nodes",
                "schedule": timedelta(minutes=2),
            },
            "cache_entity_counts": {
                "task": "cache_entity_counts",
                "schedule": timedelta(minutes=10),
            },
            "update_aggregates": {
                "task": "update_aggregates",
                "schedule": timedelta(minutes=10),
            },
            "publish_scheduled_releases": {
                "task": "publish_scheduled_releases",
                "schedule": timedelta(minutes=1),
            },
            "create_engagement_notifications": {
                "task": "create_engagement_notifications",
                "schedule": timedelta(minutes=10),
            },
            "create_listen_streak_reminder_notifications": {
                "task": "create_listen_streak_reminder_notifications",
                "schedule": timedelta(seconds=10),
            },
            "create_remix_contest_notifications": {
                "task": "create_remix_contest_notifications",
                "schedule": timedelta(seconds=30),
            },
            "repair_audio_analyses": {
                "task": "repair_audio_analyses",
                "schedule": timedelta(minutes=3),
            },
        },
        task_serializer="json",
        accept_content=["json"],
        broker_url=redis_url,
    )

    # Initialize Redis connection
    redis_inst = get_redis()

    # Initialize DB object for celery task context
    db = SessionManager(
        database_url, ast.literal_eval(shared_config["db"]["engine_args_literal"])
    )
    db_read_replica = SessionManager(
        database_url_read_replica,
        ast.literal_eval(shared_config["db"]["engine_args_literal"]),
    )
    set_session_managers(db, db_read_replica)
    logger.info("Database instance initialized!")

    # Seed the challenges table from challenges.json. Previously done by the
    # Flask init path; now that we're celery-only, this is the sole seeding
    # point so a fresh deploy gets the expected challenge rows.
    with db.scoped_session() as session:
        create_new_challenges(session)

    registry_address = Web3.to_checksum_address(
        shared_config["eth_contracts"]["registry"]
    )
    eth_manager = EthManager(eth_web3, eth_abi_values, registry_address)
    eth_manager.init_contracts()

    # Clear existing locks used in tasks if present
    redis_inst.delete(eth_indexing_last_scanned_block_key)
    redis_inst.delete("network_peers_lock")
    redis_inst.delete("update_metrics_lock")
    redis_inst.delete("update_play_count_lock")
    redis_inst.delete("index_hourly_play_counts_lock")
    redis_inst.delete("update_discovery_lock")
    redis_inst.delete("aggregate_metrics_lock")
    redis_inst.delete("synchronize_metrics_lock")
    redis_inst.delete("solana_plays_lock")
    redis_inst.delete("index_challenges_lock")
    redis_inst.delete("user_bank_lock")
    redis_inst.delete("payment_router_lock")
    redis_inst.delete("index_eth_lock")
    redis_inst.delete("index_oracles_lock")
    redis_inst.delete("solana_rewards_manager_lock")
    redis_inst.delete("index_user_listening_history_lock")
    redis_inst.delete("prune_plays_lock")
    redis_inst.delete("update_aggregate_table:aggregate_user_tips")
    redis_inst.delete("spl_token_lock")
    redis_inst.delete("profile_challenge_backfill_lock")
    redis_inst.delete("index_trending_lock")
    redis_inst.delete(UPDATE_DELIST_STATUSES_LOCK)
    redis_inst.delete(REPAIR_AUDIO_ANALYSES_LOCK)
    redis_inst.delete("update_aggregates_lock")
    redis_inst.delete("publish_scheduled_releases_lock")
    redis_inst.delete("create_engagement_notifications")
    redis_inst.delete(index_core_lock_key)
    # delete cached final_poa_block in case it has changed
    redis_inst.delete(final_poa_block_redis_key)

    logger.info("Redis instance connected!")

    # Initialize custom task context with database object
    class WrappedDatabaseTask(DatabaseTask):
        def __init__(self, *args, **kwargs):
            DatabaseTask.__init__(
                self,
                db=db,
                db_read_replica=db_read_replica,
                web3=web3,
                abi_values=abi_values,
                eth_abi_values=eth_abi_values,
                shared_config=shared_config,
                redis=redis_inst,
                eth_web3_provider=eth_web3,
                trusted_notifier_manager=trusted_notifier_manager,
                solana_client_manager=solana_client_manager,
                challenge_event_bus=setup_challenge_bus(),
                eth_manager=eth_manager,
            )

    # Subclassing celery task with discovery provider context
    # Provided through properties defined in 'DatabaseTask'
    celery.Task = WrappedDatabaseTask

    celery.finalize()

    # Clear out old celery tasks on app startup
    # Initialize with beat or initial message
    celery.control.purge()

    # Start tasks that should fire upon startup
    celery.send_task("cache_current_nodes")
    celery.send_task("cache_entity_counts")
    celery.send_task("index_rewards_manager", queue="index_sol")
    celery.send_task("index_user_bank", queue="index_sol")
    celery.send_task("index_payment_router", queue="index_sol")
    celery.send_task("index_challenges", queue="index_challenges")
    celery.send_task("index_core", queue="index_core")
