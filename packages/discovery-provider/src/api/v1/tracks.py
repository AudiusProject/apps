import json
import logging
import re
import urllib.parse
from typing import List
from urllib.parse import parse_qs, urlencode, urljoin, urlparse

import requests
from flask import redirect
from flask.globals import request
from flask_restx import Namespace, Resource, fields, inputs, marshal, reqparse

from src.api.v1.helpers import (
    DescriptiveArgument,
    abort_bad_path_param,
    abort_bad_request_param,
    abort_not_found,
    current_user_parser,
    decode_ids_array,
    decode_with_abort,
    extend_blob_info,
    extend_related,
    extend_track,
    extend_user,
    format_limit,
    format_offset,
    full_trending_parser,
    get_current_user_id,
    get_default_max,
    get_encoded_track_id,
    make_full_response,
    make_full_response_with_related,
    make_response,
    pagination_parser,
    pagination_with_current_user_parser,
    parse_bool_param,
    remixes_parser,
    stem_from_track,
    success_response,
    success_response_with_related,
    track_search_parser,
    trending_parser,
    trending_parser_paginated,
)
from src.api.v1.models.comments import comment_model, comment_notification_setting_model
from src.api.v1.models.users import user_model, user_model_full
from src.queries.comments import get_track_comments
from src.queries.generate_unpopulated_trending_tracks import TRENDING_TRACKS_LIMIT
from src.queries.get_extended_purchase_gate import get_extended_purchase_gate
from src.queries.get_feed import get_feed
from src.queries.get_latest_entities import get_latest_entities
from src.queries.get_premium_tracks import get_usdc_purchase_tracks
from src.queries.get_random_tracks import get_random_tracks
from src.queries.get_recommended_tracks import (
    DEFAULT_RECOMMENDED_LIMIT,
    RECOMMENDED_TRACKS_TTL_SEC,
    get_full_recommended_tracks,
    get_recommended_tracks,
)
from src.queries.get_remix_track_parents import get_remix_track_parents
from src.queries.get_remixable_tracks import get_remixable_tracks
from src.queries.get_remixes_of import get_remixes_of
from src.queries.get_reposters_for_track import get_reposters_for_track
from src.queries.get_savers_for_track import get_savers_for_track
from src.queries.get_stems_of import get_stems_of
from src.queries.get_subsequent_tracks import get_subsequent_tracks
from src.queries.get_top_followee_saves import get_top_followee_saves
from src.queries.get_top_followee_windowed import get_top_followee_windowed
from src.queries.get_top_listeners_for_track import get_top_listeners_for_track
from src.queries.get_track_access_info import get_track_access_info
from src.queries.get_track_comment_count import get_track_comment_count
from src.queries.get_track_inspect_info import get_track_inspect_info
from src.queries.get_track_signature import (
    get_track_download_signature,
    get_track_stream_signature,
)
from src.queries.get_tracks import GetTrackArgs, RouteArgs, get_tracks
from src.queries.get_trending import get_trending
from src.queries.get_trending_ids import get_trending_ids
from src.queries.get_unclaimed_id import get_unclaimed_id
from src.queries.get_underground_trending import get_underground_trending
from src.queries.query_helpers import get_content_url_with_mirrors
from src.queries.search_queries import SearchKind, search
from src.trending_strategies.trending_strategy_factory import (
    DEFAULT_TRENDING_VERSIONS,
    TrendingStrategyFactory,
)
from src.trending_strategies.trending_type_and_version import TrendingType
from src.utils import redis_connection
from src.utils.get_all_nodes import get_all_healthy_content_nodes_cached
from src.utils.redis_cache import cache
from src.utils.redis_metrics import record_metrics
from src.utils.rendezvous import RendezvousHash

from .models.tracks import blob_info
from .models.tracks import remixes_response as remixes_response_model
from .models.tracks import stem, stem_full, track, track_access_info, track_full

logger = logging.getLogger(__name__)

trending_strategy_factory = TrendingStrategyFactory()

# Models & namespaces

ns = Namespace("tracks", description="Track related operations")
full_ns = Namespace("tracks", description="Full track operations")

track_response = make_response("track_response", ns, fields.Nested(track))
full_track_response = make_full_response(
    "full_track_response", full_ns, fields.Nested(track_full)
)

tracks_response = make_response(
    "tracks_response", ns, fields.List(fields.Nested(track))
)
full_tracks_response = make_full_response(
    "full_tracks_response", full_ns, fields.List(fields.Nested(track_full))
)

# Get single track


def get_single_track(track_id, current_user_id, endpoint_ns, exclude_gated=True):
    args = {
        "id": [track_id],
        "filter_deleted": False,
        "exclude_gated": exclude_gated,
        "current_user_id": current_user_id,
        "skip_unlisted_filter": True,
    }
    tracks = get_tracks(args)
    if not tracks:
        abort_not_found(track_id, endpoint_ns)
    single_track = extend_track(tracks[0])
    return success_response(single_track)


def parse_routes(routes: List[str]) -> List[RouteArgs]:
    return [
        {"handle": route.split("/")[-2], "slug": route.split("/")[-1]}
        for route in routes
    ]


TRACK_ROUTE = "/<string:track_id>"


@ns.route(TRACK_ROUTE)
class Track(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Track""",
        description="""Gets a track by ID""",
        params={"track_id": "A Track ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.marshal_with(track_response)
    @cache(ttl_sec=5)
    def get(self, track_id):
        decoded_id = decode_with_abort(track_id, ns)
        return get_single_track(decoded_id, None, ns, exclude_gated=False)


@full_ns.route(TRACK_ROUTE)
class FullTrack(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Track""",
        description="""Gets a track by ID.""",
        params={
            "track_id": "A Track ID",
        },
    )
    @full_ns.expect(current_user_parser)
    @full_ns.marshal_with(full_track_response)
    @cache(ttl_sec=5)
    def get(self, track_id: str):
        args = current_user_parser.parse_args()
        decoded_id = decode_with_abort(track_id, full_ns)
        current_user_id = get_current_user_id(args)

        return get_single_track(
            track_id=decoded_id,
            current_user_id=current_user_id,
            endpoint_ns=full_ns,
            exclude_gated=False,
        )


full_track_route_parser = current_user_parser.copy()
full_track_route_parser.add_argument(
    "handle",
    required=False,
    doc=False,  # Deprecated
)
full_track_route_parser.add_argument(
    "slug",
    required=False,
    doc=False,  # Deprecated
)
full_track_route_parser.add_argument(
    "route", action="append", required=False, doc=False  # Deprecated
)
full_track_route_parser.add_argument(
    "permalink",
    action="append",
    required=False,
    description="The permalink of the track(s)",
)
full_track_route_parser.add_argument(
    "id", action="append", required=False, description="The ID of the track(s)"
)

track_slug_parser = full_track_route_parser.copy()
track_slug_parser.remove_argument("user_id")


@ns.route("")
class BulkTracks(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Bulk Tracks""",
        description="""Gets a list of tracks using their IDs or permalinks""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.response(
        200, "Success", tracks_response
    )  # Manually set the expected response to be a list of tracks using using @ns.response
    @ns.expect(track_slug_parser)
    @ns.response(200, "Success", tracks_response)
    @cache(ttl_sec=5)
    def get(self):
        args = track_slug_parser.parse_args()
        slug, handle = (args.get("slug"), args.get("handle"))
        routes = args.get("route")
        permalinks = args.get("permalink")
        ids = args.get("id")

        routes = (routes or []) + (permalinks or [])
        if not ((slug and handle) or routes or ids):
            ns.abort(400, "Expected query param 'permalink' or 'id'")
        elif ids and (routes or (slug and handle)):
            ns.abort(
                400,
                "Ambiguous query params: Expected one of 'id', 'permalink' but not both",
            )
        routes_parsed = routes if routes else []
        try:
            routes_parsed = parse_routes(routes_parsed)
        except IndexError:
            abort_bad_request_param("permalink", ns)
        if slug and handle:
            routes_parsed.append({"handle": handle, "slug": slug})
        if ids:
            tracks = get_tracks(
                {
                    "with_users": True,
                    "id": decode_ids_array(ids),
                    "exclude_gated": False,
                    "skip_unlisted_filter": True,
                }
            )
        else:
            tracks = get_tracks(
                {
                    "with_users": True,
                    "routes": routes_parsed,
                    "exclude_gated": False,
                    "skip_unlisted_filter": True,
                }
            )
        if not tracks:
            if handle and slug:
                abort_not_found(f"{handle}/{slug}", ns)
            elif routes:
                abort_not_found(routes, ns)
            else:
                abort_not_found(ids, ns)

        # For backwards compatibility, the old handle/slug route returned an object, not an array
        # Manually handle marshalling to accomodate while also allowing new SDK to have array as return type
        if handle and slug:
            tracks = extend_track(tracks[0])
            response, status = success_response(tracks)
            return marshal(response, track_response), status
        else:
            tracks = [extend_track(track) for track in tracks]
            response, status = success_response(tracks)
            return marshal(response, tracks_response), status


@full_ns.route("")
class FullBulkTracks(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Bulk Tracks""",
        description="""Gets a list of tracks using their IDs or permalinks""",
    )
    @full_ns.expect(full_track_route_parser)
    @full_ns.response(200, "Success", full_tracks_response)
    @cache(ttl_sec=5)
    def get(self):
        args = full_track_route_parser.parse_args()
        slug, handle = args.get("slug"), args.get("handle")
        routes = args.get("route")
        permalinks = args.get("permalink")
        current_user_id = get_current_user_id(args)
        ids = args.get("id")

        routes = (routes or []) + (permalinks or [])
        if not ((slug and handle) or routes or ids):
            full_ns.abort(400, "Expected query param 'permalink' or 'id'")
        elif ids and (routes or (slug and handle)):
            full_ns.abort(
                400,
                "Ambiguous query params: Expected one of 'id', 'permalink' but not both",
            )
        routes_parsed = routes if routes else []
        try:
            routes_parsed = parse_routes(routes_parsed)
        except IndexError:
            abort_bad_request_param("permalink", full_ns)
        if slug and handle:
            routes_parsed.append({"handle": handle, "slug": slug})
        if ids:
            tracks = get_tracks(
                {
                    "with_users": True,
                    "id": decode_ids_array(ids),
                    "current_user_id": current_user_id,
                    "skip_unlisted_filter": True,
                }
            )
        else:
            tracks = get_tracks(
                {
                    "with_users": True,
                    "routes": routes_parsed,
                    "current_user_id": current_user_id,
                    "skip_unlisted_filter": True,
                }
            )
        if not tracks:
            if handle and slug:
                abort_not_found(f"{handle}/{slug}", full_ns)
            elif routes:
                abort_not_found(routes, full_ns)
            else:
                abort_not_found(ids, full_ns)

        # For backwards compatibility, the old handle/slug route returned an object, not an array
        # Manually handle marshalling to accomodate while also allowing new SDK to have array as return type
        if handle and slug:
            tracks = extend_track(tracks[0])
            response, status = success_response(tracks)
            return marshal(response, full_track_response), status
        else:
            tracks = list(map(extend_track, tracks))
            response, status = success_response(tracks)
            return marshal(response, full_tracks_response), status


def get_stream_url_from_content_node(
    content_node: str, path: str, skip_check: bool = False
):
    # Add additional query parameters
    joined_url = urljoin(content_node, path)
    parsed_url = urlparse(joined_url)

    # Performance improvement POC to skip node status check
    if skip_check:
        return parsed_url.geturl()
    query_params = parse_qs(parsed_url.query)
    query_params["skip_play_count"] = ["true"]
    stream_url = parsed_url._replace(query=urlencode(query_params, doseq=True)).geturl()

    headers = {"Range": "bytes=0-1"}

    try:
        response = requests.get(stream_url, headers=headers, timeout=5)
        if (
            response.status_code == 206
            or response.status_code == 204
            or response.status_code == 200
        ):
            return parsed_url.geturl()
    except:
        pass


# Inspect
inspect_parser = reqparse.RequestParser(argument_class=DescriptiveArgument)
inspect_parser.add_argument(
    "original",
    description="""Optional - if set to true inspects the original file quality""",
    type=inputs.boolean,
    required=False,
    default=False,
)
inspect_result = make_response("track_inspect", ns, fields.Nested(blob_info))


@ns.route("/<string:track_id>/inspect")
class TrackInspect(Resource):
    @record_metrics
    @ns.doc(
        id="""Inspect Track""",
        description="""Inspect a track""",
        params={"track_id": "A Track ID"},
        responses={
            200: "Success",
            400: "Bad request",
            500: "Server error",
        },
    )
    @ns.expect(inspect_parser)
    @ns.marshal_with(inspect_result)
    @cache(ttl_sec=5)
    def get(self, track_id):
        """
        Inspects the details of the file for a track.
        """
        request_args = inspect_parser.parse_args()
        is_original = request_args.get("original")
        decoded_id = decode_with_abort(track_id, ns)
        info = get_track_access_info(decoded_id)
        track_info = info.get("track")

        if not track_info:
            logger.error(
                f"tracks.py | stream | Track with id {track_id} may not exist. Please investigate."
            )
            abort_not_found(track_id, ns)

        redis = redis_connection.get_redis()
        cid = (
            track_info.get("orig_file_cid")
            if is_original
            else track_info.get("track_cid")
        )

        raw_blob_info = get_track_inspect_info(
            cid, track_id=track_id, redis_instance=redis
        )
        if not raw_blob_info:
            abort_not_found(track_id, ns)

        blob_info = extend_blob_info(raw_blob_info)
        return success_response(blob_info)


# Bulk Inspect
bulk_inspect_parser = reqparse.RequestParser(argument_class=DescriptiveArgument)
bulk_inspect_parser.add_argument(
    "id",
    description="""List of track IDs to inspect""",
    type=str,
    action="append",
    required=True,
)
bulk_inspect_parser.add_argument(
    "original",
    description="""Optional - if set to true inspects the original file quality""",
    type=inputs.boolean,
    required=False,
    default=False,
)
bulk_inspect_result = make_response(
    "track_inspect_list", ns, fields.List(fields.Nested(blob_info))
)


@ns.route("/inspect")
class BulkTrackInspect(Resource):
    @record_metrics
    @ns.doc(
        id="""Inspect Tracks""",
        description="""Inspect multiple tracks""",
        responses={
            200: "Success",
            400: "Bad request",
            500: "Server error",
        },
    )
    @ns.expect(bulk_inspect_parser)
    @ns.marshal_with(bulk_inspect_result)
    @cache(ttl_sec=5)
    def get(self):
        """
        Inspects the details of the files for multiple tracks.
        """
        request_args = bulk_inspect_parser.parse_args()
        is_original = request_args.get("original")
        track_ids = request_args.get("id")

        if not track_ids:
            ns.abort(400, "Expected query param 'id'")

        decoded_ids = [decode_with_abort(track_id, ns) for track_id in track_ids]
        tracks_info = [get_track_access_info(decoded_id) for decoded_id in decoded_ids]
        valid_tracks = [info.get("track") for info in tracks_info if info.get("track")]

        if not valid_tracks:
            abort_not_found(track_ids, ns)

        redis = redis_connection.get_redis()
        results = []

        for track_info in valid_tracks:
            cid = (
                track_info.get("orig_file_cid")
                if is_original
                else track_info.get("track_cid")
            )
            raw_blob_info = get_track_inspect_info(
                cid, track_id=track_info.get("track_id"), redis_instance=redis
            )
            if raw_blob_info:
                blob_info = extend_blob_info(raw_blob_info)
                results.append(blob_info)
            else:
                results.append(None)

        return success_response(results)


# Comments

track_comments_parser = pagination_with_current_user_parser.copy()
track_comments_parser.add_argument(
    "sort_method",
    required=False,
    default="top",
    choices=("top", "newest", "timestamp"),
    type=str,
    description="The sort method",
)


track_comments_response = make_response(
    "track_comments_response", ns, fields.List(fields.Nested(comment_model))
)


@ns.route("/<string:track_id>/comments")
class TrackComments(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Track Comments""",
        description="""Get a list of comments for a track""",
        params={"track_id": "A Track ID"},
        responses={
            200: "Success",
            400: "Bad request",
            500: "Server error",
        },
    )
    @ns.expect(track_comments_parser)
    @ns.marshal_with(track_comments_response)
    @cache(ttl_sec=5)
    def get(self, track_id):
        args = track_comments_parser.parse_args()
        decoded_id = decode_with_abort(track_id, ns)
        current_user_id = args.get("user_id")
        track_comments = get_track_comments(
            args, decoded_id, current_user_id, include_related=False
        )

        return success_response(track_comments["data"])


track_comments_response_full = make_full_response_with_related(
    "track_comments_response_full", full_ns, fields.List(fields.Nested(comment_model))
)


@full_ns.route("/<string:track_id>/comments")
class FullTrackComments(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Track Comments""",
        description="""Get a list of comments for a track""",
        params={"track_id": "A Track ID"},
        responses={
            200: "Success",
            400: "Bad request",
            500: "Server error",
        },
    )
    @full_ns.expect(track_comments_parser)
    @full_ns.marshal_with(track_comments_response_full)
    @cache(ttl_sec=5)
    def get(self, track_id):
        args = track_comments_parser.parse_args()
        decoded_id = decode_with_abort(track_id, full_ns)
        current_user_id = args.get("user_id")
        track_comments = get_track_comments(
            args, decoded_id, current_user_id, include_related=True
        )
        track_comments["related"] = extend_related(
            track_comments["related"], current_user_id
        )
        return success_response_with_related(track_comments)


track_comment_notification_setting_response = make_response(
    "track_comment_notification_response",
    ns,
    fields.Nested(comment_notification_setting_model),
)

comment_count_model = ns.model(
    "comment_count", {"track_id": fields.Integer, "comment_count": fields.Integer}
)

track_comment_count_parser = current_user_parser.copy()
track_comment_count_response = make_response(
    "track_comment_count_response",
    ns,
    fields.Integer,
)


@ns.route("/<string:track_id>/comment_count")
class TrackCommentCount(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Track Comment Count""",
        description="""Get the comment count for a track""",
        params={"track_id": "A Track ID"},
        responses={
            200: "Success",
            400: "Bad request",
            500: "Server error",
        },
    )
    @ns.expect(track_comment_count_parser)
    @ns.marshal_with(track_comment_count_response)
    @cache(ttl_sec=5)
    def get(self, track_id):
        args = track_comments_parser.parse_args()
        decoded_track_id = decode_with_abort(track_id, ns)
        current_user_id = args.get("user_id")
        track_comments = get_track_comment_count(decoded_track_id, current_user_id)
        return success_response(track_comments)


@ns.route("/<string:track_id>/comment_notification_setting")
class TrackCommentNotificationSetting(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Track Comment Notification Setting""",
        description="""Get the comment notification setting for a track""",
        params={"track_id": "A Track ID"},
        responses={
            200: "Success",
            400: "Bad request",
            500: "Server error",
        },
    )
    @ns.expect(current_user_parser)
    @ns.marshal_with(track_comment_notification_setting_response)
    @cache(ttl_sec=5)
    def get(self, track_id):
        args = track_comments_parser.parse_args()
        decoded_id = decode_with_abort(track_id, ns)

        current_user_id = get_current_user_id(args)
        track_comments = get_track_comment_count(decoded_id, current_user_id)
        return success_response(track_comments)


# Stream
stream_parser = current_user_parser.copy()
stream_parser.add_argument(
    "preview",
    description="""Optional - true if streaming track preview""",
    type=inputs.boolean,
    required=False,
    default=False,
)
stream_parser.add_argument(
    "user_signature",
    description="""Optional - signature from the requesting user's wallet.
        This is needed to authenticate the user and verify access in case the track is gated.""",
    type=str,
)
stream_parser.add_argument(
    "user_data",
    description="""Optional - data which was used to generate the optional signature argument.""",
    type=str,
)
stream_parser.add_argument(
    "nft_access_signature",
    description="""Optional - gated content signature for this track which was previously generated by a registered DN.
        We perform checks on it and pass it through to CN.""",
    type=str,
)
stream_parser.add_argument(
    "skip_play_count",
    description="""Optional - boolean that disables tracking of play counts.""",
    type=bool,
    required=False,
    default=False,
)
stream_parser.add_argument(
    "api_key",
    description="""Optional - API key for third party apps. This is required for tracks that only allow specific API keys.""",
    type=str,
    required=False,
    default=None,
)
stream_parser.add_argument(
    "skip_check",
    description="""Optional - POC to skip node 'double dip' health check""",
    type=bool,
    required=False,
    default=None,
)
stream_parser.add_argument(
    "no_redirect",
    description="""Optional - If true will not return a 302 and instead will return the stream url in JSON""",
    type=bool,
    required=False,
    default=None,
)

stream_url_response = make_response(
    "stream_url_response", ns, fields.String(required=True)
)


@ns.route("/<string:track_id>/stream")
class TrackStream(Resource):
    @record_metrics
    @ns.doc(
        id="""Stream Track""",
        description="""Stream an mp3 track""",
        params={"track_id": "A Track ID"},
        responses={
            200: "Success",
            216: "Partial content",
            400: "Bad request",
            416: "Content range invalid",
            500: "Server error",
        },
    )
    @ns.response(200, "Success", stream_url_response)
    @ns.expect(stream_parser)
    @cache(ttl_sec=5, transform=redirect)
    def get(self, track_id):
        """
        Get the streamable MP3 file of a track

        This endpoint accepts the Range header for streaming.
        https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests
        """
        request_args = stream_parser.parse_args()
        is_preview = request_args.get("preview")
        user_id = get_current_user_id(request_args)
        user_data = request_args.get("user_data")
        user_signature = request_args.get("user_signature")
        nft_access_signature = request_args.get("nft_access_signature")
        api_key = request_args.get("api_key")
        no_redirect = request_args.get("no_redirect")

        decoded_id = decode_with_abort(track_id, ns)

        info = get_track_access_info(decoded_id)
        track = info.get("track")

        if not track:
            logger.error(
                f"tracks.py | stream | Track with id {track_id} may not exist. Please investigate."
            )
            abort_not_found(track_id, ns)
        elif (track["allowed_api_keys"] and not api_key) or (
            api_key
            and track["allowed_api_keys"]
            and api_key.lower() not in track["allowed_api_keys"]
        ):
            logger.error(
                f"tracks.py | stream | Streaming track {track_id} does not allow streaming from api key {api_key}."
            )
            abort_not_found(track_id, ns)

        # signature for the track to be included as a query param in the redirect to CN
        stream_signature = get_track_stream_signature(
            {
                "track": track,
                "is_preview": is_preview,
                "user_id": user_id,
                "user_data": user_data,
                "user_signature": user_signature,
                "nft_access_signature": nft_access_signature,
            }
        )
        if not stream_signature:
            abort_not_found(track_id, ns)

        signature = stream_signature["signature"]
        cid = stream_signature["cid"]
        params = {"signature": json.dumps(signature)}
        skip_play_count = request_args.get("skip_play_count", False)
        if skip_play_count:
            params["skip_play_count"] = skip_play_count

        content_url_with_mirrors = get_content_url_with_mirrors(
            signature, cid, track.get("placement_hosts")
        )
        if no_redirect:
            return success_response(content_url_with_mirrors["url"])
        else:
            return content_url_with_mirrors["url"]


# Download

download_parser = current_user_parser.copy()
download_parser.add_argument(
    "user_signature",
    description="""Optional - signature from the requesting user's wallet.
        This is needed to authenticate the user and verify access in case the track is gated.""",
    type=str,
)
download_parser.add_argument(
    "user_data",
    description="""Optional - data which was used to generate the optional signature argument.""",
    type=str,
)
download_parser.add_argument(
    "nft_access_signature",
    description="""Optional - nft access signature for this track which was previously generated by a registered DN.
        We perform checks on it and pass it through to CN.""",
    type=str,
)
download_parser.add_argument(
    "original",
    description="""Optional - true if downloading original file""",
    type=inputs.boolean,
    required=False,
    default=False,
)
download_parser.add_argument(
    "filename",
    description="""Optional - name of file to download. If not provided, defaults to track original filename or title.""",
    type=str,
)


@ns.route("/<string:track_id>/download")
class TrackDownload(Resource):
    @record_metrics
    @ns.doc(
        id="""Download Track""",
        description="""Download an original or mp3 track""",
        params={"track_id": "A Track ID"},
        responses={
            200: "Success",
            216: "Partial content",
            400: "Bad request",
            416: "Content range invalid",
            500: "Server error",
        },
    )
    @ns.expect(download_parser)
    @cache(ttl_sec=5, transform=redirect)
    def get(self, track_id):
        """
        Download the original or MP3 file of a track.
        """
        request_args = download_parser.parse_args()
        user_id = get_current_user_id(request_args)
        decoded_id = decode_with_abort(track_id, ns)
        info = get_track_access_info(decoded_id)
        track = info.get("track")
        if not track:
            logger.error(
                f"tracks.py | download | Track with id {track_id} may not exist. Please investigate."
            )
            abort_not_found(track_id, ns)

        redis = redis_connection.get_redis()

        # signature for the track to be included as a query param in the redirect to CN
        download_signature = get_track_download_signature(
            {
                "track": track,
                "is_original": request_args.get("original"),
                "filename": request_args.get("filename"),
                "user_id": user_id,
                "user_data": request_args.get("user_data"),
                "user_signature": request_args.get("user_signature"),
                "nft_access_signature": request_args.get("nft_access_signature"),
            }
        )
        if not download_signature:
            abort_not_found(track_id, ns)

        signature = download_signature["signature"]
        cid = download_signature["cid"]
        filename = download_signature["filename"]
        params = {"signature": json.dumps(signature), "filename": filename}
        base_path = f"tracks/cidstream/{cid}"
        query_string = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
        path = f"{base_path}?{query_string}"

        # we cache track cid -> content node so we can avoid
        # checking multiple content nodes for a track
        # if we already know where to look
        redis_key = f"track_cid:{cid}"
        cached_content_node = redis.get(redis_key)
        stream_url = None
        if cached_content_node:
            cached_content_node = cached_content_node.decode("utf-8")
            stream_url = get_stream_url_from_content_node(cached_content_node, path)
            if stream_url:
                return stream_url

        healthy_nodes = get_all_healthy_content_nodes_cached(redis)
        if not healthy_nodes:
            logger.error(
                f"tracks.py | download | No healthy Content Nodes found when streaming track ID {track_id}. Please investigate."
            )
            abort_not_found(track_id, ns)

        rendezvous = RendezvousHash(
            *[re.sub("/$", "", node["endpoint"].lower()) for node in healthy_nodes]
        )

        content_nodes = rendezvous.get_n(9999999, cid)
        for content_node in content_nodes:
            try:
                stream_url = get_stream_url_from_content_node(content_node, path)
                if stream_url:
                    redis.set(redis_key, content_node)
                    redis.expire(redis_key, 60 * 30)  # 30 min ttl
                    return stream_url
            except Exception as e:
                logger.error(f"Could not locate cid {cid} on {content_node}: {e}")
        abort_not_found(track_id, ns)


track_search_result = make_response(
    "track_search", ns, fields.List(fields.Nested(track))
)


@ns.route("/search")
class TrackSearchResult(Resource):
    @record_metrics
    @ns.doc(
        id="""Search Tracks""",
        description="""Search for a track or tracks""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(track_search_parser)
    @ns.marshal_with(track_search_result)
    @cache(ttl_sec=600)
    def get(self):
        args = track_search_parser.parse_args()
        query = args.get("query")
        include_purchaseable = parse_bool_param(args.get("includePurchaseable"))
        genres = args.get("genre")
        moods = args.get("mood")
        has_downloads = parse_bool_param(args.get("has_downloads"))
        is_purchaseable = parse_bool_param(args.get("is_purchaseable"))
        keys = args.get("key")
        bpm_min = args.get("bpm_min")
        bpm_max = args.get("bpm_max")
        sort_method = args.get("sort_method")
        only_downloadable = args.get("only_downloadable")
        limit = format_limit(args, 50, 10)
        offset = format_offset(args)
        search_args = {
            "query": query,
            "kind": SearchKind.tracks.name,
            "is_auto_complete": False,
            "current_user_id": None,
            "with_users": True,
            "limit": limit,
            "offset": offset,
            "only_downloadable": only_downloadable,
            "include_purchaseable": include_purchaseable,
            "only_purchaseable": is_purchaseable,
            "genres": genres,
            "moods": moods,
            "only_with_downloads": has_downloads,
            "keys": keys,
            "bpm_min": bpm_min,
            "bpm_max": bpm_max,
            "sort_method": sort_method,
        }
        response = search(search_args)
        return success_response(response["tracks"])


# Trending
#
# There are two trending endpoints - regular and full. Regular
# uses the familiar caching decorator, while full is more interesting.
#
# Full Trending is consumed page by page in the client, but we'd like to avoid caching
# each page seperately (to avoid old pages interleaving with new ones on the client).
# We're further constrained by the need to fetch more than the page size of ~10 in our playcount
# query in order to score + sort the tracks.
#
# We address this by always fetching and scoring `TRENDING_LIMIT` (>> page limit) tracks,
# caching the entire tracks list. This cached value is sliced by limit + offset and returned.
# This cache entry is be keyed by genre + user_id + time_range.
#
# However, this causes an issue where every distinct user_id (every logged in user) will have a cache miss
# on their first call to trending. We deal with this by adding an additional layer of caching inside
# `get_trending_tracks.py`, which caches the scored tracks before they are populated (keyed by genre + time).
# With this second cache, each user_id can reuse on the same cached list of tracks, and then populate them uniquely.


@ns.route(
    "/trending",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.TRACKS].name},
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Trending Tracks""",
            "description": """Gets the top 100 trending (most popular) tracks on Audius""",
            "responses": {200: "Success", 400: "Bad request", 500: "Server error"},
        }
    },
)
@ns.route("/trending/<string:version>", doc=False)
class Trending(Resource):
    @record_metrics
    @ns.expect(trending_parser)
    @ns.marshal_with(tracks_response)
    def get(self, version):
        trending_track_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.TRACKS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_track_versions)
        )
        if not version_list:
            abort_bad_path_param("version", ns)

        args = trending_parser.parse_args()
        args["exclude_gated"] = True
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.TRACKS, version_list[0]
        )
        trending_tracks = get_trending(args, strategy)
        return success_response(trending_tracks)


@full_ns.route(
    "/trending",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.TRACKS].name},
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Trending Tracks""",
            "description": """Gets the top 100 trending (most popular) tracks on Audius""",
            "responses": {200: "Success", 400: "Bad request", 500: "Server error"},
        }
    },
)
@full_ns.route(
    "/trending/<string:version>",
    doc={
        "get": {
            "id": """Get Trending Tracks With Version""",
            "description": """Gets the top 100 trending (most popular) tracks on Audius using a given trending strategy version""",
            "params": {"version": "The strategy version of trending to use"},
        }
    },
)
class FullTrending(Resource):
    @record_metrics
    @full_ns.doc()
    @full_ns.expect(full_trending_parser)
    @full_ns.marshal_with(full_tracks_response)
    def get(self, version):
        trending_track_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.TRACKS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_track_versions)
        )
        if not version_list:
            abort_bad_path_param("version", full_ns)

        args = full_trending_parser.parse_args()
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.TRACKS, version_list[0]
        )
        trending_tracks = get_trending(args, strategy)
        return success_response(trending_tracks)


@ns.route(
    "/trending/underground",
    defaults={
        "version": DEFAULT_TRENDING_VERSIONS[TrendingType.UNDERGROUND_TRACKS].name
    },
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Underground Trending Tracks""",
            "description": """Gets the top 100 trending underground tracks on Audius""",
        }
    },
)
@ns.route("/trending/underground/<string:version>", doc=False)
class UndergroundTrending(Resource):
    @record_metrics
    @ns.expect(pagination_parser)
    @ns.marshal_with(tracks_response)
    def get(self, version):
        underground_trending_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.TRACKS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, underground_trending_versions)
        )
        if not version_list:
            abort_bad_path_param("version", ns)

        args = pagination_parser.parse_args()
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.TRACKS, version_list[0]
        )
        trending_tracks = get_underground_trending(request, args, strategy)
        return success_response(trending_tracks)


@full_ns.route(
    "/trending/underground",
    defaults={
        "version": DEFAULT_TRENDING_VERSIONS[TrendingType.UNDERGROUND_TRACKS].name
    },
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Underground Trending Tracks""",
            "description": """Gets the top 100 trending underground tracks on Audius""",
        }
    },
)
@full_ns.route(
    "/trending/underground/<string:version>",
    doc={
        "get": {
            "id": "Get Underground Trending Tracks With Version",
            "description": "Gets the top 100 trending underground tracks on Audius using a given trending strategy version",
            "params": {"version": "The strategy version of trending to user"},
        }
    },
)
class FullUndergroundTrending(Resource):
    @record_metrics
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(full_tracks_response)
    def get(self, version):
        underground_trending_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.TRACKS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, underground_trending_versions)
        )
        if not version_list:
            abort_bad_path_param("version", full_ns)

        args = pagination_with_current_user_parser.parse_args()
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.UNDERGROUND_TRACKS, version_list[0]
        )
        trending_tracks = get_underground_trending(request, args, strategy)
        return success_response(trending_tracks)


# Get recommended tracks for a genre and exclude tracks in the exclusion list
recommended_track_parser = trending_parser_paginated.copy()
recommended_track_parser.remove_argument("offset")
recommended_track_parser.add_argument(
    "exclusion_list",
    type=int,
    action="append",
    required=False,
    description="List of track ids to exclude",
)


@ns.route(
    "/recommended",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.TRACKS].name},
    strict_slashes=False,
    doc=False,
)
@ns.route("/recommended/<string:version>", doc=False)
class RecommendedTrack(Resource):
    @record_metrics
    @ns.expect(recommended_track_parser)
    @ns.marshal_with(tracks_response)
    @cache(ttl_sec=RECOMMENDED_TRACKS_TTL_SEC)
    def get(self, version):
        trending_track_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.TRACKS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_track_versions)
        )
        if not version_list:
            abort_bad_path_param("version", ns)

        args = recommended_track_parser.parse_args()
        limit = format_limit(args, default_limit=DEFAULT_RECOMMENDED_LIMIT)
        args["limit"] = max(TRENDING_TRACKS_LIMIT, limit)
        args["exclude_gated"] = True
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.TRACKS, version_list[0]
        )
        recommended_tracks = get_recommended_tracks(args, strategy)
        return success_response(recommended_tracks[:limit])


full_recommended_track_parser = recommended_track_parser.copy()
full_recommended_track_parser.add_argument(
    "user_id", required=False, description="The user ID of the user making the request"
)


@full_ns.route(
    "/recommended",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.TRACKS].name},
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Recommended Tracks""",
            "description": """Get recommended tracks""",
        }
    },
)
@full_ns.route(
    "/recommended/<string:version>",
    doc={
        "get": {
            "id": """Get Recommended Tracks With Version""",
            "description": """Get recommended tracks using the given trending strategy version""",
            "params": {"version": "The strategy version of trending to use"},
        }
    },
)
class FullRecommendedTracks(Resource):
    @record_metrics
    @full_ns.expect(full_recommended_track_parser)
    @full_ns.marshal_with(full_tracks_response)
    def get(self, version):
        trending_track_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.TRACKS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_track_versions)
        )
        if not version_list:
            abort_bad_path_param("version", full_ns)

        args = full_recommended_track_parser.parse_args()
        limit = format_limit(args, default_limit=DEFAULT_RECOMMENDED_LIMIT)
        args["limit"] = max(TRENDING_TRACKS_LIMIT, limit)
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.TRACKS, version_list[0]
        )
        full_recommended_tracks = get_full_recommended_tracks(request, args, strategy)
        return success_response(full_recommended_tracks[:limit])


trending_ids_route_parser = trending_parser.copy()
trending_ids_route_parser.remove_argument("time")

track_id = full_ns.model("track_id", {"id": fields.String(required=True)})
trending_times_ids = full_ns.model(
    "trending_times_ids",
    {
        "week": fields.List(fields.Nested(track_id)),
        "month": fields.List(fields.Nested(track_id)),
        "year": fields.List(fields.Nested(track_id)),
    },
)
trending_ids_response = make_response(
    "trending_ids_response", full_ns, fields.Nested(trending_times_ids)
)


@full_ns.route(
    "/trending/ids",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.TRACKS].name},
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Trending Track IDs""",
            "description": """Gets the track IDs of the top trending tracks on Audius""",
            "responses": {200: "Success", 400: "Bad request", 500: "Server error"},
        }
    },
)
@full_ns.route(
    "/trending/ids/<string:version>",
    doc={
        "get": {
            "id": """Get Trending Tracks IDs With Version""",
            "description": """Gets the track IDs of the top trending tracks on Audius based on the given trending strategy version""",
            "params": {"version": "The strategy version of trending to use"},
            "responses": {200: "Success", 400: "Bad request", 500: "Server error"},
        }
    },
)
class FullTrendingIds(Resource):
    @record_metrics
    @full_ns.expect(trending_ids_route_parser)
    @full_ns.marshal_with(trending_ids_response)
    def get(self, version):
        trending_track_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.TRACKS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_track_versions)
        )
        if not version_list:
            abort_bad_path_param("version", full_ns)

        args = trending_ids_route_parser.parse_args()
        args["limit"] = args.get("limit", 10)
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.TRACKS, version_list[0]
        )
        trending_ids = get_trending_ids(args, strategy)
        res = {
            "week": list(map(get_encoded_track_id, trending_ids["week"])),
            "month": list(map(get_encoded_track_id, trending_ids["month"])),
            "year": list(map(get_encoded_track_id, trending_ids["year"])),
        }
        return success_response(res)


track_favorites_response = make_full_response(
    "track_favorites_response_full",
    full_ns,
    fields.List(fields.Nested(user_model_full)),
)


@full_ns.route("/<string:track_id>/favorites")
class FullTrackFavorites(Resource):
    @full_ns.doc(
        id="""Get Users From Favorites""",
        description="""Get users that favorited a track""",
        params={"track_id": "A Track ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(track_favorites_response)
    @cache(ttl_sec=5)
    def get(self, track_id):
        args = pagination_with_current_user_parser.parse_args()
        decoded_id = decode_with_abort(track_id, full_ns)
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        current_user_id = get_current_user_id(args)

        args = {
            "save_track_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
        users = get_savers_for_track(args)
        users = list(map(extend_user, users))

        return success_response(users)


track_reposts_response = make_full_response(
    "track_reposts_response_full", full_ns, fields.List(fields.Nested(user_model_full))
)


@full_ns.route("/<string:track_id>/reposts")
class FullTrackReposts(Resource):
    @full_ns.doc(
        id="""Get Users From Reposts""",
        description="""Get the users that reposted a track""",
        params={"track_id": "A Track ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(track_reposts_response)
    @cache(ttl_sec=5)
    def get(self, track_id):
        args = pagination_with_current_user_parser.parse_args()
        decoded_id = decode_with_abort(track_id, full_ns)
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        current_user_id = get_current_user_id(args)

        args = {
            "repost_track_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
        users = get_reposters_for_track(args)
        users = list(map(extend_user, users))
        return success_response(users)


full_top_listener_item = full_ns.model(
    "full_top_listener",
    {
        "count": fields.Integer(required=True),
        "user": fields.Nested(user_model_full, required=True),
    },
)

top_listener_response_full = make_response(
    "full_top_listener", full_ns, fields.List(fields.Nested(full_top_listener_item))
)


@full_ns.route("/<string:track_id>/top_listeners")
class FullTrackTopListeners(Resource):
    @full_ns.doc(
        id="""Get Track Top Listeners""",
        description="""Get the users that have listened to a track the most""",
        params={"track_id": "A Track ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(top_listener_response_full)
    @cache(ttl_sec=5)
    def get(self, track_id):
        args = pagination_with_current_user_parser.parse_args()
        decoded_id = decode_with_abort(track_id, full_ns)
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        current_user_id = get_current_user_id(args)

        args = {
            "track_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
        top_listeners = get_top_listeners_for_track(args)
        for row in top_listeners:
            row["user"] = extend_user(row["user"])
        return success_response(top_listeners)


top_listener_item = ns.model(
    "top_listener",
    {
        "count": fields.Integer(required=True),
        "user": fields.Nested(user_model, required=True),
    },
)

top_listener_response = make_response(
    "top_listener", ns, fields.List(fields.Nested(top_listener_item))
)


@ns.route("/<string:track_id>/top_listeners")
class TrackTopListeners(Resource):
    @ns.doc(
        id="""Get Track Top Listeners""",
        description="""Get the users that have listened to a track the most""",
        params={"track_id": "A Track ID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(pagination_with_current_user_parser)
    @ns.marshal_with(top_listener_response)
    @cache(ttl_sec=5)
    def get(self, track_id):
        args = pagination_with_current_user_parser.parse_args()
        decoded_id = decode_with_abort(track_id, ns)
        limit = get_default_max(args.get("limit"), 10, 100)
        offset = get_default_max(args.get("offset"), 0)
        current_user_id = get_current_user_id(args)

        args = {
            "track_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
        top_listeners = get_top_listeners_for_track(args)
        for row in top_listeners:
            row["user"] = extend_user(row["user"])
        return success_response(top_listeners)


full_track_stems_response = make_full_response(
    "stems_response", full_ns, fields.List(fields.Nested(stem_full))
)


@full_ns.route("/<string:track_id>/stems")
class FullTrackStems(Resource):
    @full_ns.doc(
        id="""Get Track Stems""",
        description="""Get the remixable stems of a track""",
        params={"track_id": "A Track ID"},
    )
    @full_ns.marshal_with(full_track_stems_response)
    @cache(ttl_sec=10)
    def get(self, track_id):
        decoded_id = decode_with_abort(track_id, full_ns)
        stems = get_stems_of(decoded_id)
        stems = list(map(stem_from_track, stems))
        return success_response(stems)


track_stems_response = make_response(
    "stems_response", ns, fields.List(fields.Nested(stem))
)


@ns.route("/<string:track_id>/stems")
class TrackStems(Resource):
    @ns.doc(
        id="""Get Track Stems""",
        description="""Get the remixable stems of a track""",
        params={"track_id": "A Track ID"},
    )
    @ns.marshal_with(track_stems_response)
    @cache(ttl_sec=10)
    def get(self, track_id):
        decoded_id = decode_with_abort(track_id, ns)
        stems = get_stems_of(decoded_id)
        stems = list(map(stem_from_track, stems))
        return success_response(stems)


track_remixables_route_parser = pagination_with_current_user_parser.copy()
track_remixables_route_parser.remove_argument("offset")
track_remixables_route_parser.add_argument(
    "with_users",
    required=False,
    type=bool,
    description="Boolean to include user info with tracks",
)

track_remixables_response = make_full_response(
    "remixables_response", full_ns, fields.List(fields.Nested(track_full))
)


@full_ns.route("/remixables")
class FullRemixableTracks(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Remixable Tracks""",
        description="""Gets a list of tracks that have stems available for remixing""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.expect(track_remixables_route_parser)
    @full_ns.marshal_with(track_remixables_response)
    @cache(ttl_sec=5)
    def get(self):
        args = track_remixables_route_parser.parse_args()
        current_user_id = get_current_user_id(args)
        args = {
            "current_user_id": current_user_id,
            "limit": get_default_max(args.get("limit"), 25, 100),
            "with_users": args.get("with_users", False),
        }
        tracks = get_remixable_tracks(args)
        tracks = list(map(extend_track, tracks))
        return success_response(tracks)


remixes_response = make_full_response(
    "remixes_response_full", full_ns, fields.Nested(remixes_response_model)
)


@full_ns.route("/<string:track_id>/remixes")
class FullRemixesRoute(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Track Remixes""",
        description="""Get all tracks that remix the given track""",
        params={"track_id": "A Track ID"},
    )
    @full_ns.expect(remixes_parser)
    @full_ns.marshal_with(remixes_response)
    @cache(ttl_sec=10)
    def get(self, track_id):
        decoded_id = decode_with_abort(track_id, full_ns)
        request_args = remixes_parser.parse_args()
        current_user_id = get_current_user_id(request_args)

        args = {
            "with_users": True,
            "track_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": format_limit(request_args, default_limit=10),
            "offset": format_offset(request_args),
            "sort_method": request_args.get("sort_method"),
            "only_cosigns": request_args.get("only_cosigns"),
            "only_contest_entries": request_args.get("only_contest_entries"),
        }
        response = get_remixes_of(args)
        response["tracks"] = list(map(extend_track, response["tracks"]))
        return success_response(response)


remixing_response = make_full_response(
    "remixing_response", full_ns, fields.List(fields.Nested(track_full))
)


@full_ns.route("/<string:track_id>/remixing")
class FullRemixingRoute(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Track Remix Parents""",
        description="""Gets all the tracks that the given track remixes""",
        params={"track_id": "A Track ID"},
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(remixing_response)
    @cache(ttl_sec=10)
    def get(self, track_id):
        decoded_id = decode_with_abort(track_id, full_ns)
        request_args = pagination_with_current_user_parser.parse_args()
        current_user_id = get_current_user_id(request_args)

        args = {
            "with_users": True,
            "track_id": decoded_id,
            "current_user_id": current_user_id,
            "limit": format_limit(request_args, default_limit=10),
            "offset": format_offset(request_args),
        }
        tracks = get_remix_track_parents(args)
        tracks = list(map(extend_track, tracks))
        return success_response(tracks)


"""
  Gets a windowed (over a certain timerange) view into the "top" of a certain type
  amongst followees. Requires an account.
  This endpoint is useful in generating views like:
      - New releases

  Args:
      window: (string) The window from now() to look back over. Supports  all standard SqlAlchemy interval notation (week, month, year, etc.).
      limit?: (number) default=25, max=100
"""
best_new_releases_parser = current_user_parser.copy()
best_new_releases_parser.add_argument(
    "window",
    required=True,
    choices=("week", "month", "year"),
    type=str,
    description="The window from now() to look back over",
)
best_new_releases_parser.add_argument(
    "limit",
    required=False,
    default=25,
    type=int,
    description="The number of tracks to get",
)
best_new_releases_parser.add_argument(
    "with_users",
    required=False,
    type=bool,
    description="Boolean to include user info with tracks",
)


@full_ns.route("/best_new_releases")
class BestNewReleases(Resource):
    @record_metrics
    @full_ns.doc(
        id="Get Best New Releases",
        description='Gets the tracks found on the "Best New Releases" smart playlist',
    )
    @full_ns.expect(best_new_releases_parser)
    @full_ns.marshal_with(full_tracks_response)
    @cache(ttl_sec=10)
    def get(self):
        request_args = best_new_releases_parser.parse_args()
        window = request_args.get("window")
        current_user_id = get_current_user_id(request_args)
        args = {
            "with_users": request_args.get("with_users"),
            "limit": format_limit(request_args, 100),
            "user_id": current_user_id,
        }
        tracks = get_top_followee_windowed("track", window, args)
        tracks = list(map(extend_track, tracks))
        return success_response(tracks)


"""
Discovery Provider Social Feed Overview
For a given user, current_user, we provide a feed of relevant content from around the audius network.
This is generated in the following manner:
  - Generate list of users followed by current_user, known as 'followees'
  - Query all track and public playlist reposts from followees
    - Generate list of reposted track ids and reposted playlist ids
  - Query all track and public playlists reposted OR created by followees, ordered by timestamp
    - At this point, 2 separate arrays one for playlists / one for tracks
  - Query additional metadata around feed entries in each array, repost + save counts, user repost boolean
  - Combine unsorted playlist and track arrays
  - Sort combined results by 'timestamp' field and return
"""

under_the_radar_parser = pagination_with_current_user_parser.copy()
under_the_radar_parser.add_argument(
    "filter",
    required=False,
    default="all",
    choices=("all", "repost", "original"),
    type=str,
    description="Filters for activity that is original vs reposts",
)
under_the_radar_parser.add_argument(
    "tracks_only",
    required=False,
    type=bool,
    description="Whether to only include tracks",
)
under_the_radar_parser.add_argument(
    "with_users",
    required=False,
    type=bool,
    description="Boolean to include user info with tracks",
)


@full_ns.route("/under_the_radar")
class UnderTheRadar(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Under the Radar Tracks""",
        description="""Gets the tracks found on the \"Under the Radar\" smart playlist""",
    )
    @full_ns.expect(under_the_radar_parser)
    @full_ns.marshal_with(full_tracks_response)
    @cache(ttl_sec=10)
    def get(self):
        request_args = under_the_radar_parser.parse_args()
        current_user_id = get_current_user_id(request_args)
        args = {
            "tracks_only": request_args.get("tracks_only"),
            "with_users": request_args.get("with_users"),
            "limit": format_limit(request_args, 100, 25),
            "offset": format_offset(request_args),
            "user_id": current_user_id,
            "filter": request_args.get("filter"),
        }
        feed_results = get_feed(args)
        feed_results = list(map(extend_track, feed_results))
        return success_response(feed_results)


most_loved_parser = current_user_parser.copy()
most_loved_parser.add_argument(
    "limit",
    required=False,
    default=25,
    type=int,
    description="Number of tracks to fetch",
)
most_loved_parser.add_argument(
    "with_users",
    required=False,
    type=bool,
    description="Boolean to include user info with tracks",
)


@full_ns.route("/most_loved")
class MostLoved(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Most Loved Tracks""",
        description="""Gets the tracks found on the \"Most Loved\" smart playlist""",
    )
    @full_ns.expect(most_loved_parser)
    @full_ns.marshal_with(full_tracks_response)
    @cache(ttl_sec=10)
    def get(self):
        request_args = most_loved_parser.parse_args()
        args = {
            "with_users": request_args.get("with_users"),
            "limit": format_limit(request_args, max_limit=100, default_limit=25),
            "user_id": get_current_user_id(request_args),
        }
        tracks = get_top_followee_saves("track", args)
        tracks = list(map(extend_track, tracks))
        return success_response(tracks)


feeling_lucky_parser = current_user_parser.copy()
feeling_lucky_parser.add_argument(
    "limit",
    required=False,
    default=25,
    type=int,
    description="Number of tracks to fetch",
)
feeling_lucky_parser.add_argument(
    "with_users",
    required=False,
    default=False,
    type=inputs.boolean,
    description="Boolean to include user info with tracks",
)
feeling_lucky_parser.add_argument(
    "min_followers",
    required=False,
    default=100,
    type=int,
    description="Fetch tracks from users with at least this number of followers",
)


@full_ns.route("/feeling_lucky")
class FeelingLucky(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Feeling Lucky Tracks""",
        description="""Gets random tracks found on the \"Feeling Lucky\" smart playlist""",
    )
    @full_ns.expect(feeling_lucky_parser)
    @full_ns.marshal_with(full_tracks_response)
    @cache(ttl_sec=10)
    def get(self):
        request_args = feeling_lucky_parser.parse_args()
        current_user_id = get_current_user_id(request_args)
        args = {
            "with_users": request_args.get("with_users"),
            "limit": format_limit(request_args, max_limit=100, default_limit=25),
            "user_id": current_user_id,
            "min_followers": request_args.get("min_followers"),
        }
        tracks = get_random_tracks(args)
        tracks = list(map(extend_track, tracks))
        return success_response(tracks)


full_usdc_purchase_tracks_parser = full_trending_parser.copy()


@full_ns.route(
    "/usdc-purchase",
    defaults={"version": DEFAULT_TRENDING_VERSIONS[TrendingType.TRACKS].name},
    strict_slashes=False,
    doc={
        "get": {
            "id": """Get Trending USDC Purchase Tracks""",
            "description": """Gets the top trending (most popular) USDC purchase tracks on Audius""",
            "responses": {200: "Success", 400: "Bad request", 500: "Server error"},
        }
    },
)
@full_ns.route(
    "/usdc-purchase/<string:version>",
    doc={
        "get": {
            "id": """Get Trending USDC Purchase Tracks With Version""",
            "description": """Gets the top trending (most popular) USDC purchase tracks on Audius using a given trending strategy version""",
            "params": {"version": "The strategy version of trending to use"},
        }
    },
)
class FullUSDCPurchaseTracks(Resource):
    @record_metrics
    @full_ns.doc()
    @full_ns.expect(full_usdc_purchase_tracks_parser)
    @full_ns.marshal_with(full_tracks_response)
    def get(self, version):
        trending_track_versions = trending_strategy_factory.get_versions_for_type(
            TrendingType.TRACKS
        ).keys()
        version_list = list(
            filter(lambda v: v.name == version, trending_track_versions)
        )
        if not version_list:
            abort_bad_path_param("version", full_ns)

        args = full_usdc_purchase_tracks_parser.parse_args()
        strategy = trending_strategy_factory.get_strategy(
            TrendingType.TRACKS, version_list[0]
        )
        premium_tracks = get_usdc_purchase_tracks(args, strategy)
        return success_response(premium_tracks)


@ns.route("/latest", doc=False)
class LatestTrack(Resource):
    @record_metrics
    @ns.doc(
        id="""Get Latest Track""",
        description="""Gets the most recent track on Audius""",
    )
    def get(self):
        args = {"limit": 1, "offset": 0}
        latest = get_latest_entities("track", args)
        return success_response(latest)


subsequent_tracks_parser = pagination_parser.copy()
subsequent_tracks_parser.remove_argument("offset")


@ns.route("/<string:track_id>/subsequent", doc=False)
class SubsequentTrack(Resource):
    @record_metrics
    @ns.doc(
        id="""Get subsequent tracks""",
        description="""Gets the next tracks by upload date""",
    )
    def get(self, track_id):
        request_args = subsequent_tracks_parser.parse_args()
        decoded_track_id = decode_with_abort(track_id, ns)
        limit = format_limit(request_args)

        subsequent_tracks = get_subsequent_tracks(decoded_track_id, limit)
        return success_response(subsequent_tracks)


@ns.route("/unclaimed_id", doc=False)
class GetUnclaimedTrackId(Resource):
    @ns.doc(
        id="""Get unclaimed track ID""",
        description="""Gets an unclaimed blockchain track ID""",
    )
    def get(self):
        unclaimed_id = get_unclaimed_id("track")
        return success_response(unclaimed_id)


access_info_response = make_response(
    "access_info_response", ns, fields.Nested(track_access_info)
)


@ns.route("/<string:track_id>/access-info")
class GetTrackAccessInfo(Resource):
    @record_metrics
    @ns.doc(
        id="Get Track Access Info",
        description="Gets the information necessary to access the track and what access the given user has.",
        params={"track_id": "A Track ID"},
    )
    @ns.expect(current_user_parser)
    @ns.marshal_with(access_info_response)
    def get(self, track_id: str):
        args = current_user_parser.parse_args()
        decoded_id = decode_with_abort(track_id, full_ns)
        current_user_id = get_current_user_id(args)
        get_track_args: GetTrackArgs = {
            "id": [decoded_id],
            "filter_deleted": True,
            "exclude_gated": False,
            "skip_unlisted_filter": True,
            "current_user_id": current_user_id,
        }
        tracks = get_tracks(get_track_args)
        if not tracks:
            abort_not_found(track_id, ns)
        raw = tracks[0]
        stream_conditions = get_extended_purchase_gate(gate=raw["stream_conditions"])
        download_conditions = get_extended_purchase_gate(
            gate=raw["download_conditions"]
        )
        track = extend_track(raw)
        track["stream_conditions"] = stream_conditions
        track["download_conditions"] = download_conditions
        return success_response(track)


@ns.route("/recent-premium")
class GetRecentPremiumTracks(Resource):
    @record_metrics
    @ns.doc(
        id="Get Recent Premium Tracks",
        description="Gets the most recently listed premium tracks",
    )
    @ns.expect(pagination_with_current_user_parser)
    @ns.marshal_with(tracks_response)
    def get(self):
        # This is stubbed, just generating docs
        abort_not_found("recent_premium", ns)


@full_ns.route("/recent-premium")
class GetRecentPremiumTracksFull(Resource):
    @record_metrics
    @full_ns.doc(
        id="Get Recent Premium Tracks",
        description="Gets the most recently listed premium tracks",
    )
    @full_ns.expect(pagination_with_current_user_parser)
    @full_ns.marshal_with(full_tracks_response)
    def get(self):
        # This is stubbed, just generating docs
        abort_not_found("recent_premium", full_ns)
