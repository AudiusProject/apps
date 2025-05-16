from sqlalchemy import func

from src.models.playlists.playlist import Playlist
from src.models.tracks.track import Track
from src.tasks.celery_app import celery
from src.tasks.entity_manager.utils import create_remix_contest_notification
from src.utils.structured_logger import StructuredLogger, log_duration
from src.utils.web3_provider import get_eth_web3

logger = StructuredLogger(__name__)
web3 = get_eth_web3()
publish_scheduled_releases_cursor_key = "publish_scheduled_releases_cursor"
batch_size = 100


@log_duration(logger)
def _publish_scheduled_releases(session):
    tracks_to_release = (
        session.query(Track)
        .filter(
            Track.is_unlisted == True,
            Track.is_scheduled_release == True,
            Track.release_date != None,  # Filter for non-null release_date
            Track.release_date < func.current_timestamp(),
        )
        .order_by(Track.created_at.asc())
        .limit(batch_size)
        .all()
    )
    if len(tracks_to_release) == 0:
        return

    logger.info(f"Found {len(tracks_to_release)} tracks ready for release")

    for track in tracks_to_release:
        logger.debug(f"Releasing track {track.track_id}")
        track.is_unlisted = False
        create_remix_contest_notification(session, track)

    playlists_to_release = (
        session.query(Playlist)
        .filter(
            Playlist.is_private == True,
            Playlist.is_album == True,  # Only support albums for now
            Playlist.is_scheduled_release == True,
            Playlist.release_date != None,  # Filter for non-null release_date
            Playlist.release_date < func.current_timestamp(),
        )
        .order_by(Playlist.created_at.asc())
        .limit(batch_size)
        .all()
    )
    logger.debug(f"Found {len(playlists_to_release)} albums ready for release")

    for playlist in playlists_to_release:
        logger.debug(f"Releasing album {playlist.playlist_id}")
        playlist.is_private = False


# ####### CELERY TASKS ####### #
@celery.task(name="publish_scheduled_releases", bind=True)
def publish_scheduled_releases(self):
    redis = publish_scheduled_releases.redis
    db = publish_scheduled_releases.db

    # Define lock acquired boolean
    have_lock = False
    # Define redis lock object
    update_lock = redis.lock(
        "publish_scheduled_releases_lock", blocking_timeout=25, timeout=600
    )
    try:
        have_lock = update_lock.acquire(blocking=False)
        if have_lock:
            with db.scoped_session() as session:
                _publish_scheduled_releases(session)

        else:
            logger.debug("Failed to acquire lock")
    except Exception as e:
        logger.error(f"ERROR caching node info {e}")
        raise e
    finally:
        if have_lock:
            update_lock.release()
