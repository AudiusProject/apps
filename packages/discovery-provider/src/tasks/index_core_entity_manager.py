import logging
import time
from logging import LoggerAdapter
from typing import List, Optional

from eth_utils import to_bytes
from sqlalchemy.orm.session import Session
from web3 import Web3
from web3.datastructures import AttributeDict
from web3.types import TxReceipt

from src.database_task import DatabaseTask
from src.models.indexing.block import Block
from src.tasks.core.gen.protocol_pb2 import BlockResponse
from src.tasks.entity_manager.entity_manager import entity_manager_update

logger = logging.getLogger(__name__)


def index_core_entity_manager(
    logger: LoggerAdapter,
    update_task: DatabaseTask,
    web3: Web3,
    session: Session,
    block: BlockResponse,
) -> Optional[int]:
    tx_receipts: List[TxReceipt] = []
    for tx_res in block.transaction_responses:
        tx = tx_res.transaction
        tx_hash = tx_res.txhash

        tx_type = tx.WhichOneof("transaction")
        if tx_type != "manage_entity":
            continue

        tx_logger = logging.LoggerAdapter(
            logger=logger,
            extra={
                **(logger.extra or {}),
                **{
                    "tx_hash": tx_hash,
                },
            },
        )

        indexing_start_time = time.perf_counter()

        tx_logger.info(
            f"index_core manage entity {tx_hash} {block.blockhash}",
        )
        manage_entity_tx = tx.manage_entity
        tx_receipt = {
            "args": AttributeDict(
                {
                    "_entityId": manage_entity_tx.entity_id,
                    "_entityType": manage_entity_tx.entity_type,
                    "_userId": manage_entity_tx.user_id,
                    "_action": manage_entity_tx.action,
                    "_metadata": manage_entity_tx.metadata,
                    "_signer": manage_entity_tx.signer,
                    "_subjectSig": manage_entity_tx.signature,
                    "_nonce": manage_entity_tx.nonce,
                }
            ),
            "transactionHash": to_bytes(text=tx_hash),
        }

        # suppress typechecker as this is what tests do
        tx_receipts.append(tx_receipt)  # type: ignore[arg-type]

    try:
        latest_indexed_block_record = (
            session.query(Block).filter(Block.is_current == True).first()
        )
        if not latest_indexed_block_record:
            raise Exception("latest_indexed_block not found")

        if latest_indexed_block_record.number is None:
            raise Exception("latest block record found but without number")

        next_em_block = latest_indexed_block_record.number + 1
        next_em_block_model = Block(
            blockhash=block.blockhash,
            parenthash=latest_indexed_block_record.blockhash,
            number=next_em_block,
            is_current=True,
        )

        latest_indexed_block_record.is_current = False
        session.add(next_em_block_model)
        entity_manager_update(
            update_task=update_task,
            session=session,
            entity_manager_txs=tx_receipts,
            block_number=next_em_block,
            block_timestamp=block.timestamp.ToSeconds(),
            block_hash=block.blockhash,
        )
        indexing_duration = time.perf_counter() - indexing_start_time
        tx_logger.info(f"Entity manager tx indexed in {indexing_duration:.3f}s")
        return next_em_block
    except Exception as e:
        logger.error(f"entity manager error in core blocks {e}", exc_info=True)
        # raise error so we don't index this block
        raise e


def get_latest_acdc_block(session: Session) -> Block:
    """
    Gets the latest block in the database.
    This block necessarily has `is_current` set to True.
    """
    latest_database_block_query = session.query(Block).filter(Block.is_current == True)
    latest_database_block_results = latest_database_block_query.all()
    assert (
        len(latest_database_block_results) == 1
    ), "Expected a single row with is_current=True"
    latest_database_block = latest_database_block_results[0]

    return latest_database_block
