import base64
import json
from typing import Optional

from eth_account import Account
from eth_account.messages import encode_defunct
from flask import Response, request
from flask_restx import Namespace, Resource, fields, inputs, reqparse
from flask_restx.errors import abort

from src.api.v1.helpers import (
    DescriptiveArgument,
    abort_bad_request_param,
    abort_forbidden,
    abort_not_found,
    current_user_parser,
    decode_ids_array,
    decode_with_abort,
    extend_account,
    extend_activity,
    extend_challenge_response,
    extend_favorite,
    extend_feed_item,
    extend_playlist,
    extend_purchase,
    extend_related,
    extend_supporter,
    extend_supporting,
    extend_track,
    extend_user,
    format_aggregate_monthly_plays_for_user,
    format_authorized_app,
    format_developer_app,
    format_library_filter,
    format_limit,
    format_managed_user,
    format_offset,
    format_query,
    format_sort_direction,
    format_sort_method,
    format_user_manager,
    get_current_user_id,
    get_default_max,
    make_full_response,
    make_full_response_with_related,
    make_response,
    pagination_parser,
    pagination_with_current_user_parser,
    parse_bool_param,
    success_response,
    success_response_with_related,
    track_history_parser,
    user_albums_route_parser,
    user_collections_library_parser,
    user_favorited_tracks_parser,
    user_playlists_route_parser,
    user_search_parser,
    user_track_listen_count_route_parser,
    user_tracks_library_parser,
    user_tracks_route_parser,
    verify_token_parser,
)
from src.api.v1.models.activities import (
    activity_full_model,
    activity_model,
    collection_activity_full_without_tracks_model,
    make_polymorph_activity,
    track_activity_full_model,
    track_activity_model,
)
from src.api.v1.models.comments import comment_model
from src.api.v1.models.common import favorite
from src.api.v1.models.developer_apps import authorized_app, developer_app
from src.api.v1.models.extensions.fields import NestedOneOf
from src.api.v1.models.extensions.models import WildcardModel
from src.api.v1.models.feed import user_feed_item
from src.api.v1.models.grants import managed_user, user_manager
from src.api.v1.models.playlists import (
    full_playlist_without_tracks_model,
    playlist_model,
)
from src.api.v1.models.support import (
    supporter_response,
    supporter_response_full,
    supporting_response,
    supporting_response_full,
)
from src.api.v1.models.tracks import track, track_full
from src.api.v1.models.users import (
    account_full,
    associated_wallets,
    challenge_response,
    connected_wallets,
    decoded_user_token,
    email_access,
    encoded_user_id,
    purchase,
    remixed_track_aggregate,
    sales_aggregate,
    sales_json_content,
    user_model,
    user_model_full,
    user_subscribers,
)
from src.api.v1.playlists import get_tracks_for_playlist
from src.challenges.challenge_event_bus import setup_challenge_bus
from src.exceptions import PermissionError
from src.models.users.email import EmailAccess
from src.queries.comments import get_muted_users, get_user_comments
from src.queries.download_csv import (
    DownloadPurchasesArgs,
    DownloadSalesArgs,
    DownloadWithdrawalsArgs,
    download_purchases,
    download_sales,
    download_withdrawals,
)
from src.queries.get_associated_user_id import get_associated_user_id
from src.queries.get_associated_user_wallet import get_associated_user_wallet
from src.queries.get_authorization import is_authorized_request
from src.queries.get_challenges import get_challenges
from src.queries.get_collection_library import (
    CollectionType,
    GetCollectionLibraryArgs,
    get_collection_library,
)
from src.queries.get_developer_apps import (
    get_developer_apps_by_user,
    get_developer_apps_with_grant_for_user,
)
from src.queries.get_feed import get_feed
from src.queries.get_follow_intersection_users import get_follow_intersection_users
from src.queries.get_followees_for_user import get_followees_for_user
from src.queries.get_followers_for_user import get_followers_for_user
from src.queries.get_managed_users import (
    GetManagedUsersArgs,
    GetUserManagersArgs,
    get_managed_users_with_grants,
    get_user_managers_with_grants,
    is_active_manager,
)
from src.queries.get_playlists import GetPlaylistsArgs, get_playlists
from src.queries.get_purchasers import (
    GetPurchasersArgs,
    get_purchasers,
    get_purchasers_count,
)
from src.queries.get_related_artists import get_related_artists
from src.queries.get_remixers import GetRemixersArgs, get_remixers, get_remixers_count
from src.queries.get_repost_feed_for_user import get_repost_feed_for_user
from src.queries.get_sales_aggregate import GetSalesAggregateArgs, get_sales_aggregate
from src.queries.get_saves import get_saves
from src.queries.get_subscribers import (
    get_subscribers_for_user,
    get_subscribers_for_users,
)
from src.queries.get_support_for_user import (
    get_support_received_by_user,
    get_support_sent_by_user,
)
from src.queries.get_top_genre_users import get_top_genre_users
from src.queries.get_top_user_track_tags import get_top_user_track_tags
from src.queries.get_top_users import get_top_users
from src.queries.get_track_library import (
    GetTrackLibraryArgs,
    LibraryFilterType,
    get_track_library,
)
from src.queries.get_tracks import GetTrackArgs, get_tracks
from src.queries.get_unclaimed_id import get_unclaimed_id
from src.queries.get_usdc_purchases import (
    GetUSDCPurchasesArgs,
    GetUSDCPurchasesCountArgs,
    get_usdc_purchases,
    get_usdc_purchases_count,
)
from src.queries.get_user_listen_counts_monthly import get_user_listen_counts_monthly
from src.queries.get_user_listening_history import (
    GetUserListeningHistoryArgs,
    get_user_listening_history,
)
from src.queries.get_user_tracks_remixed import (
    GetUserTracksRemixedArgs,
    get_user_tracks_remixed,
)
from src.queries.get_user_with_wallet import get_user_with_wallet
from src.queries.get_users import get_users
from src.queries.get_users_account import GetAccountArgs, get_account
from src.queries.query_helpers import (
    CollectionLibrarySortMethod,
    CollectionSortMethod,
    PurchaseSortMethod,
    SortDirection,
)
from src.queries.search_queries import SearchKind, search
from src.utils.auth_middleware import auth_middleware
from src.utils.db_session import get_db_read_replica
from src.utils.helpers import decode_string_id, encode_int_id
from src.utils.redis_cache import cache
from src.utils.redis_metrics import record_metrics
from src.utils.structured_logger import StructuredLogger, log_duration

from .authorization_helpers import check_authorized

logger = StructuredLogger(__name__)

ns = Namespace("users", description="User related operations")
full_ns = Namespace("users", description="Full user operations")

user_response = make_response("user_response", ns, fields.Nested(user_model))
full_user_response = make_full_response(
    "full_user_response", full_ns, fields.List(fields.Nested(user_model_full))
)

users_response = make_response(
    "users_response", ns, fields.List(fields.Nested(user_model))
)

full_users_response = make_response(
    "full_users_response", full_ns, fields.List(fields.Nested(user_model_full))
)


def get_single_user(user_id, current_user_id):
    args = {"id": [user_id], "current_user_id": current_user_id}
    users = get_users(args)
    if not users:
        abort_not_found(user_id, ns)
    user = extend_user(users[0], current_user_id)
    return success_response(user)


USER_ROUTE = "/<string:id>"


@ns.route(USER_ROUTE)
class User(Resource):
    @record_metrics
    @ns.doc(
        id="""Get User""",
        description="Gets a single user by their user ID",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.marshal_with(user_response)
    @cache(ttl_sec=5)
    def get(self, id):
        user_id = decode_with_abort(id, ns)
        return get_single_user(user_id, None)


@full_ns.route(USER_ROUTE)
class FullUser(Resource):
    @record_metrics
    @ns.doc(
        id="""Get User""",
        description="Gets a single user by their user ID",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(current_user_parser)
    @full_ns.marshal_with(full_user_response)
    @cache(ttl_sec=5)
    def get(self, id):
        user_id = decode_with_abort(id, ns)
        args = current_user_parser.parse_args()
        current_user_id = get_current_user_id(args)

        return get_single_user(user_id, current_user_id)


tracks_route_parser = current_user_parser.copy()
tracks_route_parser.add_argument(
    "id", action="append", required=False, description="The ID of the user(s)"
)


@ns.route("")
class BulkUsers(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Bulk Users""",
        description="Gets a list of users by ID",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(tracks_route_parser)
    @ns.marshal_with(users_response)
    @cache(ttl_sec=5)
    def get(self):
        args = tracks_route_parser.parse_args()
        ids = decode_ids_array(args.get("id"))
        users = get_users({"id": ids})
        if not users:
            abort_not_found(ids, ns)
        users = list(map(extend_user, users))
        return success_response(users)


@full_ns.route("")
class BulkFullUsers(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Bulk Users""",
        description="Gets a list of users by ID",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(tracks_route_parser)
    @full_ns.marshal_with(full_user_response)
    @cache(ttl_sec=5)
    def get(self):
        args = tracks_route_parser.parse_args()
        ids = decode_ids_array(args.get("id"))
        current_user_id = get_current_user_id(args)

        users = get_users({"id": ids, "current_user_id": current_user_id})
        if not users:
            abort_not_found(ids, ns)
        users = list(map(extend_user, users))
        return success_response(users)


USER_HANDLE_ROUTE = "/handle/<string:handle>"


@full_ns.route(USER_HANDLE_ROUTE)
class FullUserHandle(Resource):
    @record_metrics
    @cache(ttl_sec=5)
    def _get(self, handle):
        args = current_user_parser.parse_args()
        current_user_id = get_current_user_id(args)

        args = {"handle": handle, "current_user_id": current_user_id}
        users = get_users(args)
        if not users:
            abort_not_found(handle, ns)
        user = extend_user(users[0])
        return success_response(user)

    @full_ns.doc(
        id="""Get User by Handle""",
        description="Gets a single user by their handle",
        params={"handle": "A User handle"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(current_user_parser)
    @full_ns.marshal_with(full_user_response)
    def get(self, handle):
        return self._get(handle)


@ns.route(USER_HANDLE_ROUTE)
class UserHandle(FullUserHandle):
    @ns.doc(
        id="""Get User by Handle""",
        description="Gets a single user by their handle",
        params={"handle": "A User handle"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(current_user_parser)
    @ns.marshal_with(user_response)
    def get(self, handle):
        return super()._get(handle)


USER_TRACKS_ROUTE = "/<string:id>/tracks"

tracks_response = make_response(
    "tracks_response", ns, fields.List(fields.Nested(track))
)

listen_count = ns.model(
    "listen_count",
    {
        "trackId": fields.Integer,
        "date": fields.String,
        "listens": fields.Integer,
    },
)

monthly_aggregate_play = ns.model(
    "monthly_aggregate_play",
    {
        "totalListens": fields.Integer,
        "trackIds": fields.List(fields.Integer),
        "listenCounts": fields.List(fields.Nested(listen_count)),
    },
)

wild_month = fields.Wildcard(fields.Nested(monthly_aggregate_play, required=True))

wild_month_model = WildcardModel(
    "wild_month_model",
    {"*": wild_month},
)
ns.add_model("wild_month_model", wild_month_model)
user_track_listen_counts_response = make_response(
    "user_track_listen_counts_response",
    ns,
    fields.Nested(
        wild_month_model,
        skip_none=True,
    ),
)


@ns.route("/<string:id>/listen_counts_monthly")
class UserTrackListenCountsMonthly(Resource):
    @record_metrics
    @ns.doc(
        id="""Get User Monthly Track Listens""",
        description="""Gets the listen data for a user by month and track within a given time frame.""",
        params={
            "id": "A User ID",
        },
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(user_track_listen_count_route_parser)
    @ns.marshal_with(user_track_listen_counts_response)
    @cache(ttl_sec=5)
    def get(self, id):
        decoded_id = decode_with_abort(id, ns)
        args = user_track_listen_count_route_parser.parse_args()
        start_time = args.get("start_time")
        end_time = args.get("end_time")

        user_listen_counts = get_user_listen_counts_monthly(
            {
                "user_id": decoded_id,
                "start_time": start_time,
                "end_time": end_time,
            }
        )

        formatted_user_listen_counts = format_aggregate_monthly_plays_for_user(
            user_listen_counts
        )
        return success_response(formatted_user_listen_counts)


@ns.route(USER_TRACKS_ROUTE)
class TrackList(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Tracks by User""",
        description="""Gets the tracks created by a user using their user ID""",
        params={
            "id": "A User ID",
        },
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(user_tracks_route_parser)
    @auth_middleware(parser=user_tracks_route_parser)
    @ns.marshal_with(tracks_response)
    @cache(ttl_sec=5)
    def get(self, id, authed_user_id=None):
        decoded_id = decode_with_abort(id, ns)
        args = user_tracks_route_parser.parse_args()

        current_user_id = get_current_user_id(args)

        sort = args.get("sort", None)  # Deprecated
        offset = format_offset(args)
        limit = format_limit(args)
        query = format_query(args)
        filter_tracks = args.get("filter_tracks", "all")
        sort_method = format_sort_method(args)
        sort_direction = format_sort_direction(args)

        args = GetTrackArgs(
            user_id=decoded_id,
            authed_user_id=authed_user_id,
            current_user_id=current_user_id,
            filter_deleted=True,
            exclude_gated=True,
            sort=sort,
            limit=limit,
            offset=offset,
            query=query,
            sort_method=sort_method,
            sort_direction=sort_direction,
            # Unused
            handle=None,
            id=None,
            min_block_number=None,
            routes=None,
            filter_tracks=filter_tracks,
        )
        tracks = get_tracks(args)
        tracks = list(map(extend_track, tracks))
        return success_response(tracks)


full_tracks_response = make_full_response(
    "full_tracks", full_ns, fields.List(fields.Nested(track_full))
)


@full_ns.route(USER_TRACKS_ROUTE)
class FullTrackList(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Tracks by User""",
        description="""Gets the tracks created by a user using their user ID""",
        params={
            "id": "A User ID",
        },
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(user_tracks_route_parser)
    @auth_middleware(user_tracks_route_parser)
    @full_ns.marshal_with(full_tracks_response)
    @cache(ttl_sec=5)
    def get(self, id, authed_user_id=None):
        decoded_id = decode_with_abort(id, ns)
        args = user_tracks_route_parser.parse_args()

        current_user_id = get_current_user_id(args)

        offset = format_offset(args)
        limit = format_limit(args)
        query = format_query(args)
        filter_tracks = args.get("filter_tracks", "all")

        sort = args.get("sort", None)  # Deprecated
        sort_method = format_sort_method(args)
        sort_direction = format_sort_direction(args)
        if sort_method:
            sort = None

        args = GetTrackArgs(
            user_id=decoded_id,
            authed_user_id=authed_user_id,
            current_user_id=current_user_id,
            filter_deleted=True,
            exclude_gated=False,
            sort=sort,
            limit=limit,
            offset=offset,
            query=query,
            sort_method=sort_method,
            sort_direction=sort_direction,
            # Unused
            handle=None,
            id=None,
            min_block_number=None,
            routes=None,
            filter_tracks=filter_tracks,
        )
        tracks = get_tracks(args)
        tracks = list(map(extend_track, tracks))
        return success_response(tracks)


USER_HANDLE_TRACKS = "/handle/<string:handle>/tracks"


@full_ns.route(USER_HANDLE_TRACKS)
class HandleFullTrackList(Resource):
    @record_metrics
    @cache(ttl_sec=5)
    def _get(self, handle, authed_user_id=None):
        args = user_tracks_route_parser.parse_args()

        current_user_id = get_current_user_id(args)

        sort = args.get("sort", None)
        sort_method = format_sort_method(args)
        sort_direction = format_sort_direction(args)
        offset = format_offset(args)
        limit = format_limit(args)
        filter_tracks = args.get("filter_tracks", "all")

        args = {
            "handle": handle,
            "current_user_id": current_user_id,
            "authed_user_id": authed_user_id,
            "with_users": True,
            "filter_deleted": True,
            "sort": sort,
            "sort_method": sort_method,
            "sort_direction": sort_direction,
            "limit": limit,
            "offset": offset,
            "filter_tracks": filter_tracks,
        }
        tracks = get_tracks(args)
        tracks = list(map(extend_track, tracks))
        return success_response(tracks)

    @full_ns.doc(
        id="""Get Tracks by User Handle""",
        description="""Gets the tracks created by a user using the user's handle""",
        params={
            "handle": "A User handle",
        },
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(user_tracks_route_parser)
    @auth_middleware(user_tracks_route_parser)
    @full_ns.marshal_with(full_tracks_response)
    def get(self, handle, authed_user_id=None):
        return self._get(handle, authed_user_id)


@ns.route(USER_HANDLE_TRACKS, doc=False)
class HandleTrackList(HandleFullTrackList):
    @ns.doc(
        id="""Get Tracks by User Handle""",
        description="""Gets the tracks created by a user using the user's handle""",
        params={
            "handle": "A User handle",
        },
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(user_tracks_route_parser)
    @auth_middleware(user_tracks_route_parser)
    @ns.marshal_with(tracks_response)
    def get(self, handle, authed_user_id):
        return super()._get(handle, authed_user_id)


USER_REPOSTS_ROUTE = "/<string:id>/reposts"

reposts_response = make_response("reposts", ns, fields.List(activity_model))

full_reposts_response = make_full_response(
    "full_reposts", full_ns, fields.List(activity_full_model)
)


@ns.route(USER_REPOSTS_ROUTE)
class RepostList(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Reposts""",
        description="""Gets the given user's reposts""",
        params={
            "id": "A User ID",
        },
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(pagination_with_current_user_parser)
    @ns.marshal_with(reposts_response)
    @cache(ttl_sec=5)
    def get(self, id):
        decoded_id = decode_with_abort(id, ns)
        args = pagination_with_current_user_parser.parse_args()

        current_user_id = get_current_user_id(args)

        offset = format_offset(args)
        limit = format_limit(args)

        args = {
            "user_id": decoded_id,
            "current_user_id": current_user_id,
            "with_users": True,
            "filter_deleted": True,
            "limit": limit,
            "offset": offset,
        }
        reposts = get_repost_feed_for_user(decoded_id, args)
        activities = list(map(extend_activity, reposts))

        return success_response(activities)


@full_ns.route(USER_REPOSTS_ROUTE)
class FullRepostList(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Reposts""",
        description="""Gets the given user's reposts""",
        params={
            "id": "A User ID",
        },
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(full_reposts_response)
    @cache(ttl_sec=5)
    def get(self, id):
        decoded_id = decode_with_abort(id, ns)
        args = pagination_with_current_user_parser.parse_args()

        current_user_id = get_current_user_id(args)

        offset = format_offset(args)
        limit = format_limit(args)

        args = {
            "current_user_id": current_user_id,
            "with_users": True,
            "filter_deleted": True,
            "limit": limit,
            "offset": offset,
        }
        reposts = get_repost_feed_for_user(decoded_id, args)
        for repost in reposts:
            if "playlist_id" in repost:
                repost["tracks"] = get_tracks_for_playlist(
                    repost["playlist_id"], current_user_id
                )
        activities = list(map(extend_activity, reposts))

        return success_response(list(map(make_polymorph_activity, activities)))


REPOST_LIST_ROUTE = "/handle/<string:handle>/reposts"


@full_ns.route(REPOST_LIST_ROUTE)
class HandleFullRepostList(Resource):
    @record_metrics
    @cache(ttl_sec=5)
    def _get(self, handle):
        args = pagination_with_current_user_parser.parse_args()

        current_user_id = get_current_user_id(args)
        offset = format_offset(args)
        limit = format_limit(args)

        args = {
            "handle": handle,
            "current_user_id": current_user_id,
            "with_users": True,
            "filter_deleted": True,
            "limit": limit,
            "offset": offset,
        }
        reposts = get_repost_feed_for_user(None, args)
        for repost in reposts:
            if "playlist_id" in repost:
                repost["tracks"] = get_tracks_for_playlist(
                    repost["playlist_id"], current_user_id
                )
        activities = list(map(extend_activity, reposts))

        return success_response(list(map(make_polymorph_activity, activities)))

    @full_ns.doc(
        id="""Get Reposts by Handle""",
        description="""Gets the user's reposts by the user handle""",
        params={
            "handle": "A User handle",
        },
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(full_reposts_response)
    def get(self, handle):
        return self._get(handle)


@ns.route(REPOST_LIST_ROUTE, doc=False)
class HandleRepostList(HandleFullRepostList):
    @ns.doc(
        id="""Get Reposts by Handle""",
        description="""Gets the user's reposts by the user handle""",
        params={
            "handle": "A User handle",
        },
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(pagination_with_current_user_parser)
    @ns.marshal_with(reposts_response)
    def get(self, handle):
        return super()._get(handle)


tags_route_parser = pagination_with_current_user_parser.copy()
tags_route_parser.remove_argument("offset")
tags_response = make_response("tags_response", ns, fields.List(fields.String))


@ns.route("/<string:id>/tags")
class MostUsedTags(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Top Track Tags""",
        description="""Gets the most used track tags by a user.""",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(tags_route_parser)
    @ns.marshal_with(tags_response)
    @cache(ttl_sec=60 * 5)
    def get(self, id):
        """Fetch most used tags in a user's tracks."""
        decoded_id = decode_with_abort(id, ns)
        args = tags_route_parser.parse_args()
        limit = format_limit(args)
        tags = get_top_user_track_tags({"user_id": decoded_id, "limit": limit})
        return success_response(tags)


favorites_response = make_response(
    "favorites_response", ns, fields.List(fields.Nested(favorite))
)
track_library_full_response = make_full_response(
    "track_library_response_full",
    full_ns,
    fields.List(fields.Nested(track_activity_full_model)),
)

collection_library_full_response = make_full_response(
    "collection_library_response_full",
    full_ns,
    fields.List(fields.Nested(collection_activity_full_without_tracks_model)),
)


# different route from /<string:id>/favorites/tracks
@ns.route("/<string:id>/favorites")
class FavoritedTracks(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Favorites""",
        description="""Gets a user's favorite tracks""",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.marshal_with(favorites_response)
    @cache(ttl_sec=5)
    def get(self, id):
        decoded_id = decode_with_abort(id, ns)
        favorites = get_saves("tracks", decoded_id)
        favorites = list(map(extend_favorite, favorites))
        return success_response(favorites)


USER_PLAYLISTS_ROUTE = "/<string:id>/playlists"


playlists_response_full = make_full_response(
    "playlists_response_full",
    full_ns,
    fields.List(fields.Nested(full_playlist_without_tracks_model)),
)


@full_ns.route(USER_PLAYLISTS_ROUTE)
class PlaylistsFull(Resource):
    def _get(self, id, authed_user_id):
        decoded_id = decode_with_abort(id, ns)
        args = user_playlists_route_parser.parse_args()

        current_user_id = get_current_user_id(args)
        if current_user_id and not is_authorized_request(current_user_id):
            abort(403, message="You are not authorized to access this resource")

        offset = format_offset(args)
        limit = format_limit(args)
        sort_method = args.get("sort_method", CollectionSortMethod.recent)
        query = format_query(args)

        args = GetPlaylistsArgs(
            user_id=decoded_id,
            authed_user_id=authed_user_id,
            current_user_id=current_user_id,
            filter_deleted=True,
            limit=limit,
            offset=offset,
            kind="Playlist",
            sort_method=sort_method,
            query=query,
        )
        playlists = get_playlists(args)
        playlists = list(map(extend_playlist, playlists))
        return success_response(playlists)

    @full_ns.doc(
        id="""Get Playlists by User""",
        description="""Gets the playlists created by a user using their user ID""",
        params={
            "id": "A User ID",
        },
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(user_playlists_route_parser)
    @auth_middleware(user_playlists_route_parser)
    @full_ns.marshal_with(playlists_response_full)
    def get(self, id, authed_user_id=None):
        return self._get(id, authed_user_id)


playlists_response = make_response(
    "playlists_response", ns, fields.List(fields.Nested(playlist_model))
)


@ns.route(USER_PLAYLISTS_ROUTE)
class Playlists(PlaylistsFull):
    @record_metrics
    @ns.doc(
        id="""Get Playlists by User""",
        description="""Gets the playlists created by a user using their user ID""",
        params={
            "id": "A User ID",
        },
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(user_playlists_route_parser)
    @auth_middleware(parser=user_playlists_route_parser)
    @ns.marshal_with(playlists_response)
    @cache(ttl_sec=5)
    def get(self, id, authed_user_id=None):
        return super()._get(id, authed_user_id)


USER_ALBUMS_ROUTE = "/<string:id>/albums"


albums_response_full = make_full_response(
    "albums_response_full",
    full_ns,
    fields.List(fields.Nested(full_playlist_without_tracks_model)),
)


@full_ns.route(USER_ALBUMS_ROUTE)
class AlbumsFull(Resource):
    def _get(self, id, authed_user_id):
        decoded_id = decode_with_abort(id, ns)
        args = user_albums_route_parser.parse_args()

        current_user_id = get_current_user_id(args)
        if current_user_id and not is_authorized_request(current_user_id):
            abort(403, message="You are not authorized to access this resource")

        offset = format_offset(args)
        limit = format_limit(args)
        sort_method = args.get("sort_method", CollectionSortMethod.recent)
        query = format_query(args)

        args = GetPlaylistsArgs(
            user_id=decoded_id,
            authed_user_id=authed_user_id,
            current_user_id=current_user_id,
            filter_deleted=True,
            limit=limit,
            offset=offset,
            kind="Album",
            sort_method=sort_method,
            query=query,
        )
        albums = get_playlists(args)
        albums = list(map(extend_playlist, albums))
        return success_response(albums)

    @full_ns.doc(
        id="""Get Albums by User""",
        description="""Gets the albums created by a user using their user ID""",
        params={
            "id": "A User ID",
        },
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(user_albums_route_parser)
    @auth_middleware(parser=user_albums_route_parser)
    @full_ns.marshal_with(albums_response_full)
    def get(self, id, authed_user_id=None):
        return self._get(id, authed_user_id)


albums_response = make_response(
    "albums_response", ns, fields.List(fields.Nested(playlist_model))
)


@ns.route(USER_ALBUMS_ROUTE)
class Albums(AlbumsFull):
    @record_metrics
    @ns.doc(
        id="""Get Albums by User""",
        description="""Gets the albums created by a user using their user ID""",
        params={
            "id": "A User ID",
        },
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(user_albums_route_parser)
    @auth_middleware(parser=user_albums_route_parser)
    @ns.marshal_with(albums_response)
    @cache(ttl_sec=5)
    def get(self, id, authed_user_id=None):
        return super()._get(id, authed_user_id)


USER_TRACKS_LIBRARY_ROUTE = "/<string:id>/library/tracks"
USER_PLAYLISTS_LIBRARY_ROUTE = "/<string:id>/library/playlists"
USER_ALBUMS_LIBRARY_ROUTE = "/<string:id>/library/albums"


@full_ns.route(USER_TRACKS_LIBRARY_ROUTE)
class UserTracksLibraryFull(Resource):
    @record_metrics
    @full_ns.doc(
        id="Get User Library Tracks",
        description="Gets a user's saved/reposted/purchased/all tracks",
        params={"id": "A user ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(user_tracks_library_parser)
    @auth_middleware(user_tracks_library_parser, require_auth=True)
    @full_ns.marshal_with(track_library_full_response)
    @cache(ttl_sec=5)
    def get(self, id: str, authed_user_id: int):
        """Fetch a user's full library tracks."""
        args = user_tracks_library_parser.parse_args()
        decoded_id = decode_with_abort(id, ns)
        check_authorized(decoded_id, authed_user_id)

        offset = format_offset(args)
        limit = format_limit(args)
        query = format_query(args)
        sort_method = format_sort_method(args)
        sort_direction = format_sort_direction(args)
        filter_type = format_library_filter(args)

        get_tracks_args = GetTrackLibraryArgs(
            filter_deleted=True,
            user_id=decoded_id,
            current_user_id=decoded_id,
            limit=limit,
            offset=offset,
            query=query,
            sort_method=sort_method,
            sort_direction=sort_direction,
            filter_type=filter_type,
        )
        library_tracks = get_track_library(get_tracks_args)
        tracks = list(map(extend_activity, library_tracks))
        return success_response(tracks)


def get_user_collections(id: str, collection_type: CollectionType, authed_user_id: int):
    """Fetches albums or playlists from a user's library"""
    args = user_collections_library_parser.parse_args()
    decoded_id = decode_with_abort(id, ns)
    check_authorized(decoded_id, authed_user_id)

    offset = format_offset(args)
    limit = format_limit(args)
    query = format_query(args)
    filter_type = format_library_filter(args)
    sort_method: Optional[CollectionLibrarySortMethod] = args.get("sort_method")
    sort_direction = format_sort_direction(args)

    get_collection_args = GetCollectionLibraryArgs(
        user_id=decoded_id,
        collection_type=collection_type,
        limit=limit,
        offset=offset,
        query=query,
        filter_type=filter_type,
        sort_direction=sort_direction,
        sort_method=sort_method,
        filter_deleted=True,
    )
    library_collections = get_collection_library(get_collection_args)
    collections = list(map(extend_activity, library_collections))
    return success_response(collections)


@full_ns.route(USER_PLAYLISTS_LIBRARY_ROUTE)
class UserPlaylistsLibraryFull(Resource):
    @record_metrics
    @full_ns.doc(
        id="Get User Library Playlists",
        description="Gets a user's saved/reposted/purchased/all playlists",
        params={"id": "A user ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(user_collections_library_parser)
    @auth_middleware(user_collections_library_parser, require_auth=True)
    @full_ns.marshal_with(collection_library_full_response)
    @cache(ttl_sec=5)
    def get(self, id: str, authed_user_id: int):
        """Fetch a user's full library playlists."""
        return get_user_collections(id, CollectionType.playlist, authed_user_id)


@full_ns.route(USER_ALBUMS_LIBRARY_ROUTE)
class UserAlbumsLibraryFull(Resource):
    @record_metrics
    @full_ns.doc(
        id="Get User Library Albums",
        description="Gets a user's saved/reposted/purchased/all albums",
        params={"id": "A user ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(user_collections_library_parser)
    @auth_middleware(user_collections_library_parser, require_auth=True)
    @full_ns.marshal_with(collection_library_full_response)
    @cache(ttl_sec=5)
    def get(self, id: str, authed_user_id: int):
        """Fetch a user's full library playlists."""
        return get_user_collections(id, CollectionType.album, authed_user_id)


USER_FAVORITED_TRACKS_ROUTE = "/<string:id>/favorites/tracks"


@full_ns.route(USER_FAVORITED_TRACKS_ROUTE)
class UserFavoritedTracksFull(Resource):
    @record_metrics
    @cache(ttl_sec=5)
    def _get(self, id):
        """Fetch favorited tracks for a user."""
        args = user_favorited_tracks_parser.parse_args()
        decoded_id = decode_with_abort(id, ns)
        current_user_id = get_current_user_id(args)

        offset = format_offset(args)
        limit = format_limit(args)
        query = format_query(args)
        sort_method = format_sort_method(args)
        sort_direction = format_sort_direction(args)
        get_tracks_args = GetTrackLibraryArgs(
            filter_deleted=False,
            user_id=decoded_id,
            current_user_id=current_user_id,
            limit=limit,
            offset=offset,
            query=query,
            sort_method=sort_method,
            sort_direction=sort_direction,
            filter_type=LibraryFilterType.favorite,
        )
        track_saves = get_track_library(get_tracks_args)
        tracks = list(map(extend_activity, track_saves))
        return success_response(tracks)

    @full_ns.doc(
        id="""Get Favorites""",
        description="""Gets a user's favorite tracks""",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(user_favorited_tracks_parser)
    @full_ns.marshal_with(track_library_full_response)
    def get(self, id):
        return self._get(id)


@ns.route("/<string:id>/favorites/albums", doc=False)
class FavoritedAlbums(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Favorite Albums""",
        description="""Gets a user's favorite albums""",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.marshal_with(favorites_response)
    @cache(ttl_sec=5)
    def get(self, id):
        decoded_id = decode_with_abort(id, ns)
        favorites = get_saves("albums", decoded_id)
        favorites = list(map(extend_favorite, favorites))
        return success_response(favorites)


@ns.route("/<string:id>/favorites/playlists", doc=False)
class FavoritedPlaylists(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Favorite Playlists""",
        description="""Gets a user's favorite playlists""",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.marshal_with(favorites_response)
    @cache(ttl_sec=5)
    def get(self, id):
        decoded_id = decode_with_abort(id, ns)
        favorites = get_saves("playlists", decoded_id)
        favorites = list(map(extend_favorite, favorites))
        return success_response(favorites)


history_response = make_response(
    "history_response", ns, fields.List(fields.Nested(track_activity_model))
)
history_response_full = make_full_response(
    "history_response_full",
    full_ns,
    fields.List(fields.Nested(track_activity_full_model)),
)

USER_HISTORY_TRACKS_ROUTE = "/<string:id>/history/tracks"


@full_ns.route(USER_HISTORY_TRACKS_ROUTE)
class TrackHistoryFull(Resource):
    @record_metrics
    @cache(ttl_sec=5)
    def _get(self, id, authed_user_id):
        args = track_history_parser.parse_args()
        decoded_id = decode_with_abort(id, ns)
        check_authorized(decoded_id, authed_user_id)

        offset = format_offset(args)
        limit = format_limit(args)
        query = format_query(args)
        sort_method = format_sort_method(args)
        sort_direction = format_sort_direction(args)
        get_tracks_args = GetUserListeningHistoryArgs(
            user_id=decoded_id,
            limit=limit,
            offset=offset,
            query=query,
            sort_method=sort_method,
            sort_direction=sort_direction,
        )
        track_history = get_user_listening_history(get_tracks_args)
        tracks = list(map(extend_activity, track_history))
        return success_response(tracks)

    @full_ns.doc(
        id="""Get User's Track History""",
        description="""Get the tracks the user recently listened to.""",
        params={"id": "A User ID"},
        responses={
            200: "Success",
            400: "Bad request",
            401: "Unauthorized",
            403: "Forbidden",
            500: "Server error",
        },
    )
    @full_ns.expect(track_history_parser)
    @auth_middleware(track_history_parser, require_auth=True)
    @full_ns.marshal_with(history_response_full)
    def get(self, id, authed_user_id=None):
        return self._get(id, authed_user_id)


@ns.route(USER_HISTORY_TRACKS_ROUTE, doc=False)
class TrackHistory(TrackHistoryFull):
    @ns.doc(
        id="""Get User's Track History""",
        description="""Get the tracks the user recently listened to.""",
        params={"id": "A User ID"},
        responses={
            200: "Success",
            400: "Bad request",
            401: "Unauthorized",
            403: "Forbidden",
            500: "Server error",
        },
    )
    @ns.expect(track_history_parser)
    @auth_middleware(track_history_parser, require_auth=True)
    @ns.marshal_with(history_response)
    def get(self, id, authed_user_id):
        return super()._get(id, authed_user_id)


user_search_result = make_response(
    "user_search", ns, fields.List(fields.Nested(user_model))
)


@ns.route("/search")
class UserSearchResult(Resource):
    @record_metrics
    @ns.doc(
        id="""Search Users""",
        description="""Search for users that match the given query""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(user_search_parser)
    @ns.marshal_with(user_search_result)
    @cache(ttl_sec=600)
    def get(self):
        args = user_search_parser.parse_args()
        query = args.get("query")
        genres = args.get("genre")
        limit = format_limit(args, 50, 10)
        offset = format_offset(args)
        is_verified = parse_bool_param(args.get("is_verified"))
        sort_method = args.get("sort_method")
        search_args = {
            "query": query,
            "kind": SearchKind.users.name,
            "is_auto_complete": False,
            "current_user_id": None,
            "with_users": True,
            "limit": limit,
            "offset": offset,
            "only_verified": is_verified,
            "genres": genres,
            "sort_method": sort_method,
        }
        response = search(search_args)
        return success_response(response["users"])


subscribers_response = make_response(
    "subscribers_response", ns, fields.List(fields.Nested(user_model))
)

full_subscribers_response = make_full_response(
    "full_subscribers_response", full_ns, fields.List(fields.Nested(user_model_full))
)

USER_SUBSCRIBERS_ROUTE = "/<string:id>/subscribers"


@full_ns.route(USER_SUBSCRIBERS_ROUTE)
class FullUserSubscribers(Resource):
    @record_metrics
    @cache(ttl_sec=5)
    def _get(self, id):
        decoded_id = decode_with_abort(id, full_ns)
        args = pagination_with_current_user_parser.parse_args()
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        current_user_id = get_current_user_id(args)
        args = {
            "user_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
        users = get_subscribers_for_user(args)
        users = list(map(extend_user, users))
        return success_response(users)

    @full_ns.doc(
        id="""Get Subscribers""",
        description="""All users that subscribe to the provided user""",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(full_subscribers_response)
    def get(self, id):
        return self._get(id)


@ns.route(USER_SUBSCRIBERS_ROUTE)
class UserSubscribers(FullUserSubscribers):
    @ns.doc(
        id="""Get Subscribers""",
        description="""All users that subscribe to the provided user""",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(pagination_with_current_user_parser)
    @ns.marshal_with(subscribers_response)
    def get(self, id):
        return super()._get(id)


bulk_subscribers_parser = reqparse.RequestParser(argument_class=DescriptiveArgument)
bulk_subscribers_parser.add_argument(
    "ids",
    required=True,
    action="split",
    description="User IDs to fetch subscribers for",
)
bulk_subscribers_response = make_response(
    "bulk_subscribers_response", ns, fields.List(fields.Nested(user_subscribers))
)
full_bulk_subscribers_response = make_full_response(
    "full_bulk_subscribers_response",
    full_ns,
    fields.List(fields.Nested(user_subscribers)),
)

BULK_USERS_SUBSCRIBERS_ROUTE = "/subscribers"


@full_ns.route(BULK_USERS_SUBSCRIBERS_ROUTE)
class FullBulkUsersSubscribers(Resource):
    def _get_subscribers(self, args):
        decoded_user_ids = list(
            map(lambda id: decode_with_abort(id, full_ns), args.get("ids", []))
        )
        subscribers = get_subscribers_for_users(
            {
                "user_ids": decoded_user_ids,
            }
        )
        return success_response(subscribers)

    @record_metrics
    @cache(ttl_sec=5)
    # Use POST to request subscribers for the user IDs in the JSON body.
    # Does not actually write any data.
    def _post(self):
        args = request.json
        return self._get_subscribers(args)

    @record_metrics
    @cache(ttl_sec=5)
    def _get(self):
        args = bulk_subscribers_parser.parse_args()
        return self._get_subscribers(args)

    @full_ns.doc(
        id="""Bulk Get Subscribers""",
        description="""All users that subscribe to the provided users""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(bulk_subscribers_parser)
    @full_ns.marshal_with(full_bulk_subscribers_response)
    def get(self):
        return self._get()

    @full_ns.doc(
        id="""Bulk Get Subscribers via JSON request""",
        description="""Get all users that subscribe to the users listed in the JSON request""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(bulk_subscribers_parser)
    @full_ns.marshal_with(full_bulk_subscribers_response)
    def post(self):
        return self._post()


@ns.route(BULK_USERS_SUBSCRIBERS_ROUTE, doc=False)
class BulkUsersSubscribers(FullBulkUsersSubscribers):
    @ns.doc(
        id="""Bulk Get Subscribers""",
        description="""All users that subscribe to the provided users""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(bulk_subscribers_parser)
    @ns.marshal_with(bulk_subscribers_response)
    def get(self):
        return super()._get()

    @ns.doc(
        id="""Bulk Get Subscribers via JSON request""",
        description="""Get all users that subscribe to the users listed in the JSON request""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(bulk_subscribers_parser)
    @ns.marshal_with(bulk_subscribers_response)
    def post(self):
        return super()._post()


followers_response = make_response(
    "followers_response", ns, fields.List(fields.Nested(user_model))
)
full_followers_response = make_full_response(
    "full_followers_response", full_ns, fields.List(fields.Nested(user_model_full))
)

USER_FOLLOWERS_ROUTE = "/<string:id>/followers"


@full_ns.route(USER_FOLLOWERS_ROUTE)
class FullFollowerUsers(Resource):
    @log_duration(logger)
    def _get_user_followers(self, id):
        decoded_id = decode_with_abort(id, full_ns)
        args = pagination_with_current_user_parser.parse_args()
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        current_user_id = get_current_user_id(args)
        args = {
            "followee_user_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
        users = get_followers_for_user(args)
        users = list(map(extend_user, users))
        return success_response(users)

    @full_ns.doc(
        id="""Get Followers""",
        description="""All users that follow the provided user""",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(full_followers_response)
    @cache(ttl_sec=5)
    def get(self, id):
        return self._get_user_followers(id)


@ns.route(USER_FOLLOWERS_ROUTE)
class FollowerUsers(FullFollowerUsers):
    @ns.doc(
        id="""Get Followers""",
        description="""All users that follow the provided user""",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(pagination_with_current_user_parser)
    @ns.marshal_with(followers_response)
    def get(self, id):
        return super()._get_user_followers(id)


following_response = make_response(
    "following_response", ns, fields.List(fields.Nested(user_model))
)
following_response_full = make_full_response(
    "following_response_full", full_ns, fields.List(fields.Nested(user_model_full))
)

FOLLOWING_USERS_ROUTE = "/<string:id>/following"


@full_ns.route(FOLLOWING_USERS_ROUTE)
class FullFollowingUsers(Resource):
    @record_metrics
    @cache(ttl_sec=5)
    def _get(self, id):
        decoded_id = decode_with_abort(id, full_ns)
        args = pagination_with_current_user_parser.parse_args()
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        current_user_id = get_current_user_id(args)
        args = {
            "follower_user_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
        users = get_followees_for_user(args)
        users = list(map(extend_user, users))
        return success_response(users)

    @full_ns.doc(
        id="""Get Following""",
        description="""All users that the provided user follows""",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(following_response_full)
    def get(self, id):
        return self._get(id)


@ns.route(FOLLOWING_USERS_ROUTE)
class FollowingUsers(FullFollowingUsers):
    @ns.doc(
        id="""Get Following""",
        description="""All users that the provided user follows""",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(pagination_with_current_user_parser)
    @ns.marshal_with(following_response)
    def get(self, id):
        return super()._get(id)


mutual_followers_response = make_response(
    "mutual_followers_response", ns, fields.List(fields.Nested(user_model))
)
full_mutual_followers_response = make_full_response(
    "full_mutual_followers_response",
    full_ns,
    fields.List(fields.Nested(user_model_full)),
)

USER_MUTUAL_FOLLOWERS_ROUTE = "/<string:id>/mutuals"


@full_ns.route(USER_MUTUAL_FOLLOWERS_ROUTE)
class FullMutualFollowers(Resource):
    @log_duration(logger)
    def _get_user_mutual_followers(self, id):
        decoded_id = decode_with_abort(id, full_ns)
        args = pagination_with_current_user_parser.parse_args()
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        current_user_id = get_current_user_id(args)
        args = {
            "my_id": current_user_id,
            "other_user_id": decoded_id,
            "limit": limit,
            "offset": offset,
        }
        users = get_follow_intersection_users(args)
        users = list(map(extend_user, users))
        return success_response(users)

    @full_ns.doc(
        id="""Get Mutual Followers""",
        description="""Get intersection of users that follow followeeUserId and users that are followed by followerUserId""",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(full_mutual_followers_response)
    @cache(ttl_sec=5)
    def get(self, id):
        return self._get_user_mutual_followers(id)


@ns.route(USER_MUTUAL_FOLLOWERS_ROUTE)
class MutualFollowers(FullMutualFollowers):
    @ns.doc(
        id="""Get Mutual Followers""",
        description="""Get intersection of users that follow followeeUserId and users that are followed by followerUserId""",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(pagination_with_current_user_parser)
    @ns.marshal_with(mutual_followers_response)
    def get(self, id):
        return super()._get_user_mutual_followers(id)


related_artist_route_parser = pagination_with_current_user_parser.copy()
related_artist_route_parser.add_argument(
    "filter_followed",
    required=False,
    type=inputs.boolean,
    default=False,
    description="If true, filters out artists that the current user already follows",
)

related_artist_response = make_response(
    "related_artist_response", ns, fields.List(fields.Nested(user_model))
)

related_artist_response_full = make_full_response(
    "related_artist_response_full", full_ns, fields.List(fields.Nested(user_model_full))
)

USER_RELATED_ROUTE = "/<string:id>/related"


@full_ns.route(USER_RELATED_ROUTE)
class FullRelatedUsers(Resource):
    @record_metrics
    @cache(ttl_sec=5)
    def _get(self, id):
        args = related_artist_route_parser.parse_args()
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = format_offset(args)
        current_user_id = get_current_user_id(args)
        filter_followed = args.get("filter_followed", False)
        decoded_id = decode_with_abort(id, full_ns)
        users = get_related_artists(
            decoded_id, current_user_id, limit, offset, filter_followed
        )
        users = list(map(extend_user, users))
        return success_response(users)

    @full_ns.doc(
        id="""Get Related Users""",
        description="""Gets a list of users that might be of interest to followers of this user.""",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(related_artist_route_parser)
    @full_ns.marshal_with(related_artist_response_full)
    def get(self, id):
        return self._get(id)


@ns.route(USER_RELATED_ROUTE)
class RelatedUsers(FullRelatedUsers):
    @ns.doc(
        id="""Get Related Users""",
        description="""Gets a list of users that might be of interest to followers of this user.""",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(related_artist_route_parser)
    @ns.marshal_with(related_artist_response)
    def get(self, id):
        return super()._get(id)


top_genre_users_route_parser = pagination_parser.copy()
top_genre_users_route_parser.add_argument(
    "genre", required=False, action="append", description="List of Genres"
)
top_genre_users_response = make_response(
    "top_genre_users_response", ns, fields.List(fields.Nested(user_model))
)
top_genre_users_response_full = make_full_response(
    "top_genre_users_response_full",
    full_ns,
    fields.List(fields.Nested(user_model_full)),
)

TOP_GENRE_ROUTE = "/genre/top"


@full_ns.route(TOP_GENRE_ROUTE)
class FullTopGenreUsers(Resource):
    @cache(ttl_sec=60 * 60 * 1)
    def _get(self):
        args = top_genre_users_route_parser.parse_args()
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)

        get_top_genre_users_args = {
            "limit": limit,
            "offset": offset,
            "with_users": True,
        }
        if args["genre"] is not None:
            get_top_genre_users_args["genre"] = args["genre"]
        top_users = get_top_genre_users(get_top_genre_users_args)
        users = list(map(extend_user, top_users))
        return success_response(users)

    @full_ns.doc(
        id="""Get Top Users In Genre""",
        description="""Get the Top Users for a Given Genre""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(top_genre_users_route_parser)
    @full_ns.marshal_with(top_genre_users_response_full)
    def get(self):
        return self._get()


@ns.route(TOP_GENRE_ROUTE, doc=False)
class TopGenreUsers(FullTopGenreUsers):
    @ns.doc(
        id="""Get Top Users In Genre""",
        description="""Get the Top Users for a Given Genre""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(top_genre_users_route_parser)
    @ns.marshal_with(top_genre_users_response)
    def get(self):
        return super()._get()


top_users_response = make_response(
    "top_users_response", ns, fields.List(fields.Nested(user_model))
)
top_users_response_full = make_full_response(
    "top_users_response_full", full_ns, fields.List(fields.Nested(user_model_full))
)

TOP_ROUTE = "/top"


@full_ns.route(TOP_ROUTE)
class FullTopUsers(Resource):
    @cache(ttl_sec=60 * 60 * 1)
    def _get(self):
        args = pagination_with_current_user_parser.parse_args()
        current_user_id = get_current_user_id(args)

        top_users = get_top_users(current_user_id)
        users = list(map(extend_user, top_users))
        return success_response(users)

    @full_ns.doc(
        id="""Get Top Users""",
        description="""Get the Top Users having at least one track by follower count""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(top_users_response_full)
    def get(self):
        return self._get()


@ns.route(TOP_ROUTE, doc=False)
class TopUsers(FullTopUsers):
    @ns.doc(
        id="""Get Top Users""",
        description="""Get the Top Users having at least one track by follower count""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(pagination_with_current_user_parser)
    @ns.marshal_with(top_users_response)
    def get(self):
        return super()._get()


associated_wallet_route_parser = reqparse.RequestParser(
    argument_class=DescriptiveArgument
)
associated_wallet_route_parser.add_argument(
    "id", required=True, description="A User ID"
)
associated_wallet_response = make_response(
    "associated_wallets_response", ns, fields.Nested(associated_wallets)
)


@ns.deprecated
@ns.route(
    "/associated_wallets",
    doc=False,
)
class AssociatedWalletByUserId(Resource):
    @log_duration(logger)
    def _get_associated_wallets(self):
        args = associated_wallet_route_parser.parse_args()
        user_id = decode_with_abort(args.get("id"), ns)
        wallets = get_associated_user_wallet({"user_id": user_id})
        return success_response(
            {"wallets": wallets["eth"], "sol_wallets": wallets["sol"]}
        )

    @ns.doc(
        id="""Get Associated Wallets""",
        description="""Get the User's associated wallets""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(associated_wallet_route_parser)
    @ns.marshal_with(associated_wallet_response)
    @cache(ttl_sec=10)
    def get(self):
        return self._get_associated_wallets()


user_associated_wallet_route_parser = reqparse.RequestParser(
    argument_class=DescriptiveArgument
)
user_associated_wallet_route_parser.add_argument(
    "associated_wallet", required=True, description="Wallet address"
)
user_associated_wallet_response = make_response(
    "user_associated_wallet_response", ns, fields.Nested(encoded_user_id)
)


@ns.route("/id")
class UserIdByAssociatedWallet(Resource):
    @ns.doc(
        id="""Get User ID from Wallet""",
        description="""Gets a User ID from an associated wallet address""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(user_associated_wallet_route_parser)
    @ns.marshal_with(user_associated_wallet_response)
    @cache(ttl_sec=10)
    def get(self):
        args = user_associated_wallet_route_parser.parse_args()
        user_id = get_associated_user_id({"wallet": args.get("associated_wallet")})
        return success_response(
            {"user_id": encode_int_id(user_id) if user_id else None}
        )


user_account_parser = reqparse.RequestParser(argument_class=DescriptiveArgument)
user_account_response_full = make_response(
    "user_account_response_full", full_ns, fields.Nested(account_full)
)

USER_ACCOUNT_ROUTE = "/account/<string:wallet>"


@full_ns.route(USER_ACCOUNT_ROUTE)
class FullUserAccount(Resource):
    @record_metrics
    @log_duration(logger)
    def _get(self, wallet, authed_user_id):
        try:
            result = get_account(
                GetAccountArgs(wallet=wallet, authed_user_id=authed_user_id)
            )
            if result is None:
                abort_not_found(wallet, full_ns)
            return success_response(extend_account(result))
        except PermissionError:
            abort_forbidden(full_ns)

    @full_ns.doc(
        id="""Get User Account""",
        description="Gets the account for a given user",
        params={"wallet": "Wallet address for the account"},
        responses={
            200: "Success",
            401: "Unauthorized",
            403: "Forbidden",
            404: "Not Found",
            500: "Server error",
        },
    )
    @full_ns.expect(user_account_parser)
    @full_ns.marshal_with(user_account_response_full)
    @auth_middleware(user_account_parser, require_auth=True)
    def get(self, wallet, authed_user_id):
        return self._get(wallet, authed_user_id)


connected_wallets_response = make_response(
    "connected_wallets_response", ns, fields.Nested(connected_wallets)
)


@ns.route("/<string:id>/connected_wallets")
class ConnectedWallets(Resource):
    @ns.doc(
        id="""Get connected wallets""",
        description="""Get the User's ERC and SPL connected wallets""",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.marshal_with(connected_wallets_response)
    def get(self, id):
        decoded_id = decode_with_abort(id, full_ns)
        wallets = get_associated_user_wallet({"user_id": decoded_id})
        return success_response(
            {"erc_wallets": wallets["eth"], "spl_wallets": wallets["sol"]}
        )


get_challenges_route_parser = reqparse.RequestParser(argument_class=DescriptiveArgument)
get_challenges_route_parser.add_argument(
    "show_historical",
    required=False,
    type=bool,
    default=False,
    description="Whether to show challenges that are inactive but completed",
)
get_challenges_response = make_response(
    "get_challenges", ns, fields.List(fields.Nested(challenge_response))
)


@ns.route("/<string:id>/challenges")
class GetChallenges(Resource):
    @ns.doc(
        id="""Get User Challenges""",
        description="""Gets all challenges for the given user""",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(get_challenges_route_parser)
    @ns.marshal_with(get_challenges_response)
    @cache(ttl_sec=5)
    def get(self, id: str):
        args = get_challenges_route_parser.parse_args()
        show_historical = args.get("show_historical")
        decoded_id = decode_with_abort(id, ns)
        db = get_db_read_replica()

        with db.scoped_session() as session:
            bus = setup_challenge_bus()
            challenges = get_challenges(decoded_id, show_historical, session, bus)
            challenges = list(map(extend_challenge_response, challenges))

            return success_response(challenges)


get_supporters_response = make_response(
    "get_supporters", ns, fields.List(fields.Nested(supporter_response))
)

USER_SUPPORTERS_ROUTE = "/<string:id>/supporters"


@ns.route(USER_SUPPORTERS_ROUTE)
class GetSupporters(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Supporters""",
        description="""Gets the supporters of the given user""",
        params={"id": "A User ID"},
    )
    @ns.expect(pagination_parser)
    @ns.marshal_with(get_supporters_response)
    @cache(ttl_sec=5)
    def get(self, id: str):
        args = pagination_parser.parse_args()
        decoded_id = decode_with_abort(id, ns)
        args["user_id"] = decoded_id
        support = get_support_received_by_user(args)
        support = list(map(extend_supporter, support))
        return success_response(support)


full_get_supporters_response = make_full_response(
    "full_get_supporters", full_ns, fields.List(fields.Nested(supporter_response_full))
)


@full_ns.route(USER_SUPPORTERS_ROUTE)
class FullGetSupporters(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Supporters""",
        description="""Gets the supporters of the given user""",
        params={"id": "A User ID"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(full_get_supporters_response)
    @cache(ttl_sec=5)
    def get(self, id: str):
        return self._get_supporters(id)

    @log_duration(logger)
    def _get_supporters(self, id: str):
        args = pagination_with_current_user_parser.parse_args()
        decoded_id = decode_with_abort(id, full_ns)
        current_user_id = get_current_user_id(args)
        args["user_id"] = decoded_id
        args["current_user_id"] = current_user_id
        support = get_support_received_by_user(args)
        support = list(map(extend_supporter, support))
        return success_response(support)


get_supporter_response = make_response(
    "get_supporter", ns, fields.Nested(supporter_response)
)
full_get_supporter_response = make_full_response(
    "full_get_supporter", full_ns, fields.Nested(supporter_response_full)
)


SUPPORTER_USER_ROUTE = "/<string:id>/supporters/<string:supporter_user_id>"


@full_ns.route(SUPPORTER_USER_ROUTE)
class FullGetSupporter(Resource):
    @record_metrics
    @cache(ttl_sec=5)
    def _get(self, id: str, supporter_user_id: str):
        args = current_user_parser.parse_args()
        decoded_id = decode_with_abort(id, full_ns)
        current_user_id = get_current_user_id(args)
        decoded_supporter_user_id = decode_with_abort(supporter_user_id, full_ns)
        args["user_id"] = decoded_id
        args["current_user_id"] = current_user_id
        args["supporter_user_id"] = decoded_supporter_user_id
        support = get_support_received_by_user(args)
        support = list(map(extend_supporter, support))
        if not support:
            abort_not_found(supporter_user_id, full_ns)
        return success_response(support[0])

    @full_ns.doc(
        id="""Get Supporter""",
        description="""Gets the specified supporter of the given user""",
        params={"id": "A User ID", "supporter_user_id": "A User ID of a supporter"},
    )
    @full_ns.expect(current_user_parser)
    @full_ns.marshal_with(full_get_supporter_response)
    def get(self, id: str, supporter_user_id: str):
        return self._get(id, supporter_user_id)


@ns.route(SUPPORTER_USER_ROUTE, doc=False)
class GetSupporter(FullGetSupporter):
    @ns.doc(
        id="""Get Supporter""",
        description="""Gets the specified supporter of the given user""",
        params={"id": "A User ID", "supporter_user_id": "A User ID of a supporter"},
    )
    @ns.expect(current_user_parser)
    @ns.marshal_with(get_supporter_response)
    def get(self, id: str, supporter_user_id: str):
        return super()._get(id, supporter_user_id)


get_supporting_response = make_response(
    "get_supporting", ns, fields.Nested(supporting_response)
)
full_get_supporting_response = make_full_response(
    "full_get_supporting", full_ns, fields.Nested(supporting_response_full)
)

get_supported_users_response = make_response(
    "get_supported_users", ns, fields.List(fields.Nested(supporting_response))
)
full_get_supported_users_response = make_full_response(
    "full_get_supported_users",
    full_ns,
    fields.List(fields.Nested(supporting_response_full)),
)

GET_SUPPORTED_USERS_ROUTE = "/<string:id>/supporting"


@ns.route(GET_SUPPORTED_USERS_ROUTE)
class GetSupportedUsers(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Supported Users""",
        description="""Gets the users that the given user supports""",
        params={"id": "A User ID"},
    )
    @ns.expect(pagination_parser)
    @ns.marshal_with(get_supported_users_response)
    @cache(ttl_sec=5)
    def get(self, id: str):
        args = pagination_parser.parse_args()
        decoded_id = decode_with_abort(id, ns)
        args["user_id"] = decoded_id
        support = get_support_sent_by_user(args)
        support = list(map(extend_supporting, support))
        return success_response(support)


@full_ns.route(GET_SUPPORTED_USERS_ROUTE)
class FullGetSupportedUsers(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Supported Users""",
        description="""Gets the users that the given user supports""",
        params={"id": "A User ID"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(full_get_supported_users_response)
    @cache(ttl_sec=5)
    def get(self, id: str):
        return self._get_supported_users(id)

    @log_duration(logger)
    def _get_supported_users(self, id: str):
        args = pagination_with_current_user_parser.parse_args()
        decoded_id = decode_with_abort(id, full_ns)
        current_user_id = get_current_user_id(args)
        args["user_id"] = decoded_id
        args["current_user_id"] = current_user_id
        support = get_support_sent_by_user(args)
        support = list(map(extend_supporting, support))
        return success_response(support)


GET_SUPPORTING_ROUTE = "/<string:id>/supporting/<string:supported_user_id>"


@full_ns.route(GET_SUPPORTING_ROUTE)
class FullGetSupporting(Resource):
    @record_metrics
    @cache(ttl_sec=5)
    def _get(self, id: str, supported_user_id: str):
        args = current_user_parser.parse_args()
        decoded_id = decode_with_abort(id, full_ns)
        current_user_id = get_current_user_id(args)
        decoded_supported_user_id = decode_with_abort(supported_user_id, full_ns)
        args["user_id"] = decoded_id
        args["current_user_id"] = current_user_id
        args["supported_user_id"] = decoded_supported_user_id
        support = get_support_sent_by_user(args)
        if not support:
            abort_not_found(decoded_id, full_ns)
        support = extend_supporting(support[0])

        return success_response(support)

    @full_ns.doc(
        id="""Get Supporting""",
        description="""Gets the support from the given user to the supported user""",
        params={
            "id": "A User ID",
            "supported_user_id": "A User ID of a supported user",
        },
    )
    @full_ns.expect(current_user_parser)
    @full_ns.marshal_with(full_get_supporting_response)
    def get(self, id: str, supported_user_id: str):
        return self._get(id, supported_user_id)


@ns.route(GET_SUPPORTING_ROUTE, doc=False)
class GetSupporting(FullGetSupporting):
    @ns.doc(
        id="""Get Supporting""",
        description="""Gets the support from the given user to the supported user""",
        params={
            "id": "A User ID",
            "supported_user_id": "A User ID of a supported user",
        },
    )
    @ns.expect(current_user_parser)
    @ns.marshal_with(get_supporting_response)
    def get(self, id: str, supported_user_id: str):
        return super()._get(id, supported_user_id)


verify_token_response = make_response(
    "verify_token", ns, fields.Nested(decoded_user_token)
)


@ns.route("/verify_token")
class GetTokenVerification(Resource):
    @record_metrics
    @ns.doc(
        id="""Verify ID Token""",
        description="""Verify if the given jwt ID token was signed by the subject (user) in the payload""",
        responses={
            200: "Success",
            400: "Bad input",
            404: "ID token not valid",
            500: "Server error",
        },
    )
    @ns.expect(verify_token_parser)
    @ns.marshal_with(verify_token_response)
    def get(self):
        args = verify_token_parser.parse_args()
        # 1. Break JWT into parts
        token_parts = args["token"].split(".")
        if not len(token_parts) == 3:
            abort_bad_request_param("token", ns)

        # 2. Decode the signature
        try:
            signature = base64.urlsafe_b64decode(token_parts[2] + "==")
        except Exception:
            ns.abort(400, "The JWT signature could not be decoded.")

        signature = signature.decode()
        base64_header = token_parts[0]
        base64_payload = token_parts[1]
        message = f"{base64_header}.{base64_payload}"

        wallet = None
        encoded_message = encode_defunct(text=message)
        try:
            wallet = Account.recover_message(
                encoded_message,
                signature=signature,
            )
        except Exception:
            ns.abort(
                404, "The JWT signature is invalid - wallet could not be recovered."
            )
        if not wallet:
            ns.abort(
                404, "The JWT signature is invalid - wallet could not be recovered."
            )

        # 4. Check that user from payload matches the user from the wallet from the signature
        try:
            stringified_payload = base64.urlsafe_b64decode(base64_payload + "==")
            payload = json.loads(stringified_payload)
        except Exception:
            ns.abort(400, "JWT payload could not be decoded.")

        wallet_user_id = get_user_with_wallet(wallet)
        jwt_user_id = decode_string_id(payload["userId"])

        if not wallet_user_id:
            ns.abort(404, "The JWT signature is invalid - invalid wallet")

        # If the user id found in the token does not match the signer of the token,
        # check if the signing user is a manager of that user. Otherwise, reject.
        if wallet_user_id != jwt_user_id:
            if not is_active_manager(jwt_user_id, wallet_user_id):
                ns.abort(
                    403,
                    "The JWT signature is invalid - the wallet does not match the user.",
                )

        # 5. Send back the decoded payload
        return success_response(payload)


@ns.route("/unclaimed_id", doc=False)
class GetUnclaimedUserId(Resource):
    @ns.doc(
        id="""Get unclaimed user ID""",
        description="""Gets an unclaimed blockchain user ID""",
    )
    def get(self):
        unclaimed_id = get_unclaimed_id("user")
        return success_response(unclaimed_id)


developer_apps_response = make_response(
    "developer_apps", ns, fields.List(fields.Nested(developer_app))
)


@ns.route("/<string:id>/developer_apps")
class DeveloperApps(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Developer Apps""",
        description="""Gets the developer apps that the user owns""",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.marshal_with(developer_apps_response)
    def get(self, id):
        decoded_id = decode_with_abort(id, ns)
        developer_apps = get_developer_apps_by_user(decoded_id)
        developer_apps = list(map(format_developer_app, developer_apps))
        return success_response(developer_apps)


authorized_apps_response = make_response(
    "authorized_apps", ns, fields.List(fields.Nested(authorized_app))
)


@ns.route("/<string:id>/authorized_apps")
class AuthorizedApps(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Authorized Apps""",
        description="""Get the apps that user has authorized to write to their account""",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.marshal_with(authorized_apps_response)
    def get(self, id):
        decoded_id = decode_with_abort(id, ns)
        authorized_apps = get_developer_apps_with_grant_for_user(decoded_id)
        authorized_apps = list(map(format_authorized_app, authorized_apps))
        return success_response(authorized_apps)


managed_users_response = make_response(
    "managed_users_response", full_ns, fields.List(fields.Nested(managed_user))
)

managed_users_route_parser = reqparse.RequestParser(argument_class=DescriptiveArgument)
managed_users_route_parser.add_argument(
    "is_approved",
    required=False,
    type=inputs.boolean,
    default=None,
    description="If true, only show users where the management request has been accepted. If false, only show those where the request was rejected. If omitted, shows all users regardless of approval status.",
)
managed_users_route_parser.add_argument(
    "is_revoked",
    required=False,
    type=inputs.boolean,
    default=False,
    description="If true, only show users where the management request has been revoked. If false, only show those with a pending or accepted request. Defaults to false.",
)


@full_ns.route("/<string:id>/managed_users")
class ManagedUsers(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Managed Users""",
        description="""Gets a list of users managed by the given user""",
        params={"id": "A user id for the manager"},
        responses={
            200: "Success",
            400: "Bad request",
            401: "Unauthorized",
            403: "Forbidden",
            500: "Server error",
        },
    )
    @full_ns.expect(managed_users_route_parser)
    @auth_middleware(managed_users_route_parser, require_auth=True)
    @full_ns.marshal_with(managed_users_response)
    def get(self, id, authed_user_id):
        user_id = decode_with_abort(id, full_ns)
        check_authorized(user_id, authed_user_id)
        args = managed_users_route_parser.parse_args()
        is_approved = args.get("is_approved", None)
        is_revoked = args.get("is_revoked", False)
        users = get_managed_users_with_grants(
            GetManagedUsersArgs(
                user_id=user_id, is_approved=is_approved, is_revoked=is_revoked
            )
        )
        users = list(map(format_managed_user, users))

        return success_response(users)


managers_response = make_response(
    "managers_response", full_ns, fields.List(fields.Nested(user_manager))
)


@full_ns.route("/<string:id>/managers")
class Managers(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Managers""",
        description="""Gets a list of users managing the given user""",
        params={"id": "An id for the managed user"},
        responses={
            200: "Success",
            400: "Bad request",
            401: "Unauthorized",
            403: "Forbidden",
            500: "Server error",
        },
    )
    @full_ns.expect(managed_users_route_parser)
    @full_ns.marshal_with(managers_response)
    def get(self, id):
        user_id = decode_with_abort(id, full_ns)

        args = managed_users_route_parser.parse_args()
        logger.debug(f"DEBUG::args: {args}")
        is_approved = args.get("is_approved", None)
        is_revoked = args.get("is_revoked", False)
        managers = get_user_managers_with_grants(
            GetUserManagersArgs(
                user_id=user_id, is_approved=is_approved, is_revoked=is_revoked
            )
        )
        managers = list(map(format_user_manager, managers))

        return success_response(managers)


purchases_and_sales_parser = pagination_with_current_user_parser.copy()
purchases_and_sales_parser.add_argument(
    "sort_method",
    required=False,
    type=str,
    choices=PurchaseSortMethod._member_names_,
    description="The sort direction",
)
purchases_and_sales_parser.add_argument(
    "sort_direction",
    required=False,
    description="The sort direction",
    type=str,
    choices=SortDirection._member_names_,
)
purchases_and_sales_parser.add_argument(
    "content_ids",
    required=False,
    description="Filters purchases by track or album IDs",
    type=str,
    action="append",
)


purchases_response = make_full_response(
    "purchases_response", full_ns, fields.List(fields.Nested(purchase))
)

purchases_count_response = make_full_response(
    "purchases_count_response", full_ns, fields.Integer()
)


@full_ns.route("/<string:id>/purchases")
class FullPurchases(Resource):
    @full_ns.doc(
        id="Get Purchases",
        description="Gets the purchases the user has made",
        params={"id": "A User ID"},
    )
    @full_ns.expect(purchases_and_sales_parser)
    @auth_middleware(purchases_and_sales_parser, require_auth=True)
    @full_ns.marshal_with(purchases_response)
    def get(self, id, authed_user_id=None):
        decoded_id = decode_with_abort(id, full_ns)
        check_authorized(decoded_id, authed_user_id)
        args = purchases_and_sales_parser.parse_args()
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        sort_method = args.get("sort_method", PurchaseSortMethod.date)
        sort_direction = args.get("sort_direction", None)
        content_ids = args.get("content_ids", [])
        decoded_content_ids = decode_ids_array(content_ids) if content_ids else []
        args = GetUSDCPurchasesArgs(
            buyer_user_id=decoded_id,
            limit=limit,
            offset=offset,
            sort_method=sort_method,
            sort_direction=sort_direction,
            content_ids=decoded_content_ids,
        )
        purchases = get_usdc_purchases(args)
        return success_response(list(map(extend_purchase, purchases)))


purchases_and_sales_count_parser = current_user_parser.copy()
purchases_and_sales_count_parser.add_argument(
    "content_ids",
    required=False,
    description="Filters purchases by track or album IDs",
    type=str,
    action="append",
)


@full_ns.route("/<string:id>/purchases/count")
class FullPurchasesCount(Resource):
    @full_ns.doc(
        id="Get Purchases Count",
        description="Gets the count of purchases the user has made",
        params={"id": "A User ID"},
    )
    @full_ns.expect(purchases_and_sales_count_parser)
    @auth_middleware(purchases_and_sales_count_parser)
    @full_ns.marshal_with(purchases_count_response)
    def get(self, id, authed_user_id):
        decoded_id = decode_with_abort(id, full_ns)
        args = purchases_and_sales_count_parser.parse_args()
        content_ids = args.get("content_ids", [])
        decoded_content_ids = decode_ids_array(content_ids) if content_ids else []
        args = GetUSDCPurchasesCountArgs(
            buyer_user_id=decoded_id,
            content_ids=decoded_content_ids,
        )
        count = get_usdc_purchases_count(args)
        return success_response(count)


@full_ns.route("/<string:id>/sales")
class FullSales(Resource):
    @full_ns.doc(
        id="Get Sales",
        description="Gets the sales the user has made",
        params={"id": "A User ID"},
    )
    @full_ns.expect(purchases_and_sales_parser)
    @auth_middleware(purchases_and_sales_parser)
    @full_ns.marshal_with(purchases_response)
    def get(self, id, authed_user_id):
        decoded_id = decode_with_abort(id, full_ns)
        check_authorized(decoded_id, authed_user_id)
        args = purchases_and_sales_parser.parse_args()
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        sort_method = args.get("sort_method", PurchaseSortMethod.date)
        sort_direction = args.get("sort_direction", None)
        content_ids = args.get("content_ids", [])
        decoded_content_ids = decode_ids_array(content_ids) if content_ids else []
        args = GetUSDCPurchasesArgs(
            seller_user_id=decoded_id,
            limit=limit,
            offset=offset,
            sort_method=sort_method,
            sort_direction=sort_direction,
            content_ids=decoded_content_ids,
        )
        purchases = get_usdc_purchases(args)
        return success_response(list(map(extend_purchase, purchases)))


@full_ns.route("/<string:id>/sales/count")
class FullSalesCount(Resource):
    @full_ns.doc(
        id="Get Sales Count",
        description="Gets the count of sales the user has made",
        params={"id": "A User ID"},
    )
    @full_ns.expect(purchases_and_sales_count_parser)
    @auth_middleware(purchases_and_sales_count_parser)
    @full_ns.marshal_with(purchases_count_response)
    def get(self, id, authed_user_id):
        decoded_id = decode_with_abort(id, full_ns)
        args = purchases_and_sales_count_parser.parse_args()
        content_ids = args.get("content_ids", [])
        decoded_content_ids = decode_ids_array(content_ids) if content_ids else []
        args = GetUSDCPurchasesCountArgs(
            seller_user_id=decoded_id,
            content_ids=decoded_content_ids,
        )
        count = get_usdc_purchases_count(args)
        return success_response(count)


sales_aggregate_parser = pagination_with_current_user_parser.copy()

sales_aggregate_response = make_response(
    "sales_aggregate_response", ns, fields.List(fields.Nested(sales_aggregate))
)


@ns.route("/<string:id>/sales/aggregate")
class SalesAggregate(Resource):
    @ns.doc(
        id="Get Sales Aggregate",
        description="Gets the aggregated sales data for the user",
        params={"id": "A User ID"},
    )
    @ns.expect(sales_aggregate_parser)
    @auth_middleware(sales_aggregate_parser, require_auth=True)
    @ns.marshal_with(sales_aggregate_response)
    def get(self, id, authed_user_id):
        decoded_id = decode_with_abort(id, ns)
        check_authorized(decoded_id, authed_user_id)
        args = sales_aggregate_parser.parse_args()
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        args = GetSalesAggregateArgs(
            seller_user_id=decoded_id,
            limit=limit,
            offset=offset,
        )
        sales_aggregate = get_sales_aggregate(args)
        return success_response(list(sales_aggregate))


purchases_download_parser = current_user_parser.copy()


@ns.route("/<string:id>/purchases/download")
class PurchasesDownload(Resource):
    @ns.doc(
        id="Download Purchases as CSV",
        description="Downloads the purchases the user has made as a CSV file",
        params={"id": "A User ID"},
    )
    @ns.produces(["text/csv"])
    @ns.expect(purchases_download_parser)
    @auth_middleware(purchases_download_parser, require_auth=True)
    def get(self, id, authed_user_id):
        decoded_id = decode_with_abort(id, ns)
        check_authorized(decoded_id, authed_user_id)
        args = DownloadPurchasesArgs(buyer_user_id=decoded_id)
        purchases = download_purchases(args)
        response = Response(purchases, content_type="text/csv")
        response.headers["Content-Disposition"] = "attachment; filename=purchases.csv"
        return response


sales_download_parser = current_user_parser.copy()


@ns.route("/<string:id>/sales/download")
class SalesDownload(Resource):
    @ns.doc(
        id="Download Sales as CSV",
        description="Downloads the sales the user has made as a CSV file",
        params={"id": "A User ID"},
    )
    @ns.produces(["text/csv"])
    @ns.expect(sales_download_parser)
    @auth_middleware(sales_download_parser, require_auth=True)
    def get(self, id, authed_user_id):
        decoded_id = decode_with_abort(id, ns)
        check_authorized(decoded_id, authed_user_id)

        download_args = DownloadSalesArgs(seller_user_id=decoded_id)
        sales = download_sales(download_args, return_json=False)

        response = Response(sales, content_type="text/csv")
        response.headers["Content-Disposition"] = "attachment; filename=sales.csv"
        return response


sales_json_response = make_response(
    "sales_json_response", ns, fields.Nested(sales_json_content)
)

sales_download_parser = current_user_parser.copy()
sales_download_parser.add_argument(
    "grantee_user_id",
    required=False,
    description="Optional receiving user ID for email decryption",
    type=str,
)


@ns.route("/<string:id>/sales/download/json")
class SalesDownloadJSON(Resource):
    @ns.doc(
        id="Download Sales as JSON",
        description="Gets the sales data for the user in JSON format",
        params={"id": "A User ID"},
    )
    @ns.produces(["application/json"])
    @ns.expect(sales_download_parser)
    @ns.marshal_with(sales_json_response)
    @auth_middleware(sales_download_parser, require_auth=True)
    def get(self, id, authed_user_id):
        decoded_id = decode_with_abort(id, ns)
        check_authorized(decoded_id, authed_user_id)

        args = sales_download_parser.parse_args()
        grantee_user_id = (
            decode_with_abort(args.get("grantee_user_id"), ns)
            if args.get("grantee_user_id")
            else None
        )

        download_args = DownloadSalesArgs(
            seller_user_id=decoded_id, grantee_user_id=grantee_user_id
        )
        sales = download_sales(download_args, return_json=True)
        return success_response(sales)


withdrawals_download_parser = current_user_parser.copy()


@ns.route("/<string:id>/withdrawals/download")
class WithdrawalsDownload(Resource):
    @ns.doc(
        id="""Download USDC Withdrawals as CSV""",
        description="""Downloads the USDC withdrawals the user has made as a CSV file""",
        params={"id": "A User ID"},
    )
    @ns.produces(["text/csv"])
    @ns.expect(withdrawals_download_parser)
    @auth_middleware(withdrawals_download_parser, require_auth=True)
    def get(self, id, authed_user_id):
        decoded_id = decode_with_abort(id, ns)
        check_authorized(decoded_id, authed_user_id)
        args = DownloadWithdrawalsArgs(user_id=decoded_id)
        withdrawals = download_withdrawals(args)
        response = Response(withdrawals, content_type="text/csv")
        response.headers["Content-Disposition"] = "attachment; filename=withdrawals.csv"
        return response


remixers_parser = pagination_with_current_user_parser.copy()
remixers_parser.add_argument(
    "track_id",
    required=False,
    description="Filters for remixers who have remixed the given track ID",
    type=str,
)
remixers_reponse = make_response(
    "remixers_response", ns, fields.List(fields.Nested(user_model))
)
full_remixers_reponse = make_full_response(
    "full_remixers_response", full_ns, fields.List(fields.Nested(user_model_full))
)
remixers_count_response = make_full_response(
    "remixers_count_response", full_ns, fields.Integer()
)

USER_REMIXERS_ROUTE = "/<string:id>/remixers"


@full_ns.route(USER_REMIXERS_ROUTE)
class FullRemixersUsers(Resource):
    @log_duration(logger)
    def _get_user_remixers(self, id):
        decoded_id = decode_with_abort(id, full_ns)
        args = remixers_parser.parse_args()
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        current_user_id = get_current_user_id(args)
        track_id = args.get("track_id")
        decoded_track_id = decode_with_abort(track_id, full_ns) if track_id else None
        args = GetRemixersArgs(
            remixee_user_id=decoded_id,
            current_user_id=current_user_id,
            track_id=decoded_track_id,
            limit=limit,
            offset=offset,
        )
        remixers = get_remixers(args)
        users = list(map(extend_user, remixers))
        return success_response(users)

    @full_ns.doc(
        id="""Get remixers""",
        description="Gets the list of unique users who have remixed tracks by the given user, or a specific track by that user if provided",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(remixers_parser)
    @full_ns.marshal_with(full_remixers_reponse)
    @cache(ttl_sec=5)
    def get(self, id):
        return self._get_user_remixers(id)


@ns.route(USER_REMIXERS_ROUTE)
class RemixersUsers(FullRemixersUsers):
    @ns.doc(
        id="""Get remixers""",
        description="Gets the list of unique users who have remixed tracks by the given user, or a specific track by that user if provided",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(remixers_parser)
    @ns.marshal_with(remixers_reponse)
    def get(self, id):
        return super()._get_user_remixers(id)


remixers_parser = current_user_parser.copy()
remixers_parser.add_argument(
    "track_id",
    required=False,
    description="Filters for remixers who have remixed the given track ID",
    type=str,
)


@full_ns.route("/<string:id>/remixers/count")
class FullRemixersUsersCount(Resource):
    @full_ns.doc(
        id="Get remixers count",
        description="Gets the count of unique users who have remixed tracks by the given user, or a specific track by that user if provided",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(remixers_parser)
    @full_ns.marshal_with(remixers_count_response)
    def get(self, id):
        decoded_user_id = decode_with_abort(id, full_ns)
        args = remixers_parser.parse_args()
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        current_user_id = get_current_user_id(args)
        track_id = args.get("track_id")
        decoded_track_id = decode_with_abort(track_id, full_ns) if track_id else None
        args = GetRemixersArgs(
            remixee_user_id=decoded_user_id,
            current_user_id=current_user_id,
            track_id=decoded_track_id,
            limit=limit,
            offset=offset,
        )
        count = get_remixers_count(args)
        return success_response(count)


purchasers_parser = pagination_with_current_user_parser.copy()
purchasers_parser.add_argument(
    "content_type",
    required=False,
    description="Type of content to filter by (track or album)",
    type=str,
)
purchasers_parser.add_argument(
    "content_id",
    required=False,
    description="Filters for users who have purchased the given track or album ID",
    type=str,
)
purchasers_reponse = make_response(
    "purchasers_response", ns, fields.List(fields.Nested(user_model))
)
full_purchasers_reponse = make_full_response(
    "full_purchasers_response", full_ns, fields.List(fields.Nested(user_model_full))
)
purchasers_count_response = make_full_response(
    "purchasers_count_response", full_ns, fields.Integer()
)

USER_PURCHASERS_ROUTE = "/<string:id>/purchasers"


@full_ns.route(USER_PURCHASERS_ROUTE)
class FullPurchasersUsers(Resource):
    @log_duration(logger)
    def _get_user_purchasers(self, id):
        decoded_id = decode_with_abort(id, full_ns)
        args = purchasers_parser.parse_args()
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        current_user_id = get_current_user_id(args)
        content_type = args.get("content_type")
        content_id = args.get("content_id")
        decoded_content_id = (
            decode_with_abort(content_id, full_ns) if content_id else None
        )
        args = GetPurchasersArgs(
            seller_user_id=decoded_id,
            current_user_id=current_user_id,
            content_type=content_type,
            content_id=decoded_content_id,
            limit=limit,
            offset=offset,
        )
        purchasers = get_purchasers(args)
        users = list(map(extend_user, purchasers))
        return success_response(users)

    @full_ns.doc(
        id="""Get purchasers""",
        description="Gets the list of unique users who have purchased content by the given user",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(purchasers_parser)
    @full_ns.marshal_with(full_purchasers_reponse)
    @cache(ttl_sec=5)
    def get(self, id):
        return self._get_user_purchasers(id)


@ns.route(USER_PURCHASERS_ROUTE)
class PurchasersUsers(FullPurchasersUsers):
    @ns.doc(
        id="""Get purchasers""",
        description="Gets the list of unique users who have purchased content by the given user",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(purchasers_parser)
    @ns.marshal_with(purchasers_reponse)
    def get(self, id):
        return super()._get_user_purchasers(id)


@full_ns.route("/<string:id>/purchasers/count")
class FullPurchasersUsersCount(Resource):
    @full_ns.doc(
        id="""Get purchasers count""",
        description="Gets the list of users who have purchased content by the given user",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(purchasers_parser)
    @full_ns.marshal_with(purchasers_count_response)
    def get(self, id):
        decoded_user_id = decode_with_abort(id, full_ns)
        args = purchasers_parser.parse_args()
        current_user_id = get_current_user_id(args)
        content_type = args.get("content_type")
        content_id = args.get("content_id")
        decoded_content_id = (
            decode_with_abort(content_id, full_ns) if content_id else None
        )
        args = GetPurchasersArgs(
            seller_user_id=decoded_user_id,
            current_user_id=current_user_id,
            content_type=content_type,
            content_id=decoded_content_id,
        )
        count = get_purchasers_count(args)
        return success_response(count)


USER_TRACKS_REMIXED_ROUTE = USER_TRACKS_ROUTE + "/remixed"

user_tracks_remixed_response = make_response(
    "user_tracks_remixed_response",
    ns,
    fields.List(fields.Nested(remixed_track_aggregate)),
)


@ns.route(USER_TRACKS_REMIXED_ROUTE)
class UserTracksRemixed(Resource):
    @ns.doc(
        id="""Get User Tracks Remixed""",
        description="Gets tracks owned by the user which have been remixed by another track",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(pagination_with_current_user_parser)
    @ns.marshal_with(user_tracks_remixed_response)
    def get(self, id):
        decoded_id = decode_with_abort(id, ns)
        args = pagination_with_current_user_parser.parse_args()
        query_args = GetUserTracksRemixedArgs(
            user_id=decoded_id,
            current_user_id=get_current_user_id(args),
            limit=get_default_max(args.get("limit"), 10, 10000),
            offset=get_default_max(args.get("offset"), 0),
        )
        remixed_track_aggregates = get_user_tracks_remixed(query_args)
        return success_response(remixed_track_aggregates)


USER_FEED_ROUTE = "/<string:id>/feed"
user_feed_parser = pagination_with_current_user_parser.copy()
user_feed_parser.add_argument(
    "filter",
    description="Controls whether the feed is limited to reposts, original content, or all items",
    required=False,
    type=str,
    choices=["all", "repost", "original"],
    default="all",
)
user_feed_parser.add_argument(
    "tracks_only",
    description="Limit feed to only tracks",
    type=inputs.boolean,
    required=False,
)
user_feed_parser.add_argument(
    "with_users",
    description="Include user data with feed items",
    type=inputs.boolean,
    required=False,
)
user_feed_parser.add_argument(
    "followee_user_id",
    description="A list of followed users to prioritize in feed generation",
    action="append",
    type=int,
    required=False,
)

user_feed_response = make_full_response(
    "user_feed_response", full_ns, fields.List(NestedOneOf(user_feed_item))
)


@full_ns.route(USER_FEED_ROUTE)
class FullUserFeed(Resource):
    @log_duration(logger)
    @record_metrics
    def _get(self, id, authed_user_id):
        decoded_id = decode_with_abort(id, ns)
        check_authorized(decoded_id, authed_user_id)

        parsedArgs = user_feed_parser.parse_args()
        args = {
            "user_id": decoded_id,
            "filter": parsedArgs.get("filter"),
            "tracks_only": parsedArgs.get("tracks_only"),
            "with_users": parsedArgs.get("with_users"),
            "followee_user_ids": parsedArgs.get("followee_user_id"),
            "limit": parsedArgs.get("limit"),
            "offset": parsedArgs.get("offset"),
        }

        feed_results = get_feed(args)
        return success_response(list(map(extend_feed_item, feed_results)))

    @full_ns.doc(
        id="""Get User Feed""",
        description="Gets the feed for the user",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(user_feed_parser)
    @full_ns.marshal_with(user_feed_response)
    @auth_middleware(user_feed_parser, require_auth=True)
    def get(self, id, authed_user_id):
        return self._get(id, authed_user_id)


muted_users_route_parser = reqparse.RequestParser(argument_class=DescriptiveArgument)

MUTED_USERS_ROUTE = "/<string:id>/muted"


@ns.route(MUTED_USERS_ROUTE)
class MutedUsers(Resource):
    @ns.doc(
        id="Get Muted Users",
        description="Gets users muted by the given user",
        params={"id": "A User ID"},
    )
    @ns.expect(muted_users_route_parser)
    @auth_middleware(muted_users_route_parser, require_auth=True)
    @ns.marshal_with(users_response)
    def get(self, id, authed_user_id):
        decoded_id = decode_with_abort(id, ns)
        check_authorized(decoded_id, authed_user_id)
        muted_users = get_muted_users(decoded_id)
        muted_users = list(map(extend_user, muted_users))
        return success_response(muted_users)


@full_ns.route(MUTED_USERS_ROUTE)
class FullMutedUsers(Resource):
    @record_metrics
    @ns.doc(
        id="Get Muted Users",
        description="Gets users muted by the given user",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(muted_users_route_parser)
    @auth_middleware(muted_users_route_parser, require_auth=True)
    @full_ns.marshal_with(full_user_response)
    def get(self, id, authed_user_id):
        decoded_id = decode_with_abort(id, ns)
        check_authorized(decoded_id, authed_user_id)
        muted_users = get_muted_users(decoded_id)
        muted_users = list(map(extend_user, muted_users))
        return success_response(muted_users)


email_access_response = make_response(
    "email_access_response", ns, fields.Nested(email_access, allow_null=True)
)


@ns.route("/<string:receiving_user_id>/emails/<string:grantor_user_id>/key")
class UserEmailKey(Resource):
    @record_metrics
    @ns.doc(
        id="""Get User Email Key""",
        summary="Get user's email encryption key",
        description="Gets the encrypted key for email access between the receiving user and granting user.",
        params={
            "receiving_user_id": "ID of user receiving email access",
            "grantor_user_id": "ID of user granting email access",
        },
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.marshal_with(email_access_response)
    @cache(ttl_sec=5)
    def get(self, receiving_user_id, grantor_user_id):
        receiving_user_id = decode_with_abort(receiving_user_id, ns)
        grantor_user_id = decode_with_abort(grantor_user_id, ns)

        db = get_db_read_replica()
        with db.scoped_session() as session:
            email_access = (
                session.query(EmailAccess)
                .filter(
                    EmailAccess.receiving_user_id == receiving_user_id,
                    EmailAccess.grantor_user_id == grantor_user_id,
                )
                .first()
            )

            if not email_access:
                return success_response(None)

            return success_response(email_access.to_dict())


# Comments
user_comments_response = make_response(
    "user_comments_response", ns, fields.List(fields.Nested(comment_model))
)


@ns.route("/<string:id>/comments")
class UserComments(Resource):
    @record_metrics
    @ns.doc(
        id="""Get User Comments""",
        description="""Get user comment history""",
        params={"id": "A User ID"},
        responses={
            200: "Success",
            400: "Bad request",
            500: "Server error",
        },
    )
    @ns.expect(pagination_with_current_user_parser)
    @ns.marshal_with(user_comments_response)
    @cache(ttl_sec=5)
    def get(self, id):
        args = pagination_with_current_user_parser.parse_args()
        user_id = decode_with_abort(id, ns)
        current_user_id = get_current_user_id(args)
        args = {
            **args,
            "user_id": user_id,
            "current_user_id": current_user_id,
        }
        user_comments = get_user_comments(args, include_related=False)

        return success_response(user_comments["data"])


user_comments_response_full = make_full_response_with_related(
    "user_comments_response_full", full_ns, fields.List(fields.Nested(comment_model))
)


@full_ns.route("/<string:id>/comments")
class FullUserComments(Resource):
    @record_metrics
    @ns.doc(
        id="""Get User Comments""",
        description="""Get user comment history""",
        params={"id": "A User ID"},
        responses={
            200: "Success",
            400: "Bad request",
            500: "Server error",
        },
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(user_comments_response_full)
    @cache(ttl_sec=5)
    def get(self, id):
        args = pagination_with_current_user_parser.parse_args()
        user_id = decode_with_abort(id, full_ns)
        current_user_id = get_current_user_id(args)
        args = {
            **args,
            "user_id": user_id,
            "current_user_id": current_user_id,
        }
        user_comments = get_user_comments(args, include_related=True)
        user_comments["related"] = extend_related(
            user_comments["related"], current_user_id
        )

        return success_response_with_related(user_comments)


recommended_tracks_parser = pagination_with_current_user_parser.copy()
recommended_tracks_parser.add_argument(
    "time_range",
    required=False,
    default="week",
    choices=("week", "month", "allTime"),
    type=str,
    description="The time range for the recommended tracks",
)


@ns.route("/<string:id>/recommended-tracks")
class UserRecommendedTracks(Resource):
    @ns.doc(
        id="Get User Recommended Tracks",
        description="Gets the recommended tracks for the user",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(recommended_tracks_parser)
    @ns.marshal_with(tracks_response)
    def get(self, id):
        # This is stubbed, just generating docs
        abort_not_found("recommended_tracks", ns)


@full_ns.route("/<string:id>/recommended-tracks")
class FullUserRecommendedTracks(Resource):
    @ns.doc(
        id="Get User Recommended Tracks",
        description="Gets the recommended tracks for the user",
        params={"id": "A User ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(recommended_tracks_parser)
    @full_ns.marshal_with(full_tracks_response)
    def get(self, id):
        # This is stubbed, just generating docs
        abort_not_found("recommended_tracks", full_ns)
