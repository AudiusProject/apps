import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple, TypedDict, cast

import requests
from elasticsearch import Elasticsearch
from redis import Redis

from src.eth_indexing.event_scanner import eth_indexing_last_scanned_block_key
from src.models.indexing.block import Block
from src.monitors import monitor_names, monitors
from src.queries.get_balances import (
    IMMEDIATE_REFRESH_REDIS_PREFIX,
    LAZY_REFRESH_REDIS_PREFIX,
)
from src.queries.get_latest_play import get_latest_play
from src.queries.get_oldest_unarchived_play import get_oldest_unarchived_play
from src.queries.get_sol_plays import get_sol_play_health_info
from src.queries.get_trusted_notifier_discrepancies import get_delist_statuses_ok
from src.tasks.index_core import (
    CoreHealth,
    core_health_check_cache_key,
    core_listens_health_check_cache_key,
)
from src.utils import (  # elasticdsl,
    db_session,
    get_all_nodes,
    helpers,
    redis_connection,
)
from src.utils.config import shared_config
from src.utils.elasticdsl import ES_INDEXES
from src.utils.prometheus_metric import PrometheusMetric, PrometheusMetricNames
from src.utils.redis_constants import (
    SolanaIndexerStatus,
    challenges_last_processed_event_redis_key,
    index_eth_last_completion_redis_key,
    latest_block_hash_redis_key,
    latest_block_redis_key,
    latest_legacy_play_db_key,
    most_recent_indexed_block_hash_redis_key,
    most_recent_indexed_block_redis_key,
    oldest_unarchived_play_key,
    redis_keys,
    trending_playlists_last_completion_redis_key,
    trending_tracks_last_completion_redis_key,
    user_balances_refresh_last_completion_redis_key,
)

logger = logging.getLogger(__name__)
MONITORS = monitors.MONITORS

number_of_cpus = os.cpu_count()

disc_prov_version = helpers.get_discovery_provider_version()

default_healthy_block_diff = int(shared_config["discprov"]["healthy_block_diff"])
default_indexing_interval_seconds = int(
    shared_config["discprov"]["block_processing_interval_sec"]
)
infra_setup = shared_config["discprov"]["infra_setup"]
environment = shared_config["discprov"]["env"]

# min system requirement values
min_number_of_cpus: int = 8  # 8 cpu
min_total_memory: int = 15500000000  # 15.5 GB of RAM
min_filesystem_size: int = 240000000000  # 240 GB of file system storage


def get_elapsed_time_redis(redis, redis_key):
    last_seen = redis.get(redis_key)
    elapsed_time_in_sec = (int(time.time()) - int(last_seen)) if last_seen else None
    return elapsed_time_in_sec


# Returns DB block state & diff
def _get_db_block_state():
    db = db_session.get_db_read_replica()
    with db.scoped_session() as session:
        # Fetch latest block from DB
        db_block_query = session.query(Block).filter(Block.is_current == True).all()
        assert len(db_block_query) == 1, "Expected SINGLE row marked as current"
        return helpers.model_to_dictionary(db_block_query[0])


# Returns number of and info on open db connections
def _get_db_conn_state():
    conn_state = monitors.get_monitors(
        [
            MONITORS[monitor_names.database_connections],
            MONITORS[monitor_names.database_connection_info],
        ]
    )

    return conn_state, False


# Returns query insights
def _get_query_insights():
    query_insights = monitors.get_monitors(
        [
            MONITORS[monitor_names.frequent_queries],
            MONITORS[monitor_names.slow_queries],
        ]
    )

    return query_insights, False


def _get_relay_health():
    try:
        relay_plugin = os.getenv(
            "audius_relay_host",
            "http://relay:6001/relay",
        )
        relay_health = requests.get(relay_plugin + "/health")
        relay_res = relay_health.json()
        return relay_res
    except Exception as e:
        logger.error(f"relay not reachable {e}")
        return None


def _is_relay_healthy(relay_health_res):
    relay_status = relay_health_res["status"]
    is_healthy = relay_status == "up"
    relay_health_res["is_unhealthy"] = not is_healthy
    return is_healthy


class GetHealthArgs(TypedDict):
    # If True, returns db connection information
    verbose: Optional[bool]

    # Determines the point at which a block difference is considered unhealthy
    health_block_diff: Optional[int]
    # If true and the block difference is unhealthy an error is returned
    enforce_block_diff: Optional[bool]

    # Number of seconds the challenge events are allowed to drift
    challenge_events_age_max_drift: Optional[int]

    # Number of seconds play counts are allowed to drift
    plays_count_max_drift: Optional[int]

    # Number of seconds reward_manager indexer is allowed to drift
    reward_manager_max_drift: Optional[int]
    # Number of seconds user_bank indexer is allowed to drift
    user_bank_max_drift: Optional[int]
    # Number of seconds spl_token indexer is allowed to drift
    spl_token_max_drift: Optional[int]
    # Number of seconds payment_router indexer allowed to drift
    payment_router_max_drift: Optional[int]
    # Number of seconds aggregate_tips indexer is allowed to drift
    aggregate_tips_max_drift: Optional[int]


def get_health(args: GetHealthArgs, use_redis_cache: bool = True) -> Tuple[Dict, bool]:
    """
    Gets health status for the service

    Returns a tuple of health results and a boolean indicating an error
    """
    redis = redis_connection.get_redis()

    bypass_errors = args.get("bypass_errors")
    verbose = args.get("verbose")
    enforce_block_diff = args.get("enforce_block_diff")
    qs_healthy_block_diff = cast(Optional[int], args.get("healthy_block_diff"))
    challenge_events_age_max_drift = args.get("challenge_events_age_max_drift")
    plays_count_max_drift = args.get("plays_count_max_drift")
    reward_manager_max_drift = args.get("reward_manager_max_drift")
    user_bank_max_drift = args.get("user_bank_max_drift")
    spl_token_max_drift = args.get("spl_token_max_drift")
    payment_router_max_drift = args.get("payment_router_max_drift")
    aggregate_tips_max_drift = args.get("aggregate_tips_max_drift")

    errors = []

    # If healthy block diff is given in url and positive, override config value
    healthy_block_diff = (
        qs_healthy_block_diff
        if qs_healthy_block_diff is not None and qs_healthy_block_diff >= 0
        else default_healthy_block_diff
    )

    latest_block_num: Optional[int] = None
    latest_block_hash: Optional[str] = None
    latest_indexed_block_num: Optional[int] = None
    latest_indexed_block_hash: Optional[str] = None

    if use_redis_cache:
        # get latest db state from redis cache
        latest_indexed_block_num = redis.get(most_recent_indexed_block_redis_key)
        if latest_indexed_block_num is not None:
            latest_indexed_block_num = int(latest_indexed_block_num)

        latest_indexed_block_hash_bytes = redis.get(
            most_recent_indexed_block_hash_redis_key
        )
        if latest_indexed_block_hash_bytes is not None:
            latest_indexed_block_hash = latest_indexed_block_hash_bytes.decode("utf-8")

    core_health: CoreHealth = get_core_health(redis=redis)
    core_listens_health = get_core_listens_health(
        redis=redis, plays_count_max_drift=plays_count_max_drift
    )

    latest_block_ts = 0
    if core_health:
        latest_chain_block_ts = core_health.get("latest_chain_block_ts") or 0
        latest_block_ts = int(latest_chain_block_ts)

    # fetch latest db state if:
    # we explicitly don't want to use redis cache or
    # value from redis cache is None
    if (
        not use_redis_cache
        or latest_indexed_block_num is None
        or latest_indexed_block_hash is None
    ):
        db_block_state = _get_db_block_state()
        latest_indexed_block_num = db_block_state["number"] or 0
        latest_indexed_block_hash = db_block_state["blockhash"]

    current_ts = int(time.time())  # Current UTC time in seconds

    core_stuck = (current_ts - latest_block_ts) > 180
    if core_stuck:
        errors.append("no new blocks in at least a minute")

    play_health_info = core_listens_health
    latest_indexed_block_num = -1
    latest_block_num = -1
    if core_health:
        latest_indexed_block_num = core_health.get("latest_indexed_block") or 0

    # Use the reliable latest_chain_slot from plays data instead of unreliable Redis keys
    # The plays data already has the correct latest chain slot/block number
    if play_health_info:
        latest_block_num = play_health_info.get("latest_chain_slot")

    # If plays data doesn't have latest_chain_slot or is None, fallback to old method
    if latest_block_num is None:
        (latest_block_num, _) = get_latest_chain_block_set_if_nx(redis)
        # Handle case where redis keys are temporarily unavailable during indexing
        # If latest_block_num is None, try to get it from core_health as fallback
        if latest_block_num is None and core_health:
            latest_block_num = core_health.get("latest_chain_block")

    user_bank_health_info = get_solana_indexer_status(
        redis, redis_keys.solana.user_bank, user_bank_max_drift
    )
    spl_token_health_info = get_solana_indexer_status(
        redis, redis_keys.solana.spl_token, spl_token_max_drift
    )
    reward_manager_health_info = get_solana_indexer_status(
        redis, redis_keys.solana.reward_manager, reward_manager_max_drift
    )
    payment_router_health_info = get_solana_indexer_status(
        redis, redis_keys.solana.payment_router, payment_router_max_drift
    )
    aggregate_tips_health_info = get_solana_indexer_status(
        redis,
        redis_keys.solana.aggregate_tips,
        aggregate_tips_max_drift,
    )

    trending_tracks_age_sec = get_elapsed_time_redis(
        redis, trending_tracks_last_completion_redis_key
    )
    trending_playlists_age_sec = get_elapsed_time_redis(
        redis, trending_playlists_last_completion_redis_key
    )
    challenge_events_age_sec = get_elapsed_time_redis(
        redis, challenges_last_processed_event_redis_key
    )
    user_balances_age_sec = get_elapsed_time_redis(
        redis, user_balances_refresh_last_completion_redis_key
    )
    num_users_in_lazy_balance_refresh_queue = int(
        redis.scard(LAZY_REFRESH_REDIS_PREFIX)
    )
    num_users_in_immediate_balance_refresh_queue = int(
        redis.scard(IMMEDIATE_REFRESH_REDIS_PREFIX)
    )
    last_scanned_block_for_balance_refresh = redis.get(
        eth_indexing_last_scanned_block_key
    )
    index_eth_age_sec = get_elapsed_time_redis(
        redis, index_eth_last_completion_redis_key
    )
    last_scanned_block_for_balance_refresh = (
        int(last_scanned_block_for_balance_refresh)
        if last_scanned_block_for_balance_refresh
        else None
    )

    # Get system information monitor values
    sys_info = monitors.get_monitors(
        [
            MONITORS[monitor_names.database_size],
            MONITORS[monitor_names.database_connections],
            MONITORS[monitor_names.total_memory],
            MONITORS[monitor_names.used_memory],
            MONITORS[monitor_names.filesystem_size],
            MONITORS[monitor_names.filesystem_used],
            MONITORS[monitor_names.received_bytes_per_sec],
            MONITORS[monitor_names.transferred_bytes_per_sec],
            MONITORS[monitor_names.redis_total_memory],
        ]
    )

    url = shared_config["discprov"]["url"]

    auto_upgrade_enabled = (
        True if os.getenv("audius_auto_upgrade_enabled") == "true" else False
    )
    database_is_localhost = os.getenv(
        "audius_db_url"
    ) == "postgresql://postgres:postgres@db:5432/audius_discovery" or "localhost" in os.getenv(
        "audius_db_url", ""
    )
    discovery_nodes = get_all_nodes.get_all_discovery_nodes_cached(redis)
    content_nodes = get_all_nodes.get_all_healthy_content_nodes_cached(redis)
    final_poa_block = helpers.get_final_poa_block()
    health_results = {
        "web": {
            "blocknumber": latest_block_num,
            "blockhash": latest_block_hash,
        },
        "db": {
            "number": latest_indexed_block_num,
            "blockhash": latest_indexed_block_hash,
        },
        "git": os.getenv("GIT_SHA"),
        "auto_upgrade_enabled": auto_upgrade_enabled,
        "database_is_localhost": database_is_localhost,
        "trending_tracks_age_sec": trending_tracks_age_sec,
        "trending_playlists_age_sec": trending_playlists_age_sec,
        "challenge_last_event_age_sec": challenge_events_age_sec,
        "user_balances_age_sec": user_balances_age_sec,
        "num_users_in_lazy_balance_refresh_queue": num_users_in_lazy_balance_refresh_queue,
        "num_users_in_immediate_balance_refresh_queue": num_users_in_immediate_balance_refresh_queue,
        "last_scanned_block_for_balance_refresh": last_scanned_block_for_balance_refresh,
        "index_eth_age_sec": index_eth_age_sec,
        "number_of_cpus": number_of_cpus,
        **sys_info,
        "plays": play_health_info,
        "solana_indexers": {
            "spl_token": spl_token_health_info,
            "payment_router": payment_router_health_info,
            "reward_manager": reward_manager_health_info,
            "user_bank": user_bank_health_info,
            "aggregate_tips": aggregate_tips_health_info,
        },
        "infra_setup": infra_setup,
        "url": url,
        # Temp
        "latest_block_num": latest_block_num,
        "latest_indexed_block_num": latest_indexed_block_num,
        "final_poa_block": final_poa_block,
        "network": {
            "discovery_nodes_with_owner": discovery_nodes,
            "discovery_nodes": (
                [d["endpoint"] for d in discovery_nodes] if discovery_nodes else None
            ),
            "content_nodes": content_nodes,
        },
        "core": {"health": core_health, "listens": core_listens_health},
    }

    if os.getenv("AUDIUS_D_GENERATED"):
        health_results["audius_d_managed"] = True
    if os.getenv("AUDIUS_DOCKER_COMPOSE_GIT_SHA") is not None:
        health_results["audius-docker-compose"] = os.getenv(
            "AUDIUS_DOCKER_COMPOSE_GIT_SHA"
        )

    if latest_block_num is not None and latest_indexed_block_num is not None:
        block_difference = abs(
            latest_block_num - latest_indexed_block_num
        )  # nethermind offset
    else:
        # If we cannot get a reading from chain about what the latest block is,
        # we set the difference to be an unhealthy amount
        block_difference = default_healthy_block_diff + 1

    # Update health results with corrected latest_block_num
    health_results["web"]["blocknumber"] = latest_block_num
    health_results["latest_block_num"] = latest_block_num
    health_results["block_difference"] = block_difference
    health_results["maximum_healthy_block_difference"] = default_healthy_block_diff
    health_results.update(disc_prov_version)

    # Check that this node meets the minimum system requirements
    num_cpus: int = cast(int, health_results["number_of_cpus"] or 0)
    total_memory: int = cast(int, health_results["total_memory"] or 0)
    filesystem_size: int = cast(int, health_results["filesystem_size"] or 0)
    if (
        num_cpus < min_number_of_cpus
        or total_memory < min_total_memory
        or filesystem_size < min_filesystem_size
    ):
        health_results["meets_min_requirements"] = False
        # TODO - this will become strictly enforced in upcoming service versions and return with error
    else:
        health_results["meets_min_requirements"] = True

    relay_health = _get_relay_health()
    if relay_health is None or not _is_relay_healthy(relay_health):
        errors.append("relay unhealthy")

    health_results["relay"] = relay_health

    # Elasticsearch health
    # esclient = elasticdsl.get_esclient()
    # if esclient:
    #     health_results["elasticsearch"] = get_elasticsearch_health_info(
    #         esclient,
    #         latest_indexed_block_num,
    #         verbose,
    #     )
    #     if health_results["elasticsearch"]["status"] != "green":
    #         errors.append("unhealthy elasticsearch")

    if verbose:
        # DB connections check
        db_connections_json, db_connections_error = _get_db_conn_state()
        health_results["db_connections"] = db_connections_json
        location = get_location()
        health_results.update(location)

        if db_connections_error:
            return health_results, db_connections_error

        query_insights_json, query_insights_error = _get_query_insights()
        health_results["query_insights"] = query_insights_json

        if query_insights_error:
            return health_results, query_insights_error

        table_size_info_json = monitors.get_monitors(
            [
                MONITORS[monitor_names.table_size_info],
            ]
        )

        health_results["tables"] = table_size_info_json

    unhealthy_blocks = bool(
        enforce_block_diff and block_difference > healthy_block_diff
    )
    unhealthy_challenges = bool(
        challenge_events_age_max_drift
        and challenge_events_age_sec
        and challenge_events_age_sec > challenge_events_age_max_drift
    )

    if unhealthy_blocks:
        errors.append("unhealthy block diff")
    if unhealthy_challenges:
        errors.append("unhealthy challenges")
    if play_health_info and play_health_info.get("is_unhealthy"):
        errors.append("unhealthy plays")
    if not user_bank_health_info["is_healthy"]:
        errors.append("unhealthy user_bank indexer")
    if not reward_manager_health_info["is_healthy"]:
        errors.append("unhealthy reward_manager indexer")
    if not spl_token_health_info["is_healthy"]:
        errors.append("unhealthy spl_token indexer")
    if not payment_router_health_info["is_healthy"]:
        errors.append("unhealthy payment_router indexer")
    if not aggregate_tips_health_info["is_healthy"]:
        errors.append("unhealthy aggregate_tips indexer")

    delist_statuses_ok = get_delist_statuses_ok()
    if not delist_statuses_ok:
        errors.append("unhealthy delist statuses")

    health_results["errors"] = errors
    health_results["discovery_provider_healthy"] = not errors or bypass_errors

    return health_results, not health_results["discovery_provider_healthy"]


class LocationResponse(TypedDict):
    country: str
    latitude: str
    longitude: str


def get_location() -> LocationResponse:
    return {
        "country": shared_config["serviceLocation"]["serviceCountry"],
        "latitude": shared_config["serviceLocation"]["serviceLatitude"],
        "longitude": shared_config["serviceLocation"]["serviceLongitude"],
    }


def get_elasticsearch_health_info(
    esclient: Elasticsearch,
    latest_indexed_block_num: int,
    verbose: Optional[bool],
) -> Dict[str, Any]:
    elasticsearch_health: Dict[str, Any] = {"status": None, "health": None}
    try:
        health = esclient.cluster.health()
        elasticsearch_health["health"] = health.get("body")
        elasticsearch_health["status"] = health.get("status")
    except Exception as e:
        logger.error(f"Could not obtain elasticsearch cluster health status: {e}")

    if verbose:
        for index_name in ES_INDEXES:
            try:
                resp = esclient.search(
                    index=index_name,
                    aggs={"max_blocknumber": {"max": {"field": "blocknumber"}}},
                    size=0,
                )
                blocknumber = int(resp["aggregations"]["max_blocknumber"]["value"])
                elasticsearch_health[index_name] = {
                    "blocknumber": blocknumber,
                    "db_block_difference": latest_indexed_block_num - blocknumber,
                }
            except Exception as e:
                logger.error(f"Failed to query elasticsearch index {index_name}: {e}")
    return elasticsearch_health


def health_check_prometheus_exporter():
    health_results, is_unhealthy = get_health({})

    # store all top-level keys with numerical values
    for key, value in health_results.items():
        if isinstance(value, (int, float)):
            PrometheusMetric(PrometheusMetricNames.HEALTH_CHECK).save(
                value, {"key": key}
            )

    # store a non-top-level key
    PrometheusMetric(PrometheusMetricNames.HEALTH_CHECK).save(
        health_results["web"]["blocknumber"], {"key": "blocknumber"}
    )


PrometheusMetric.register_collector(
    "health_check_prometheus_exporter", health_check_prometheus_exporter
)


class SolanaIndexerHealth(TypedDict):
    # whether the indexer is healthy, as defined by the given allowed drift
    # for since_last_completed_at
    is_healthy: bool
    # time (in seconds) since the last completion of the indexer
    since_last_completed_at: Optional[float]
    # UTC timestamp of the last indexing job completion
    last_completed_at: Optional[float]
    # the last indexed transaction signature
    last_tx: Optional[str]


def get_solana_indexer_status(
    redis: Redis, keys: SolanaIndexerStatus, max_drift: Optional[int]
) -> SolanaIndexerHealth:
    last_completed_at = redis.get(keys.last_completed_at)
    last_completed_at = (
        float(last_completed_at) if last_completed_at is not None else None
    )
    now = datetime.now(timezone.utc).timestamp()
    since_last_completed_at = (
        (now - last_completed_at) if last_completed_at is not None else None
    )
    last_tx = redis.get(keys.last_tx)
    last_tx = str(last_tx, encoding="utf-8") if last_tx is not None else None
    # Job completed at least once and less than max_drift ago (if applicable)
    is_healthy = since_last_completed_at is not None and (
        max_drift is None or since_last_completed_at < max_drift
    )

    return {
        "is_healthy": is_healthy,
        "since_last_completed_at": since_last_completed_at,
        "last_completed_at": last_completed_at,
        "last_tx": last_tx,
    }


class SolHealthInfo(TypedDict):
    is_unhealthy: bool
    tx_info: Dict


class PlayHealthInfo(SolHealthInfo):
    oldest_unarchived_play_created_at: str


# Aggregate play health info across Solana and legacy storage
def get_play_health_info(
    redis: Redis, plays_count_max_drift: Optional[int]
) -> PlayHealthInfo:
    if redis is None:
        raise Exception("Invalid arguments for get_play_health_info")

    current_time_utc = datetime.utcnow()
    # Fetch plays info from Solana
    sol_play_info = get_sol_play_health_info(redis, current_time_utc)

    # If play count max drift provided, perform comparison
    is_unhealthy_sol_plays = bool(
        plays_count_max_drift and plays_count_max_drift < sol_play_info["time_diff"]
    )

    # If unhealthy sol plays, this will be overwritten
    time_diff_general = sol_play_info["time_diff"]
    oldest_unarchived_play = None

    if is_unhealthy_sol_plays or not plays_count_max_drift:
        # Calculate time diff from now to latest play
        latest_db_play = redis.get(latest_legacy_play_db_key)
        if not latest_db_play:
            # Query and cache latest db play if found
            latest_db_play = get_latest_play()
            if latest_db_play:
                redis.set(latest_legacy_play_db_key, latest_db_play.timestamp())
        else:
            # Decode bytes into float for latest timestamp
            latest_db_play = float(latest_db_play.decode())
            latest_db_play = datetime.utcfromtimestamp(latest_db_play)

        oldest_unarchived_play = redis.get(oldest_unarchived_play_key)
        if not oldest_unarchived_play:
            # Query and cache oldest unarchived play
            oldest_unarchived_play = get_oldest_unarchived_play()
            if oldest_unarchived_play:
                redis.set(
                    oldest_unarchived_play_key,
                    oldest_unarchived_play.timestamp(),
                )
        else:
            # Decode bytes into float for latest timestamp
            oldest_unarchived_play = datetime.utcfromtimestamp(
                float(oldest_unarchived_play.decode())
            )

        time_diff_general = (
            (current_time_utc - latest_db_play).total_seconds()
            if latest_db_play
            else time_diff_general
        )

    is_unhealthy_plays = bool(
        plays_count_max_drift
        and (is_unhealthy_sol_plays and (plays_count_max_drift < time_diff_general))
    )

    return {
        "is_unhealthy": is_unhealthy_plays,
        "tx_info": sol_play_info,
        "oldest_unarchived_play_created_at": str(oldest_unarchived_play),
    }


def get_core_listens_health(redis: Redis, plays_count_max_drift: Optional[int]):
    try:
        core_health = redis.get(core_listens_health_check_cache_key)
        if core_health:
            res = json.loads(core_health)

            is_unhealthy_sol_plays = bool(
                plays_count_max_drift and plays_count_max_drift < res["time_diff"]
            )

            res["is_unhealthy"] = is_unhealthy_sol_plays
            return res
        return None
    except Exception as e:
        logger.error(f"get_health.py | could not get core listens health {e}")
        return None


def get_core_health(redis: Redis):
    try:
        core_health = redis.get(core_health_check_cache_key)
        if core_health:
            return json.loads(core_health)
        return None
    except Exception as e:
        logger.error(f"get_health.py | could not get core health {e}")
        return None


def get_latest_chain_block_set_if_nx(redis=None):
    """
    Retrieves the latest block number and blockhash from redis if the keys exist.
    Otherwise it sets these values in redis by querying web3 and returns them

    :param redis: redis connection
    :param web3: web3 connection

    :rtype (int, string)
    """

    latest_block_num = None
    latest_block_hash = None

    if redis is None:
        raise Exception("Invalid arguments for get_latest_chain_block_set_if_nx")

    stored_latest_block_num = redis.get(latest_block_redis_key)
    if stored_latest_block_num is not None:
        latest_block_num = int(stored_latest_block_num)

    stored_latest_blockhash = redis.get(latest_block_hash_redis_key)
    if stored_latest_blockhash is not None:
        latest_block_hash = stored_latest_blockhash.decode("utf-8")

    return latest_block_num, latest_block_hash
