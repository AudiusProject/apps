import logging  # pylint: disable=C0302
from typing import List

from web3 import Web3
from web3.datastructures import AttributeDict

from integration_tests.challenges.index_helpers import UpdateTask
from src.models.indexing.skipped_transaction import SkippedTransaction
from src.tasks.entity_manager.entity_manager import entity_manager_update
from src.utils.db_session import get_db
from src.utils.redis_connection import get_redis

logger = logging.getLogger(__name__)


def test_skip_tx(app, mocker):
    mocker.patch(
        "src.tasks.entity_manager.entity_manager.create_user",
        side_effect=Exception("Skip tx error"),
        autospec=True,
    )

    def get_events_side_effect(_, tx_receipt):
        return tx_receipts[tx_receipt["transactionHash"].decode("utf-8")]

    mocker.patch(
        "src.tasks.entity_manager.entity_manager.get_entity_manager_events_tx",
        side_effect=get_events_side_effect,
        autospec=True,
    )

    mocker.patch(
        "src.queries.confirm_indexing_transaction_error.get_all_other_discovery_nodes_cached",
        return_value=["node1", "node2", "node3"],
        autospec=True,
    )

    mock_response = mocker.Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"data": "FAILED"}

    mocker.patch(
        "src.queries.confirm_indexing_transaction_error.requests.get",
        return_value=mock_response,
    )

    # setup db and mocked txs
    with app.app_context():
        db = get_db()
        web3 = Web3()
        redis = get_redis()

        update_task = UpdateTask(web3, None, redis)

    tx_receipts = {
        # invalid create
        "CreateUser": [
            {
                "args": AttributeDict(
                    {
                        "_entityId": 1,
                        "_entityType": "User",
                        "_userId": 1,
                        "_action": "Create",
                        "_metadata": "",
                        "_signer": "user1wallet",
                    }
                )
            },
        ],
    }

    entity_manager_txs = [
        AttributeDict({"transactionHash": update_task.web3.to_bytes(text=tx_receipt)})
        for tx_receipt in tx_receipts
    ]

    "Tests valid batch of tracks create/update/delete actions"
    with db.scoped_session() as session:
        # index transactions
        entity_manager_update(
            update_task,
            session,
            entity_manager_txs,
            block_number=0,
            block_timestamp=1585336422,
            block_hash=hex(0),
        )
        skipped_transactions: List[SkippedTransaction] = session.query(
            SkippedTransaction
        ).first()

        assert skipped_transactions.txhash == "0x43726561746555736572"
