import concurrent.futures
import logging
import time
from datetime import datetime, timezone
from decimal import Decimal
from typing import Callable, Dict, List, Optional, TypedDict, cast

import base58
from redis import Redis
from solders.instruction import CompiledInstruction
from solders.message import Message
from solders.pubkey import Pubkey
from solders.rpc.responses import GetTransactionResp
from solders.transaction import Transaction
from solders.transaction_status import UiTransactionStatusMeta
from sqlalchemy import desc
from sqlalchemy.orm.session import Session

from src.exceptions import SolanaTransactionFetchError
from src.models.rewards.challenge import Challenge, ChallengeType
from src.models.rewards.challenge_disbursement import ChallengeDisbursement
from src.models.rewards.reward_manager import RewardManagerTransaction
from src.models.rewards.user_challenge import UserChallenge
from src.models.users.audio_transactions_history import (
    AudioTransactionsHistory,
    TransactionMethod,
    TransactionType,
)
from src.models.users.user import User
from src.models.users.user_bank import UserBankAccount
from src.queries.get_balances import enqueue_immediate_balance_refresh
from src.solana.constants import (
    FETCH_TX_SIGNATURES_BATCH_SIZE,
    TX_SIGNATURES_MAX_BATCHES,
    TX_SIGNATURES_RESIZE_LENGTH,
)
from src.solana.solana_client_manager import SolanaClientManager
from src.solana.solana_parser import (
    InstructionFormat,
    SolanaInstructionType,
    parse_instruction_data,
)
from src.tasks.celery_app import celery
from src.utils.config import shared_config
from src.utils.helpers import get_solana_tx_token_balance_changes
from src.utils.prometheus_metric import save_duration_metric
from src.utils.redis_cache import get_solana_transaction_key
from src.utils.redis_constants import redis_keys
from src.utils.session_manager import SessionManager

logger = logging.getLogger(__name__)

REWARDS_MANAGER_PROGRAM = shared_config["solana"]["rewards_manager_program_address"]
REWARDS_MANAGER_ACCOUNT = shared_config["solana"]["rewards_manager_account"]
MIN_SLOT = int(shared_config["solana"]["rewards_manager_min_slot"])

# Used to find the correct accounts for sender/receiver in the transaction
TRANSFER_RECEIVER_ACCOUNT_INDEX = 4
INITIAL_FETCH_SIZE = 10


def check_valid_rewards_manager_program():
    try:
        base58.b58decode(REWARDS_MANAGER_PROGRAM)
        return True
    except ValueError:
        logger.error(
            f"index_rewards_manager.py"
            f"Invalid Rewards Manager program ({REWARDS_MANAGER_PROGRAM}) configured, exiting."
        )
        return False


is_valid_rewards_manager_program = check_valid_rewards_manager_program()


rewards_manager_transfer_instr: List[InstructionFormat] = [
    {"name": "amount", "type": SolanaInstructionType.u64},
    {"name": "id", "type": SolanaInstructionType.string},
    {"name": "eth_recipient", "type": SolanaInstructionType.EthereumAddress},
]


class RewardsManagerTransfer(TypedDict):
    amount: int
    id: str
    eth_recipient: str


class RewardTransferInstruction(TypedDict):
    amount: int
    challenge_id: str
    specifier: str
    eth_recipient: str
    prebalance: int
    postbalance: int


class RewardManagerTransactionInfo(TypedDict):
    tx_sig: str
    slot: int
    timestamp: int | None
    transfer_instruction: Optional[RewardTransferInstruction]


challenge_type_map_global: Dict[str, TransactionType] = {}


def get_challenge_type_map(
    session: Session,
):
    # pylint: disable=W0603
    global challenge_type_map_global
    if not bool(challenge_type_map_global):
        challenges = (
            session.query(Challenge.id, Challenge.type)
            .filter(bool(Challenge.active))
            .all()
        )
        challenge_type_map_global = {
            challenge[0]: (
                TransactionType.trending_reward
                if challenge[1] == ChallengeType.trending
                else TransactionType.user_reward
            )
            for challenge in challenges
        }
    # Temporary change to map old challenge ids to new ones
    challenge_type_map_global["profile-completion"] = challenge_type_map_global["p"]
    challenge_type_map_global["track-upload"] = challenge_type_map_global["u"]
    challenge_type_map_global["referrals"] = challenge_type_map_global["r"]
    challenge_type_map_global["ref-v"] = challenge_type_map_global["rv"]
    challenge_type_map_global["referred"] = challenge_type_map_global["rd"]
    challenge_type_map_global["connect-verified"] = challenge_type_map_global["v"]
    challenge_type_map_global["mobile-install"] = challenge_type_map_global["m"]
    challenge_type_map_global["send-first-tip"] = challenge_type_map_global["ft"]
    challenge_type_map_global["first-playlist"] = challenge_type_map_global["fp"]

    return challenge_type_map_global


def parse_transfer_instruction_data(data: str) -> RewardsManagerTransfer:
    """Parse Transfer instruction data submitted to Audius Rewards Manager program

    Instruction struct:
    pub struct TransferArgs {
        /// Amount to transfer
        pub amount: u64,
        /// ID generated on backend
        pub id: String,
        /// Recipient's Eth address
        pub eth_recipient: EthereumAddress,
    }

    Decodes the data and parses each param into the correct type
    """

    return parse_instruction_data(data, rewards_manager_transfer_instr)


def parse_transfer_instruction_id(transfer_id: str) -> Optional[List[str]]:
    """Parses the transfer instruction id into [challenge_id, specifier]
    The id in the transfer instruction is formatted as "<CHALLENGE_ID>:<SPECIFIER>"
    """
    id_parts = transfer_id.split(":", 1)
    if len(id_parts) != 2:
        logger.error(
            "index_rewards_manager.py | Unable to parse transfer instruction id"
            f"into challenge_id and specifier {transfer_id}"
        )
        return None
    return id_parts


def get_valid_instruction(
    tx_message: Message, meta: UiTransactionStatusMeta
) -> Optional[CompiledInstruction]:
    """Checks that the tx is valid
    checks for the transaction message for correct instruction log
    checks accounts keys for rewards manager account
    checks for rewards manager program in instruction
    """
    try:
        account_keys = tx_message.account_keys
        has_transfer_instruction = any(
            log == "Program log: Instruction: Transfer"
            for log in (meta.log_messages or [])
        )

        if not has_transfer_instruction:
            return None

        instructions = tx_message.instructions
        rewards_manager_program_index = account_keys.index(
            Pubkey.from_string(REWARDS_MANAGER_PROGRAM)
        )
        for instruction in instructions[::-1]:
            if instruction.program_id_index == rewards_manager_program_index:
                return instruction

        return None
    except Exception as e:
        logger.error(
            f"index_rewards_manager.py | Error processing instruction valid, {e}",
            exc_info=True,
        )
        return None


def get_sol_tx_info(
    solana_client_manager: SolanaClientManager, tx_sig: str, redis: Redis
):
    existing_tx = redis.get(get_solana_transaction_key(tx_sig))
    if existing_tx is not None and existing_tx != "":
        logger.debug(f"index_rewards_manager.py | Cache hit: {tx_sig}")
        tx_info = GetTransactionResp.from_json(existing_tx.decode("utf-8"))
        return tx_info
    logger.debug(f"index_rewards_manager.py | Cache miss: {tx_sig}")
    tx_info = solana_client_manager.get_sol_tx_info(tx_sig)
    return tx_info


def fetch_and_parse_sol_rewards_transfer_instruction(
    solana_client_manager: SolanaClientManager, tx_sig: str, redis: Redis
) -> Optional[RewardManagerTransactionInfo]:
    """Fetches metadata for rewards transfer transactions and parses data

    Fetches the transaction metadata from solana using the tx signature
    Checks the metadata for a transfer instruction
    Decodes and parses the transfer instruction metadata
    Validates the metadata fields
    """
    try:
        tx_info = get_sol_tx_info(solana_client_manager, tx_sig, redis)
        if not tx_info or not tx_info.value:
            raise Exception("Missing txinfo")
        # Create transaction metadata
        result = tx_info.value
        tx_metadata: RewardManagerTransactionInfo = {
            "tx_sig": tx_sig,
            "slot": result.slot,
            "timestamp": result.block_time,
            "transfer_instruction": None,
        }
        meta = result.transaction.meta
        if not meta:
            return tx_metadata
        if meta.err:
            logger.warn(
                f"index_rewards_manager.py | Skipping error transaction from chain {tx_info}"
            )
            return tx_metadata
        tx_message = cast(Transaction, result.transaction.transaction).message
        instruction = get_valid_instruction(tx_message, meta)
        if instruction is None:
            return tx_metadata
        transfer_instruction_data = parse_transfer_instruction_data(
            str(instruction.data)
        )
        amount = transfer_instruction_data["amount"]
        eth_recipient = transfer_instruction_data["eth_recipient"]
        id = transfer_instruction_data["id"]
        transfer_instruction = parse_transfer_instruction_id(id)
        if transfer_instruction is None:
            return tx_metadata

        challenge_id, specifier = transfer_instruction
        receiver_index = instruction.accounts[TRANSFER_RECEIVER_ACCOUNT_INDEX]
        account_keys = list(map(lambda key: str(key), tx_message.account_keys))
        receiver_user_bank = account_keys[receiver_index]
        balance_changes = get_solana_tx_token_balance_changes(
            meta=meta, account_keys=account_keys
        )
        if receiver_user_bank not in balance_changes:
            raise Exception("Reward recipient balance missing!")
        tx_metadata["transfer_instruction"] = {
            "amount": amount,
            "eth_recipient": eth_recipient,
            "challenge_id": challenge_id,
            "specifier": specifier,
            "prebalance": balance_changes[receiver_user_bank]["pre_balance"],
            "postbalance": balance_changes[receiver_user_bank]["post_balance"],
        }
        return tx_metadata
    except SolanaTransactionFetchError:
        return None
    except Exception as e:
        logger.error(
            f"index_rewards_manager.py | Error processing {tx_sig}, {e}", exc_info=True
        )
        raise e


def process_batch_sol_reward_manager_txs(
    session: Session,
    reward_manager_txs: List[RewardManagerTransactionInfo],
    redis: Redis,
):
    """Validates that the transfer instruction is consistent with DB and inserts ChallengeDisbursement DB entries"""
    try:
        logger.debug(f"index_rewards_manager | processing {reward_manager_txs}")
        eth_recipients = [
            tx["transfer_instruction"]["eth_recipient"]
            for tx in reward_manager_txs
            if tx["transfer_instruction"] is not None
        ]
        users = (
            session.query(User.wallet, User.user_id, UserBankAccount.bank_account)
            .join(UserBankAccount, UserBankAccount.ethereum_address == User.wallet)
            .filter(User.wallet.in_(eth_recipients), User.is_current == True)
            .all()
        )

        users_map = {
            user[0]: {"user_id": user[1], "user_bank": user[2]} for user in users
        }

        specifiers = [
            tx["transfer_instruction"]["specifier"]
            for tx in reward_manager_txs
            if tx["transfer_instruction"] is not None
        ]
        user_challenges = (
            session.query(UserChallenge.specifier)
            .filter(
                UserChallenge.specifier.in_(specifiers),
            )
            .all()
        )
        user_challenge_specifiers = {challenge[0] for challenge in user_challenges}
        challenge_type_map = get_challenge_type_map(session)

        challenge_disbursements = []
        audio_tx_histories = []
        for tx in reward_manager_txs:
            timestamp = datetime.utcfromtimestamp(float(tx["timestamp"] or 0))
            # Add transaction
            session.add(
                RewardManagerTransaction(
                    signature=tx["tx_sig"], slot=tx["slot"], created_at=timestamp
                )
            )
            session.flush()
            # No instruction found
            if tx["transfer_instruction"] is None:
                logger.warning(
                    f"index_rewards_manager.py | No transfer instruction found in {tx}"
                )
                continue
            transfer_instr: RewardTransferInstruction = tx["transfer_instruction"]
            specifier = transfer_instr["specifier"]
            eth_recipient = transfer_instr["eth_recipient"]
            if specifier not in user_challenge_specifiers:
                logger.error(
                    f"index_rewards_manager.py | Challenge specifier {specifier} not found"
                    "while processing disbursement"
                )
            if eth_recipient not in users_map:
                logger.error(
                    f"index_rewards_manager.py | eth_recipient {eth_recipient} not found while processing disbursement"
                )
                tx_signature = tx["tx_sig"]
                tx_slot = tx["slot"]
                logger.error(
                    f"index_rewards_manager.py | eth_recipient {eth_recipient} not found processing disbursement"
                    f"tx signature={tx_signature}"
                    f"tx slot={tx_slot}"
                    f"specifier = {specifier}"
                )
                # Set this user's id and user bank to 0 instead of blocking indexing
                # This state can be rectified asynchronously
                users_map[eth_recipient] = {"user_id": 0, "user_bank": 0}

            user_id = users_map[eth_recipient]["user_id"]
            challenge_id = transfer_instr["challenge_id"]
            logger.debug(
                f"index_rewards_manager.py | found successful disbursement for user_id: [{user_id}]"
            )

            challenge_disbursements.append(
                ChallengeDisbursement(
                    challenge_id=challenge_id,
                    user_id=user_id,
                    specifier=specifier,
                    amount=str(transfer_instr["amount"]),
                    slot=tx["slot"],
                    signature=tx["tx_sig"],
                )
            )

            prebalance = transfer_instr["prebalance"]
            postbalance = transfer_instr["postbalance"]
            balance_change = postbalance - prebalance
            if challenge_id not in challenge_type_map:
                logger.error(
                    f"index_rewards_manager.py | Challenge id {challenge_id} not found in challenge type map"
                )
                continue
            audio_tx_histories.append(
                AudioTransactionsHistory(
                    user_bank=users_map[eth_recipient]["user_bank"],
                    slot=tx["slot"],
                    signature=tx["tx_sig"],
                    transaction_type=challenge_type_map[challenge_id],
                    method=TransactionMethod.receive,
                    transaction_created_at=timestamp,
                    change=Decimal(balance_change),
                    balance=Decimal(postbalance),
                    tx_metadata=challenge_id,
                )
            )

        if challenge_disbursements:
            # Save out the disbursements and transaction history list
            session.bulk_save_objects(challenge_disbursements)
            session.bulk_save_objects(audio_tx_histories)
            # Enqueue balance refreshes for the users
            user_ids = [c.user_id for c in challenge_disbursements]
            enqueue_immediate_balance_refresh(redis, user_ids)

    except Exception as e:
        logger.error(f"index_rewards_manager.py | Error processing {e}", exc_info=True)
        raise e


def get_latest_reward_disbursment_slot(session: Session):
    """Fetches the most recent slot for Challenge Disburements"""
    latest_slot = None
    highest_slot_query = (
        session.query(RewardManagerTransaction.slot).order_by(
            desc(RewardManagerTransaction.slot)
        )
    ).first()
    # Can be None prior to first write operations
    if highest_slot_query is not None:
        latest_slot = highest_slot_query[0]

    # If no slots have yet been recorded, assume all are valid
    if latest_slot is None:
        latest_slot = 0

    return latest_slot


def get_tx_in_db(session: Session, tx_sig: str) -> bool:
    """Checks if the transaction signature already exists for Challenge Disburements"""
    tx_sig_db_count = (
        session.query(RewardManagerTransaction).filter(
            RewardManagerTransaction.signature == tx_sig
        )
    ).count()
    exists = tx_sig_db_count > 0
    return exists


def get_transaction_signatures(
    solana_client_manager: SolanaClientManager,
    db: SessionManager,
    program: str,
    get_latest_slot: Callable[[Session], int],
    check_tx_exists: Callable[[Session, str], bool],
    min_slot=None,
) -> List[List[str]]:
    """Fetches next batch of transaction signature offset from the previous latest processed slot

    Fetches the latest processed slot for the rewards manager program
    Iterates backwards from the current tx until an intersection is found with the latest processed slot
    Returns the next set of transaction signature from the current offset slot to process
    """
    # List of signatures that will be populated as we traverse recent operations
    transaction_signatures = []

    last_tx_signature = None

    # Loop exit condition
    intersection_found = False
    is_initial_fetch = True

    # Query for solana transactions until an intersection is found
    with db.scoped_session() as session:
        latest_processed_slot = get_latest_slot(session)
        while not intersection_found:
            fetch_size = (
                INITIAL_FETCH_SIZE
                if is_initial_fetch
                else FETCH_TX_SIGNATURES_BATCH_SIZE
            )
            logger.debug(
                f"index_rewards_manager.py | Requesting {fetch_size} transactions"
            )
            transactions_history = solana_client_manager.get_signatures_for_address(
                program, before=last_tx_signature, limit=fetch_size
            )
            is_initial_fetch = False

            transactions_array = transactions_history.value
            if not transactions_array:
                intersection_found = True
                logger.debug(
                    f"index_rewards_manager.py | No transactions found before {last_tx_signature}"
                )
            else:
                # Current batch of transactions
                transaction_signature_batch = []
                for tx_info in transactions_array:
                    tx_sig = str(tx_info.signature)
                    tx_slot = tx_info.slot

                    if tx_info.err is not None:
                        logger.debug(
                            f"index_rewards_manager.py | Skipping error transaction tx={tx_sig} err={tx_info.err}"
                        )
                        continue

                    logger.debug(
                        f"index_rewards_manager.py | Processing tx={tx_sig} | slot={tx_slot}"
                    )
                    if tx_info.slot > latest_processed_slot:
                        transaction_signature_batch.append(tx_sig)
                    elif tx_info.slot <= latest_processed_slot and (
                        min_slot is None or tx_info.slot > min_slot
                    ):
                        # Check the tx signature for any txs in the latest batch,
                        # and if not present in DB, add to processing
                        logger.debug(
                            f"index_rewards_manager.py | Latest slot re-traversal\
                            slot={tx_slot}, sig={tx_sig},\
                            latest_processed_slot(db)={latest_processed_slot}"
                        )
                        exists = check_tx_exists(session, tx_sig)
                        if exists:
                            intersection_found = True
                            break
                        # Ensure this transaction is still processed
                        transaction_signature_batch.append(tx_sig)

                # Restart processing at the end of this transaction signature batch
                last_tx = transactions_array[-1]
                last_tx_signature = last_tx.signature

                # Append batch of processed signatures
                if transaction_signature_batch:
                    transaction_signatures.append(transaction_signature_batch)

                # Ensure processing does not grow unbounded
                if len(transaction_signatures) > TX_SIGNATURES_MAX_BATCHES:
                    # Only take the oldest transaction from the transaction_signatures array
                    # transaction_signatures is sorted from newest to oldest
                    transaction_signatures = transaction_signatures[
                        -TX_SIGNATURES_RESIZE_LENGTH:
                    ]

    # Reverse batches aggregated so oldest transactions are processed first
    transaction_signatures.reverse()
    return transaction_signatures


def process_transaction_signatures(
    solana_client_manager: SolanaClientManager,
    db: SessionManager,
    redis: Redis,
    transaction_signatures: List[List[str]],
):
    """Concurrently processes the transactions to update the DB state for reward transfer instructions"""
    last_tx_sig: Optional[str] = None
    if transaction_signatures and transaction_signatures[-1]:
        last_tx_sig = transaction_signatures[-1][0]

    for tx_sig_batch in transaction_signatures:
        logger.debug(f"index_rewards_manager.py | processing {tx_sig_batch}")
        batch_start_time = time.time()

        transfer_instructions: List[RewardManagerTransactionInfo] = []
        # Process each batch in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            parse_sol_tx_futures = {
                executor.submit(
                    fetch_and_parse_sol_rewards_transfer_instruction,
                    solana_client_manager,
                    tx_sig,
                    redis,
                ): tx_sig
                for tx_sig in tx_sig_batch
            }
            for future in concurrent.futures.as_completed(parse_sol_tx_futures):
                try:
                    # No return value expected here so we just ensure all futures are resolved
                    parsed_solana_transfer_instruction = future.result()
                    if parsed_solana_transfer_instruction is not None:
                        transfer_instructions.append(parsed_solana_transfer_instruction)

                except Exception as exc:
                    logger.error(f"index_rewards_manager.py | {exc}")
                    raise exc
        with db.scoped_session() as session:
            process_batch_sol_reward_manager_txs(session, transfer_instructions, redis)
        batch_end_time = time.time()
        batch_duration = batch_end_time - batch_start_time
        logger.debug(
            f"index_rewards_manager.py | processed batch {len(tx_sig_batch)} txs in {batch_duration}s"
        )
        return last_tx_sig


def process_solana_rewards_manager(
    solana_client_manager: SolanaClientManager, db: SessionManager, redis: Redis
):
    """Fetches the next set of reward manager transactions and updates the DB with Challenge Disbursements"""
    if not is_valid_rewards_manager_program:
        logger.error(
            "index_rewards_manager.py | no valid reward manager program passed"
        )
        return
    if not REWARDS_MANAGER_ACCOUNT:
        logger.error("index_rewards_manager.py | reward manager account missing")
        return

    # List of signatures that will be populated as we traverse recent operations
    transaction_signatures = get_transaction_signatures(
        solana_client_manager,
        db,
        REWARDS_MANAGER_PROGRAM,
        get_latest_reward_disbursment_slot,
        get_tx_in_db,
        MIN_SLOT,
    )
    if transaction_signatures:
        logger.debug(f"index_rewards_manager.py | {transaction_signatures}")

    last_tx_sig = process_transaction_signatures(
        solana_client_manager, db, redis, transaction_signatures
    )
    if last_tx_sig:
        redis.set(redis_keys.solana.reward_manager.last_tx, last_tx_sig)


# ####### CELERY TASKS ####### #
@celery.task(name="index_rewards_manager", rate_limit="5/s", bind=True)
@save_duration_metric(metric_group="celery_task")
def index_rewards_manager(self):
    redis = index_rewards_manager.redis
    solana_client_manager = index_rewards_manager.solana_client_manager
    db = index_rewards_manager.db

    # Define lock acquired boolean
    have_lock = False
    # Max duration of lock is 4hrs or 14400 seconds
    update_lock = redis.lock("solana_rewards_manager_lock", timeout=14400)

    try:
        # Attempt to acquire lock - do not block if unable to acquire
        have_lock = update_lock.acquire(blocking=False)
        if have_lock:
            logger.debug("index_rewards_manager.py | Acquired lock")
            process_solana_rewards_manager(solana_client_manager, db, redis)
            redis.set(
                redis_keys.solana.reward_manager.last_completed_at,
                datetime.now(timezone.utc).timestamp(),
            )
        else:
            logger.debug("index_rewards_manager.py | Failed to acquire lock")
    except Exception as e:
        logger.error(
            "index_rewards_manager.py | Fatal error in main loop", exc_info=True
        )
        raise e
    finally:
        if have_lock:
            update_lock.release()
        celery.send_task("index_rewards_manager", queue="index_sol")
