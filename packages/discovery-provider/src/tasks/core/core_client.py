import logging
from typing import Optional

import grpc

from src.tasks.core.audiusd_gen.core.v1.service_pb2_grpc import CoreServiceStub
from src.tasks.core.audiusd_gen.core.v1.types_pb2 import (
    GetBlockRequest,
    GetBlockResponse,
    GetNodeInfoRequest,
    PingRequest,
)
from src.tasks.core.gen.protocol_pb2 import BlockResponse as LegacyBlockResponse
from src.tasks.core.gen.protocol_pb2 import GetBlockRequest as LegacyGetBlockRequest
from src.tasks.core.gen.protocol_pb2 import (
    GetNodeInfoRequest as LegacyGetNodeInfoRequest,
)
from src.tasks.core.gen.protocol_pb2 import NodeInfoResponse as LegacyNodeInfoResponse
from src.tasks.core.gen.protocol_pb2 import PingRequest as LegacyPingRequest
from src.tasks.core.gen.protocol_pb2 import PingResponse as LegacyPingResponse
from src.tasks.core.gen.protocol_pb2 import SignedTransaction as LegacySignedTransaction
from src.tasks.core.gen.protocol_pb2 import TransactionResponse
from src.tasks.core.gen.protocol_pb2_grpc import ProtocolStub
from src.utils.config import shared_config

logger = logging.getLogger(__name__)

environment = shared_config["discprov"]["env"]


class CoreClient:
    """Typesafe gRPC client for core."""

    endpoint: str
    channel: grpc.Channel
    rpc: ProtocolStub

    chain_id: Optional[str]

    def __init__(self):
        self.endpoint = self.get_core_endpoint()
        creds = grpc.ssl_channel_credentials()
        self.channel = grpc.secure_channel(self.endpoint, creds)
        self.rpc = ProtocolStub(channel=self.channel)

    def get_core_endpoint(self) -> str:
        return "grpc.audius.engineering:443"

    def ping(self) -> LegacyPingResponse:
        return self.rpc.Ping(LegacyPingRequest())

    def get_node_info(self) -> LegacyNodeInfoResponse:
        return self.rpc.GetNodeInfo(LegacyGetNodeInfoRequest())

    def get_block(self, height: int) -> LegacyBlockResponse:
        """Gets the specified block from core and gets the indexed record. Returns None if not found in either."""
        return self.rpc.GetBlock(LegacyGetBlockRequest(height=height))


class AudiusdClient(CoreClient):
    """
    AudiusdClient is a drop-in replacement for CoreClient, using the new audiusd backend.
    This allows migration without changing all usages of CoreClient immediately.
    """

    endpoint: str
    channel: grpc.Channel
    core_service: CoreServiceStub

    def __init__(self):
        self.endpoint = self.get_audiusd_endpoint()
        if environment == "dev":
            self.channel = grpc.insecure_channel(self.endpoint)
        else:
            creds = grpc.ssl_channel_credentials()
            self.channel = grpc.secure_channel(self.endpoint, creds)
        self.core_service = CoreServiceStub(channel=self.channel)

    def get_audiusd_endpoint(self) -> str:
        if environment == "dev":
            return "openaudio-1:50051"
        return "grpc.audius.engineering:443"

    def get_core_endpoint(self) -> str:
        # For compatibility with CoreClient interface
        return self.get_audiusd_endpoint()

    def get_node_info(self):
        # Return type: GetNodeInfoResponse (from audiusd_gen)
        return self.core_service.GetNodeInfo(GetNodeInfoRequest())

    def ping(self):
        # Return type: PingResponse (from audiusd_gen)
        return self.core_service.Ping(PingRequest())

    def get_block(self, height: int):
        # Return type: GetBlockResponse (from audiusd_gen)
        res: GetBlockResponse = self.core_service.GetBlock(
            GetBlockRequest(height=height)
        )
        block = res.block

        # Convert transactions by serializing/deserializing
        converted_transactions = []
        for tx in block.transactions:
            legacy_tx = LegacySignedTransaction()
            legacy_tx.ParseFromString(tx.transaction.SerializeToString())
            converted_transactions.append(
                TransactionResponse(
                    txhash=tx.hash,
                    block_height=tx.height,
                    block_hash=tx.hash,
                    transaction=legacy_tx,
                )
            )

        return LegacyBlockResponse(
            blockhash=block.hash,
            chainid=block.chain_id,
            proposer=block.proposer,
            height=block.height,
            current_height=res.current_height,
            timestamp=block.timestamp,
            transaction_responses=converted_transactions,
        )


core_instance: Optional[CoreClient] = None


def get_core_instance() -> CoreClient:
    # pylint: disable=W0603
    global core_instance
    if not core_instance:
        core_instance = AudiusdClient()
        return core_instance
    return core_instance
