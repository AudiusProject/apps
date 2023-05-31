import logging

from src.tasks.celery_app import celery
from src.utils.get_all_other_nodes import (
    ALL_CONTENT_NODES_CACHE_KEY,
    ALL_DISCOVERY_NODES_CACHE_KEY,
    get_all_other_content_nodes,
    get_all_other_discovery_nodes,
    get_node_endpoint,
)
from src.utils.prometheus_metric import save_duration_metric
from src.utils.redis_cache import set_json_cached_key

logger = logging.getLogger(__name__)


# ####### CELERY TASKS ####### #
@celery.task(name="cache_current_nodes", bind=True)
@save_duration_metric(metric_group="celery_task")
def cache_current_nodes_task(self):
    redis = cache_current_nodes_task.redis
    # Define lock acquired boolean
    have_lock = False
    # Define redis lock object
    # Max duration of lock is 4hrs or 14400 seconds
    update_lock = redis.lock(
        "cache_current_nodes_lock", blocking_timeout=25, timeout=14400
    )
    try:
        have_lock = update_lock.acquire(blocking=False)
        if have_lock:
            logger.info("cache_current_nodes.py | fetching all other discovery nodes")
            discovery_nodes = get_all_other_discovery_nodes()[0]
            current_node = get_node_endpoint()
            # add current node to list
            if current_node is not None:
                discovery_nodes.append(current_node)

            set_json_cached_key(redis, ALL_DISCOVERY_NODES_CACHE_KEY, discovery_nodes)
            logger.info("cache_current_nodes.py | set current discovery nodes in redis")

            logger.info("cache_current_nodes.py | fetching all other content nodes")
            content_nodes = get_all_other_content_nodes()[0]

            set_json_cached_key(redis, ALL_CONTENT_NODES_CACHE_KEY, content_nodes)
            logger.info("cache_current_nodes.py | set current content nodes in redis")
        else:
            logger.info("cache_current_nodes.py | Failed to acquire lock")
    except Exception as e:
        logger.error(f"cache_current_nodes.py | ERROR caching node info {e}")
        raise e
    finally:
        if have_lock:
            update_lock.release()
