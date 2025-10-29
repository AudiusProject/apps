import logging  # pylint: disable=C0302
from typing import List, Optional, TypedDict

from sqlalchemy import and_, asc, case, desc, or_
from sqlalchemy.sql.functions import coalesce

from src.models.social.aggregate_plays import AggregatePlay
from src.models.tracks.aggregate_track import AggregateTrack
from src.models.tracks.track_route import TrackRoute
from src.models.tracks.track_with_aggregates import TrackWithAggregates
from src.models.users.user import User
from src.queries.get_managed_users import is_active_manager
from src.queries.query_helpers import (
    SortDirection,
    SortMethod,
    add_query_pagination,
    add_users_to_tracks,
    get_pagination_vars,
    parse_sort_param,
    populate_track_metadata,
)
from src.utils import helpers, redis_connection
from src.utils.db_session import get_db_read_replica

logger = logging.getLogger(__name__)

redis = redis_connection.get_redis()


class RouteArgs(TypedDict):
    handle: str
    slug: str


class GetTrackArgs(TypedDict, total=False):
    user_id: int
    limit: int
    offset: int
    handle: str
    id: List[int]
    current_user_id: int
    authed_user_id: Optional[int]
    min_block_number: int

    # Deprecated, prefer sort_method and sort_direction
    sort: str

    query: Optional[str]
    filter_deleted: bool
    exclude_gated: bool
    routes: List[RouteArgs]
    filter_tracks: str

    # If true, skips the filtering of unlisted tracks
    skip_unlisted_filter: Optional[bool]

    # Optional sort method for the returned results
    sort_method: Optional[SortMethod]
    sort_direction: Optional[SortDirection]


def _get_tracks(session, args):
    # Create initial query
    base_query = session.query(TrackWithAggregates)
    base_query = base_query.filter(TrackWithAggregates.is_current == True)

    # NOTE: the stem_of filter is added for content node to validate the track's owner id
    # This is a temporary fix and should be replaced with a new endpoint to fetch a track's owner id
    if not args.get("skip_stem_of_filter", False):
        base_query = base_query.filter(TrackWithAggregates.stem_of == None)

    # Filter out tracks the user is not authorized to view
    if "routes" in args and args.get("routes") is not None:
        routes = args.get("routes")
        # Join the routes table
        base_query = base_query.join(
            TrackRoute, TrackRoute.track_id == TrackWithAggregates.track_id
        )

        # Add the query conditions for each route
        filter_cond = []
        for route in routes:
            filter_cond.append(
                and_(
                    TrackRoute.slug == route["slug"],
                    TrackRoute.owner_id == route["owner_id"],
                )
            )
        base_query = base_query.filter(or_(*filter_cond))
    elif args.get("skip_unlisted_filter", False):
        pass
    else:
        current_user_id = args.get("current_user_id")
        user_id = args.get("user_id")
        authed_user_id = args.get("authed_user_id")
        is_authed_user_owner = (
            user_id is not None
            and authed_user_id is not None
            and authed_user_id == user_id
        )
        is_authed_user_manager = (
            user_id is not None
            and current_user_id is not None
            and authed_user_id is not None
            and current_user_id == user_id
            and is_active_manager(user_id, authed_user_id)
        )
        # Only return unlisted tracks if either
        # - above case, routes are present (direct links to hidden tracks)
        # - the current user is authenticated as the owner or a manager of the owner
        if not (is_authed_user_owner or is_authed_user_manager):
            base_query = base_query.filter(TrackWithAggregates.is_unlisted == False)

    # Conditionally process an array of tracks
    if "id" in args and args.get("id") is not None:
        track_id_list = args.get("id")
        try:
            # Update query with track_id list
            base_query = base_query.filter(
                TrackWithAggregates.track_id.in_(track_id_list)
            )
        except ValueError as e:
            logger.error("Invalid value found in track id list", exc_info=True)
            raise e

    # Allow filtering of tracks by a certain creator
    if args.get("user_id"):
        user_id = args.get("user_id")
        base_query = base_query.filter(TrackWithAggregates.owner_id == user_id)

    # Allow filtering of deletes
    if "filter_deleted" in args and args.get("filter_deleted") is not None:
        filter_deleted = args.get("filter_deleted")
        if filter_deleted:
            base_query = base_query.filter(TrackWithAggregates.is_delete == False)

    # Allow filtering of gated tracks
    if args.get("exclude_gated", False):
        base_query = base_query.filter(TrackWithAggregates.is_stream_gated == False)

    if "min_block_number" in args and args.get("min_block_number") is not None:
        min_block_number = args.get("min_block_number")
        base_query = base_query.filter(
            TrackWithAggregates.blocknumber >= min_block_number
        )

    if "query" in args and args.get("query") is not None:
        query = args.get("query")
        base_query = base_query.join(TrackWithAggregates.user, aliased=True).filter(
            or_(
                TrackWithAggregates.title.ilike(f"%{query.lower()}%"),
                User.name.ilike(f"%{query.lower()}%"),
            )
        )

    # Allow filtering of tracks by unlisted vs public.
    # If a user is not authorized to view unlisted tracks but has specified filter_tracks=unlisted,
    # this will filter out all results.
    if "filter_tracks" in args and args.get("filter_tracks") != "all":
        filter_tracks = args.get("filter_tracks")
        if filter_tracks == "unlisted":
            base_query = base_query.filter(TrackWithAggregates.is_unlisted == True)
        else:
            base_query = base_query.filter(TrackWithAggregates.is_unlisted == False)

    if "sort_method" in args and args.get("sort_method") is not None:
        sort_method = args.get("sort_method")
        sort_direction = args.get("sort_direction")
        sort_fn = desc if sort_direction == SortDirection.desc else asc
        if sort_method == SortMethod.title:
            base_query = base_query.order_by(
                sort_fn(TrackWithAggregates.title), TrackWithAggregates.track_id
            )
        elif sort_method == SortMethod.artist_name:
            base_query = base_query.join(
                TrackWithAggregates.user, aliased=True
            ).order_by(sort_fn(User.name), TrackWithAggregates.track_id)
        elif sort_method == SortMethod.release_date:
            base_query = base_query.order_by(
                sort_fn(
                    coalesce(
                        TrackWithAggregates.release_date,
                        TrackWithAggregates.created_at,
                    )
                ),
                TrackWithAggregates.track_id,
            )
        elif sort_method == SortMethod.plays:
            base_query = base_query.join(TrackWithAggregates.aggregate_play).order_by(
                sort_fn(AggregatePlay.count), TrackWithAggregates.track_id
            )
        elif sort_method == SortMethod.reposts:
            base_query = base_query.join(TrackWithAggregates.aggregate_track).order_by(
                sort_fn(AggregateTrack.repost_count), TrackWithAggregates.track_id
            )
        elif sort_method == SortMethod.saves:
            base_query = base_query.join(TrackWithAggregates.aggregate_track).order_by(
                sort_fn(AggregateTrack.save_count), TrackWithAggregates.track_id
            )
    else:
        # Return the user's pinned track first if there is no specified sort_method
        if "user_id" in args and args.get("user_id") is not None:
            user_id = args.get("user_id")
            pinned_track_id = (
                session.query(User.artist_pick_track_id)
                .filter(User.is_current == True, User.user_id == user_id)
                .scalar()
            )
            if pinned_track_id:
                base_query = base_query.order_by(
                    case(
                        ((TrackWithAggregates.track_id == pinned_track_id, 0),), else_=1
                    )
                )

    # Deprecated, use sort_method and sort_direction
    if "sort" in args and args.get("sort") is not None:
        if args["sort"] == "date":
            base_query = base_query.order_by(
                coalesce(
                    # This func is defined in migrations
                    TrackWithAggregates.release_date,
                    TrackWithAggregates.created_at,
                ).desc(),
                TrackWithAggregates.track_id,
            )
        elif args["sort"] == "plays":
            base_query = base_query.join(
                AggregatePlay,
                AggregatePlay.play_item_id == TrackWithAggregates.track_id,
            ).order_by(AggregatePlay.count.desc(), TrackWithAggregates.track_id)
        else:
            whitelist_params = [
                "created_at",
                "create_date",
                "release_date",
                "blocknumber",
                "track_id",
            ]
            base_query = parse_sort_param(
                base_query, TrackWithAggregates, whitelist_params, "track_id"
            )

    query_results = add_query_pagination(base_query, args["limit"], args["offset"])
    tracks = helpers.query_result_to_list(query_results.all())
    return tracks


def get_tracks(args: GetTrackArgs):
    """
    Gets tracks.
    A note on caching strategy:
        - This method is cached at two layers: at the API via the @cache decorator,
        and within this method using the shared get_unpopulated_tracks cache.

        The shared cache only works when fetching via ID, so calls to fetch tracks
        via handle, asc/desc sort, or filtering by block_number won't hit the shared cache.
        These will hit the API cache unless they have a current_user_id included.

    """
    tracks = []

    db = get_db_read_replica()
    with db.scoped_session() as session:

        def get_tracks_and_ids():
            if "handle" in args and args.get("handle") is not None:
                handle = args.get("handle")
                user = (
                    session.query(User.user_id)
                    .filter(User.handle_lc == handle.lower())
                    .first()
                )
                args["user_id"] = user.user_id

            if "routes" in args and args.get("routes") is not None:
                # Convert the handles to user_ids
                routes = args.get("routes")
                handles = [route["handle"].lower() for route in routes]
                user_id_tuples = (
                    session.query(User.user_id, User.handle_lc)
                    .filter(User.handle_lc.in_(handles), User.is_current == True)
                    .all()
                )
                user_id_map = {handle: user_id for (user_id, handle) in user_id_tuples}
                args["routes"] = []
                for route in routes:
                    if route["handle"].lower() in user_id_map:
                        args["routes"].append(
                            {
                                "slug": route["slug"],
                                "owner_id": user_id_map[route["handle"].lower()],
                            }
                        )
                # If none of the handles were found, return empty lists
                if not args["routes"]:
                    return ([], [])

            (limit, offset) = get_pagination_vars()
            args["limit"] = limit
            args["offset"] = offset

            tracks = _get_tracks(session, args)

            track_ids = list(map(lambda track: track["track_id"], tracks))

            return (tracks, track_ids)

        (tracks, track_ids) = get_tracks_and_ids()

        # bundle peripheral info into track results
        current_user_id = args.get("current_user_id")

        # remove track segments from deactivated user tracks and deleted tracks
        for track in tracks:
            if track["user"][0]["is_deactivated"] or track["is_delete"]:
                track["track_segments"] = []

        tracks = populate_track_metadata(
            session, track_ids, tracks, current_user_id, track_has_aggregates=True
        )
        tracks = add_users_to_tracks(session, tracks, current_user_id)

    return tracks
