import datetime
import logging
import time

from src.eth_indexing.event_scanner import EventScanner
from src.tasks.cache_user_balance import get_token_address
from src.tasks.celery_app import celery
from src.utils.helpers import load_eth_abi_values
from src.utils.prometheus_metric import save_duration_metric
from src.utils.redis_constants import index_eth_last_completion_redis_key
from src.utils.web3_provider import get_eth_web3

logger = logging.getLogger(__name__)

CHAIN_REORG_SAFETY_BLOCKS = 10

web3 = get_eth_web3()

# Prepare stub ERC-20 contract object
eth_abi_values = load_eth_abi_values()
AUDIO_TOKEN_CONTRACT = web3.eth.contract(abi=eth_abi_values["AudiusToken"]["abi"])

AUDIO_CHECKSUM_ADDRESS = get_token_address(web3)


# This implementation follows the example outlined in the link below
# https://web3py.readthedocs.io/en/stable/examples.html#advanced-example-fetching-all-token-transfer-events
def index_eth_transfer_events(db, redis_inst):
    scanner = EventScanner(
        db=db,
        redis=redis_inst,
        web3=web3,
        contract=AUDIO_TOKEN_CONTRACT,
        event_type=AUDIO_TOKEN_CONTRACT.events.Transfer,
        filters={"address": AUDIO_CHECKSUM_ADDRESS},
    )
    scanner.restore()

    # Assume we might have scanned the blocks all the way to the last Ethereum block
    # that mined a few seconds before the previous scan run ended.
    # Because there might have been a minor Ethereum chain reorganisations
    # since the last scan ended, we need to discard
    # the last few blocks from the previous scan results.
    # Scan from [last block scanned] - [latest ethereum block]
    # (with a potentially offset from the tail to attempt to avoid blocks not mined yet)
    since_block = scanner.get_last_scanned_block() - CHAIN_REORG_SAFETY_BLOCKS

    # Note that our chain reorg safety blocks cannot go negative
    start_block = max(since_block, 0)
    end_block = scanner.get_suggested_scan_end_block()
    if start_block > end_block:
        logger.info(
            f"index_eth.py | Start block ({start_block}) cannot be greater then end block ({end_block})"
        )
        return

    logger.info(
        f"index_eth.py | Scanning events from blocks {start_block} - {end_block}"
    )
    start = time.time()

    # Run the scan
    result, total_chunks_scanned = scanner.scan(start_block, end_block)

    logger.debug(
        "index_eth.py | Reached end block for eth transfer events... saving events to database"
    )
    scanner.save(end_block)
    duration = time.time() - start
    logger.info(
        f"index_eth.py | Scanned total {len(result)} Transfer events, in {duration} seconds, \
            total {total_chunks_scanned} chunk scans performed"
    )


@celery.task(name="index_eth", bind=True)
@save_duration_metric(metric_group="celery_task")
def index_eth(self):
    # Index AUDIO Transfer events to update user balances
    db = index_eth.db
    redis_inst = index_eth.redis

    interval = datetime.timedelta(seconds=30)
    start_time = time.time()
    errored = False
    try:
        logger.info(f"index_eth.py | {self.request.id} | Acquired index_eth_lock")

        index_eth_transfer_events(db, redis_inst)

        end_time = time.time()
        redis_inst.set(index_eth_last_completion_redis_key, int(end_time))
        logger.info(
            f"index_eth.py | {self.request.id} | Processing complete within session"
        )
    except Exception as e:
        logger.error(f"{self.name}.py | Fatal error in main loop", exc_info=True)
        errored = True
        raise e
    finally:
        end_time = time.time()
        elapsed = end_time - start_time
        time_left = max(0, interval.total_seconds() - elapsed)
        logger.info(
            {
                "task_name": self.name,
                "elapsed": elapsed,
                "interval": interval.total_seconds(),
                "time_left": time_left,
                "errored": errored,
            },
        )
        celery.send_task(self.name, countdown=time_left)
