from datetime import datetime, timezone
from typing import Union

from sqlalchemy import desc
from sqlalchemy.orm.session import Session

from src.challenges.challenge_event import ChallengeEvent
from src.challenges.challenge_event_bus import ChallengeEventBus
from src.exceptions import IndexingValidationError
from src.gated_content.constants import USDC_PURCHASE_KEY
from src.models.playlists.album_price_history import AlbumPriceHistory
from src.models.playlists.playlist import Playlist
from src.models.playlists.playlist_route import PlaylistRoute
from src.models.playlists.playlist_track import PlaylistTrack
from src.models.tracks.track import Track
from src.tasks.entity_manager.utils import (
    CHARACTER_LIMIT_DESCRIPTION,
    PLAYLIST_ID_OFFSET,
    PLAYLIST_TRACK_LIMIT,
    Action,
    EntityType,
    ManageEntityParameters,
    convert_legacy_purchase_access_gate,
    copy_record,
    parse_release_date,
    validate_signer,
)
from src.tasks.metadata import immutable_playlist_fields
from src.tasks.task_helpers import generate_slug_and_collision_id
from src.utils import helpers
from src.utils.structured_logger import StructuredLogger

logger = StructuredLogger(__name__)


def update_playlist_routes_table(
    params: ManageEntityParameters, playlist_record: Playlist, is_create: bool
):
    pending_playlist_routes = params.pending_playlist_routes
    session = params.session

    params.logger.debug(
        f"index.py | playlists.py | Updating playlist routes for {playlist_record.playlist_id}"
    )
    # Get the title slug, and set the new slug to that
    # (will check for conflicts later)
    new_playlist_slug_title = helpers.sanitize_slug(
        playlist_record.playlist_name, playlist_record.playlist_id
    )
    new_playlist_slug = new_playlist_slug_title

    # Find the current route for the playlist
    # Check the pending playlist route updates first

    # Then query the DB if necessary
    prev_playlist_route_record = params.existing_records["PlaylistRoute"].get(
        playlist_record.playlist_id
    )

    if prev_playlist_route_record:
        if prev_playlist_route_record.title_slug == new_playlist_slug_title:
            # If the title slug hasn't changed, we have no work to do
            params.logger.debug(f"not changing for {playlist_record.playlist_id}")
            return

    new_playlist_slug, new_collision_id = generate_slug_and_collision_id(
        session,
        PlaylistRoute,
        playlist_record.playlist_id,
        playlist_record.playlist_name,
        playlist_record.playlist_owner_id,
        pending_playlist_routes,
        new_playlist_slug_title,
        new_playlist_slug,
    )

    # Add the new playlist route
    new_playlist_route = PlaylistRoute()
    new_playlist_route.slug = new_playlist_slug
    new_playlist_route.title_slug = new_playlist_slug_title
    new_playlist_route.collision_id = new_collision_id
    new_playlist_route.owner_id = playlist_record.playlist_owner_id
    new_playlist_route.playlist_id = playlist_record.playlist_id
    new_playlist_route.is_current = True
    new_playlist_route.blockhash = playlist_record.blockhash
    new_playlist_route.blocknumber = playlist_record.blocknumber
    new_playlist_route.txhash = playlist_record.txhash

    if is_create:
        # playlist-name-<id>
        migration_playlist_slug_title = helpers.sanitize_slug(
            playlist_record.playlist_name,
            playlist_record.playlist_id,
            playlist_record.playlist_id,
        )
        migration_playlist_slug = migration_playlist_slug_title

        migration_playlist_route = PlaylistRoute()
        migration_playlist_route.slug = migration_playlist_slug
        migration_playlist_route.title_slug = migration_playlist_slug_title
        migration_playlist_route.collision_id = new_collision_id
        migration_playlist_route.owner_id = playlist_record.playlist_owner_id
        migration_playlist_route.playlist_id = playlist_record.playlist_id
        migration_playlist_route.is_current = False
        migration_playlist_route.blockhash = playlist_record.blockhash
        migration_playlist_route.blocknumber = playlist_record.blocknumber
        migration_playlist_route.txhash = playlist_record.txhash
        params.add_record(
            migration_playlist_route.playlist_id,
            migration_playlist_route,
            EntityType.PLAYLIST_ROUTE,
        )

    params.add_record(
        new_playlist_route.playlist_id, new_playlist_route, EntityType.PLAYLIST_ROUTE
    )

    # Add to pending playlist routes so we don't add the same route twice
    pending_playlist_routes.append(new_playlist_route)

    params.logger.debug(
        f"index.py | playlists.py | Updated playlist routes for {playlist_record.playlist_id} with slug {new_playlist_slug} and owner_id {new_playlist_route.owner_id}"
    )


def update_playlist_tracks(params: ManageEntityParameters, playlist_record: Playlist):
    # Update the playlist_tracks table
    session = params.session
    existing_playlist_tracks = (
        session.query(PlaylistTrack)
        .filter(
            PlaylistTrack.playlist_id == params.entity_id,
        )
        .all()
    )
    existing_tracks = {track.track_id: track for track in existing_playlist_tracks}
    playlist_contents = dict(playlist_record.playlist_contents)
    track_ids = playlist_contents.get("track_ids", [])

    updated_track_ids = [track["track"] for track in track_ids]
    params.logger.debug(
        f"playlists.py | Updating playlist tracks for {playlist_record.playlist_id}"
    )

    # Build a unique list of track IDs from both existing and updated tracks and fetch them
    track_ids = list(set(list(existing_tracks.keys()) + updated_track_ids))

    track_records = session.query(Track).filter(Track.track_id.in_(track_ids)).all()
    track_records_dict = {track.track_id: track for track in track_records}

    # delete relations that previously existed but are not in the updated list
    # Note: we are checking the tracks and only touching the models if things
    # actually need to change to avoid unnecessary DB updates across a bunch of Track rows
    for playlist_track in existing_playlist_tracks:
        if playlist_track.track_id not in updated_track_ids:
            if not playlist_track.is_removed:
                playlist_track.is_removed = True
                playlist_track.updated_at = params.block_datetime

            track_record = track_records_dict.get(playlist_track.track_id)
            if track_record:
                # remove from playlists_containing_track if necessary
                if (
                    track_record.playlists_containing_track
                    and playlist_record.playlist_id
                    in track_record.playlists_containing_track
                ):
                    updated_playlists = list(track_record.playlists_containing_track)
                    updated_playlists.remove(playlist_record.playlist_id)
                    track_record.playlists_containing_track = updated_playlists
                    track_record.updated_at = params.block_datetime

                # Update playlists_previously_containing_track if necessary
                if not track_record.playlists_previously_containing_track or (
                    track_record.playlists_previously_containing_track
                    and str(playlist_record.playlist_id)
                    not in track_record.playlists_previously_containing_track
                ):
                    updated_playlists_previously_containing_track = (
                        dict(track_record.playlists_previously_containing_track)
                        if track_record.playlists_previously_containing_track
                        else {}
                    )
                    updated_playlists_previously_containing_track[
                        str(playlist_record.playlist_id)
                    ] = {"time": params.block_integer_time}
                    track_record.playlists_previously_containing_track = (
                        updated_playlists_previously_containing_track
                    )
                    track_record.updated_at = params.block_datetime

    for track_id in updated_track_ids:
        # add playlist_id to playlists_containing_track and remove from playlists_previously_containing_track
        track_record = track_records_dict.get(track_id)
        if track_record:
            current_playlist_id = playlist_record.playlist_id
            # add playlist_id to playlists_containing_track if it's not already there
            if (
                not track_record.playlists_containing_track
                or current_playlist_id not in track_record.playlists_containing_track
            ):
                if not track_record.playlists_containing_track:
                    track_record.playlists_containing_track = [current_playlist_id]
                else:
                    updated_playlists = list(track_record.playlists_containing_track)
                    updated_playlists.append(current_playlist_id)
                    track_record.playlists_containing_track = updated_playlists
                track_record.updated_at = params.block_datetime

            if (
                str(current_playlist_id)
                in track_record.playlists_previously_containing_track
            ):
                updated_playlists_previously_containing_track = dict(
                    track_record.playlists_previously_containing_track
                )
                del updated_playlists_previously_containing_track[
                    str(current_playlist_id)
                ]
                track_record.playlists_previously_containing_track = (
                    updated_playlists_previously_containing_track
                )
                track_record.updated_at = params.block_datetime

        # add row for each track that is not already in the table
        if track_id not in existing_tracks:
            new_playlist_track = PlaylistTrack(
                playlist_id=playlist_record.playlist_id,
                track_id=track_id,
                is_removed=False,
                created_at=params.block_datetime,
                updated_at=params.block_datetime,
            )
            # upsert to handle duplicates
            session.merge(new_playlist_track)
        elif existing_tracks[track_id].is_removed:
            # recover deleted relation (track was previously removed then re-added)
            existing_tracks[track_id].is_removed = False
            existing_tracks[track_id].updated_at = params.block_datetime

    params.logger.debug(
        f"playlists.py | Updated playlist tracks for {playlist_record.playlist_id}"
    )


def update_album_price_history(
    session: Session,
    playlist_record: Playlist,
    playlist_metadata: dict,
    blocknumber: int,
    timestamp: datetime,
):
    """Adds an entry in the track price history table to record the price change of a track or change of splits if necessary."""
    new_record = None
    is_stream_gated = playlist_metadata.get(
        "is_stream_gated", False
    ) and playlist_metadata.get("stream_conditions", None)
    if is_stream_gated:
        # Convert legacy conditions to new array format with user IDs if necessary
        conditions = convert_legacy_purchase_access_gate(
            playlist_record.playlist_owner_id,
            playlist_metadata["stream_conditions"],
        )
        if USDC_PURCHASE_KEY in conditions:
            usdc_purchase = conditions[USDC_PURCHASE_KEY]
            new_record = AlbumPriceHistory()
            new_record.playlist_id = playlist_record.playlist_id
            new_record.block_timestamp = timestamp
            new_record.blocknumber = blocknumber
            new_record.splits = {}
            if "price" in usdc_purchase:
                price = usdc_purchase["price"]
                if isinstance(price, int):
                    new_record.total_price_cents = price
                else:
                    raise IndexingValidationError(
                        "Invalid type of usdc_purchase gated conditions 'price'"
                    )
            else:
                raise IndexingValidationError(
                    "Price missing from usdc_purchase gated conditions"
                )

            if "splits" in usdc_purchase:
                splits = usdc_purchase["splits"]
                # TODO: [PAY-2553] better validation of splits
                if isinstance(splits, list):
                    new_record.splits = splits
                else:
                    raise IndexingValidationError(
                        "Invalid type of usdc_purchase gated conditions 'splits'"
                    )
            else:
                raise IndexingValidationError(
                    "Splits missing from usdc_purchase gated conditions"
                )
    if new_record:
        old_record: Union[AlbumPriceHistory, None] = (
            session.query(AlbumPriceHistory)
            .filter(AlbumPriceHistory.playlist_id == playlist_record.playlist_id)
            .order_by(desc(AlbumPriceHistory.block_timestamp))
            .first()
        )
        if (
            not old_record
            or old_record.block_timestamp != new_record.block_timestamp
            and (
                old_record.total_price_cents != new_record.total_price_cents
                or old_record.splits != new_record.splits
            )
        ):
            logger.debug(
                f"playlist.py | Updating price history for {playlist_record.playlist_id}. Old record={old_record} New record={new_record}"
            )
            session.add(new_record)


def get_playlist_events_tx(update_task, event_type, tx_receipt):
    return getattr(update_task.playlist_contract.events, event_type)().process_receipt(
        tx_receipt
    )


def validate_playlist_tx(params: ManageEntityParameters):
    user_id = params.user_id
    playlist_id = params.entity_id

    validate_signer(params)

    if params.entity_type != EntityType.PLAYLIST:
        raise IndexingValidationError(
            f"Entity type {params.entity_type} is not a playlist"
        )

    if params.action == Action.CREATE:
        if playlist_id in params.existing_records["Playlist"]:
            raise IndexingValidationError(
                f"Cannot create playlist {playlist_id} that already exists"
            )
        if playlist_id < PLAYLIST_ID_OFFSET:
            raise IndexingValidationError(
                f"Cannot create playlist {playlist_id} below the offset"
            )
    else:
        if playlist_id not in params.existing_records["Playlist"]:
            raise IndexingValidationError(
                f"Cannot update playlist {playlist_id} that does not exist"
            )
        existing_playlist: Playlist = params.existing_records["Playlist"][playlist_id]
        if existing_playlist.playlist_owner_id != user_id:
            raise IndexingValidationError(
                f"Cannot update playlist {playlist_id} that does not belong to user {user_id}"
            )
    if params.action == Action.CREATE or params.action == Action.UPDATE:
        if not params.metadata:
            raise IndexingValidationError(
                "Metadata is required for playlist creation and update"
            )
        playlist_description = params.metadata.get("description")
        if (
            playlist_description
            and len(playlist_description) > CHARACTER_LIMIT_DESCRIPTION
        ):
            raise IndexingValidationError(
                f"Playlist {playlist_id} description exceeds character limit {CHARACTER_LIMIT_DESCRIPTION}"
            )
        if params.metadata.get("playlist_contents"):
            # Handle nested dictionary or array formats
            track_items = (
                params.metadata["playlist_contents"].get("track_ids")
                if isinstance(params.metadata["playlist_contents"], dict)
                else params.metadata["playlist_contents"]
            )

            if not isinstance(track_items, list):
                raise IndexingValidationError(
                    "playlist contents must be a list of tracks"
                )

            if len(track_items) > PLAYLIST_TRACK_LIMIT:
                raise IndexingValidationError(
                    f"Playlist {playlist_id} exceeds track limit {PLAYLIST_TRACK_LIMIT}"
                )

        validate_access_conditions(params)


def validate_access_conditions(params: ManageEntityParameters):
    playlist_metadata = params.metadata

    is_stream_gated = playlist_metadata.get("is_stream_gated")
    stream_conditions = playlist_metadata.get("stream_conditions", {}) or {}

    if is_stream_gated:
        # if stream gated, must have stream conditions
        if not stream_conditions:
            raise IndexingValidationError(
                f"Playlist {params.entity_id} is stream gated but has no stream conditions"
            )
        # must be gated on a single condition
        if len(stream_conditions) != 1:
            raise IndexingValidationError(
                f"Playlist {params.entity_id} has an invalid number of stream conditions"
            )


def create_playlist(params: ManageEntityParameters):
    validate_playlist_tx(params)

    playlist_id = params.entity_id
    tracks = (
        params.metadata["playlist_contents"].get("track_ids", [])
        if isinstance(params.metadata["playlist_contents"], dict)
        else params.metadata["playlist_contents"]
    )
    tracks_with_index_time = []
    last_added_to = None

    created_at = params.block_datetime
    for track in tracks:
        track_id = track.get("track") or track.get("track_id")
        track_time = track.get("timestamp") or track.get("time")
        if not track_id or not track_time:
            raise IndexingValidationError(
                f"Cannot add {track} to playlist {playlist_id}"
            )

        tracks_with_index_time.append(
            {
                "track": track_id,
                "metadata_time": track_time,
                "time": params.block_integer_time,
            }
        )
        last_added_to = params.block_datetime

    # Convert stream conditions from legacy format to new format
    stream_conditions = convert_legacy_purchase_access_gate(
        params.user_id, params.metadata.get("stream_conditions", None)
    )

    playlist_record = Playlist(
        playlist_id=playlist_id,
        metadata_multihash=params.metadata_cid,
        playlist_owner_id=params.user_id,
        is_album=params.metadata.get("is_album", False),
        description=params.metadata["description"],
        playlist_image_multihash=params.metadata["playlist_image_sizes_multihash"],
        playlist_image_sizes_multihash=params.metadata[
            "playlist_image_sizes_multihash"
        ],
        playlist_name=params.metadata["playlist_name"],
        release_date=str(params.block_datetime),  # type:ignore
        is_scheduled_release=params.metadata.get("is_scheduled_release", False),
        is_private=params.metadata.get("is_private", False),
        is_image_autogenerated=params.metadata.get("is_image_autogenerated", False),
        is_stream_gated=params.metadata.get("is_stream_gated", False),
        stream_conditions=stream_conditions,
        playlist_contents={"track_ids": tracks_with_index_time},
        created_at=created_at,
        updated_at=params.block_datetime,
        blocknumber=params.block_number,
        blockhash=params.event_blockhash,
        txhash=params.txhash,
        last_added_to=last_added_to,
        is_current=False,
        is_delete=False,
        ddex_app=params.metadata.get("ddex_app", None),
        ddex_release_ids=params.metadata.get("ddex_release_ids", None),
        artists=params.metadata.get("artists", None),
        copyright_line=params.metadata.get("copyright_line", None),
        producer_copyright_line=params.metadata.get("producer_copyright_line", None),
        parental_warning_type=params.metadata.get("parental_warning_type", None),
        upc=params.metadata.get("upc", None),
    )

    update_playlist_routes_table(params, playlist_record, True)

    populate_playlist_record_metadata(playlist_record, params)

    params.add_record(playlist_id, playlist_record)

    update_playlist_tracks(params, playlist_record)

    update_album_price_history(
        params.session,
        playlist_record,
        params.metadata,
        params.block_number,
        params.block_datetime,
    )

    if tracks:
        dispatch_challenge_playlist_upload(
            params.challenge_bus,
            params.block_number,
            params.block_datetime,
            playlist_record,
        )


def dispatch_challenge_playlist_upload(
    bus: ChallengeEventBus,
    block_number: int,
    block_datetime: datetime,
    playlist_record: Playlist,
):
    # Adds challenge for creating your first playlist and adding a track to it.
    bus.dispatch(
        ChallengeEvent.first_playlist,
        block_number,
        block_datetime,
        playlist_record.playlist_owner_id,
    )


def validate_update_ddex_playlist(params: ManageEntityParameters, playlist_record):
    if playlist_record.ddex_app:
        if playlist_record.ddex_app != params.signer:
            raise IndexingValidationError(
                f"Signer {params.signer} does not have permission to {params.action} DDEX playlist {playlist_record.playlist_id}"
            )


def update_playlist(params: ManageEntityParameters):
    validate_playlist_tx(params)
    # TODO ignore updates on deleted playlists?

    playlist_id = params.entity_id
    existing_playlist = params.existing_records["Playlist"][playlist_id]
    if (
        playlist_id in params.new_records["Playlist"]
    ):  # override with last updated playlist is in this block
        existing_playlist = params.new_records["Playlist"][playlist_id][-1]

    validate_update_ddex_playlist(params, existing_playlist)

    playlist_record = copy_record(
        existing_playlist,
        params.block_number,
        params.event_blockhash,
        params.txhash,
        params.block_datetime,
    )

    populate_playlist_record_metadata(playlist_record, params)

    update_playlist_routes_table(params, playlist_record, False)

    update_playlist_tracks(params, playlist_record)

    params.add_record(playlist_id, playlist_record)

    update_album_price_history(
        params.session,
        playlist_record,
        params.metadata,
        params.block_number,
        params.block_datetime,
    )

    if playlist_record.playlist_contents["track_ids"]:
        dispatch_challenge_playlist_upload(
            params.challenge_bus,
            params.block_number,
            params.block_datetime,
            playlist_record,
        )


def delete_playlist(params: ManageEntityParameters):
    validate_playlist_tx(params)

    existing_playlist = params.existing_records["Playlist"][params.entity_id]
    if params.entity_id in params.new_records["Playlist"]:
        # override with last updated playlist is in this block
        existing_playlist = params.new_records["Playlist"][params.entity_id][-1]

    validate_update_ddex_playlist(params, existing_playlist)

    deleted_playlist = copy_record(
        existing_playlist,
        params.block_number,
        params.event_blockhash,
        params.txhash,
        params.block_datetime,
    )
    deleted_playlist.is_delete = True

    params.add_record(params.entity_id, deleted_playlist)


def process_playlist_contents(
    playlist_record, playlist_metadata, block_integer_time, existing_track_records
):
    updated_tracks = []
    # Incoming tracks can be legacy format (dict with track_ids) or new format (array of objects)
    track_items = (
        playlist_metadata["playlist_contents"].get("track_ids")
        if isinstance(playlist_metadata["playlist_contents"], dict)
        else playlist_metadata["playlist_contents"]
    )

    if not isinstance(track_items, list):
        raise IndexingValidationError(
            f"Invalid playlist_contents format: {playlist_metadata['playlist_contents']}"
        )

    for track in track_items:
        # Prefer track_id, use legacy track field otherwise
        track_id = track.get("track") or track.get("track_id")
        # Prefer metadata_timestamp if it exists, otherwise use timestamp or the legacy time field
        metadata_time = (
            track.get("metadata_timestamp")
            or track.get("timestamp")
            or track.get("time")
        )
        index_time = (
            block_integer_time  # default index time to current block for new tracks
        )

        if not track_id:
            raise IndexingValidationError(
                f"Track object missing track/track_id field: {track}"
            )

        if not isinstance(track_id, int):
            decoded = helpers.decode_string_id(str(track_id))
            if decoded is None:
                logger.warning(
                    f"playlists.py | Skipping non-integer track_id in playlist_contents: {track_id}"
                )
                continue
            track_id = decoded

        track_metadata = existing_track_records.get(track_id)
        if playlist_record.is_album and (
            not track_metadata
            or (track_metadata.owner_id != playlist_record.playlist_owner_id)
        ):
            continue

        previous_playlist_tracks = playlist_record.playlist_contents["track_ids"]
        for previous_track in previous_playlist_tracks:
            previous_track_id = previous_track["track"]
            # prefer metadata_time to check if track was already in playlist
            previous_track_time = (
                previous_track.get("metadata_time") or previous_track["time"]
            )
            if previous_track_id == track_id and previous_track_time == metadata_time:
                index_time = previous_track_time

        updated_tracks.append(
            {
                "track": track_id,
                "time": index_time,
                "metadata_time": metadata_time,
            }
        )

    return {"track_ids": updated_tracks}


def populate_playlist_record_metadata(
    playlist_record,
    params: ManageEntityParameters,
):
    playlist_metadata = params.metadata
    block_integer_time = params.block_integer_time
    block_datetime = params.block_datetime
    metadata_cid = params.metadata_cid
    action = params.action

    # Iterate over the playlist_record keys. Note: order matters - the order follows
    # the order of the keys in the Playlist model.
    playlist_record_attributes = playlist_record.get_attributes_dict()
    for key, _ in playlist_record_attributes.items():
        # Update the playlist_record when the corresponding field exists
        # in playlist_metadata
        if key == "playlist_contents":
            if not playlist_metadata.get(key):
                continue
            playlist_record.playlist_contents = process_playlist_contents(
                playlist_record,
                playlist_metadata,
                block_integer_time,
                params.existing_records["Track"],
            )
        elif key == "release_date":
            if "release_date" in playlist_metadata:
                # casting to string because datetime doesn't work for some reason
                parsed_release_date = parse_release_date(
                    playlist_metadata["release_date"]
                )
                # postgres will convert to a timestamp

                if (
                    parsed_release_date
                    and parsed_release_date > datetime.now().astimezone(timezone.utc)
                ):
                    # ignore release date if in the future and updating public albums
                    if action == Action.UPDATE and playlist_record.is_private == False:
                        continue

                if parsed_release_date:
                    playlist_record.release_date = str(  # type:ignore
                        parsed_release_date
                    )
        elif key == "is_private":
            # if playlist is being published (changing from private to public),
            # override release_date and is_scheduled_release.
            if (
                playlist_record.is_private
                # default to true so this statement doesn't trigger if is_private is missing
                and not playlist_metadata.get("is_private", True)
                and action == Action.UPDATE
            ):
                playlist_record.is_scheduled_release = False
                playlist_record.release_date = str(datetime.now())  # type: ignore

            if "is_private" in playlist_metadata:
                playlist_record.is_private = playlist_metadata["is_private"]

            # allow scheduled_releases to override is_private value based on release date
            # only for CREATE because publish_scheduled releases will publish this once
            if (
                playlist_record.is_scheduled_release
                and playlist_record.release_date
                and action == Action.CREATE
            ):
                playlist_record.is_private = (
                    playlist_record.release_date
                    >= str(  # type:ignore
                        datetime.now()
                    )
                )
        elif key in playlist_metadata:
            if key in immutable_playlist_fields and action == Action.UPDATE:
                # skip fields that cannot be modified after creation
                continue
            elif key == "stream_conditions":
                # Convert stream conditions from legacy format to new format
                playlist_record.stream_conditions = convert_legacy_purchase_access_gate(
                    params.user_id, playlist_metadata[key]
                )
            else:
                setattr(playlist_record, key, playlist_metadata[key])
    track_ids = playlist_record.playlist_contents["track_ids"]
    if track_ids:
        last_added_to = track_ids[0]["time"]
        for track_obj in playlist_record.playlist_contents["track_ids"]:
            if track_obj["time"] > last_added_to:
                last_added_to = track_obj["time"]
        try:
            playlist_record.last_added_to = datetime.utcfromtimestamp(last_added_to)
        except ValueError:
            params.logger.error(
                f"playlist.py | EntityManager | Invalid last_added_to timestamp: {last_added_to}"
            )

    playlist_record.updated_at = block_datetime
    playlist_record.metadata_multihash = metadata_cid

    params.logger.debug(
        f"playlist.py | EntityManager | Updated playlist record {playlist_record}"
    )
