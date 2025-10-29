from datetime import datetime, timezone
from typing import Dict, List, Union

from sqlalchemy import desc
from sqlalchemy.orm.session import Session
from sqlalchemy.sql import null

from src.challenges.challenge_event import ChallengeEvent
from src.challenges.challenge_event_bus import ChallengeEventBus
from src.exceptions import IndexingValidationError
from src.gated_content.constants import USDC_PURCHASE_KEY
from src.gated_content.content_access_checker import (
    ContentAccessBatchArgs,
    content_access_checker,
)
from src.models.tracks.remix import Remix
from src.models.tracks.stem import Stem
from src.models.tracks.track import Track
from src.models.tracks.track_download import TrackDownload
from src.models.tracks.track_price_history import TrackPriceHistory
from src.models.tracks.track_route import TrackRoute
from src.models.users.usdc_purchase import PurchaseAccessType
from src.models.users.user import User
from src.tasks.entity_manager.utils import (
    CHARACTER_LIMIT_DESCRIPTION,
    TRACK_ID_OFFSET,
    Action,
    EntityType,
    ManageEntityParameters,
    convert_legacy_purchase_access_gate,
    copy_record,
    create_remix_contest_notification,
    parse_release_date,
    validate_signer,
)
from src.tasks.metadata import (
    immutable_track_fields,
    is_valid_cid,
    is_valid_musical_key,
)
from src.tasks.task_helpers import generate_slug_and_collision_id
from src.utils import helpers
from src.utils.hardcoded_data import genre_allowlist
from src.utils.structured_logger import StructuredLogger

logger = StructuredLogger(__name__)


def update_stems_table(session, track_record, track_metadata):
    if ("stem_of" not in track_metadata) or (
        not isinstance(track_metadata["stem_of"], dict)
    ):
        return
    parent_track_id = track_metadata["stem_of"].get("parent_track_id")
    if not isinstance(parent_track_id, int):
        return

    # Avoid re-adding stem if it already exists
    existing_stem = (
        session.query(Stem)
        .filter_by(
            parent_track_id=parent_track_id, child_track_id=track_record.track_id
        )
        .first()
    )
    if existing_stem:
        return

    stem = Stem(parent_track_id=parent_track_id, child_track_id=track_record.track_id)
    session.add(stem)


def update_remixes_table(session, track_record, track_metadata):
    child_track_id = track_record.track_id

    # Delete existing remix parents
    session.query(Remix).filter_by(child_track_id=child_track_id).delete()

    # Add all remixes
    parent_track_ids = get_remix_parent_track_ids(track_metadata)
    if not parent_track_ids:
        return

    for parent_track_id in parent_track_ids:
        remix = Remix(parent_track_id=parent_track_id, child_track_id=child_track_id)
        session.add(remix)


def update_track_price_history(
    session: Session,
    track_record: Track,
    track_metadata: dict,
    blocknumber: int,
    timestamp: datetime,
):
    """Adds an entry in the track price history table to record the price change of a track or change of splits if necessary."""
    new_record = None
    is_stream_gated = track_metadata.get(
        "is_stream_gated", False
    ) and track_metadata.get("stream_conditions", None)
    is_download_gated = track_metadata.get(
        "is_download_gated", False
    ) and track_metadata.get("download_conditions", None)
    if is_stream_gated or is_download_gated:
        conditions = (
            track_metadata["stream_conditions"]
            if is_stream_gated
            else track_metadata["download_conditions"]
        )
        # Convert legacy conditions to new array format with user IDs
        conditions = convert_legacy_purchase_access_gate(
            track_record.owner_id, conditions
        )
        if USDC_PURCHASE_KEY in conditions:
            usdc_purchase = conditions[USDC_PURCHASE_KEY]
            new_record = TrackPriceHistory()
            new_record.track_id = track_record.track_id
            new_record.block_timestamp = timestamp
            new_record.blocknumber = blocknumber
            new_record.splits = []
            new_record.access = (
                PurchaseAccessType.stream
                if is_stream_gated
                else PurchaseAccessType.download
            )
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
        old_record: Union[TrackPriceHistory, None] = (
            session.query(TrackPriceHistory)
            .filter(TrackPriceHistory.track_id == track_record.track_id)
            .order_by(desc(TrackPriceHistory.block_timestamp))
            .first()
        )

        if not old_record or (
            old_record.block_timestamp != new_record.block_timestamp
            and not old_record.equals(new_record)
        ):
            logger.debug(
                f"track.py | Updating price history for {track_record.track_id}. Old record={old_record} New record={new_record}"
            )
            session.add(new_record)


@helpers.time_method
def update_track_routes_table(
    params, track_record, track_metadata, pending_track_routes
):
    """Creates the route for the given track"""

    # Check if the title is staying the same, and if so, return early
    if "title" not in track_metadata or track_record.title == track_metadata["title"]:
        return

    # Get the title slug, and set the new slug to that
    # (will check for conflicts later)
    new_track_slug_title = helpers.sanitize_slug(
        track_metadata["title"], track_record.track_id
    )
    new_track_slug = new_track_slug_title

    # Find the current route for the track
    # Check the pending track route updates first
    prev_track_route_record = params.existing_records[EntityType.TRACK_ROUTE].get(
        track_record.track_id
    )

    if prev_track_route_record is not None:
        if prev_track_route_record.title_slug == new_track_slug_title:
            # If the title slug hasn't changed, we have no work to do
            return
        # The new route will be current
        prev_track_route_record.is_current = False

    new_track_slug, new_collision_id = generate_slug_and_collision_id(
        params.session,
        TrackRoute,
        track_record.track_id,
        track_metadata["title"],
        track_record.owner_id,
        pending_track_routes,
        new_track_slug_title,
        new_track_slug,
    )

    # Add the new track route
    new_track_route = TrackRoute()
    new_track_route.slug = new_track_slug
    new_track_route.title_slug = new_track_slug_title
    new_track_route.collision_id = new_collision_id
    new_track_route.owner_id = track_record.owner_id
    new_track_route.track_id = track_record.track_id
    new_track_route.is_current = True
    new_track_route.blockhash = track_record.blockhash
    new_track_route.blocknumber = track_record.blocknumber
    new_track_route.txhash = track_record.txhash
    params.add_record(track_record.track_id, new_track_route, EntityType.TRACK_ROUTE)

    # Add to pending track routes so we don't add the same route twice
    pending_track_routes.append(new_track_route)


def dispatch_challenge_track_upload(
    bus: ChallengeEventBus, block_number: int, block_datetime: datetime, track_record
):
    bus.dispatch(
        ChallengeEvent.track_upload, block_number, block_datetime, track_record.owner_id
    )


def is_valid_json_field(metadata, field):
    if field in metadata and isinstance(metadata[field], dict) and metadata[field]:
        return True
    return False


def populate_track_record_metadata(track_record: Track, track_metadata, handle, action):
    # Iterate over the track_record keys
    # Update track_record values for which keys exist in track_metadata
    # Note: order matters - the order follows the order of the keys in the Track model
    track_record_attributes = track_record.get_attributes_dict()
    for key, _ in track_record_attributes.items():
        # For certain fields, update track_record under certain conditions
        if key == "stream_conditions":
            if "stream_conditions" in track_metadata and (
                is_valid_json_field(track_metadata, "stream_conditions")
                or track_metadata["stream_conditions"] is None
            ):
                # Convert legacy conditions to new array format with user IDs
                track_record.stream_conditions = convert_legacy_purchase_access_gate(
                    track_record.owner_id, track_metadata["stream_conditions"]
                )

        elif key == "download_conditions":
            if "download_conditions" in track_metadata and (
                is_valid_json_field(track_metadata, "download_conditions")
                or track_metadata["download_conditions"] is None
            ):
                # Convert legacy conditions to new array format with user IDs
                track_record.download_conditions = convert_legacy_purchase_access_gate(
                    track_record.owner_id, track_metadata["download_conditions"]
                )
        elif key == "allowed_api_keys":
            if key in track_metadata:
                if track_metadata[key] is None:
                    track_record.allowed_api_keys = None
                else:
                    track_record.allowed_api_keys = [
                        api_key.lower()
                        for api_key in track_metadata["allowed_api_keys"]
                    ]
        elif key == "stem_of":
            if "stem_of" in track_metadata and is_valid_json_field(
                track_metadata, "stem_of"
            ):
                track_record.stem_of = track_metadata["stem_of"]

        elif key == "remix_of":
            if "remix_of" in track_metadata and is_valid_json_field(
                track_metadata, "remix_of"
            ):
                track_record.remix_of = track_metadata["remix_of"]

        elif key == "route_id":
            if "title" in track_metadata:
                track_record.route_id = helpers.create_track_route_id(
                    track_metadata["title"], handle
                )

        elif key == "release_date":
            if "release_date" in track_metadata:
                # casting to string because datetime doesn't work for some reason
                parsed_release_date = parse_release_date(track_metadata["release_date"])
                # postgres will convert to a timestamp

                if (
                    parsed_release_date
                    and parsed_release_date > datetime.now().astimezone(timezone.utc)
                ):
                    # ignore release date if in the future and updating public tracks
                    if action == Action.UPDATE and track_record.is_unlisted == False:
                        continue

                if parsed_release_date:
                    track_record.release_date = str(parsed_release_date)  # type: ignore
        elif key == "is_unlisted":
            # if track is being published (changing from private to public),
            # override release_date and is_scheduled_release.
            if (
                track_record.is_unlisted
                # default to true so this statement doesn't trigger if is_private is missing
                and not track_metadata.get("is_unlisted", True)
                and action == Action.UPDATE
            ):
                track_record.is_scheduled_release = False
                track_record.release_date = str(datetime.now())  # type: ignore

            if "is_unlisted" in track_metadata:
                track_record.is_unlisted = track_metadata["is_unlisted"]

            # allow scheduled_releases to override is_unlisted value based on release date
            # only for CREATE because publish_scheduled releases will publish this once
            if (
                track_record.is_scheduled_release
                and track_record.release_date
                and action == Action.CREATE
            ):
                track_record.is_unlisted = (
                    track_record.release_date
                    >= str(  # type:ignore
                        datetime.now()
                    )
                )

        elif key == "ddex_release_ids":
            if "ddex_release_ids" in track_metadata and (
                is_valid_json_field(track_metadata, "ddex_release_ids")
                or track_metadata["ddex_release_ids"] is None
            ):
                track_record.ddex_release_ids = track_metadata["ddex_release_ids"]

        elif key == "artists":
            if "artists" in track_metadata:
                artists = track_metadata["artists"]
                if artists and isinstance(artists, list):
                    valid = True
                    for artist in artists:
                        if not isinstance(artist, dict):
                            valid = False
                            break
                    if valid:
                        track_record.artists = artists
                elif artists is None:
                    track_record.artists = artists

        elif key == "resource_contributors":
            if "resource_contributors" in track_metadata:
                resource_contributors = track_metadata["resource_contributors"]
                if resource_contributors and isinstance(resource_contributors, list):
                    valid = True
                    for contributor in resource_contributors:
                        if not isinstance(contributor, dict):
                            valid = False
                            break
                    if valid:
                        track_record.resource_contributors = resource_contributors
                elif resource_contributors is None:
                    track_record.resource_contributors = resource_contributors

        elif key == "indirect_resource_contributors":
            if "indirect_resource_contributors" in track_metadata:
                indirect_resource_contributors = track_metadata[
                    "indirect_resource_contributors"
                ]
                if indirect_resource_contributors and isinstance(
                    indirect_resource_contributors, list
                ):
                    valid = True
                    for contributor in indirect_resource_contributors:
                        if not isinstance(contributor, dict):
                            valid = False
                            break
                    if valid:
                        track_record.indirect_resource_contributors = (
                            indirect_resource_contributors
                        )
                elif indirect_resource_contributors is None:
                    track_record.indirect_resource_contributors = (
                        indirect_resource_contributors
                    )

        elif key == "rights_controller":
            if "rights_controller" in track_metadata and (
                is_valid_json_field(track_metadata, "rights_controller")
                or track_metadata["rights_controller"] is None
            ):
                track_record.rights_controller = track_metadata["rights_controller"]

        elif key == "copyright_line":
            if "copyright_line" in track_metadata and (
                is_valid_json_field(track_metadata, "copyright_line")
                or track_metadata["copyright_line"] is None
            ):
                track_record.copyright_line = track_metadata["copyright_line"]

        elif key == "producer_copyright_line":
            if "producer_copyright_line" in track_metadata and (
                is_valid_json_field(track_metadata, "producer_copyright_line")
                or track_metadata["producer_copyright_line"] is None
            ):
                track_record.producer_copyright_line = track_metadata[
                    "producer_copyright_line"
                ]

        elif key == "bpm":
            if "bpm" in track_metadata:
                bpm_value = track_metadata["bpm"]
                if bpm_value is None:
                    track_record.bpm = None
                else:
                    try:
                        bpm_float = float(bpm_value)
                        if bpm_float != 0:
                            track_record.bpm = bpm_float  # type: ignore
                    except (ValueError, TypeError):
                        continue

        elif key == "musical_key":
            if "musical_key" in track_metadata:
                key_value = track_metadata["musical_key"]
                if key_value is None:
                    track_record.musical_key = None
                else:
                    if isinstance(key_value, str) and is_valid_musical_key(key_value):
                        track_record.musical_key = key_value

        elif key == "track_cid":
            if (
                "track_cid" in track_metadata
                and track_metadata["track_cid"] is not None
                and is_valid_cid(track_metadata["track_cid"])
            ):
                track_record.track_cid = track_metadata["track_cid"]
        elif key == "preview_cid":
            if (
                "preview_cid" in track_metadata
                and track_metadata["preview_cid"] is not None
                and is_valid_cid(track_metadata["preview_cid"])
            ):
                track_record.preview_cid = track_metadata["preview_cid"]
        elif key == "orig_file_cid":
            if (
                "orig_file_cid" in track_metadata
                and track_metadata["orig_file_cid"] is not None
                and is_valid_cid(track_metadata["orig_file_cid"])
            ):
                track_record.orig_file_cid = track_metadata["orig_file_cid"]
        elif key == "orig_filename":
            if "orig_filename" in track_metadata and isinstance(
                track_metadata["orig_filename"], str
            ):
                track_record.orig_filename = track_metadata["orig_filename"]
        elif key == "duration":
            if (
                "duration" in track_metadata
                and isinstance(track_metadata["duration"], int)
                and track_metadata["duration"] > 0
            ):
                track_record.duration = track_metadata["duration"]

        else:
            # For most fields, update the track_record when the corresponding field exists
            # in track_metadata
            if key in track_metadata:
                if key in immutable_track_fields and action == Action.UPDATE:
                    # skip fields that cannot be modified after creation
                    continue
                setattr(track_record, key, track_metadata[key])

    return track_record


def validate_track_tx(params: ManageEntityParameters):
    track_id = params.entity_id

    validate_signer(params)

    if params.entity_type != EntityType.TRACK:
        raise IndexingValidationError(
            f"Entity type {params.entity_type} is not a track"
        )

    if params.action == Action.CREATE:
        if track_id in params.existing_records["Track"]:
            raise IndexingValidationError(f"Track {track_id} already exists")

        if track_id < TRACK_ID_OFFSET:
            raise IndexingValidationError(
                f"Cannot create track {track_id} below the offset"
            )

    if params.action == Action.CREATE or params.action == Action.UPDATE:
        if not params.metadata:
            raise IndexingValidationError(
                "Metadata is required for playlist creation and update"
            )
        track_bio = params.metadata.get("description")
        track_genre = params.metadata.get("genre")
        if track_genre is not None and track_genre not in genre_allowlist:
            raise IndexingValidationError(
                f"Track {track_id} attempted to be placed in genre '{track_genre}' which is not in the allow list"
            )
        if track_bio is not None and len(track_bio) > CHARACTER_LIMIT_DESCRIPTION:
            raise IndexingValidationError(
                f"Track {track_id} description exceeds character limit {CHARACTER_LIMIT_DESCRIPTION}"
            )
        validate_remixability(params)
        validate_access_conditions(params)

    if params.action == Action.UPDATE or params.action == Action.DELETE:
        # update / delete specific validations
        if track_id not in params.existing_records["Track"]:
            raise IndexingValidationError(f"Track {track_id} does not exist")
        existing_track: Track = params.existing_records["Track"][track_id]
        if existing_track.owner_id != params.user_id:
            raise IndexingValidationError(
                f"Existing track {track_id} does not match user"
            )

    if params.action == Action.DOWNLOAD:
        if track_id not in params.existing_records["Track"]:
            raise IndexingValidationError(f"Track {track_id} does not exist")


def get_handle(params: ManageEntityParameters):
    # TODO: get the track owner user handle
    handle = (
        params.session.query(User.handle)
        .filter(User.user_id == params.user_id, User.is_current == True)
        .first()
    )
    if not handle or not handle[0]:
        raise IndexingValidationError(
            f"Cannot find handle for user ID {params.user_id}"
        )

    return handle[0]


def update_track_record(
    params: ManageEntityParameters, track: Track, metadata: Dict, handle: str
):
    populate_track_record_metadata(track, metadata, handle, params.action)

    # if cover_art CID is of a dir, store under _sizes field instead
    if track.cover_art:
        track.cover_art_sizes = track.cover_art
        track.cover_art = None


def create_remix_contest_notification_helper(
    params: ManageEntityParameters, track_record: Track
):
    """Create notifications for followers and favoriters when a track with a remix contest becomes public.
    This version is used by the entity manager flow.
    """
    is_newly_public = track_record.is_unlisted and not params.metadata.get(
        "is_unlisted"
    )
    if not is_newly_public:
        return

    create_remix_contest_notification(
        params.session, track_record, params.block_number, params.block_datetime
    )


def create_track(params: ManageEntityParameters):
    handle = get_handle(params)
    validate_track_tx(params)

    track_id = params.entity_id
    owner_id = params.user_id

    track_record = Track(
        track_id=track_id,
        owner_id=owner_id,
        txhash=params.txhash,
        blockhash=params.event_blockhash,
        blocknumber=params.block_number,
        created_at=params.block_datetime,
        updated_at=params.block_datetime,
        release_date=str(params.block_datetime),  # type: ignore
        is_delete=False,
        ddex_app=params.metadata.get("ddex_app", None),
    )

    update_track_routes_table(
        params, track_record, params.metadata, params.pending_track_routes
    )

    update_track_record(params, track_record, params.metadata, handle)

    update_stems_table(params.session, track_record, params.metadata)
    update_remixes_table(params.session, track_record, params.metadata)
    update_track_price_history(
        params.session,
        track_record,
        params.metadata,
        params.block_number,
        params.block_datetime,
    )
    dispatch_challenge_track_upload(
        params.challenge_bus, params.block_number, params.block_datetime, track_record
    )

    params.add_record(track_id, track_record)


def validate_update_ddex_track(params: ManageEntityParameters, track_record):
    if track_record.ddex_app:
        if track_record.ddex_app != params.signer:
            raise IndexingValidationError(
                f"Signer {params.signer} does not have permission to {params.action} DDEX track {track_record.track_id}"
            )


def update_track(params: ManageEntityParameters):
    handle = get_handle(params)
    validate_track_tx(params)

    track_id = params.entity_id
    existing_track = params.existing_records["Track"][track_id]
    if (
        track_id in params.new_records["Track"]
    ):  # override with last updated track is in this block
        existing_track = params.new_records["Track"][track_id][-1]

    validate_update_ddex_track(params, existing_track)

    track_record = copy_record(
        existing_track,
        params.block_number,
        params.event_blockhash,
        params.txhash,
        params.block_datetime,
    )

    update_track_routes_table(
        params, track_record, params.metadata, params.pending_track_routes
    )
    update_track_price_history(
        params.session,
        track_record,
        params.metadata,
        params.block_number,
        params.block_datetime,
    )
    create_remix_contest_notification_helper(params, track_record)
    update_track_record(params, track_record, params.metadata, handle)
    update_remixes_table(params.session, track_record, params.metadata)

    params.add_record(track_id, track_record)


def delete_track(params: ManageEntityParameters):
    validate_track_tx(params)

    track_id = params.entity_id
    existing_track = params.existing_records["Track"][track_id]
    if params.entity_id in params.new_records["Track"]:
        # override with last updated playlist is in this block
        existing_track = params.new_records["Track"][params.entity_id][-1]

    validate_update_ddex_track(params, existing_track)

    deleted_track = copy_record(
        existing_track,
        params.block_number,
        params.event_blockhash,
        params.txhash,
        params.block_datetime,
    )
    deleted_track.is_delete = True
    # Detach this track from the parent if it is a stem
    deleted_track.stem_of = null()

    # delete stems record
    params.session.query(Stem).filter_by(child_track_id=track_id).delete()

    params.add_record(track_id, deleted_track)


def download_track(params: ManageEntityParameters):
    validate_track_tx(params)

    track_id = params.entity_id
    existing_track = params.existing_records["Track"][track_id]
    if (
        track_id in params.new_records["Track"]
    ):  # override with last updated track is in this block
        existing_track = params.new_records["Track"][track_id][-1]

    if not existing_track:
        raise IndexingValidationError(f"Track {track_id} does not exist")

    stem_of = existing_track.stem_of
    parent_track_id = (
        stem_of.get("parent_track_id", track_id)
        if isinstance(stem_of, dict)
        else track_id
    )

    session = params.session

    has_metadata = isinstance(params.metadata, dict)

    existing_track_download = (
        session.query(TrackDownload)
        .filter_by(
            parent_track_id=parent_track_id, track_id=track_id, txhash=params.txhash
        )
        .first()
    )
    if existing_track_download:
        return

    record = TrackDownload(
        txhash=params.txhash,
        blocknumber=params.block_number,
        parent_track_id=parent_track_id,
        track_id=track_id,
        user_id=params.user_id,
        city=params.metadata.get("city") if has_metadata else None,
        region=params.metadata.get("region") if has_metadata else None,
        country=params.metadata.get("country") if has_metadata else None,
    )
    session.add(record)


# Make sure that the user has access to remix parent tracks
def validate_remixability(params: ManageEntityParameters):
    track_metadata = params.metadata
    user_id = params.user_id
    session = params.session

    parent_track_ids = get_remix_parent_track_ids(track_metadata)
    if not parent_track_ids:
        return

    args: List[ContentAccessBatchArgs] = list(
        map(
            lambda track_id: {
                "user_id": user_id,
                "content_id": track_id,
                "content_type": "track",
            },
            parent_track_ids,
        )
    )
    gated_content_batch_access = content_access_checker.check_access_for_batch(
        session, args
    )
    if "track" not in gated_content_batch_access:
        return
    if user_id not in gated_content_batch_access["track"]:
        return

    for track_id in gated_content_batch_access["track"][user_id]:
        access = gated_content_batch_access["track"][user_id][track_id]
        if not access["has_stream_access"]:
            raise IndexingValidationError(
                f"User {user_id} does not have access to remix parent gated track {track_id}"
            )


def get_remix_parent_track_ids(track_metadata):
    if "remix_of" not in track_metadata:
        return
    if not isinstance(track_metadata["remix_of"], dict):
        return

    tracks = track_metadata["remix_of"].get("tracks")
    if not tracks:
        return
    if not isinstance(tracks, list):
        return

    parent_track_ids = []
    for track in tracks:
        if not isinstance(track, dict):
            continue
        parent_track_id = track.get("parent_track_id")
        if isinstance(parent_track_id, int):
            parent_track_ids.append(parent_track_id)

    return parent_track_ids


def validate_access_conditions(params: ManageEntityParameters):
    track_metadata = params.metadata

    stem_of = track_metadata.get("stem_of")
    is_stream_gated = track_metadata.get("is_stream_gated")
    stream_conditions = track_metadata.get("stream_conditions", {}) or {}
    is_download_gated = track_metadata.get("is_download_gated")
    download_conditions = track_metadata.get("download_conditions", {}) or {}

    # if stem track, must not be have stream/download conditions
    # stem tracks must rely on their parent track's access conditions
    # otherwise the access checker may e.g. look for a purchase
    # on the stem track instead of the parent track
    if stem_of and (is_stream_gated or is_download_gated):
        raise IndexingValidationError(
            f"Track {params.entity_id} is a stem track but has stream/download conditions"
        )

    if is_stream_gated or is_download_gated:
        conditions = (
            params.metadata["stream_conditions"]
            if is_stream_gated
            else params.metadata["download_conditions"]
        )
        if conditions and USDC_PURCHASE_KEY in conditions:
            if not conditions[USDC_PURCHASE_KEY].get("splits"):
                raise IndexingValidationError(
                    f"Track {params.entity_id} usdc_purchase does not contain splits"
                )

    if is_stream_gated:
        # if stream gated, must have stream conditions
        if not stream_conditions:
            raise IndexingValidationError(
                f"Track {params.entity_id} is stream gated but has no stream conditions"
            )
        # must be gated on a single condition
        if len(stream_conditions) != 1:
            raise IndexingValidationError(
                f"Track {params.entity_id} has an invalid number of stream conditions"
            )
        # if stream gated, must be download gated
        if not is_download_gated:
            raise IndexingValidationError(
                f"Track {params.entity_id} is stream gated but not download gated"
            )
        # if stream gated, stream conditions must be same as download conditions
        if stream_conditions != download_conditions:
            raise IndexingValidationError(
                f"Track {params.entity_id} stream conditions do not match download conditions"
            )
    elif is_download_gated:
        # if download gated, must have download conditions
        if not download_conditions:
            raise IndexingValidationError(
                f"Track {params.entity_id} is download gated but has no download conditions"
            )
        # must be gated on a single condition
        if len(download_conditions) != 1:
            raise IndexingValidationError(
                f"Track {params.entity_id} has an invalid number of download conditions"
            )
