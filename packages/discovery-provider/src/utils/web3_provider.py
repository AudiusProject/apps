"""
Interface for using a web3 provider
"""

import logging
import os
from typing import Optional

from web3 import HTTPProvider, Web3
from web3.middleware import geth_poa_middleware

from src.utils.config import shared_config
from src.utils.multi_provider import MultiProvider

logger = logging.getLogger(__name__)

web3: Optional[Web3] = None

GATEWAY_FALLBACK_BLOCKDIFF = 10000


def get_web3(web3endpoint=None):
    # pylint: disable=W0603
    global web3

    if web3:
        return web3

    local_rpc = os.getenv("audius_web3_localhost")
    web3 = Web3(HTTPProvider(local_rpc))

    web3.strict_bytes_type_checking = False
    # required middleware for POA
    # https://web3py.readthedocs.io/en/latest/middleware.html#proof-of-authority
    web3.middleware_onion.inject(geth_poa_middleware, layer=0)
    return web3


eth_web3: Optional[Web3] = None


# mainnet eth, not ACDC
def get_eth_web3():
    # pylint: disable=W0603
    global eth_web3
    if not eth_web3:
        provider = MultiProvider(shared_config["web3"]["eth_provider_url"])
        for p in provider.providers:
            p.middlewares.clear()
        # Remove the default JSON-RPC retry middleware
        # as it correctly cannot handle eth_getLogs block range
        # throttle down.
        # See https://web3py.readthedocs.io/en/stable/examples.html
        eth_web3 = Web3(provider)
        eth_web3.strict_bytes_type_checking = False
        return eth_web3
    return eth_web3
