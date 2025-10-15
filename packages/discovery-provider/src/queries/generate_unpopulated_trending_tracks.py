import logging
from typing import Optional

from sqlalchemy import desc, text
from sqlalchemy.orm.session import Session

from src.gated_content.constants import SHOULD_TRENDING_EXCLUDE_GATED_TRACKS
from src.models.tracks.track import Track
from src.models.tracks.track_trending_score import TrackTrendingScore
from src.queries.get_unpopulated_tracks import get_unpopulated_tracks
from src.trending_strategies.base_trending_strategy import BaseTrendingStrategy

logger = logging.getLogger(__name__)

TRENDING_TRACKS_LIMIT = 100


def make_generate_unpopulated_trending(
    session: Session,
    genre: Optional[str],
    time_range: str,
    strategy: BaseTrendingStrategy,
    exclude_gated: bool = SHOULD_TRENDING_EXCLUDE_GATED_TRACKS,
    usdc_purchase_only: bool = False,
    limit: int = TRENDING_TRACKS_LIMIT,
):
    # year time_range equates to allTime for current implementations
    if time_range == "year":
        time_range = "allTime"

    trending_scores_query = session.query(
        TrackTrendingScore.track_id, TrackTrendingScore.score
    ).filter(
        TrackTrendingScore.type == strategy.trending_type.name,
        TrackTrendingScore.version == strategy.version.name,
        TrackTrendingScore.time_range == time_range,
    )

    if genre:
        trending_scores_query = trending_scores_query.filter(
            TrackTrendingScore.genre == genre
        )

    trending_track_ids_subquery = trending_scores_query.subquery()
    trending_track_ids_query = (
        session.query(
            trending_track_ids_subquery.c.track_id,
            trending_track_ids_subquery.c.score,
            Track.track_id,
        )
        .join(
            trending_track_ids_subquery,
            Track.track_id == trending_track_ids_subquery.c.track_id,
        )
        .filter(
            Track.is_current == True,
            Track.is_delete == False,
            Track.is_unlisted == False,
            Track.stem_of == None,
        )
    )

    # If usdc_purchase_only is true, then filter out track ids belonging to
    # non-USDC purchase tracks before applying the limit.
    if usdc_purchase_only:
        trending_track_ids_query = trending_track_ids_query.filter(
            Track.is_stream_gated == True,
            text("CAST(stream_conditions AS TEXT) LIKE '%usdc_purchase%'"),
        )
    # If exclude_gated is true, then filter out track ids belonging to
    # gated tracks before applying the limit.
    elif exclude_gated:
        trending_track_ids_query = trending_track_ids_query.filter(
            Track.is_stream_gated == False,
        )

    trending_track_ids = (
        trending_track_ids_query.order_by(
            desc(trending_track_ids_subquery.c.score),
            desc(trending_track_ids_subquery.c.track_id),
        )
        .limit(limit)
        .all()
    )

    # Get unpopulated metadata
    track_ids = [track_id[0] for track_id in trending_track_ids]
    tracks = get_unpopulated_tracks(session, track_ids, exclude_gated=exclude_gated)

    return (tracks, track_ids)
