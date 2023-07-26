from datetime import datetime
from typing import Dict, Union

from sqlalchemy import desc
from sqlalchemy.orm.session import Session
from sqlalchemy.sql import null
from src.challenges.challenge_event import ChallengeEvent
from src.challenges.challenge_event_bus import ChallengeEventBus
from src.exceptions import IndexingValidationError
from src.models.tracks.remix import Remix
from src.models.tracks.stem import Stem
from src.models.tracks.track import Track
from src.models.tracks.track_price_history import TrackPriceHistory
from src.models.tracks.track_route import TrackRoute
from src.models.users.user import User
from src.tasks.entity_manager.utils import (
    CHARACTER_LIMIT_TRACK_DESCRIPTION,
    TRACK_ID_OFFSET,
    Action,
    EntityType,
    ManageEntityParameters,
    copy_record,
    validate_signer,
)
from src.tasks.metadata import immutable_track_fields
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
    if "remix_of" in track_metadata and isinstance(track_metadata["remix_of"], dict):
        tracks = track_metadata["remix_of"].get("tracks")
        if tracks and isinstance(tracks, list):
            for track in tracks:
                if not isinstance(track, dict):
                    continue
                parent_track_id = track.get("parent_track_id")
                if isinstance(parent_track_id, int):
                    remix = Remix(
                        parent_track_id=parent_track_id, child_track_id=child_track_id
                    )
                    session.add(remix)


def update_track_price_history(
    session: Session,
    track_record: Track,
    track_metadata,
    blocknumber: int,
    timestamp: datetime,
):
    """Adds an entry in the track price history table to record the price change of a track or change of splits if necessary."""
    new_record = None
    if (
        "premium_conditions" in track_metadata
        and track_metadata["premium_conditions"] is not None
    ):
        premium_conditions = track_metadata["premium_conditions"]
        if "usdc_purchase" in premium_conditions:
            usdc_purchase = premium_conditions["usdc_purchase"]
            new_record = TrackPriceHistory()
            new_record.track_id = track_record.track_id
            new_record.block_timestamp = timestamp
            new_record.blocknumber = blocknumber
            new_record.splits = {}
            if "price" in usdc_purchase:
                price = usdc_purchase["price"]
                if isinstance(price, int):
                    new_record.total_price_cents = price
            if "splits" in usdc_purchase:
                splits = usdc_purchase["splits"]
                # TODO: better validation of splits
                if isinstance(splits, dict):
                    new_record.splits = splits
    if new_record:
        old_record: Union[TrackPriceHistory, None] = (
            session.query(TrackPriceHistory)
            .filter(TrackPriceHistory.track_id == track_record.track_id)
            .order_by(desc(TrackPriceHistory.block_timestamp))
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
                f"track.py | Updating price history for {track_record.track_id}. Old record={old_record} New record={new_record}"
            )
            session.add(new_record)


@helpers.time_method
def update_track_routes_table(
    session, track_record, track_metadata, pending_track_routes
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
    prev_track_route_record = next(
        (
            route
            for route in pending_track_routes
            if route.is_current and route.track_id == track_record.track_id
        ),
        None,
    )

    # Then query the DB if necessary
    if prev_track_route_record is None:
        prev_track_route_record = (
            session.query(TrackRoute)
            .filter(
                TrackRoute.track_id == track_record.track_id,
                TrackRoute.is_current == True,
            )  # noqa: E712
            .one_or_none()
        )

    if prev_track_route_record is not None:
        if prev_track_route_record.title_slug == new_track_slug_title:
            # If the title slug hasn't changed, we have no work to do
            return
        # The new route will be current
        prev_track_route_record.is_current = False

    new_track_slug, new_collision_id = generate_slug_and_collision_id(
        session,
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
    session.add(new_track_route)

    # Add to pending track routes so we don't add the same route twice
    pending_track_routes.append(new_track_route)


def dispatch_challenge_track_upload(
    bus: ChallengeEventBus, block_number: int, track_record
):
    bus.dispatch(ChallengeEvent.track_upload, block_number, track_record.owner_id)


def is_valid_json_field(metadata, field):
    if field in metadata and isinstance(metadata[field], dict) and metadata[field]:
        return True
    return False


def populate_track_record_metadata(track_record, track_metadata, handle, action):
    # Iterate over the track_record keys
    # Update track_record values for which keys exist in track_metadata
    track_record_attributes = track_record.get_attributes_dict()
    for key, _ in track_record_attributes.items():
        # For certain fields, update track_record under certain conditions
        if key == "premium_conditions":
            if "premium_conditions" in track_metadata and is_valid_json_field(
                track_metadata, "premium_conditions"
            ):
                track_record.premium_conditions = track_metadata["premium_conditions"]

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

        elif key == "download":
            if "download" in track_metadata:
                track_record.download = {
                    "is_downloadable": track_metadata["download"].get("is_downloadable")
                    == True,
                    "requires_follow": track_metadata["download"].get("requires_follow")
                    == True,
                    "cid": track_metadata["download"].get("cid", None),
                }

        elif key == "route_id":
            if "title" in track_metadata:
                track_record.route_id = helpers.create_track_route_id(
                    track_metadata["title"], handle
                )

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
        if track_id in params.existing_records[EntityType.TRACK]:
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
        if (
            track_bio is not None
            and len(track_bio) > CHARACTER_LIMIT_TRACK_DESCRIPTION
        ):
            raise IndexingValidationError(
                f"Track {track_id} description exceeds character limit {CHARACTER_LIMIT_TRACK_DESCRIPTION}"
            )
    if params.action == Action.UPDATE or params.action == Action.DELETE:
        # update / delete specific validations
        if track_id not in params.existing_records[EntityType.TRACK]:
            raise IndexingValidationError(f"Track {track_id} does not exist")
        existing_track: Track = params.existing_records[EntityType.TRACK][track_id]
        if existing_track.owner_id != params.user_id:
            raise IndexingValidationError(
                f"Existing track {track_id} does not match user"
            )

        if params.action == Action.UPDATE and not existing_track.is_unlisted and params.metadata.get("is_unlisted"):
            raise IndexingValidationError(
                f"Cannot unlist track {track_id}"
            )

    if params.action != Action.DELETE:
        ai_attribution_user_id = params.metadata.get("ai_attribution_user_id")
        if ai_attribution_user_id:
            ai_attribution_user = params.existing_records[EntityType.USER][
                ai_attribution_user_id
            ]
            if not ai_attribution_user or not ai_attribution_user.allow_ai_attribution:
                raise IndexingValidationError(
                    f"Cannot AI attribute user {ai_attribution_user}"
                )


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

    # ensure txhash is from the current tx
    track.txhash = params.txhash

    # if cover_art CID is of a dir, store under _sizes field instead
    if track.cover_art:
        track.cover_art_sizes = track.cover_art
        track.cover_art = None


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
        is_delete=False,
    )

    update_track_routes_table(
        params.session, track_record, params.metadata, params.pending_track_routes
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
        params.challenge_bus, params.block_number, track_record
    )

    params.add_track_record(track_id, track_record)


def update_track(params: ManageEntityParameters):
    handle = get_handle(params)
    validate_track_tx(params)

    track_id = params.entity_id
    existing_track = params.existing_records[EntityType.TRACK][track_id]
    if (
        track_id in params.new_records[EntityType.TRACK]
    ):  # override with last updated track is in this block
        existing_track = params.new_records[EntityType.TRACK][track_id][-1]

    track_record = copy_record(
        existing_track,
        params.block_number,
        params.event_blockhash,
        params.txhash,
        params.block_datetime,
    )

    update_track_routes_table(
        params.session, track_record, params.metadata, params.pending_track_routes
    )
    update_track_price_history(
        params.session,
        track_record,
        params.metadata,
        params.block_number,
        params.block_datetime,
    )
    update_track_record(params, track_record, params.metadata, handle)
    update_remixes_table(params.session, track_record, params.metadata)

    params.add_track_record(track_id, track_record)


def delete_track(params: ManageEntityParameters):
    validate_track_tx(params)

    track_id = params.entity_id
    existing_track = params.existing_records[EntityType.TRACK][track_id]
    if params.entity_id in params.new_records[EntityType.TRACK]:
        # override with last updated playlist is in this block
        existing_track = params.new_records[EntityType.TRACK][params.entity_id][-1]

    deleted_track = copy_record(
        existing_track,
        params.block_number,
        params.event_blockhash,
        params.txhash,
        params.block_datetime,
    )
    deleted_track.is_delete = True
    deleted_track.stem_of = null()
    deleted_track.remix_of = null()
    deleted_track.premium_conditions = null()

    params.add_track_record(track_id, deleted_track)
