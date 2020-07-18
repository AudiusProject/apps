from sqlalchemy import func, desc, case, and_

from src import exceptions
from src.models import Track, Repost, RepostType, Save, SaveType, Remix
from src.utils import helpers
from src.utils.db_session import get_db_read_replica
from src.queries.query_helpers import get_current_user_id, populate_track_metadata, \
    paginate_query, add_users_to_tracks, create_save_count_subquery, \
    create_repost_count_subquery


def get_remixes_of(track_id, args):
    db = get_db_read_replica()
    with db.scoped_session() as session:
        # Fetch the parent track to get the track's owner id
        parent_track = session.query(Track).filter(
            Track.is_current == True,
            Track.track_id == track_id
        ).first()

        if parent_track == None:
            raise exceptions.ArgumentError("Invalid track_id provided")

        track_owner_id = parent_track.owner_id

        # Create subquery for save counts for sorting
        save_count_subquery = create_save_count_subquery(
            session, SaveType.track)

        # Create subquery for repost counts for sorting
        repost_count_subquery = create_repost_count_subquery(
            session, RepostType.track)

        # Get the 'children' remix tracks
        # Use the track owner id to fetch reposted/saved tracks returned first
        base_query = (
            session.query(
                Track
            )
            .join(
                Remix,
                and_(
                    Remix.child_track_id == Track.track_id,
                    Remix.parent_track_id == track_id
                )
            ).outerjoin(
                Save,
                and_(
                    Save.save_item_id == Track.track_id,
                    Save.save_type == SaveType.track,
                    Save.is_current == True,
                    Save.is_delete == False,
                    Save.user_id == track_owner_id
                )
            ).outerjoin(
                Repost,
                and_(
                    Repost.repost_item_id == Track.track_id,
                    Repost.user_id == track_owner_id,
                    Repost.repost_type == RepostType.track,
                    Repost.is_current == True,
                    Repost.is_delete == False
                )
            ).outerjoin(
                repost_count_subquery,
                repost_count_subquery.c['id'] == Track.track_id
            ).outerjoin(
                save_count_subquery,
                save_count_subquery.c['id'] == Track.track_id
            )
            .filter(
                Track.is_current == True,
                Track.is_delete == False,
                Track.is_unlisted == False
            )
            # 1. Co-signed tracks ordered by save + repost count
            # 2. Other tracks ordered by save + repost count
            .order_by(
                desc(
                    # If there is no "co-sign" for the track (no repost or save from the parent owner),
                    # defer to secondary sort
                    case(
                        [
                            (and_(Repost.created_at == None,
                                  Save.created_at == None), 0),
                        ],
                        else_=(
                            func.coalesce(repost_count_subquery.c.repost_count, 0) + \
                            func.coalesce(save_count_subquery.c.save_count, 0)
                        )
                    )
                ),
                # Order by saves + reposts
                desc(
                    func.coalesce(repost_count_subquery.c.repost_count, 0) + \
                    func.coalesce(save_count_subquery.c.save_count, 0)
                ),
                # Ties, pick latest track id
                desc(Track.track_id)
            )
        )

        (tracks, count) = paginate_query(base_query, True, True)
        tracks = tracks.all()
        tracks = helpers.query_result_to_list(tracks)
        track_ids = list(map(lambda track: track["track_id"], tracks))
        current_user_id = get_current_user_id(required=False)
        tracks = populate_track_metadata(
            session, track_ids, tracks, current_user_id)

        if "with_users" in args and args.get("with_users") != 'false':
            add_users_to_tracks(session, tracks)

    return {'tracks': tracks, 'count': count}
