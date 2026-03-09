import json
import time
from typing import List, Optional, TypedDict, Union, cast

from src.exceptions import IndexingValidationError
from src.models.grants.developer_app import DeveloperApp
from src.models.grants.oauth_redirect_uri import OauthRedirectUri
from src.tasks.entity_manager.utils import (
    Action,
    EntityType,
    ManageEntityParameters,
    copy_record,
    get_address_from_signature,
    validate_signer,
)
from src.utils.helpers import is_fqdn
from src.utils.indexing_errors import EntityMissingRequiredFieldError
from src.utils.model_nullable_validator import all_required_fields_present
from src.utils.structured_logger import StructuredLogger

logger = StructuredLogger(__name__)


MAX_DESCRIPTION_LENGTH = 160
MAX_IMAGE_URL_LENGTH = 2000
MAX_APP_COUNT = 5
MAX_REDIRECT_URI_LENGTH = 2000
MAX_REDIRECT_URIS = 50


class AppSignature(TypedDict):
    message: str
    signature: str


class CreateDeveloperAppMetadata(TypedDict):
    name: Union[str, None]
    description: Union[str, None]
    image_url: Union[str, None]
    is_personal_access: Union[bool, None]
    app_signature: Union[AppSignature, None]
    redirect_uris: Union[List[str], None]


class UpdateDeveloperAppMetadata(TypedDict):
    name: Union[str, None]
    description: Union[str, None]
    image_url: Union[str, None]
    address: Union[str, None]
    redirect_uris: Union[List[str], None]


class DeleteDeveloperAppMetadata(TypedDict):
    address: Union[str, None]


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
        "image_url": None,
        "redirect_uris": None,
    }

    if raw_metadata:
        try:
            json_metadata = json.loads(raw_metadata)

            metadata["name"] = json_metadata.get("name", None)
            metadata["description"] = json_metadata.get("description", None)
            image_url_raw = json_metadata.get("image_url", None)
            if image_url_raw and is_fqdn(image_url_raw):
                metadata["image_url"] = image_url_raw
            metadata["is_personal_access"] = json_metadata.get(
                "is_personal_access", None
            )
            metadata["app_signature"] = json_metadata.get("app_signature", None)
            redirect_uris_raw = json_metadata.get("redirect_uris", None)
            if isinstance(redirect_uris_raw, list) and all(
                isinstance(u, str) and len(u) <= MAX_REDIRECT_URI_LENGTH
                for u in redirect_uris_raw
            ):
                metadata["redirect_uris"] = redirect_uris_raw[:MAX_REDIRECT_URIS]
            return metadata
        except Exception as e:
            logger.error(
                f"entity_manager | developer_app.py | Unable to parse developer app create while indexing: {e}"
            )
            return None
    return metadata


def get_update_developer_app_metadata_from_raw(
    raw_metadata: Optional[str],
) -> Optional[UpdateDeveloperAppMetadata]:
    metadata: UpdateDeveloperAppMetadata = {
        "name": None,
        "description": None,
        "image_url": None,
        "address": None,
        "redirect_uris": None,
    }

    if raw_metadata:
        try:
            json_metadata = json.loads(raw_metadata)
            raw_address = json_metadata.get("address", None)
            if raw_address:
                metadata["address"] = raw_address.lower()
            else:
                metadata["address"] = None

            metadata["name"] = json_metadata.get("name", None)
            metadata["description"] = json_metadata.get("description", None)
            image_url_raw = json_metadata.get("image_url", None)
            if image_url_raw and is_fqdn(image_url_raw):
                metadata["image_url"] = image_url_raw
            redirect_uris_raw = json_metadata.get("redirect_uris", None)
            if isinstance(redirect_uris_raw, list) and all(
                isinstance(u, str) and len(u) <= MAX_REDIRECT_URI_LENGTH
                for u in redirect_uris_raw
            ):
                metadata["redirect_uris"] = redirect_uris_raw[:MAX_REDIRECT_URIS]
            return metadata
        except Exception as e:
            logger.error(
                f"entity_manager | developer_app.py | Unable to parse developer app update while indexing: {e}"
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


def validate_entity_type(params: ManageEntityParameters):
    if params.entity_type != EntityType.DEVELOPER_APP:
        raise IndexingValidationError(
            f"Invalid {params.action} Developer App Transaction, wrong entity type {params.entity_type}"
        )


def validate_user(params: ManageEntityParameters):
    user_id = params.user_id
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


def validate_address_exists(params: ManageEntityParameters, metadata: dict):
    address = metadata.get("address", None)
    if not address:
        raise IndexingValidationError(
            f"Invalid {params.action} Developer App Transaction, address is required and was not provided"
        )

    if address not in params.existing_records["DeveloperApp"]:
        raise IndexingValidationError(
            f"Invalid {params.action} Developer App Transaction, developer app with address {metadata['address']} does not exist"
        )


def validate_owner(params: ManageEntityParameters, metadata: dict):
    user_id = params.user_id
    address = metadata.get("address", None)

    existing_developer_app = params.existing_records["DeveloperApp"][address]
    if user_id != existing_developer_app.user_id:
        raise IndexingValidationError(
            f"Invalid {params.action} Developer App Transaction, user id {user_id} does not match given developer app address"
        )


def validate_app_signature(params: ManageEntityParameters, metadata: dict):
    address = metadata.get("address", None)

    if not metadata["app_signature"]:
        raise IndexingValidationError(
            "Invalid {params.action} Developer App Transaction, app signature is required and was not provided"
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
            f"Invalid {params.action} Developer App Transaction, app signature provided does not have correct message"
        )
    try:
        address = get_address_from_signature(metadata["app_signature"])
    except:
        raise IndexingValidationError(
            f"Invalid {params.action} Developer App Transaction, app signature provided is invalid"
        )
    if not address:
        raise IndexingValidationError(
            f"Invalid {params.action} Developer App Transaction, app signature provided is invalid"
        )


def validate_name(params: ManageEntityParameters, metadata: dict):
    if not metadata["name"]:
        raise IndexingValidationError(
            f"Invalid {params.action} Developer App Transaction, name is required and was not provided"
        )
    if not isinstance(metadata["name"], str) or len((metadata["name"])) > 50:
        raise IndexingValidationError(
            f"Invalid {params.action} Developer App Transaction, name must be under 51 characters"
        )


def validate_unique_address(params: ManageEntityParameters, metadata: dict):
    address = metadata.get("address", None)
    if address in params.existing_records["DeveloperApp"]:
        raise IndexingValidationError(
            f"Invalid {params.action} Developer App Transaction, address {address} already exists"
        )
    if address in params.existing_records["UserWallet"]:
        raise IndexingValidationError(
            f"Invalid {params.action} Developer App Transaction, address cannot be a user's wallet"
        )


def validate_personal_access(params: ManageEntityParameters, metadata: dict):
    if metadata["is_personal_access"] != None and not isinstance(
        metadata["is_personal_access"], bool
    ):
        raise IndexingValidationError(
            f"Invalid {params.action} Developer App Transaction, is_personal_access must be a boolean (or empty)"
        )


def validate_description(params: ManageEntityParameters, metadata: dict):
    if metadata["description"] != None and (
        not isinstance(metadata["description"], str)
        or len((metadata["description"])) > MAX_DESCRIPTION_LENGTH
    ):
        raise IndexingValidationError(
            f"Invalid {params.action} Developer App Transaction, description must be under 161 characters"
        )


def validate_image_url(params: ManageEntityParameters, metadata: dict):
    if metadata["image_url"] != None and (
        not isinstance(metadata["image_url"], str)
        or len((metadata["image_url"])) > MAX_IMAGE_URL_LENGTH
    ):
        raise IndexingValidationError(
            f"Invalid {params.action} Developer App Transaction, image_url must be under 2001 characters"
        )


def validate_user_app_count(params: ManageEntityParameters, metadata: dict):
    user_id = params.user_id
    address = metadata.get("address", None)
    session = params.session

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
        num_existing_apps_from_user + num_new_apps_from_user >= MAX_APP_COUNT
    )
    if user_has_too_many_apps:
        raise IndexingValidationError(
            "Invalid Create Developer App Transaction, user has too many developer apps"
        )


def validate_developer_app_tx(params: ManageEntityParameters, metadata):
    validate_entity_type(params)
    validate_user(params)
    validate_signer(params)

    if params.action == Action.DELETE:
        validate_address_exists(params, metadata)
        validate_owner(params, metadata)

    elif params.action == Action.CREATE:
        validate_app_signature(params, metadata)
        metadata["address"] = get_address_from_signature(metadata["app_signature"])
        validate_unique_address(params, metadata)
        validate_name(params, metadata)
        validate_personal_access(params, metadata)
        validate_description(params, metadata)
        validate_image_url(params, metadata)
        validate_user_app_count(params, metadata)

    elif params.action == Action.UPDATE:
        validate_address_exists(params, metadata)
        validate_owner(params, metadata)
        validate_name(params, metadata)
        validate_description(params, metadata)
        validate_image_url(params, metadata)

    else:
        raise IndexingValidationError(
            f"Invalid Developer App Transaction, action {params.action} is not valid"
        )

    address = metadata.get("address", None)
    return address


def create_developer_app(params: ManageEntityParameters):
    metadata = get_create_developer_app_metadata_from_raw(params.metadata)
    if not metadata:
        raise IndexingValidationError(
            "Invalid Developer App Transaction, unable to parse create metadata"
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
        image_url=(metadata["image_url"] or None),
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

    for uri in metadata.get("redirect_uris") or []:
        params.session.add(OauthRedirectUri(client_id=address, redirect_uri=uri))

    return developer_app_record


def update_developer_app(params: ManageEntityParameters):
    metadata = get_update_developer_app_metadata_from_raw(params.metadata)
    if not metadata:
        raise IndexingValidationError(
            "Invalid Developer App Transaction, unable to parse update metadata"
        )
    address = validate_developer_app_tx(params, metadata)

    existing_developer_app = params.existing_records["DeveloperApp"][address]
    developer_app_record = copy_record(
        existing_developer_app,
        params.block_number,
        params.event_blockhash,
        params.txhash,
        params.block_datetime,
    )

    developer_app_record.name = cast(str, metadata["name"])
    developer_app_record.description = metadata["description"] or None
    developer_app_record.image_url = metadata["image_url"] or None

    validate_developer_app_record(developer_app_record)
    params.add_record(address, developer_app_record)

    redirect_uris = metadata.get("redirect_uris")
    if redirect_uris is not None:
        params.session.query(OauthRedirectUri).filter(
            OauthRedirectUri.client_id == address
        ).delete(synchronize_session=False)
        for uri in redirect_uris:
            params.session.add(OauthRedirectUri(client_id=address, redirect_uri=uri))

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

    params.session.query(OauthRedirectUri).filter(
        OauthRedirectUri.client_id == address
    ).delete(synchronize_session=False)

    return revoked_developer_app


def validate_developer_app_record(developer_app_record):
    if not all_required_fields_present(DeveloperApp, developer_app_record):
        raise EntityMissingRequiredFieldError(
            "developer app",
            developer_app_record,
            f"Error parsing developer app {developer_app_record} with entity missing required field(s)",
        )

    return developer_app_record
