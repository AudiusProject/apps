"""DB-only scheduled release publish (parity with @pedalboard/publish-scheduled-releases).

Used by integration tests after Celery task removal from discovery-provider.
"""

from sqlalchemy import func

from src.models.playlists.playlist import Playlist
from src.models.tracks.track import Track
from src.tasks.entity_manager.utils import create_remix_contest_notification

batch_size = 100


def publish_scheduled_releases_session(session):
    tracks_to_release = (
        session.query(Track)
        .filter(
            Track.is_unlisted == True,
            Track.is_scheduled_release == True,
            Track.release_date != None,
            Track.release_date < func.current_timestamp(),
        )
        .order_by(Track.created_at.asc())
        .limit(batch_size)
        .all()
    )
    if len(tracks_to_release) == 0:
        pass
    else:
        for track in tracks_to_release:
            track.is_unlisted = False
            create_remix_contest_notification(session, track)

    playlists_to_release = (
        session.query(Playlist)
        .filter(
            Playlist.is_private == True,
            Playlist.is_album == True,
            Playlist.is_scheduled_release == True,
            Playlist.release_date != None,
            Playlist.release_date < func.current_timestamp(),
        )
        .order_by(Playlist.created_at.asc())
        .limit(batch_size)
        .all()
    )

    for playlist in playlists_to_release:
        playlist.is_private = False
