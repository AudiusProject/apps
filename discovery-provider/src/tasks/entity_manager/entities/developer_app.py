import json
import time
from typing import Optional, TypedDict, Union, cast

from eth_account.messages import defunct_hash_message

from src.exceptions import IndexingValidationError
from src.models.grants.developer_app import DeveloperApp
from src.tasks.entity_manager.utils import (
    Action,
    EntityType,
    ManageEntityParameters,
    copy_record,
)
from src.utils import web3_provider
from src.utils.indexing_errors import EntityMissingRequiredFieldError
from src.utils.model_nullable_validator import all_required_fields_present
from src.utils.structured_logger import StructuredLogger

logger = StructuredLogger(__name__)


class AppSignature(TypedDict):
    message: str
    signature: str


class CreateDeveloperAppMetadata(TypedDict):
    name: Union[str, None]
    description: Union[str, None]
    is_personal_access: Union[bool, None]
    app_signature: Union[AppSignature, None]


class DeleteDeveloperAppMetadata(TypedDict):
    address: Union[str, None]


def get_app_address_from_signature(app_signature):
    web3 = web3_provider.get_eth_web3()
    message_hash = defunct_hash_message(text=app_signature["message"])
    app_address = web3.eth.account._recover_hash(
        message_hash, signature=app_signature["signature"]
    )
    return app_address.lower()


def is_within_6_hours(timestamp_str):
    current_timestamp = int(time.time())
    input_timestamp = int(timestamp_str)
    time_difference = abs(current_timestamp - input_timestamp)
    return time_difference < 6 * 60 * 60


def get_create_developer_app_metadata_from_raw(
    raw_metadata: Optional[str],
) -> Optional[CreateDeveloperAppMetadata]:
    metadata: CreateDeveloperAppMetadata = {
        "name": None,
        "is_personal_access": None,
        "description": None,
        "app_signature": None,
    }

    if raw_metadata:
        try:
            json_metadata = json.loads(raw_metadata)

            metadata["name"] = json_metadata.get("name", None)
            metadata["description"] = json_metadata.get("description", None)
            metadata["is_personal_access"] = json_metadata.get(
                "is_personal_access", None
            )
            metadata["app_signature"] = json_metadata.get("app_signature", None)
            return metadata
        except Exception as e:
            logger.error(
                f"entity_manager | developer_app.py | Unable to parse developer app metadata while indexing: {e}"
            )
            return None
    return metadata


def get_delete_developer_app_metadata_from_raw(
    raw_metadata: Optional[str],
) -> Optional[DeleteDeveloperAppMetadata]:
    metadata: DeleteDeveloperAppMetadata = {
        "address": None,
    }

    if raw_metadata:
        try:
            json_metadata = json.loads(raw_metadata)

            raw_address = json_metadata.get("address", None)
            if raw_address:
                metadata["address"] = raw_address.lower()
            else:
                metadata["address"] = None
            return metadata
        except Exception as e:
            logger.error(
                f"entity_manager | developer_app.py | Unable to parse developer app metadata while indexing: {e}"
            )
            return None
    return metadata


def validate_developer_app_tx(params: ManageEntityParameters, metadata):
    user_id = params.user_id
    address = metadata.get("address", None)
    session = params.session

    if params.entity_type != EntityType.DEVELOPER_APP:
        raise IndexingValidationError(
            f"Invalid Developer App Transaction, wrong entity type {params.entity_type}"
        )
    if not user_id:
        raise IndexingValidationError(
            f"Invalid {params.action} Developer App Transaction, user id is required and was not provided"
        )
    if user_id not in params.existing_records["User"]:
        raise IndexingValidationError(
            f"Invalid {params.action} Developer App Transaction, user id {user_id} does not exist"
        )
    if not params.existing_records["User"][user_id].wallet:
        raise IndexingValidationError(
            f"Programming error while indexing {params.action} Developer App Transaction, user wallet missing"
        )

    wallet = params.existing_records["User"][user_id].wallet
    if wallet and wallet.lower() != params.signer.lower():
        raise IndexingValidationError(
            f"Invalid {params.action} Developer App Transaction, user does not match signer"
        )
    if params.action == Action.DELETE:
        if not address:
            raise IndexingValidationError(
                f"Invalid {params.action} Developer App Transaction, address is required and was not provided"
            )

        if address not in params.existing_records["DeveloperApp"]:
            raise IndexingValidationError(
                f"Invalid Delete Developer App Transaction, developer app with address {metadata['address']} does not exist"
            )
        existing_developer_app = params.existing_records["DeveloperApp"][address]
        if user_id != existing_developer_app.user_id:
            raise IndexingValidationError(
                f"Invalid Delete Developer App Transaction, user id {user_id} does not match given developer app address"
            )
    elif params.action == Action.CREATE:
        if not metadata["app_signature"]:
            raise IndexingValidationError(
                "Invalid Create Developer App Transaction, app signature is required and was not provided"
            )
        if (
            not isinstance(metadata["app_signature"], dict)
            or not metadata["app_signature"]
            .get("message", "")
            .startswith("Creating Audius developer app at ")
            or not is_within_6_hours(
                (metadata["app_signature"].get("message", "").split())[-1]
            )
        ):
            raise IndexingValidationError(
                "Invalid Create Developer App Transaction, app signature provided does not have correct message"
            )
        try:
            address = get_app_address_from_signature(metadata["app_signature"])
        except:
            raise IndexingValidationError(
                "Invalid Create Developer App Transaction, app signature provided is invalid"
            )
        if not address:
            raise IndexingValidationError(
                "Invalid Create Developer App Transaction, app signature provided is invalid"
            )
        if not metadata["name"]:
            raise IndexingValidationError(
                "Invalid Create Developer App Transaction, name is required and was not provided"
            )
        if not isinstance(metadata["name"], str) or len((metadata["name"])) > 50:
            raise IndexingValidationError(
                "Invalid Create Developer App Transaction, name must be under 51 characters"
            )
        if address in params.existing_records["DeveloperApp"]:
            raise IndexingValidationError(
                f"Invalid Create Developer App Transaction, address {address} already exists"
            )
        if metadata["is_personal_access"] != None and not isinstance(
            metadata["is_personal_access"], bool
        ):
            raise IndexingValidationError(
                "Invalid Create Developer App Transaction, is_personal_access must be a boolean (or empty)"
            )
        if metadata["description"] != None and (
            not isinstance(metadata["description"], str)
            or len((metadata["description"])) > 160
        ):
            raise IndexingValidationError(
                "Invalid Create Developer App Transaction, description must be under 161 characters"
            )

        num_existing_apps_from_user = (
            session.query(DeveloperApp)
            .filter(
                DeveloperApp.user_id == user_id,
                DeveloperApp.is_delete == False,
                DeveloperApp.is_current == True,
            )
            .count()
        )

        num_new_apps_from_user = 0
        for addressKey, apps in params.new_records["DeveloperApp"].items():
            if addressKey.lower() != address.lower() and apps[-1].user_id == user_id:
                num_new_apps_from_user += 1

        user_has_too_many_apps = (
            num_existing_apps_from_user + num_new_apps_from_user >= 3
        )
        print(f"asdf num_existing_apps_from_user {num_existing_apps_from_user}")
        print(f"asdf num_new_apps_from_user {num_new_apps_from_user}")

        if user_has_too_many_apps:
            raise IndexingValidationError(
                "Invalid Create Developer App Transaction, user has too many developer apps"
            )
    else:
        raise IndexingValidationError(
            f"Invalid Developer App Transaction, action {params.action} is not valid"
        )
    return address


def create_developer_app(params: ManageEntityParameters):
    metadata = get_create_developer_app_metadata_from_raw(params.metadata)
    if not metadata:
        raise IndexingValidationError(
            "Invalid Developer App Transaction, unable to parse metadata"
        )
    address = validate_developer_app_tx(params, metadata)
    user_id = params.user_id

    developer_app_record = DeveloperApp(
        user_id=user_id,
        name=cast(
            str, metadata["name"]
        ),  # cast to assert non null (since we validated above)
        address=cast(
            str, address
        ),  # cast to assert non null (since we validated above)
        description=(metadata["description"] or None),
        is_personal_access=(metadata["is_personal_access"] or False),
        txhash=params.txhash,
        blockhash=params.event_blockhash,
        blocknumber=params.block_number,
        is_current=True,
        updated_at=params.block_datetime,
        created_at=params.block_datetime,
    )

    validate_developer_app_record(developer_app_record)
    params.add_record(address, developer_app_record)
    return developer_app_record


def delete_developer_app(params: ManageEntityParameters):
    metadata = get_delete_developer_app_metadata_from_raw(params.metadata)
    if not metadata:
        raise IndexingValidationError(
            "Invalid Revoke Developer App Transaction, unable to parse metadata"
        )
    address = validate_developer_app_tx(params, metadata)
    existing_developer_app = params.existing_records["DeveloperApp"][address]
    if address in params.new_records["DeveloperApp"]:
        existing_developer_app = params.new_records["DeveloperApp"][address][-1]

    revoked_developer_app = copy_record(
        existing_developer_app,
        params.block_number,
        params.event_blockhash,
        params.txhash,
        params.block_datetime,
    )

    revoked_developer_app.is_delete = True

    validate_developer_app_record(revoked_developer_app)
    params.add_record(address, revoked_developer_app)
    return revoked_developer_app


def validate_developer_app_record(developer_app_record):
    if not all_required_fields_present(DeveloperApp, developer_app_record):
        raise EntityMissingRequiredFieldError(
            "developer app",
            developer_app_record,
            f"Error parsing developer app {developer_app_record} with entity missing required field(s)",
        )

    return developer_app_record
