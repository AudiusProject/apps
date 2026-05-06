from datetime import datetime

from src.challenges.challenge_event_bus import ChallengeEvent
from src.exceptions import IndexingValidationError
from src.models.events.event import Event, EventEntityType, EventType
from src.models.tracks.track import Track
from src.tasks.entity_manager.utils import (
    EntityType,
    ManageEntityParameters,
    validate_signer,
)
from src.tasks.remix_contest_notifications.fan_remix_contest_winners_selected import (
    create_fan_remix_contest_winners_selected_notification,
)
from src.utils.structured_logger import StructuredLogger

logger = StructuredLogger(__name__)


def validate_create_event_tx(params: ManageEntityParameters):
    validate_signer(params)
    metadata = params.metadata

    # Check if event_id already exists
    if params.entity_id in params.existing_records[EntityType.EVENT.value]:
        raise IndexingValidationError(
            f"Event with id {params.entity_id} already exists"
        )

    # Check if all required fields are present
    required_fields = ["event_type", "end_date"]
    for field in required_fields:
        if field not in metadata:
            raise IndexingValidationError(f"Missing required field: {field}")

    if params.metadata.get("end_date"):
        # Validate end_date is a valid iso format
        try:
            datetime.fromisoformat(params.metadata["end_date"])
        except ValueError:
            raise IndexingValidationError("end_date is not a valid iso format")

        # Validate end_date is not in the past
        if (
            datetime.fromisoformat(params.metadata["end_date"]).timestamp()
            < params.block_datetime.timestamp()
        ):
            raise IndexingValidationError("end_date cannot be in the past")

    # Validate entity_type is valid
    valid_entity_types = [EventEntityType.track.value]
    if (
        params.metadata.get("entity_type")
        and params.metadata["entity_type"] not in valid_entity_types
    ):
        raise IndexingValidationError(
            f"Invalid entity_type: {params.metadata['entity_type']}"
        )

    # Validate entity type is correct and entity exists
    # TODO: Update this to validate that the entity_type is correct
    if (
        params.metadata["entity_id"]
        and params.metadata["entity_type"] == EventEntityType.track.value
        and params.metadata["entity_id"]
        not in params.existing_records[EntityType.TRACK.value]
    ):
        raise IndexingValidationError(
            f"Track {params.metadata['entity_id']} does not exist"
        )

    # Validate user is the owner of the entity
    if params.metadata["entity_type"] == EventEntityType.track.value:
        track_owner = params.existing_records[EntityType.TRACK.value][
            params.metadata["entity_id"]
        ].owner_id
        if track_owner != params.user_id:
            raise IndexingValidationError(
                f"User {params.user_id} is not the owner of the track {params.metadata['entity_id']}"
            )

    # Validate user exists
    if params.user_id not in params.existing_records[EntityType.USER.value]:
        raise IndexingValidationError(f"User {params.user_id} does not exist")

    # Validate remix contest rules
    if metadata["event_type"] == EventType.remix_contest:
        if not metadata["entity_id"] or not metadata["entity_type"]:
            raise IndexingValidationError(
                "For remix competitions, entity_id and entity_type must be provided"
            )

        # Query database directly for existing remix contests for this track
        # since existing_records only contains the specific event being created
        existing_remix_contest = (
            params.session.query(Event)
            .filter(
                Event.entity_id == metadata["entity_id"],
                Event.event_type == EventType.remix_contest,
                Event.is_deleted == False,
                Event.end_date > params.block_datetime,  # Only active contests
            )
            .first()
        )

        if existing_remix_contest:
            raise IndexingValidationError(
                f"An existing remix contest for entity_id {metadata['entity_id']} already exists"
            )

        track = params.existing_records[EntityType.TRACK.value][metadata["entity_id"]]
        if track.remix_of:
            raise IndexingValidationError(
                f"Track {metadata['entity_id']} is a remix and cannot host a remix contest"
            )


def create_event(params: ManageEntityParameters):
    validate_create_event_tx(params)

    event_id = params.entity_id
    event_record = Event(
        event_id=event_id,
        event_type=params.metadata["event_type"],
        user_id=params.user_id,
        entity_type=params.metadata["entity_type"],
        entity_id=params.metadata["entity_id"],
        end_date=params.metadata["end_date"],
        event_data=params.metadata["event_data"],
        is_deleted=False,
        created_at=params.block_datetime,
        updated_at=params.block_datetime,
        txhash=params.txhash,
        blockhash=params.event_blockhash,
        blocknumber=params.block_number,
    )

    params.add_record(event_id, event_record, EntityType.EVENT)


def validate_update_event_tx(params: ManageEntityParameters):
    validate_signer(params)
    event_id = params.entity_id
    user_id = params.user_id
    existing_event = params.existing_records[EntityType.EVENT.value][event_id]

    if not existing_event:
        raise IndexingValidationError(
            f"Cannot update event {event_id} that does not exist"
        )

    if user_id != existing_event.user_id:
        raise IndexingValidationError(f"Only event owner can update event {event_id}")

    if params.metadata.get("end_date"):
        # Validate end_date is a valid iso format
        try:
            datetime.fromisoformat(params.metadata["end_date"])
        except ValueError:
            raise IndexingValidationError("end_date is not a valid iso format")

        # Validate that the end_date is after the current end_date of the remix contest
        if (
            existing_event.event_type == EventType.remix_contest
            and existing_event.end_date
        ):
            if (
                datetime.fromisoformat(params.metadata["end_date"]).timestamp()
                < existing_event.end_date.timestamp()
            ):
                raise IndexingValidationError(
                    "end_date cannot be before the current end_date of the remix contest"
                )
        # Validate end_date is not in the past for other event types
        elif (
            datetime.fromisoformat(params.metadata["end_date"]).timestamp()
            < params.block_datetime.timestamp()
        ):
            raise IndexingValidationError("end_date cannot be in the past")


def update_event(params: ManageEntityParameters):
    validate_update_event_tx(params)
    event_record = params.existing_records[EntityType.EVENT.value][params.entity_id]

    # Detect first-time winners selection on a remix contest so we can fire
    # the fan notification before the winners list is overwritten below.
    should_notify_winners_selected = False
    new_winners = []
    event_data = params.metadata.get("event_data")
    if (
        event_record.event_type == EventType.remix_contest
        and event_data
        and isinstance(event_data, dict)
        and isinstance(event_record.event_data, dict)
    ):
        current_winners = event_record.event_data.get("winners", [])
        new_winners = event_data.get("winners", [])

        if len(current_winners) == 0 and len(new_winners) > 0:
            should_notify_winners_selected = True

    # Trigger notification when winners are first selected
    if should_notify_winners_selected:
        create_fan_remix_contest_winners_selected_notification(
            params.session, event_record.event_id, params.block_datetime
        )

    # Update the event record with new values from params.metadata
    event_record.end_date = params.metadata.get("end_date", event_record.end_date)
    event_record.event_data = params.metadata.get("event_data", event_record.event_data)
    event_record.updated_at = params.block_datetime
    event_record.txhash = params.txhash
    event_record.blockhash = params.event_blockhash
    event_record.blocknumber = params.block_number

    # Trigger challenge update when winners are selected
    for winner_track_id in new_winners:
        # Look up the track in the database to get the owner_id (the remixer who should receive the challenge)
        winner_track = (
            params.session.query(Track)
            .filter(Track.track_id == winner_track_id, Track.is_delete == False)
            .first()
        )

        if winner_track:
            params.challenge_bus.dispatch(
                ChallengeEvent.remix_contest_winner,
                params.block_number,
                params.block_datetime,
                winner_track.owner_id,
                {
                    "contest_id": event_record.event_id,
                    "host_user_id": event_record.user_id,
                    "event_timestamp": params.block_datetime.timestamp(),
                },
            )


def validate_delete_event_tx(params: ManageEntityParameters):
    validate_signer(params)
    event_id = params.entity_id
    user_id = params.user_id
    existing_event = params.existing_records[EntityType.EVENT.value][event_id]

    if not existing_event:
        raise IndexingValidationError(
            f"Cannot delete event {event_id} that does not exist"
        )

    if user_id != existing_event.user_id:
        raise IndexingValidationError(f"Only event owner can delete event {event_id}")


def delete_event(params: ManageEntityParameters):
    validate_delete_event_tx(params)
    event_id = params.entity_id
    existing_event = params.existing_records[EntityType.EVENT.value][event_id]

    existing_event.txhash = params.txhash
    existing_event.blockhash = params.event_blockhash
    existing_event.blocknumber = params.block_number
    existing_event.updated_at = params.block_datetime
    existing_event.is_deleted = True
