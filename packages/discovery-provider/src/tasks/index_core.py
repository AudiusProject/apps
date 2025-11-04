import json
import logging
import time
from datetime import datetime
from logging import LoggerAdapter
from typing import Optional, TypedDict, cast

from celery.exceptions import SoftTimeLimitExceeded
from redis import Redis
from sqlalchemy import desc
from web3 import Web3

from src.challenges.challenge_event_bus import ChallengeEventBus
from src.models.core.core_indexed_blocks import CoreIndexedBlocks
from src.models.social.play import Play
from src.tasks.celery_app import celery
from src.tasks.core.core_client import CoreClient, get_core_instance
from src.tasks.core.gen.protocol_pb2 import BlockResponse
from src.tasks.index_core_cutovers import get_plays_core_cutover, get_sol_cutover
from src.tasks.index_core_entity_manager import index_core_entity_manager
from src.tasks.index_core_plays import index_core_plays
from src.tasks.index_core_side_effects import run_side_effects
from src.utils.config import shared_config
from src.utils.core import (
    CoreHealth,
    core_health_check_cache_key,
    core_listens_health_check_cache_key,
)
from src.utils.redis_constants import (
    latest_block_hash_redis_key,
    latest_block_redis_key,
    most_recent_indexed_block_hash_redis_key,
    most_recent_indexed_block_redis_key,
)
from src.utils.session_manager import SessionManager

root_logger = logging.getLogger(__name__)

index_core_lock_key = "index_core_lock"

environment = shared_config["discprov"]["env"]
default_indexing_interval_seconds = int(
    shared_config["discprov"]["block_processing_interval_sec"]
)


class CoreListensTxInfo(TypedDict):
    signature: str
    slot: int
    timestamp: int


class CoreListensTxInfoHealth(TypedDict):
    chain_tx: CoreListensTxInfo | None
    db_tx: CoreListensTxInfo


class CoreListensHealth(TypedDict):
    latest_chain_slot: int
    latest_indexed_slot: int
    slot_diff: int
    time_diff: float
    sol_slot_cutover: int
    core_block_cutover: int
    tx_info: CoreListensTxInfoHealth


class IndexingResult(TypedDict):
    indexed_sol_plays_slot: Optional[int]


# dresses up the core health to look like the solana plays endpoint
def update_core_listens_health(
    redis: Redis,
    latest_indexed_block: BlockResponse,
    core_plays_cutover: int,
    sol_plays_cutover: int,
):
    latest_indexed_slot = latest_indexed_block.height
    latest_chain_slot = latest_indexed_block.current_height

    slot_diff = latest_chain_slot - latest_indexed_slot
    time_diff = (
        datetime.utcnow() - latest_indexed_block.timestamp.ToDatetime()
    ).total_seconds()

    health: CoreListensHealth = {
        "slot_diff": slot_diff,
        "time_diff": time_diff,
        "latest_chain_slot": latest_chain_slot,
        "latest_indexed_slot": latest_indexed_slot,
        "tx_info": {
            "chain_tx": None,
            "db_tx": {
                "signature": "",
                "slot": latest_indexed_slot,
                "timestamp": latest_indexed_block.timestamp.ToSeconds(),
            },
        },
        "core_block_cutover": core_plays_cutover,
        "sol_slot_cutover": sol_plays_cutover,
    }
    redis.set(core_listens_health_check_cache_key, json.dumps(health))


def update_core_health(
    redis: Redis,
    latest_indexed_block: BlockResponse,
    indexing_plays: bool,
    indexing_em: bool,
):
    health: CoreHealth = {
        "chain_id": latest_indexed_block.chainid,
        "indexing_entity_manager": indexing_em,
        "indexing_plays": indexing_plays,
        "latest_chain_block": latest_indexed_block.current_height,
        "latest_chain_block_ts": latest_indexed_block.timestamp.seconds,
        "latest_indexed_block": latest_indexed_block.height,
    }
    redis.set(core_health_check_cache_key, json.dumps(health))


def update_latest_block_redis(
    logger: LoggerAdapter, core: CoreClient, redis: Redis, latest_block: int
):
    try:
        block = core.get_block(latest_block)
        block_number = block.current_height
        block_hash = block.blockhash
        redis.set(latest_block_redis_key, block_number)
        redis.set(latest_block_hash_redis_key, block_hash)
    except Exception as e:
        logger.error(f"couldn't update latest redis block: {e}")


def update_latest_indexed_block_redis(
    logger: LoggerAdapter, core: CoreClient, redis: Redis, latest_indexed_block: int
):
    try:
        block = core.get_block(latest_indexed_block)

        block_number = block.height
        block_hash = block.blockhash

        redis.set(most_recent_indexed_block_redis_key, block_number)
        redis.set(most_recent_indexed_block_hash_redis_key, block_hash)

    except Exception as e:
        logger.error(f"couldn't update latest redis block: {e}")


@celery.task(name="index_core", bind=True, soft_time_limit=500)
def index_core(self):
    redis: Redis = index_core.redis
    db: SessionManager = index_core.db
    challenge_bus: ChallengeEventBus = index_core.challenge_event_bus
    web3: Web3 = index_core.web3

    update_lock = redis.lock(index_core_lock_key, blocking_timeout=25, timeout=600)
    have_lock = False

    try:
        have_lock = update_lock.acquire(blocking=False)

        if not have_lock:
            return

        core: CoreClient = get_core_instance()

        # state that gets populated as indexing job goes on
        # used for updating health check and other things
        block_indexed: Optional[BlockResponse] = None

        # execute all of indexing in one db session
        with db.scoped_session() as session:
            core_node_info = core.get_node_info()

            latest_core_block_height = core_node_info.current_height
            core_chain_id = core_node_info.chainid

            latest_indexed_block: Optional[CoreIndexedBlocks] = (
                session.query(CoreIndexedBlocks)
                .filter(CoreIndexedBlocks.chain_id == core_chain_id)
                .order_by(CoreIndexedBlocks.height.desc())
                .first()
            )

            latest_indexed_block_height: int = 0
            if latest_indexed_block and latest_indexed_block.height:
                latest_indexed_block_height = cast(int, latest_indexed_block.height)

            latest_slot_record: Play = (
                session.query(Play)
                .filter(Play.slot != None)
                .filter(Play.signature != None)
                .order_by(desc(Play.slot))
                .first()
            )

            latest_indexed_slot = 0
            if latest_slot_record and latest_slot_record.slot:
                latest_indexed_slot = cast(int, latest_slot_record.slot)

            next_block = latest_indexed_block_height + 1

            logger = logging.LoggerAdapter(
                logger=root_logger,
                extra={
                    "indexer": "core",
                    "chain_id": core_chain_id,
                    "latest_indexed_block": latest_indexed_block_height,
                    "next_indexed_block": next_block,
                    "latest_chain_block": latest_core_block_height,
                },
            )

            update_latest_block_redis(
                logger=logger,
                core=core,
                redis=redis,
                latest_block=core_node_info.current_height,
            )

            logger.debug("indexing block")

            block = core.get_block(next_block)
            if not block:
                return

            if block.height < 0:
                return

            if block.chainid != core_chain_id:
                logger.warning(
                    f"mismatched chain id {block.chainid} given for block but indexing chain {core_chain_id}"
                )
                return
            block_logger = logging.LoggerAdapter(
                logger=logger,
                extra={
                    "indexer": "core",
                    "chain_id": core_chain_id,
                    "core_blockhash": block.blockhash,
                    "core_block_height": block.height,
                },
            )

            indexing_start_time = time.perf_counter()

            indexed_slot = index_core_plays(
                logger=block_logger,
                session=session,
                challenge_bus=challenge_bus,
                latest_indexed_slot=latest_indexed_slot,
                block=block,
            )

            indexed_em_block = index_core_entity_manager(
                logger=block_logger,
                update_task=self,
                web3=web3,
                session=session,
                block=block,
            )

            run_side_effects(
                logger=block_logger,
                block=block,
                session=session,
                core=core,
                challenge_bus=challenge_bus,
            )

            indexing_duration = time.perf_counter() - indexing_start_time
            block_logger.info(f"Core block indexed in {indexing_duration:.3f}s")

            # get block parenthash, in none case also use None
            # this would be the case in solana cutover where the previous
            # block to the cutover isn't indexed either
            parenthash: Optional[str] = None
            previous_height = block.height - 1
            if previous_height > 0:
                parent_block = (
                    session.query(CoreIndexedBlocks)
                    .filter(CoreIndexedBlocks.chain_id == core_chain_id)
                    .filter(CoreIndexedBlocks.height == previous_height)
                    .one_or_none()
                )
                if parent_block:
                    parenthash = parent_block.blockhash

            new_block = CoreIndexedBlocks(
                chain_id=core_chain_id,
                height=block.height,
                blockhash=block.blockhash,
                parenthash=parenthash,
                plays_slot=indexed_slot,
                em_block=indexed_em_block,
            )

            exists = (
                session.query(CoreIndexedBlocks)
                .filter(CoreIndexedBlocks.chain_id == core_chain_id)
                .filter(CoreIndexedBlocks.height == block.height)
                .one_or_none()
            )
            if not exists:
                session.add(new_block)
            if exists:
                logger.warning(f"block {block.height} already indexed")

            block_indexed = block

        # after session has been committed, update health checks and other things
        if block_indexed:
            update_latest_indexed_block_redis(
                logger=logger,
                core=core,
                redis=redis,
                latest_indexed_block=block_indexed.height,
            )
            update_core_health(
                redis=redis,
                latest_indexed_block=block_indexed,
                indexing_plays=True,
                indexing_em=True,
            )
            update_core_listens_health(
                redis=redis,
                latest_indexed_block=block_indexed,
                core_plays_cutover=get_plays_core_cutover(),
                sol_plays_cutover=get_sol_cutover(),
            )

    except SoftTimeLimitExceeded:
        # Soft time limit exceeded, release lock and re-queue and doesn't commit the session
        logger.error("Soft time limit exceeded. Releasing lock and re-queuing.")
    except Exception as e:
        root_logger.error(f"Error in indexing core blocks {e}", exc_info=True)
    finally:
        # don't queue up new message or release lock if never had lock
        if not have_lock:
            return

        if have_lock:
            try:
                update_lock.release()
            except Exception as e:
                logger.error(f"couldn't release lock {e}")
        if not block_indexed:
            celery.send_task("index_core", countdown=0.5, queue="index_core")
        else:
            celery.send_task("index_core", queue="index_core")
