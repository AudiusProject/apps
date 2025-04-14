from sqlalchemy import and_, desc, func, or_
from sqlalchemy.orm import aliased

from src import exceptions
from src.models.events.event import Event, EventType
from src.models.social.aggregate_plays import AggregatePlay
from src.models.social.repost import Repost, RepostType
from src.models.social.save import Save, SaveType
from src.models.tracks.aggregate_track import AggregateTrack
from src.models.tracks.remix import Remix
from src.models.tracks.track import Track
from src.queries.get_unpopulated_tracks import get_unpopulated_tracks
from src.queries.query_helpers import (
    RemixesSortMethod,
    add_query_pagination,
    add_users_to_tracks,
    populate_track_metadata,
)
from src.utils import helpers
from src.utils.db_session import get_db_read_replica

UNPOPULATED_REMIXES_CACHE_DURATION_SEC = 10


def get_remixes_of(args):
    track_id = args.get("track_id")
    current_user_id = args.get("current_user_id")
    limit, offset = args.get("limit"), args.get("offset")
    sort_method = args.get("sort_method", "recent")
    only_cosigns = args.get("only_cosigns", False)
    only_contest_entries = args.get("only_contest_entries", False)

    db = get_db_read_replica()

    with db.scoped_session() as session:

        def get_unpopulated_remixes():
            # Fetch the parent track to get the track's owner id
            parent_track_res = get_unpopulated_tracks(
                session=session,
                track_ids=[track_id],
                filter_deleted=False,
                filter_unlisted=False,
            )

            if not parent_track_res or parent_track_res[0] is None:
                raise exceptions.ArgumentError("Invalid track_id provided")

            parent_track = parent_track_res[0]
            track_owner_id = parent_track["owner_id"]

            # Get the 'children' remix tracks
            # Use the track owner id to fetch reposted/saved tracks returned first
            ParentTrack = aliased(Track)

            base_query = (
                session.query(Track)
                .join(
                    Remix,
                    and_(
                        Remix.child_track_id == Track.track_id,
                        Remix.parent_track_id == track_id,
                    ),
                )
                .outerjoin(
                    Save,
                    and_(
                        Save.save_item_id == Track.track_id,
                        Save.save_type == SaveType.track,
                        Save.is_current == True,
                        Save.is_delete == False,
                        Save.user_id == track_owner_id,
                    ),
                )
                .outerjoin(
                    Repost,
                    and_(
                        Repost.repost_item_id == Track.track_id,
                        Repost.user_id == track_owner_id,
                        Repost.repost_type == RepostType.track,
                        Repost.is_current == True,
                        Repost.is_delete == False,
                    ),
                )
                .outerjoin(
                    AggregateTrack,
                    AggregateTrack.track_id == Track.track_id,
                )
                .outerjoin(
                    AggregatePlay,
                    AggregatePlay.play_item_id == Track.track_id,
                )
                .outerjoin(ParentTrack, ParentTrack.track_id == Remix.parent_track_id)
                .outerjoin(
                    Event,
                    and_(
                        Event.entity_id == ParentTrack.track_id,
                        Event.event_type == EventType.remix_contest,
                    ),
                )
                .filter(
                    Track.is_current == True,
                    Track.is_delete == False,
                    Track.is_unlisted == False,
                )
            )
            if only_cosigns:
                base_query = base_query.filter(
                    or_(
                        ParentTrack.owner_id == Save.user_id,
                        ParentTrack.owner_id == Repost.user_id,
                    )
                )
            print(f"asdf only_contest_entries {only_contest_entries}")
            if only_contest_entries:
                base_query = base_query.filter(
                    and_(
                        Event.created_at <= Track.created_at,
                        Track.created_at <= Event.end_date,
                    )
                )

            if sort_method == RemixesSortMethod.recent:
                base_query = base_query.order_by(
                    desc(Track.created_at), desc(Track.track_id)
                )
            elif sort_method == RemixesSortMethod.likes:
                base_query = base_query.order_by(
                    desc(func.coalesce(AggregateTrack.save_count, 0)),
                    desc(Track.track_id),
                )
            elif sort_method == RemixesSortMethod.plays:
                base_query = base_query.order_by(
                    desc(func.coalesce(AggregatePlay.count, 0)), desc(Track.track_id)
                )

            (tracks, count) = add_query_pagination(
                base_query, limit, offset, True, True
            )
            print(f"asdf base_query: {base_query}")
            tracks = tracks.all()
            tracks = helpers.query_result_to_list(tracks)
            track_ids = list(map(lambda track: track["track_id"], tracks))
            return (tracks, track_ids, count)

        (tracks, track_ids, count) = get_unpopulated_remixes()
        tracks = populate_track_metadata(session, track_ids, tracks, current_user_id)
        if args.get("with_users", False):
            add_users_to_tracks(session, tracks, current_user_id)

    return {"tracks": tracks, "count": count}
