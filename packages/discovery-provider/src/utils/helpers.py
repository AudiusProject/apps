import contextlib
import datetime
import functools
import json
import logging
import os
import re
import time
import unicodedata
from functools import reduce
from json.encoder import JSONEncoder
from typing import List, Optional, TypedDict, cast

import base58
import psutil

# pylint: disable=no-name-in-module
from eth_account.messages import encode_defunct
from flask import g, request
from hashids import Hashids
from jsonformatter import JsonFormatter
from solders.instruction import CompiledInstruction
from solders.message import Message
from solders.pubkey import Pubkey
from solders.transaction_status import UiTransactionStatusMeta
from sqlalchemy import inspect
from web3 import Web3
from web3.auto import w3

from src import exceptions
from src.solana.solana_helpers import MEMO_PROGRAM_ID, MEMO_V2_PROGRAM_ID
from src.utils.config import shared_config

from . import multihash

logger = logging.getLogger(__name__)


def get_ip(request_obj):
    """Gets the IP address from a request using the X-Forwarded-For header if present"""
    # If Cloudflare proxy is present, it should have knowledge of the connecting IP
    if request_obj.headers.get("CF-Connecting-IP"):
        return request_obj.headers.get("CF-Connecting-IP")

    # Use the X-Forwraded-For header
    ip = request_obj.headers.get("X-Forwarded-For", request_obj.remote_addr)
    if not ip:
        return ""
    return ip.split(",")[0].strip()


@contextlib.contextmanager
def cd(path):
    """Context manager that changes to directory `path` and return to CWD
    when exited.
    """
    old_path = os.getcwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(old_path)


def bytes32_to_str(bytes32input):
    bytes32_stripped = bytes32input.rstrip(b"\x00")
    return bytes32_stripped.decode("utf8")


# Regex used to verify valid FQDN
fqdn_regex = re.compile(
    r"^(?:^|[ \t])((https?:\/\/)?(?:localhost|(cn[0-9]_creator-node_1:[0-9]+)|(audius-creator-node-[0-9])|(audius-discovery-provider-[0-9])|[\w-]+(?:\.[\w-]+)+)(:\d+)?(\/\S*)?)$"
)


# Helper function to check if a given string is a valid FQDN
def is_fqdn(endpoint_str):
    # Regex used to verify valid FQDN
    valid_endpoint = fqdn_regex.match(endpoint_str)
    if valid_endpoint:
        return True
    return False


def query_result_to_list(query_result):
    results = []
    for row in query_result:
        results.append(model_to_dictionary(row, None))
    return results


def model_to_dictionary(model, exclude_keys=None):
    """Converts the given SQLAlchemy model into a dictionary, primarily used
    for serialization to JSON.

    - Includes columns, relationships, and properties decorated with
    `@property` (useful for calculated values from relationships).
    - Excludes the keys in `exclude_keys` and the keys in the given model's
    `exclude_keys` property or attribute.
    - Excludes any property or attribute with a leading underscore.
    - Excludes unloaded properties expressed in relationships.
    """
    state = inspect(model)
    # Collect the model members that are unloaded so we do not
    # unintentionally cause them to load
    unloaded = state.unloaded
    model_dict = {}

    columns = model.__table__.columns.keys()
    relationships = model.__mapper__.relationships.keys()
    properties = []
    for key in list(set(dir(model)) - set(columns) - set(relationships)):
        if hasattr(type(model), key):
            attr = getattr(type(model), key)
            if not callable(attr) and isinstance(attr, property):
                properties.append(key)

    if exclude_keys is None:
        exclude_keys = []
    if hasattr(model, "exclude_keys"):
        exclude_keys.extend(model.exclude_keys)

    assert set(exclude_keys).issubset(set(properties).union(columns))

    for key in columns:
        if key not in exclude_keys and not key.startswith("_"):
            model_dict[key] = getattr(model, key)

    for key in properties:
        if key not in exclude_keys and not key.startswith("_"):
            model_dict[key] = getattr(model, key)

    for key in relationships:
        if key not in exclude_keys and not key.startswith("_"):
            if key in unloaded:
                continue
            attr = getattr(model, key)
            if isinstance(attr, list):
                model_dict[key] = query_result_to_list(attr)
            else:
                model_dict[key] = model_to_dictionary(attr)

    return model_dict


# Convert a tuple of model format into the proper model itself represented as a dictionary.
# The number of entries in the tuple, must map the model.
#
# When a subquery selects the entirety of a model and an outer query selects the entirety
# of that subquery, the results are returned as a tuple. They can be safely coerced into
# a dictionary with column keys.
def tuple_to_model_dictionary(t, model):
    """Converts the given tuple into the proper SQLAlchemy model object in dictionary form."""
    keys = model.__table__.columns.keys()
    assert len(t) == len(keys)

    return dict(zip(keys, t))


class CustomJsonFormatter(JsonFormatter):
    def format(self, record):
        if os.getenv("audius_discprov_env") == "stage":
            cpu_percent = psutil.cpu_percent(interval=None)

            # Get memory usage
            process = psutil.Process()
            memory_info = process.memory_info()
            rss = memory_info.rss / (1024**2)  # Resident Set Size in MB

            # Include CPU and memory usage in log record
            record.cpu = cpu_percent
            record.memory = rss

        return super().format(record)


log_format = {
    "level": "levelname",
    "msg": "message",
    "timestamp": "asctime",
    "service": os.getenv("audius_service", "default"),
}

formatter = CustomJsonFormatter(log_format, ensure_ascii=False, mix_extra=True)


def reset_logging():
    root = logging.getLogger()
    list(map(root.removeHandler, root.handlers))
    list(map(root.removeFilter, root.filters))


# Configures root logger with custom format and loglevel
# All child loggers will inherit settings from root logger as configured in this function
def configure_logging(loglevel_str="WARN"):
    logger = logging.getLogger()  # retrieve root logger

    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    try:
        loglevel = getattr(logging, loglevel_str)
    except AttributeError:
        logger.warning(
            f"{loglevel_str} is not a valid loglevel. Defaulting to logging.WARN"
        )
        loglevel = logging.WARN

    logger.setLevel(loglevel)


def configure_flask_app_logging(app, loglevel_str):
    # Disable werkzeug logger to remove default flask logs in favor of app decorator log below
    werkzeug_log = logging.getLogger("werkzeug")
    werkzeug_log.disabled = True

    configure_logging(loglevel_str)
    logger = logging.getLogger()  # retrieve root logger

    # Set a timer before the req to get the request time
    @app.before_request
    def start_timer():  # pylint: disable=W0612
        # pylint: disable=E0237
        g.start = time.time()

    # Log the request
    @app.after_request
    def log_request(response):  # pylint: disable=W0612
        now = time.time()
        duration = int((now - g.start) * 1000)
        ip = get_ip(request)
        host = request.host.split(":", 1)[0]
        args = request.query_string.decode("utf-8")

        log_params = {
            "method": request.method,
            "path": request.path,
            "status": response.status_code,
            "duration": duration,
            "ip": ip,
            "host": host,
            "params": args,
        }

        request_user_id = request.headers.get("X-User-ID")
        if request_user_id:
            log_params["request_user_id"] = request_user_id

        request_app_name = request.args.get("app_name")
        if request_app_name:
            log_params["appName"] = request_app_name
            logger.debug("handle read via developer app", extra=log_params)

        parts = []
        for name, value in log_params.items():
            part = f"{name}={value}"
            parts.append(part)

        logger.debug("handle flask request", extra=log_params)
        return response


def load_abi_values():
    abiDir = os.path.join(os.getcwd(), "build", "contracts")
    jsonFiles = os.listdir(abiDir)
    loaded_abi_values = {}
    for contractJsonFile in jsonFiles:
        fullPath = os.path.join(abiDir, contractJsonFile)
        with open(fullPath) as f:
            data = json.load(f)
            loaded_abi_values[data["contractName"]] = data
    return loaded_abi_values


# Load Ethereum ABI values
def load_eth_abi_values():
    abiDir = os.path.join(os.getcwd(), "build", "eth-contracts")
    jsonFiles = os.listdir(abiDir)
    loaded_abi_values = {}
    for contractJsonFile in jsonFiles:
        fullPath = os.path.join(abiDir, contractJsonFile)
        with open(fullPath) as f:
            data = json.load(f)
            loaded_abi_values[data["contractName"]] = data
    return loaded_abi_values


def remove_test_file(filepath):
    """Try and remove a file, no-op if not present"""
    try:
        os.remove(filepath)
    except OSError:
        pass


def multihash_digest_to_cid(multihash_digest):
    user_metadata_digest = multihash_digest.hex()
    user_metadata_hash_fn = 18
    buf = multihash.encode(bytes.fromhex(user_metadata_digest), user_metadata_hash_fn)
    return multihash.to_b58_string(buf)


def get_discovery_provider_version():
    versionFilePath = os.path.join(os.getcwd(), ".version.json")
    data = None
    with open(versionFilePath) as f:
        data = json.load(f)
    return data


HASH_MIN_LENGTH = 5
HASH_SALT = "azowernasdfoia"

hashids = Hashids(min_length=5, salt=HASH_SALT)


def encode_int_id(id: int):
    # if id is already a string, assume it has already been encoded
    if isinstance(id, str):
        return id
    return cast(str, hashids.encode(id))


def decode_string_id(id: str) -> Optional[int]:
    # Returns a tuple
    decoded = hashids.decode(id)
    if not decoded:
        return None
    return decoded[0]


def create_track_route_id(title, handle):
    """
    Constructs a track's route_id from an unsanitized title and handle.
    Resulting route_ids are of the shape `<handle>/<sanitized_title>`.
    """
    sanitized_title = title.encode("utf-8", "ignore").decode("utf-8", "ignore")
    sanitized_title = unicodedata.normalize("NFC", sanitized_title)
    # Strip out invalid characters
    sanitized_title = re.sub(
        r"!|%|\`|#|\$|&|\'|\(|\)|&|\*|\+|,|\/|:|;|=|\?|@|\[|\]|\x00",
        "",
        sanitized_title,
    )

    # Convert whitespaces to dashes
    sanitized_title = re.sub(r"\s+", "-", sanitized_title)

    # Convert multiple dashes to single dashes
    sanitized_title = re.sub(r"-+", "-", sanitized_title)

    # Lowercase it
    sanitized_title = sanitized_title.lower()

    # Lowercase the handle
    sanitized_handle = handle.lower()

    return f"{sanitized_handle}/{sanitized_title}"


def sanitize_slug(title, record_id, collision_id=0):
    """Converts the title of a record into a URL-friendly 'slug'

    Strips special characters, replaces spaces with dashes, converts to
    lowercase, and appends a collision_id if non-zero.

    If the sanitized title is entirely escaped (empty string), use the
    hashed record_id.

    Example:
    (Title="My Awesome Track!", collision_id=2) => "my-awesome-track-2"
    (PlaylistName="My Awesome Playlist'~~", collision_id=2) => "my-awesome-playlist-2"
    """
    sanitized_title = title.encode("utf-8", "ignore").decode("utf-8", "ignore")
    sanitized_title = unicodedata.normalize("NFC", sanitized_title)
    # Strip out invalid characters
    sanitized_title = re.sub(
        r"!|%|#|\$|&|\'|\(|\)|&|\*|\+|\’|,|\/|:|;|=|\?|@|\[|\]|\x00|\^|\.|\{|\}|\"|~",
        "",
        sanitized_title,
    )

    # Convert whitespaces to dashes
    sanitized_title = re.sub(r"\s+", "-", sanitized_title.strip())
    sanitized_title = re.sub(r"-+", "-", sanitized_title)

    sanitized_title = sanitized_title.lower()
    # This means that the entire title was sanitized away, use the id
    # for the slug.
    if not sanitized_title:
        sanitized_title = encode_int_id(record_id)

    if collision_id > 0:
        sanitized_title = f"{sanitized_title}-{collision_id}"

    return sanitized_title


# Validates the existance of arguments within a request.
# req_args is a map, expected_args is a list of string arguments expected to be present in the map.
def validate_arguments(req_args, expected_args):
    if req_args is None:
        raise exceptions.ArgumentError("No arguments present.")
    all_exist = reduce((lambda acc, cur: cur in req_args and acc), expected_args, True)
    if not all_exist:
        raise exceptions.ArgumentError("Not all required arguments exist.")


# Subclass JSONEncoder to format dates in strict isoformat.
# Otherwise, it can behave differently on diffeent systems.
class DateTimeEncoder(JSONEncoder):
    def default(self, o):  # pylint: disable=method-hidden
        if isinstance(o, (datetime.date, datetime.datetime)):
            return o.isoformat()
        return super().default(o)


def time_method(func):
    @functools.wraps(func)
    def wrapper(*args, **kargs):
        tick = time.perf_counter()
        result = func(*args, **kargs)
        tock = time.perf_counter()
        elapsed = tock - tick
        logger = logging.getLogger(__name__)
        logger.debug(f"TIME_METHOD Function={func.__name__} Elapsed={elapsed:0.6f}s")
        return result

    return wrapper


def get_tx_arg(tx, arg_name):
    return getattr(tx["args"], arg_name)


# Split a list into smaller lists
def split_list(list, n):
    for i in range(0, len(list), n):
        yield list[i : i + n]


class BalanceChange(TypedDict):
    pre_balance: int
    post_balance: int
    change: int
    owner: str


def get_solana_tx_token_balance_changes(
    account_keys: List[str],
    meta: UiTransactionStatusMeta,
    mint: Optional[str] = None,
):
    """
    Extracts the pre and post balances and determines change for a solana transaction metadata object
    Args:
        account_keys: the account keys for legacy transaction or the account keys
            + loaded addresses for a v1 transaction.
    """
    all_keys = account_keys.copy()
    if meta.loaded_addresses:
        writable = meta.loaded_addresses.writable or []
        readonly = meta.loaded_addresses.readonly or []
        all_keys.extend(str(key) for key in writable + readonly)

    balance_changes: dict[str, BalanceChange] = {}
    for pre_balance_dict in meta.pre_token_balances or []:
        if mint and str(pre_balance_dict.mint) != mint:
            continue

        post_balance_dict = next(
            (
                balance
                for balance in (meta.post_token_balances or [])
                if balance.account_index == pre_balance_dict.account_index
            ),
            None,
        )
        if post_balance_dict is None:
            continue

        account_key = all_keys[pre_balance_dict.account_index]
        pre_balance = int(pre_balance_dict.ui_token_amount.amount)
        post_balance = int(post_balance_dict.ui_token_amount.amount)
        owner = post_balance_dict.owner
        change = post_balance - pre_balance
        balance_changes[account_key] = {
            "pre_balance": pre_balance,
            "post_balance": post_balance,
            "change": change,
            "owner": str(owner),
        }
    return balance_changes


def get_memo_program_index(tx_message: Message):
    try:
        return tx_message.account_keys.index(Pubkey.from_string(MEMO_PROGRAM_ID))
    except ValueError:
        # Do nothing, there's no memos
        return None


def get_memo_v2_program_index(tx_message: Message):
    try:
        return tx_message.account_keys.index(Pubkey.from_string(MEMO_V2_PROGRAM_ID))
    except ValueError:
        # Do nothing, there's no memos
        return None


def decode_all_solana_memos(tx_message: Message):
    """Finds all memo instructions in a transaction and base58 decodes their instruction data as a string"""
    memo_program_index = get_memo_program_index(tx_message)
    memo_v2_program_index = get_memo_v2_program_index(tx_message)
    return [
        base58.b58decode(instruction.data).decode("utf8")
        for instruction in tx_message.instructions
        if instruction.program_id_index == memo_program_index
        or instruction.program_id_index == memo_v2_program_index
    ]


def get_account_owner_from_balance_change(
    account: str, balance_changes: dict[str, BalanceChange]
):
    """Finds the owner of the sender account by looking at the balance changes"""
    if account in balance_changes:
        return balance_changes[account]["owner"]
    else:
        return None


def get_valid_instruction(
    tx_message: Message, meta: UiTransactionStatusMeta, program_address: str
) -> Optional[CompiledInstruction]:
    """Checks that the tx is valid
    checks for the transaction message for correct instruction log
    checks accounts keys for claimable token program
    """
    account_keys = tx_message.account_keys
    instructions: List[CompiledInstruction] = tx_message.instructions
    try:
        program_index = list(map(lambda x: str(x), account_keys)).index(program_address)
        for instruction in instructions:
            if instruction.program_id_index == program_index:
                return instruction
    except ValueError as e:
        logger.error(
            f"No {program_address} found in instruction account keys {account_keys}, {e}"
        )

    return None


def has_log(meta: UiTransactionStatusMeta, instruction: str):
    if meta is None:
        return False
    return any(log == instruction for log in (meta.log_messages or []))


# The transaction might list sender/receiver in a different order in the pubKeys.
# The "accounts" field of the instruction has the mapping of accounts to pubKey index
# Example of transaction JSON returned from solana getTransaction():
# Eg: accounts[0] = 1, so to look up pre and post balances for
# 3Y7gfpxeniGVyVC93CrK42tD4GFSt6gxTW2xfFzKqxVt, look for accountIndex: 1
# "transaction": {
#     "message": {
#         "header": {
#             "numReadonlySignedAccounts": 0,
#             "numReadonlyUnsignedAccounts": 3,
#             "numRequiredSignatures": 1
#         },
#         "accountKeys": [
#             "FFQB4iQRXWqQHDRbpixXyGoufw8qdVt8SDLuFzZSZZka",
#             "3Y7gfpxeniGVyVC93CrK42tD4GFSt6gxTW2xfFzKqxVt",
#             "E2LCbKdo2L3ikt1gK6pwp1pDLuhAfHBNf6fEQXpAqrf9",
#             "9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM",
#             "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo",
#             "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
#         ],
#         "recentBlockhash": "22F56uRSayJV1AKMN5jiim5xyGCxvShamW4VrZyfgM9U",
#         "instructions": [
#             {
#             "accounts": [
#                 0
#             ],
#             "data": "Bs2CZBUGWJZV5kqF3ecfJisidP9WQtCpeeWCzk6AUyYLQWgLdHPz",
#             "programIdIndex": 4
#             },
#             {
#             "accounts": [
#                 1,
#                 3,
#                 2,
#                 0
#             ],
#             "data": "ixUKHa1t4JYGF",
#             "programIdIndex": 5
#             }
#       ],
#       "indexToProgramIds": {}
#     },
def get_account_index(instruction: CompiledInstruction, index: int):
    return instruction.accounts[index]


def get_final_poa_block() -> int:
    final_poa_block = None

    try:
        final_poa_block = int(str(os.getenv("audius_final_poa_block", 0)))
    except:
        raise Exception("audius_final_poa_block not set")

    return final_poa_block


def format_total_audio_balance(balance: str) -> int:
    return int(int(balance) / 1e18)


# Generate signature and timestamp using data
# copied from src/api_helpers.py because of circular imports
def generate_signature(data):
    # convert sorted dictionary to string with no white spaces
    to_sign_str = json.dumps(
        data,
        sort_keys=True,
        ensure_ascii=False,
        separators=(",", ":"),
        cls=DateTimeEncoder,
    )

    # generate hash for if data contains unicode chars
    to_sign_hash = Web3.keccak(text=to_sign_str).hex()

    # generate SignableMessage for sign_message()
    encoded_to_sign = encode_defunct(hexstr=to_sign_hash)

    # sign to get signature
    signed_message = w3.eth.account.sign_message(
        encoded_to_sign, private_key=shared_config["delegate"]["private_key"]
    )
    return signed_message.signature.hex()
