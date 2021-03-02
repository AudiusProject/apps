import logging  # pylint: disable=C0302
import random

from src.api.v1.helpers import extend_track, decode_string_id
from src.queries.get_trending_tracks import get_trending_tracks

logger = logging.getLogger(__name__)

DEFAULT_RANDOM_LIMIT = 10

def get_random_tracks(args):
    """Gets random tracks from trending by getting the currently cached tracks and then populating them."""
    exclusion_list = args.get("exclusion_list") or []
    time = args.get("time") if args.get("time") is not None else 'week'
    current_user_id = args.get("user_id")
    args = {
        'time': time,
        'genre': args.get("genre", None),
        'with_users': True,
        'limit': args.get("limit"),
        'offset': 0
    }

    # decode and add user_id if necessary
    if current_user_id:
        args["current_user_id"] = decode_string_id(current_user_id)

    tracks = get_trending_tracks(args)
    filtered_tracks = list(filter(lambda track: track['track_id'] not in exclusion_list, tracks))

    random.shuffle(filtered_tracks)
    return list(map(extend_track, filtered_tracks))
