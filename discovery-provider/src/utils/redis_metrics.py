import logging # pylint: disable=C0302
import functools
from datetime import datetime
import redis
from flask.globals import request
from src.utils.config import shared_config
from src.utils.query_params import stringify_query_params, app_name_param
logger = logging.getLogger(__name__)

REDIS_URL = shared_config["redis"]["url"]
REDIS = redis.Redis.from_url(url=REDIS_URL)

# Redis Key Convention:
# API_METRICS:routes:<date>:<hour>
# API_METRICS:application:<date>:<hour>

metrics_prefix = "API_METRICS"
metrics_routes = "routes"
metrics_application = "applications"

'''
NOTE: if you want to change the time interval to recording metrics,
change the `datetime_format` and func `get_rounded_date_time` to reflect the interval
ie. If you wanted to record metrics per minute:
datetime_format = "%Y/%m/%d:%H-%M" # Add the minute template
def get_rounded_date_time():
    return datetime.utcnow().replace(second=0, microsecond=0) # Remove rounding min.
'''
datetime_format = "%Y/%m/%d:%H"
def get_rounded_date_time():
    return datetime.utcnow().replace(minute=0, second=0, microsecond=0)

def parse_metrics_key(key):
    """
    Validates that a key is correctly formatted and returns
    the source: (routes|applications) and date of key
    """
    if not metrics_prefix.startswith(metrics_prefix):
        logger.warning(f"Bad redis key inserted w/out metrics prefix {key}")
        return None

    fragments = key.split(':')
    if len(fragments) != 4:
        logger.warning(f"Bad redis key inserted: must have 4 parts {key}")
        return None

    _, source, date, time = fragments
    if source not in (metrics_routes, metrics_application):
        logger.warning(f"Bad redis key inserted: must be routes or application {key}")
        return None
    date_time = datetime.strptime(f"{date}:{time}", datetime_format)

    return source, date_time

def extract_app_name_key():
    """
    Extracts the application name redis key and hash from the request
    The key should be of format:
        <metrics_prefix>:<metrics_application>:<rounded_date_time_format>
        ie: "API_METRICS:applications:2020/08/04:14"
    The hash should be of format:
        <app_name>
        ie: "audius_dapp"
    """
    application_name = request.args.get(app_name_param, type=str, default=None)
    date_time = get_rounded_date_time().strftime(datetime_format)

    appplication_key = f"{metrics_prefix}:{metrics_application}:{date_time}"
    return (appplication_key, application_name)

def extract_route_key():
    """
    Extracts the route redis key and hash from the request
    The key should be of format:
        <metrics_prefix>:<metrics_routes>:<rounded_date_time_format>
        ie: "API_METRICS:routes:2020/08/04:14"
    The hash should be of format:
        <path><sorted_query_params>
        ie: "/v1/tracks/search?genre=rap&query=best"
    """
    path = request.path
    req_args = request.args.items()
    req_args = stringify_query_params(req_args)
    route = f"{path}?{req_args}" if req_args else path

    date_time = get_rounded_date_time().strftime(datetime_format)
    route_key = f"{metrics_prefix}:{metrics_routes}:{date_time}"
    return (route_key, route)

# Metrics decorator.
def record_metrics(func):
    """
    The metrics decorator records each time a route is hit in redis
    The number of times a route is hit and an app_name query param are used are recorded.
    A redis a redis hash map is used to store each of these values.

    NOTE: This must be placed before the cache decorator in order for the redis incr to occur
    """
    @functools.wraps(func)
    def wrap(*args, **kwargs):
        try:
            appplication_key, application_name = extract_app_name_key()
            route_key, route = extract_route_key()
            REDIS.hincrby(route_key, route, 1)
            if application_name:
                REDIS.hincrby(appplication_key, application_name, 1)
        except Exception as e:
            logger.error('Error while recording metrics: %s', e.message)

        return func(*args, **kwargs)
    return wrap
