import { ethers } from 'ethers'
import { create } from '@bufbuild/protobuf'
import { createClient, Client } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-node'
import {
  Protocol,
  SignedTransactionSchema,
  ManageEntityLegacySchema,
  PingRequestSchema as GrpcPingRequestSchema,
  TransactionResponse as GrpcTransactionResponse
} from './core-sdk/protocol_pb'
import { ValidatedRelayRequest } from './types/relay'
import { readConfig } from './config/config.js'
import pino from 'pino'
import { CoreService } from './audiusd-sdk/core/v1/service_pb.js'
import {
  PingRequestSchema,
  SendTransactionResponse as ConnectTransactionResponse
} from './audiusd-sdk/core/v1/types_pb.js'
import { audiusSdk } from '.'

type ClientType = 'grpc' | 'connect'

interface ClientInfo {
  type: ClientType
  client: Client<typeof Protocol | typeof CoreService>
  lastSuccessfulPing: number
}

let activeClient: ClientInfo | null = null

async function pingClient(clientInfo: ClientInfo): Promise<boolean> {
  try {
    if (clientInfo.type === 'grpc') {
      await (clientInfo.client as Client<typeof Protocol>).ping(
        create(GrpcPingRequestSchema, {})
      )
    } else {
      await (clientInfo.client as Client<typeof CoreService>).ping(
        create(PingRequestSchema, {})
      )
    }
    clientInfo.lastSuccessfulPing = Date.now()
    return true
  } catch (e) {
    return false
  }
}

async function initializeClients(logger: pino.Logger): Promise<boolean> {
  if (activeClient) {
    return true
  }

  const config = readConfig()
  try {
    const connectTransport = createConnectTransport({
      baseUrl: config.coreEndpoint,
      httpVersion: '2',
      useBinaryFormat: true
    })
    const connectClient = createClient(CoreService, connectTransport)
    const connectInfo: ClientInfo = {
      type: 'connect',
      client: connectClient,
      lastSuccessfulPing: 0
    }
    if (await pingClient(connectInfo)) {
      activeClient = connectInfo
      logger.info('Successfully connected using Connect client')
      return true
    }
  } catch (e) {
    logger.warn({ err: e }, 'Connect client initialization failed')
  }
  return false
}

type CoreRelayResponse = {
  status: boolean
  transactionHash: string
  transactionIndex: number
  blockHash: string
  blockNumber: number
  from: string
  to: string
  contractAddress?: string
  cumulativeGasUsed: number
  gasUsed: number
  effectiveGasPrice: number
  // logs: Log[]
  // logsBloom: string
}

export const coreRelay = async (
  logger: pino.Logger,
  requestId: string,
  request: ValidatedRelayRequest
): Promise<CoreRelayResponse | null> => {
  try {
    // Initialize clients if needed
    const clientsInitialized = await initializeClients(logger)
    if (!clientsInitialized || !activeClient) {
      throw new Error('Failed to initialize any client')
    }

    const { encodedABI } = request

    const {
      userId,
      entityId,
      entityType,
      action,
      metadata,
      subjectSig,
      nonce: nonceBytes
    } = audiusSdk.services.entityManager.decodeManageEntity(
      encodedABI as `0x${string}`
    )

    const signature = ethers.utils.hexlify(subjectSig)
    const nonce = ethers.utils.hexlify(nonceBytes)

    const manageEntity = create(ManageEntityLegacySchema, {
      userId,
      entityId,
      entityType,
      action,
      metadata,
      signature,
      nonce
    })

    const signedTransaction = create(SignedTransactionSchema, {
      signature,
      transaction: {
        case: 'manageEntity' as const,
        value: manageEntity
      },
      requestId: requestId
    })

    // Use the active client to send transaction
    const res = await activeClient.client.sendTransaction({
      transaction: signedTransaction
    })

    // Extract transaction info based on client type
    let txHash = '',
      blockHeight = BigInt(0),
      blockHash = ''

    if (activeClient.type === 'grpc') {
      const grpcRes = res as GrpcTransactionResponse
      txHash = grpcRes.txhash
      blockHeight = grpcRes.blockHeight
      blockHash = grpcRes.blockHash
    } else {
      const connectRes = res as ConnectTransactionResponse
      if (connectRes.transaction) {
        txHash = connectRes.transaction.hash || ''
        blockHeight = connectRes.transaction.height || BigInt(0)
        blockHash = connectRes.transaction.blockHash || ''
      }
    }

    logger.info(
      {
        tx: res.transaction,
        txhash: txHash,
        block: blockHeight,
        blockhash: blockHash
      },
      'core relay success'
    )
    return {
      status: true,
      transactionHash: txHash,
      transactionIndex: 0,
      blockHash: blockHash,
      blockNumber: Number(blockHeight),
      from: request.senderAddress || '',
      to: request.senderAddress || '',
      cumulativeGasUsed: 10,
      gasUsed: 10,
      effectiveGasPrice: 420
    }
  } catch (e) {
    logger.error({ err: e }, 'core relay failure:')
    return null
  }
}
