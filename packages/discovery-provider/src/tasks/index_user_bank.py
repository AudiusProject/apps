import concurrent.futures
import re
import time
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple, TypedDict, cast

import base58
from redis import Redis
from solders.instruction import CompiledInstruction
from solders.message import Message
from solders.pubkey import Pubkey
from solders.rpc.responses import GetTransactionResp
from solders.token.associated import get_associated_token_address
from solders.transaction_status import UiTransactionStatusMeta
from sqlalchemy import and_, desc
from sqlalchemy.orm.session import Session

from src.challenges.challenge_event import ChallengeEvent
from src.challenges.challenge_event_bus import ChallengeEventBus
from src.exceptions import SolanaTransactionFetchError
from src.models.users.audio_transactions_history import (
    AudioTransactionsHistory,
    TransactionMethod,
    TransactionType,
)
from src.models.users.usdc_transactions_history import (
    USDCTransactionMethod,
    USDCTransactionsHistory,
    USDCTransactionType,
)
from src.models.users.user import User
from src.models.users.user_bank import USDCUserBankAccount, UserBankAccount, UserBankTx
from src.models.users.user_tip import UserTip
from src.queries.get_balances import enqueue_immediate_balance_refresh
from src.solana.constants import (
    FETCH_TX_SIGNATURES_BATCH_SIZE,
    TX_SIGNATURES_MAX_BATCHES,
    TX_SIGNATURES_RESIZE_LENGTH,
)
from src.solana.solana_client_manager import SolanaClientManager
from src.solana.solana_helpers import (
    JUPITER_PROGRAM_ID,
    SPL_TOKEN_ID_PK,
    get_address_pair,
    get_base_address,
)
from src.solana.solana_parser import (
    InstructionFormat,
    SolanaInstructionType,
    parse_instruction_data,
)
from src.tasks.celery_app import celery
from src.utils.config import shared_config
from src.utils.helpers import (
    BalanceChange,
    decode_all_solana_memos,
    get_account_index,
    get_account_owner_from_balance_change,
    get_solana_tx_token_balance_changes,
    get_valid_instruction,
    has_log,
)
from src.utils.prometheus_metric import save_duration_metric
from src.utils.redis_cache import get_solana_transaction_key
from src.utils.redis_constants import redis_keys
from src.utils.structured_logger import StructuredLogger

logger = StructuredLogger(__name__)

# Populate values used in UserBank indexing from config
USER_BANK_ADDRESS = shared_config["solana"]["user_bank_program_address"]
PAYMENT_ROUTER_ADDRESS = shared_config["solana"]["payment_router_program_address"]
WAUDIO_MINT = shared_config["solana"]["waudio_mint"]
USDC_MINT = shared_config["solana"]["usdc_mint"]

USER_BANK_KEY = Pubkey.from_string(USER_BANK_ADDRESS) if USER_BANK_ADDRESS else None
WAUDIO_MINT_PUBKEY = Pubkey.from_string(WAUDIO_MINT) if WAUDIO_MINT else None
USDC_MINT_PUBKEY = Pubkey.from_string(USDC_MINT) if USDC_MINT else None

PAYMENT_ROUTER_PUBKEY = (
    Pubkey.from_string(PAYMENT_ROUTER_ADDRESS) if PAYMENT_ROUTER_ADDRESS else None
)

JUPITER_PROGRAM_ID_PUBKEY = Pubkey.from_string(JUPITER_PROGRAM_ID)

# Transfer instructions don't have a mint acc arg but do have userbank authority.
# So re-derive the claimable token PDAs for each mint here to help us determine mint later.
WAUDIO_PDA, _ = get_base_address(WAUDIO_MINT_PUBKEY, USER_BANK_KEY)
USDC_PDA, _ = get_base_address(USDC_MINT_PUBKEY, USER_BANK_KEY)

PAYMENT_ROUTER_PDA_PUBKEY, _ = get_base_address(
    "payment_router".encode("UTF-8"), PAYMENT_ROUTER_PUBKEY
)
PAYMENT_ROUTER_USDC_ATA_ADDRESS = (
    str(get_associated_token_address(PAYMENT_ROUTER_PDA_PUBKEY, USDC_MINT_PUBKEY))
    if PAYMENT_ROUTER_PDA_PUBKEY and USDC_MINT_PUBKEY
    else None
)
PAYMENT_ROUTER_WAUDIO_ATA_ADDRESS = (
    str(get_associated_token_address(PAYMENT_ROUTER_PDA_PUBKEY, WAUDIO_MINT_PUBKEY))
    if PAYMENT_ROUTER_PDA_PUBKEY and WAUDIO_MINT_PUBKEY
    else None
)

# Used to limit tx history if needed
MIN_SLOT = int(shared_config["solana"]["user_bank_min_slot"])
INITIAL_FETCH_SIZE = 10

PREPARE_WITHDRAWAL_MEMO_STRING = "Prepare Withdrawal"
WITHDRAWAL_MEMO_STRING = "Withdrawal"
INTERNAL_TRANSFER_MEMO_STRING = "Internal Transfer"

# Used to find the correct accounts for sender/receiver in the transaction and the ClaimableTokensPDA
TRANSFER_SENDER_ACCOUNT_INDEX = 1
TRANSFER_RECEIVER_ACCOUNT_INDEX = 2
TRANSFER_USER_BANK_PDA_INDEX = 4

# Used to find the mint for a CreateTokenAccount instruction
CREATE_MINT_ACCOUNT_INDEX = 1

# Used to find the memo instruction
TRANSFER_MEMO_INSTRUCTION_INDEX = 2

# The amount of USDC that represents one USD cent
USDC_PER_USD_CENT = 10000


# Recover ethereum public key from bytes array
# Message formatted as follows:
# EthereumAddress = [214, 237, 135, 129, 143, 240, 221, 138, 97, 84, 199, 236, 234, 175, 81, 23, 114, 209, 118, 39]
def parse_eth_address_from_msg(msg: str):
    res = re.findall(r"\[.*?\]", msg)
    # Remove brackets
    inner_res = res[0][1:-1]
    # Convert to public key hex for ethereum
    arr_val = [int(s) for s in inner_res.split(",")]
    public_key_bytes = bytes(arr_val)
    public_key = public_key_bytes.hex()
    public_key_str = f"0x{public_key}"
    return public_key_str, public_key_bytes


# Return highest user bank slot that has been processed
def get_highest_user_bank_tx_slot(session: Session):
    slot = MIN_SLOT
    tx_query = (session.query(UserBankTx.slot).order_by(desc(UserBankTx.slot))).first()
    if tx_query:
        slot = tx_query[0]
    return slot


# Query a tx signature and confirm its existence
def get_tx_in_db(session: Session, tx_sig: str) -> bool:
    exists = False
    tx_sig_db_count = (
        session.query(UserBankTx).filter(UserBankTx.signature == tx_sig)
    ).count()
    exists = tx_sig_db_count > 0
    return exists


def refresh_user_balances(session: Session, redis: Redis, accts=List[str]):
    results = (
        session.query(User.user_id, UserBankAccount.bank_account)
        .join(
            UserBankAccount,
            and_(
                UserBankAccount.bank_account.in_(accts),
                UserBankAccount.ethereum_address == User.wallet,
            ),
        )
        .filter(User.is_current == True)
        .all()
    )
    # Only refresh if this is a known account within audius
    if results:
        user_ids = [user_id[0] for user_id in results]
        logger.debug(f"index_user_bank.py | Refresh user_ids = {user_ids}")
        enqueue_immediate_balance_refresh(redis, user_ids)
    return results


create_token_account_instr: List[InstructionFormat] = [
    {"name": "eth_address", "type": SolanaInstructionType.EthereumAddress},
]


def process_create_userbank_instruction(
    session: Session,
    instruction: CompiledInstruction,
    account_keys: List[str],
    tx_sig: str,
    timestamp: datetime,
):
    tx_data = str(instruction.data)
    parsed_token_data = parse_create_token_data(tx_data)
    eth_addr = parsed_token_data["eth_address"]
    decoded = base58.b58decode(tx_data)[1:]
    public_key_bytes = decoded[:20]
    mint_address = account_keys[
        get_account_index(instruction, CREATE_MINT_ACCOUNT_INDEX)
    ]
    _, derived_address = get_address_pair(
        Pubkey.from_string(mint_address),
        public_key_bytes,
        USER_BANK_KEY,
        SPL_TOKEN_ID_PK,
    )
    bank_acct = str(derived_address[0])
    try:
        # Confirm expected address is present in transaction
        bank_acct_index = account_keys.index(bank_acct)
        if bank_acct_index:
            if mint_address == WAUDIO_MINT:
                logger.debug(
                    f"index_user_bank.py | {tx_sig} Found known $AUDIO account: {eth_addr}, {bank_acct}"
                )
                session.add(
                    UserBankAccount(
                        signature=tx_sig,
                        ethereum_address=eth_addr,
                        bank_account=bank_acct,
                        created_at=timestamp,
                    )
                )
            elif mint_address == USDC_MINT:
                logger.debug(
                    f"index_user_bank.py | {tx_sig} Found known $USDC account: {eth_addr}, {bank_acct}"
                )
                session.add(
                    USDCUserBankAccount(
                        signature=tx_sig,
                        ethereum_address=eth_addr,
                        bank_account=bank_acct,
                        created_at=timestamp,
                    )
                )
            else:
                logger.error(
                    f"index_user_bank.py | Unknown mint address {mint_address}. Expected AUDIO={WAUDIO_MINT} or USDC={USDC_MINT}"
                )
        else:
            logger.error(
                f"index_user_bank.py | Failed to find user bank account index {bank_acct}"
            )

    except ValueError as e:
        logger.error(e)


def get_transfer_type_from_memo(memos: List[str]) -> USDCTransactionType:
    """Checks the list of memos for one matching containing a transaction type and returns it if found. Defaults to USDCTransactionType.transfer if no matching memo is found"""
    for memo in memos:
        if memo == PREPARE_WITHDRAWAL_MEMO_STRING:
            return USDCTransactionType.prepare_withdrawal
        elif memo == WITHDRAWAL_MEMO_STRING:
            return USDCTransactionType.withdrawal
        elif memo == INTERNAL_TRANSFER_MEMO_STRING:
            return USDCTransactionType.internal_transfer
    return USDCTransactionType.transfer


def index_user_tip(
    session: Session,
    receiver_user_id: int,
    receiver_account: str,
    sender_user_id: int,
    sender_account: str,
    balance_changes: dict[str, BalanceChange],
    slot: int,
    timestamp: datetime,
    tx_sig: str,
):
    user_tip = UserTip(
        signature=tx_sig,
        amount=balance_changes[receiver_account]["change"],
        sender_user_id=sender_user_id,
        receiver_user_id=receiver_user_id,
        slot=slot,
        created_at=timestamp,
    )
    logger.debug(f"index_user_bank.py | Creating tip {user_tip}")
    session.add(user_tip)

    audio_tx_sent = AudioTransactionsHistory(
        user_bank=sender_account,
        slot=slot,
        signature=tx_sig,
        transaction_type=TransactionType.tip,
        method=TransactionMethod.send,
        transaction_created_at=timestamp,
        change=Decimal(balance_changes[sender_account]["change"]),
        balance=Decimal(balance_changes[sender_account]["post_balance"]),
        tx_metadata=str(receiver_user_id),
    )
    logger.debug(
        f"index_user_bank.py | Creating audio_tx_history send tx for tip {audio_tx_sent}"
    )
    session.add(audio_tx_sent)
    audio_tx_received = AudioTransactionsHistory(
        user_bank=receiver_account,
        slot=slot,
        signature=tx_sig,
        transaction_type=TransactionType.tip,
        method=TransactionMethod.receive,
        transaction_created_at=timestamp,
        change=Decimal(balance_changes[receiver_account]["change"]),
        balance=Decimal(balance_changes[receiver_account]["post_balance"]),
        tx_metadata=str(sender_user_id),
    )
    session.add(audio_tx_received)
    logger.debug(
        f"index_user_bank.py | Creating audio_tx_history received tx for tip {audio_tx_received}"
    )


def process_transfer_instruction(
    session: Session,
    redis: Redis,
    instruction: CompiledInstruction,
    memos: List[str],
    account_keys: List[str],
    meta: UiTransactionStatusMeta,
    tx_sig: str,
    slot: int,
    challenge_event_bus: ChallengeEventBus,
    timestamp: datetime,
):
    sender_idx = get_account_index(instruction, TRANSFER_SENDER_ACCOUNT_INDEX)
    receiver_idx = get_account_index(instruction, TRANSFER_RECEIVER_ACCOUNT_INDEX)
    sender_account = account_keys[sender_idx]
    receiver_account = account_keys[receiver_idx]

    userbank_authority_pda = account_keys[
        get_account_index(instruction, TRANSFER_USER_BANK_PDA_INDEX)
    ]
    is_audio = userbank_authority_pda == str(WAUDIO_PDA)
    is_usdc = userbank_authority_pda == str(USDC_PDA)
    if not is_audio and not is_usdc:
        logger.error(
            f"index_user_bank.py | Unknown claimableTokenPDA in transaction. Expected {str(WAUDIO_PDA)} or {str(USDC_PDA)} but got {userbank_authority_pda}"
        )
        return

    if (
        receiver_account == PAYMENT_ROUTER_USDC_ATA_ADDRESS
        or receiver_account == PAYMENT_ROUTER_WAUDIO_ATA_ADDRESS
    ):
        logger.debug(f"index_user_bank.py | Skipping payment router tx {tx_sig}")
        return

    user_id_accounts = []

    if is_audio:
        # Accounts to refresh balance
        logger.debug(
            f"index_user_bank.py | Balance refresh accounts: {sender_account}, {receiver_account}"
        )
        user_id_accounts = refresh_user_balances(
            session, redis, [sender_account, receiver_account]
        )
        if not user_id_accounts:
            logger.error("index_user_bank.py | ERROR: Neither accounts are user banks")
            return
    elif is_usdc:
        user_id_accounts = (
            session.query(User.user_id, USDCUserBankAccount.bank_account)
            .join(
                USDCUserBankAccount,
                and_(
                    USDCUserBankAccount.bank_account.in_(
                        [sender_account, receiver_account]
                    ),
                    USDCUserBankAccount.ethereum_address == User.wallet,
                ),
            )
            .filter(User.is_current == True)
            .all()
        )
        if not user_id_accounts:
            logger.error(
                f"index_user_bank.py | ERROR: Neither accounts are user banks, {sender_account} {receiver_account}"
            )
            return
    else:
        logger.error(
            f"index_user_bank.py | Unrecognized authority {userbank_authority_pda}. Expected one of AUDIO={WAUDIO_PDA} or USDC={USDC_PDA}"
        )
        return

    sender_user_id: Optional[int] = None
    receiver_user_id: Optional[int] = None
    for user_id_account in user_id_accounts:
        if user_id_account[1] == sender_account:
            sender_user_id = user_id_account[0]
        elif user_id_account[1] == receiver_account:
            receiver_user_id = user_id_account[0]
    if sender_user_id is None:
        logger.error(
            "index_user_bank.py | sender_user_id is None. This can happen if the transaction happens before the userbank was indexed - clients should take care to confirm the userbank is indexed first!"
        )
        return

    balance_changes = get_solana_tx_token_balance_changes(
        account_keys=account_keys, meta=meta
    )

    # If there was only 1 user bank, index as a send external transfer
    # Cannot index receive external transfers this way as those use the spl-token program,
    # not the claimable tokens program, so we will always have a sender_user_id
    if receiver_user_id is None:
        transaction_type = get_transfer_type_from_memo(memos=memos)
        if JUPITER_PROGRAM_ID_PUBKEY in account_keys:
            transaction_type = USDCTransactionType.prepare_withdrawal

        # Attempt to look up account owner, fallback to recipient address
        receiver_account_owner = (
            get_account_owner_from_balance_change(
                account=receiver_account, balance_changes=balance_changes
            )
            or receiver_account
        )
        TransactionHistoryModel = (
            AudioTransactionsHistory if is_audio else USDCTransactionsHistory
        )
        change_amount = Decimal(balance_changes[sender_account]["change"])
        # For withdrawals, the user bank balance change will be zero, since the
        # user bank is only used as an intermediate step. So we will index the change
        # amount as how much was actually sent to the destination
        if transaction_type == USDCTransactionType.withdrawal:
            change_amount = -Decimal(balance_changes[receiver_account]["change"])
        transfer_sent = TransactionHistoryModel(
            user_bank=sender_account,
            slot=slot,
            signature=tx_sig,
            transaction_type=transaction_type,
            method=TransactionMethod.send,
            transaction_created_at=timestamp,
            change=change_amount,
            balance=Decimal(balance_changes[sender_account]["post_balance"]),
            tx_metadata=str(receiver_account_owner),
        )
        logger.debug(
            f"index_user_bank.py | Creating {transaction_type} sent {transfer_sent}"
        )
        session.add(transfer_sent)
    # If there are two userbanks to update, it was a transfer from user to user
    else:
        if is_audio:
            index_user_tip(
                session=session,
                receiver_user_id=receiver_user_id,
                receiver_account=receiver_account,
                sender_user_id=sender_user_id,
                sender_account=sender_account,
                balance_changes=balance_changes,
                slot=slot,
                timestamp=timestamp,
                tx_sig=tx_sig,
            )
            challenge_event_bus.dispatch(
                ChallengeEvent.send_tip, slot, timestamp, sender_user_id
            )
        elif is_usdc:
            usdc_tx_sent = USDCTransactionsHistory(
                user_bank=sender_account,
                slot=slot,
                signature=tx_sig,
                transaction_type=USDCTransactionType.transfer,
                method=USDCTransactionMethod.send,
                transaction_created_at=timestamp,
                change=Decimal(balance_changes[sender_account]["change"]),
                balance=Decimal(balance_changes[sender_account]["post_balance"]),
                tx_metadata=receiver_account,
            )
            logger.debug(
                f"index_user_bank.py | Creating USDC transfer sent tx {usdc_tx_sent}"
            )
            session.add(usdc_tx_sent)
            usdc_tx_received = USDCTransactionsHistory(
                user_bank=receiver_account,
                slot=slot,
                signature=tx_sig,
                transaction_type=USDCTransactionType.transfer,
                method=USDCTransactionMethod.receive,
                transaction_created_at=timestamp,
                change=Decimal(balance_changes[receiver_account]["change"]),
                balance=Decimal(balance_changes[receiver_account]["post_balance"]),
                tx_metadata=sender_account,
            )
            session.add(usdc_tx_received)
            logger.debug(
                f"index_user_bank.py | Creating USDC transfer received tx {usdc_tx_received}"
            )


class CreateTokenAccount(TypedDict):
    eth_address: str


def parse_create_token_data(data: str) -> CreateTokenAccount:
    """Parse Transfer instruction data submitted to Audius Claimable Token program

    Instruction struct:
    pub struct TransferArgs {
        pub eth_address: EthereumAddress,
    }

    Decodes the data and parses each param into the correct type
    """

    return parse_instruction_data(data, create_token_account_instr)


def process_user_bank_tx_details(
    solana_client_manager: SolanaClientManager,
    session: Session,
    redis: Redis,
    tx_info: GetTransactionResp,
    tx_sig,
    timestamp,
    challenge_event_bus: ChallengeEventBus,
):
    result = tx_info.value
    if not result:
        logger.error("index_user_bank.py | No result")
        return
    meta = result.transaction.meta
    if not meta:
        logger.error("index_user_bank.py | No result meta")
        return
    error = meta.err
    if error:
        logger.error(
            f"index_user_bank.py | Skipping error transaction from chain {tx_info}"
        )
        return
    transaction = result.transaction.transaction
    if not hasattr(transaction, "message"):
        logger.error(f"index_user_bank.py | No transaction message found {transaction}")
        return

    account_keys = list(map(lambda x: str(x), transaction.message.account_keys))
    if meta.loaded_addresses is not None:
        account_keys.extend(list(map(lambda x: str(x), meta.loaded_addresses.writable)))
        account_keys.extend(list(map(lambda x: str(x), meta.loaded_addresses.readonly)))

    tx_message = cast(Message, transaction.message)

    # Check for valid instruction
    has_create_token_instruction = has_log(
        meta, "Program log: Instruction: CreateTokenAccount"
    )
    has_transfer_instruction = has_log(meta, "Program log: Instruction: Transfer")

    if not has_create_token_instruction and not has_transfer_instruction:
        return

    instruction = get_valid_instruction(tx_message, meta, USER_BANK_ADDRESS)
    if instruction is None:
        logger.error(f"index_user_bank.py | {tx_sig} No Valid instruction found")
        return
    if has_create_token_instruction:
        process_create_userbank_instruction(
            session=session,
            instruction=instruction,
            account_keys=account_keys,
            tx_sig=tx_sig,
            timestamp=timestamp,
        )

    elif has_transfer_instruction:
        process_transfer_instruction(
            session=session,
            redis=redis,
            instruction=instruction,
            memos=decode_all_solana_memos(tx_message=tx_message),
            account_keys=account_keys,
            meta=meta,
            tx_sig=tx_sig,
            slot=result.slot,
            challenge_event_bus=challenge_event_bus,
            timestamp=timestamp,
        )


def get_sol_tx_info(
    solana_client_manager: SolanaClientManager, tx_sig: str, redis: Redis
):
    try:
        existing_tx = redis.get(get_solana_transaction_key(tx_sig))
        if existing_tx is not None and existing_tx != "":
            logger.debug(f"index_user_bank.py | Cache hit: {tx_sig}")
            tx_info = GetTransactionResp.from_json(existing_tx.decode("utf-8"))
            return (tx_info, tx_sig)
        logger.debug(f"index_user_bank.py | Cache miss: {tx_sig}")
        tx_info = solana_client_manager.get_sol_tx_info(tx_sig)
        return (tx_info, tx_sig)
    except SolanaTransactionFetchError:
        return None


def process_user_bank_txs() -> None:
    solana_client_manager: SolanaClientManager = index_user_bank.solana_client_manager
    challenge_bus: ChallengeEventBus = index_user_bank.challenge_event_bus
    db = index_user_bank.db
    redis = index_user_bank.redis
    logger.debug("index_user_bank.py | Acquired lock")

    # Exit if required configs are not found
    if not WAUDIO_MINT_PUBKEY or not USER_BANK_KEY:
        logger.error(
            f"index_user_bank.py | Missing required configuration"
            f"WAUDIO_PROGRAM_PUBKEY: {WAUDIO_MINT_PUBKEY} USER_BANK_KEY: {USER_BANK_KEY}- exiting."
        )
        return

    # List of signatures that will be populated as we traverse recent operations
    transaction_signatures = []

    last_tx_signature = None

    # Loop exit condition
    intersection_found = False
    is_initial_fetch = True

    # Query for solana transactions until an intersection is found
    with db.scoped_session() as session:
        latest_processed_slot = get_highest_user_bank_tx_slot(session)
        logger.debug(f"index_user_bank.py | high tx = {latest_processed_slot}")
        while not intersection_found:
            fetch_size = (
                INITIAL_FETCH_SIZE
                if is_initial_fetch
                else FETCH_TX_SIGNATURES_BATCH_SIZE
            )
            logger.debug(f"index_user_bank.py | Requesting {fetch_size} transactions")
            transactions_history = solana_client_manager.get_signatures_for_address(
                USER_BANK_ADDRESS, before=last_tx_signature, limit=fetch_size
            )
            is_initial_fetch = False
            transactions_array = transactions_history.value
            if not transactions_array:
                intersection_found = True
                logger.debug(
                    f"index_user_bank.py | No transactions found before {last_tx_signature}"
                )
            else:
                # Current batch of transactions
                transaction_signature_batch = []
                for transaction_with_signature in transactions_array:
                    tx_sig = str(transaction_with_signature.signature)
                    tx_slot = transaction_with_signature.slot
                    if transaction_with_signature.err is not None:
                        logger.debug(
                            f"index_user_bank.py | Skipping error transaction tx={tx_sig} err={transaction_with_signature.err}"
                        )
                        continue
                    logger.debug(
                        f"index_user_bank.py | Processing tx={tx_sig} | slot={tx_slot}"
                    )
                    if transaction_with_signature.slot > latest_processed_slot:
                        transaction_signature_batch.append(tx_sig)
                    elif (
                        transaction_with_signature.slot <= latest_processed_slot
                        and transaction_with_signature.slot > MIN_SLOT
                    ):
                        # Check the tx signature for any txs in the latest batch,
                        # and if not present in DB, add to processing
                        logger.debug(
                            f"index_user_bank.py | Latest slot re-traversal\
                            slot={tx_slot}, sig={tx_sig},\
                            latest_processed_slot(db)={latest_processed_slot}"
                        )
                        exists = get_tx_in_db(session, tx_sig)
                        if exists:
                            intersection_found = True
                            break
                        # Ensure this transaction is still processed
                        transaction_signature_batch.append(tx_sig)

                # Restart processing at the end of this transaction signature batch
                last_tx_signature = transactions_array[-1].signature

                # Append batch of processed signatures
                if transaction_signature_batch:
                    transaction_signatures.append(transaction_signature_batch)

                # Ensure processing does not grow unbounded
                if len(transaction_signatures) > TX_SIGNATURES_MAX_BATCHES:
                    prev_len = len(transaction_signatures)
                    # Only take the oldest transaction from the transaction_signatures array
                    # transaction_signatures is sorted from newest to oldest
                    transaction_signatures = transaction_signatures[
                        -TX_SIGNATURES_RESIZE_LENGTH:
                    ]
                    logger.debug(
                        f"index_user_bank.py | sliced tx_sigs from {prev_len} to {len(transaction_signatures)} entries"
                    )

        # Reverse batches aggregated so oldest transactions are processed first
        transaction_signatures.reverse()

        last_tx_sig: Optional[str] = None
        if transaction_signatures and transaction_signatures[-1]:
            last_tx_sig = transaction_signatures[-1][0]

        num_txs_processed = 0
        for tx_sig_batch in transaction_signatures:
            logger.debug(f"index_user_bank.py | processing {tx_sig_batch}")
            batch_start_time = time.time()

            tx_infos: List[Tuple[GetTransactionResp, str]] = []
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                parse_sol_tx_futures = {
                    executor.submit(
                        get_sol_tx_info, solana_client_manager, str(tx_sig), redis
                    ): tx_sig
                    for tx_sig in tx_sig_batch
                }
                for future in concurrent.futures.as_completed(parse_sol_tx_futures):
                    try:
                        tx_info = future.result()
                        if not tx_info:
                            continue
                        tx_infos.append(tx_info)
                    except Exception as exc:
                        logger.error(f"index_user_bank.py | error {exc}", exc_info=True)
                        raise

            # Sort by slot
            # Note: while it's possible (even likely) to have multiple tx in the same slot,
            # these transactions can't be dependent on one another, so we don't care which order
            # we process them.
            tx_infos.sort(key=lambda info: info[0].value.slot if info[0].value else 0)

            for tx_info, tx_sig in tx_infos:
                num_txs_processed += 1

                tx_value = tx_info.value
                if tx_value is None:
                    raise Exception(f"No txinfo value {tx_info}")

                tx_slot = tx_value.slot
                timestamp = float(tx_value.block_time or 0)
                parsed_timestamp = datetime.utcfromtimestamp(timestamp)

                logger.debug(
                    f"index_user_bank.py | parse_user_bank_transaction |\
                {tx_slot}, {tx_sig} | {tx_info} | {parsed_timestamp}"
                )

                process_user_bank_tx_details(
                    solana_client_manager=solana_client_manager,
                    session=session,
                    redis=redis,
                    tx_info=tx_info,
                    tx_sig=tx_sig,
                    timestamp=parsed_timestamp,
                    challenge_event_bus=challenge_bus,
                )
                session.add(
                    UserBankTx(
                        signature=str(tx_sig),
                        slot=tx_slot,
                        created_at=parsed_timestamp,
                    )
                )

            batch_end_time = time.time()
            batch_duration = batch_end_time - batch_start_time
            logger.debug(
                f"index_user_bank.py | processed batch {len(tx_sig_batch)} txs in {batch_duration}s"
            )

    if last_tx_sig:
        redis.set(redis_keys.solana.user_bank.last_tx, last_tx_sig)


# ####### CELERY TASKS ####### #
@celery.task(name="index_user_bank", rate_limit="5/s", bind=True)
@save_duration_metric(metric_group="celery_task")
def index_user_bank(self):
    # Cache custom task class properties
    # Details regarding custom task context can be found in wiki
    # Custom Task definition can be found in src/__init__.py
    redis = index_user_bank.redis
    # Define lock acquired boolean
    have_lock = False
    # Define redis lock object
    update_lock = redis.lock("user_bank_lock", timeout=10 * 60)

    try:
        # Attempt to acquire lock - do not block if unable to acquire
        have_lock = update_lock.acquire(blocking=False)
        if have_lock:
            challenge_bus: ChallengeEventBus = index_user_bank.challenge_event_bus
            with challenge_bus.use_scoped_dispatch_queue():
                process_user_bank_txs()
            redis.set(
                redis_keys.solana.user_bank.last_completed_at,
                datetime.now(timezone.utc).timestamp(),
            )
        else:
            logger.debug("index_user_bank.py | Failed to acquire lock")

    except Exception as e:
        logger.error("index_user_bank.py | Fatal error in main loop", exc_info=True)
        raise e
    finally:
        if have_lock:
            update_lock.release()
        celery.send_task("index_user_bank", countdown=0.5, queue="index_sol")
