import datetime
import logging
import time
from typing import List

from src.tasks.celery_app import celery
from src.utils import web3_provider
from src.utils.config import shared_config
from src.utils.helpers import load_eth_abi_values
from src.utils.prometheus_metric import save_duration_metric

logger = logging.getLogger(__name__)

oracle_addresses_key = "oracle_addresses"

eth_abi_values = load_eth_abi_values()
REWARDS_CONTRACT_ABI = eth_abi_values["EthRewardsManager"]["abi"]


eth_web3 = web3_provider.get_eth_web3()
eth_registry_address = eth_web3.to_checksum_address(
    shared_config["eth_contracts"]["registry"]
)
eth_registry_instance = eth_web3.eth.contract(
    address=eth_registry_address, abi=eth_abi_values["Registry"]["abi"]
)


def get_oracle_addresses_from_chain(redis) -> List[str]:
    try:
        # Note: this call will fail until the eth rewards manager contract is deployed
        eth_rewards_manager_address = eth_registry_instance.functions.getContract(
            bytes("EthRewardsManagerProxy", "utf-8")
        ).call()
        eth_rewards_manager_instance = eth_web3.eth.contract(
            address=eth_rewards_manager_address, abi=REWARDS_CONTRACT_ABI
        )
        oracle_addresses = (
            eth_rewards_manager_instance.functions.getAntiAbuseOracleAddresses().call()
        )
        redis.set(oracle_addresses_key, ",".join(oracle_addresses))
        return oracle_addresses
    except Exception as e:
        logger.error(
            f"index_oracles.py | Failed to get oracle addresses from chain: {e}"
        )
        return []


@celery.task(name="index_oracles", bind=True)
@save_duration_metric(metric_group="celery_task")
def index_oracles_task(self):
    redis = index_oracles_task.redis
    have_lock = False
    update_lock = redis.lock("index_oracles_lock", timeout=60)

    interval = datetime.timedelta(minutes=5)
    start_time = time.time()
    errored = False
    try:
        have_lock = update_lock.acquire(blocking=False)
        if have_lock:
            get_oracle_addresses_from_chain(redis)
        else:
            logger.error("index_oracles.py | Fatal error in main loop", exc_info=True)
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
        if have_lock:
            update_lock.release()
        celery.send_task(self.name, countdown=time_left)
