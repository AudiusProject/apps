import { RewardManagerProgram, Secp256k1Program } from '@audius/spl'
import { PublicKey, type TransactionInstruction } from '@solana/web3.js'
import {
  SolanaClient,
  SolanaRelay,
  SolanaRelayWalletAdapter,
  Configuration
} from '@audius/sdk/services'

// CHANGE THESE
const endpoints = [
  'https://discoveryprovider.staging.audius.co',
  'https://discoveryprovider2.staging.audius.co',
  'https://discoveryprovider3.staging.audius.co'
]
const programId = new PublicKey('CDpzvz7DfgbF95jSSCHLX3ERkugyfgn9Fw8ypNZ1hfXp')
const rewardManagerState = new PublicKey(
  'GaiG9LDYHfZGqeNaoGRzFEnLiwUT7WiC6sA6FDJX9ZPq'
)
const addressLookupTable = new PublicKey(
  'ChFCWjeFxM6SRySTfT46zXn2K7m89TJsft4HWzEtkB4J'
)

const authority = RewardManagerProgram.deriveAuthority({
  programId,
  rewardManagerState
})

const client = new SolanaClient({
  solanaWalletAdapter: new SolanaRelayWalletAdapter({
    solanaRelay: new SolanaRelay(
      new Configuration({
        basePath: endpoints[0] + '/solana',
        headers: { 'Content-Type': 'application/json' }
      })
    )
  })
})

const createSenderPublicInstructions = async ({
  senderEthAddress,
  operatorEthAddress,
  attestations
}: {
  senderEthAddress: string
  operatorEthAddress: string
  attestations: any[]
}) => {
  const instructions: TransactionInstruction[] = []
  const existingSenders: PublicKey[] = []

  const sender = RewardManagerProgram.deriveSender({
    ethAddress: senderEthAddress,
    programId,
    authority
  })

  for (let i = 0; i < attestations.length; i++) {
    const data = attestations[i]

    const message = RewardManagerProgram.encodeSenderAttestation({
      senderEthAddress,
      rewardManagerState
    })

    const { signature, recoveryId } = RewardManagerProgram.encodeSignature(
      data.attestation
    )
    const secpInstruction = Secp256k1Program.createInstructionWithEthAddress({
      ethAddress: data.owner_wallet,
      message,
      signature,
      recoveryId,
      instructionIndex: instructions.length
    })
    instructions.push(secpInstruction)

    const sender = RewardManagerProgram.deriveSender({
      ethAddress: data.owner_wallet,
      programId,
      authority
    })
    existingSenders.push(sender)
  }
  const payer = await client.getFeePayer()
  const createSenderInst = RewardManagerProgram.createSenderPublicInstruction({
    senderEthAddress,
    operatorEthAddress,
    sender,
    existingSenders,
    rewardManagerState,
    authority,
    payer,
    rewardManagerProgramId: programId
  })
  instructions.push(createSenderInst)
  return instructions
}

const createContentNodeSenders = async () => {
  const {
    data: {
      network: { content_nodes: contentNodes }
    }
  } = await fetch(endpoints[0] + '/health_check').then((r) => r.json())

  for (const contentNode of contentNodes) {
    const senderEthAddress = contentNode.delegateOwnerWallet
    const {
      data: { spOwnerWallet: operatorEthAddress }
    } = await fetch(contentNode.endpoint + '/health_check').then((r) =>
      r.json()
    )

    const attestations = await Promise.all(
      endpoints.map(async (e) => {
        const res = await fetch(
          `${e}/v1/challenges/attest_sender?sender_eth_address=${senderEthAddress}`
        )
        const { data } = await res.json()
        return data
      })
    )

    const instructions = await createSenderPublicInstructions({
      senderEthAddress,
      operatorEthAddress,
      attestations
    })

    const payer = await client.getFeePayer()
    const tx = await client.buildTransaction({
      instructions,
      addressLookupTables: [addressLookupTable],
      feePayer: payer
    })

    try {
      const res = await client.sendTransaction(tx)
      console.log(res)
    } catch (e) {
      console.error(e)
      console.log(e.response)
    }
  }
}

createContentNodeSenders()
