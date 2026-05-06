import logging  # pylint: disable=C0302
from typing import Any, Optional, TypedDict

from sqlalchemy.orm.session import Session

from src.gated_content.constants import SHOULD_TRENDING_EXCLUDE_GATED_TRACKS
from src.models.tracks.track import Track
from src.models.tracks.track_trending_score import TrackTrendingScore
from src.models.users.aggregate_user import AggregateUser
from src.queries.get_unpopulated_tracks import get_unpopulated_tracks
from src.queries.query_helpers import (
    get_users_by_id,
    get_users_ids,
    populate_track_metadata,
)

logger = logging.getLogger(__name__)

UNDERGROUND_TRENDING_LENGTH = 50


def make_get_unpopulated_tracks(session, limit, offset, strategy):
    # Get top 20 trending tracks to exclude
    top_trending_subquery = (
        session.query(TrackTrendingScore.track_id)
        .join(
            Track,
            Track.track_id == TrackTrendingScore.track_id,
        )
        .filter(
            TrackTrendingScore.type == strategy.trending_type.name,
            TrackTrendingScore.version == strategy.version.name,
            TrackTrendingScore.time_range == "week",
            Track.is_current == True,
            Track.is_delete == False,
            Track.is_unlisted == False,
            Track.is_available == True,
        )
        .order_by(
            TrackTrendingScore.score.desc(),
            TrackTrendingScore.track_id.desc(),
        )
        .limit(20)
        .subquery()
    )

    # Main query to get underground trending tracks
    underground_tracks_query = (
        session.query(
            TrackTrendingScore.track_id,
            TrackTrendingScore.score,
        )
        .join(
            Track,
            Track.track_id == TrackTrendingScore.track_id,
        )
        .join(
            AggregateUser,
            AggregateUser.user_id == Track.owner_id,
        )
        .filter(
            TrackTrendingScore.type == strategy.trending_type.name,
            TrackTrendingScore.version == strategy.version.name,
            TrackTrendingScore.time_range == "week",
            Track.is_current == True,
            Track.is_delete == False,
            Track.is_unlisted == False,
            Track.is_available == True,
            AggregateUser.follower_count < 1500,
            AggregateUser.following_count < 1500,
            TrackTrendingScore.track_id.notin_(top_trending_subquery),
        )
        .order_by(
            TrackTrendingScore.score.desc(),
            TrackTrendingScore.track_id.desc(),
        )
        .limit(limit)
        .offset(offset)
    )

    underground_tracks = underground_tracks_query.all()

    # Get unpopulated metadata
    track_ids = [track[0] for track in underground_tracks]
    tracks = get_unpopulated_tracks(
        session,
        track_ids,
        exclude_gated=SHOULD_TRENDING_EXCLUDE_GATED_TRACKS,
    )

    return (tracks, track_ids)


class GetUndergroundTrendingTrackArgs(TypedDict, total=False):
    current_user_id: Optional[Any]
    offset: int
    limit: int


def _get_underground_trending_with_session(
    session: Session,
    args: GetUndergroundTrendingTrackArgs,
    strategy,
    use_request_context=True,
):
    current_user_id = args.get("current_user_id", None)
    limit, offset = args.get("limit"), args.get("offset")

    (tracks, track_ids) = make_get_unpopulated_tracks(session, limit, offset, strategy)

    tracks = populate_track_metadata(session, track_ids, tracks, current_user_id)

    tracks_map = {track["track_id"]: track for track in tracks}

    # Re-sort the populated tracks b/c it loses sort order in sql query
    sorted_tracks = [tracks_map[track_id] for track_id in track_ids]
    user_id_list = get_users_ids(sorted_tracks)
    users = get_users_by_id(session, user_id_list, current_user_id, use_request_context)
    for track in sorted_tracks:
        user = users[track["owner_id"]]
        if user:
            track["user"] = user

    return sorted_tracks
