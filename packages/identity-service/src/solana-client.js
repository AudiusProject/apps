const config = require('./config')
const solanaWeb3 = require('@solana/web3.js')
const keccak256 = require('keccak256')
const secp256k1 = require('secp256k1')
const borsh = require('borsh')

const VALID_SIGNER = config.get('solanaValidSigner')
const AUDIUS_ETH_REGISTRY_PROGRAM = config.get('solanaAudiusEthRegistryAddress')
  ? new solanaWeb3.PublicKey(config.get('solanaAudiusEthRegistryAddress'))
  : null
const TRACK_LISTEN_PROGRAM = config.get('solanaTrackListenCountAddress')
  ? new solanaWeb3.PublicKey(config.get('solanaTrackListenCountAddress'))
  : null
const INSTRUCTIONS_PROGRAM = new solanaWeb3.PublicKey(
  'Sysvar1nstructions1111111111111111111111111'
)
const CLOCK_PROGRAM = new solanaWeb3.PublicKey(
  'SysvarC1ock11111111111111111111111111111111'
)

class TrackData {
  constructor({ userId, trackId, source, timestamp }) {
    this.userId = userId
    this.trackId = trackId
    this.source = source
    this.timestamp = timestamp
  }
}

class InstructionArgs {
  constructor({ trackData, signature, recoveryId }) {
    this.trackData = trackData
    this.signature = signature
    this.recoveryId = recoveryId
  }
}

class InstructionEnum {
  constructor({ instruction, choose }) {
    this.instruction = instruction
    this.choose = choose
  }
}

const trackDataSchema = new Map([
  [
    TrackData,
    {
      kind: 'struct',
      fields: [
        ['userId', 'string'],
        ['trackId', 'string'],
        ['source', 'string'],
        ['timestamp', 'u64']
      ]
    }
  ]
])

const instructionSchema = new Map([
  [
    InstructionEnum,
    {
      kind: 'enum',
      field: 'choose',
      values: [['instruction', InstructionArgs]]
    }
  ],
  [
    InstructionArgs,
    {
      kind: 'struct',
      fields: [
        ['trackData', TrackData],
        ['signature', [64]],
        ['recoveryId', 'u8']
      ]
    }
  ],
  [
    TrackData,
    {
      kind: 'struct',
      fields: [
        ['userId', 'string'],
        ['trackId', 'string'],
        ['source', 'string'],
        ['timestamp', 'u64']
      ]
    }
  ]
])

let feePayerKeypair = null
let feePayerKeypairs = null

// Optionally returns the existing singleFeePayer
// Ensures other usages of this function do not break as we upgrade to multiple
function getFeePayerKeypair(singleFeePayer = true) {
  if (!feePayerKeypairs) {
    feePayerKeypairs = config.get('solanaFeePayerWallets')
      ? config
          .get('solanaFeePayerWallets')
          .map((item) => item.privateKey)
          .map((key) => solanaWeb3.Keypair.fromSecretKey(Uint8Array.from(key)))
      : null
  }
  if (!feePayerKeypair) {
    feePayerKeypair = (feePayerKeypairs && feePayerKeypairs[0]) || null
  }
  // Ensure legacy usage of single feePayer is not broken
  // If multiple feepayers are not provided, default to single value as well
  if (
    singleFeePayer ||
    feePayerKeypairs === null ||
    feePayerKeypairs.length === 0
  ) {
    return feePayerKeypair
  }

  const randomFeePayerIndex = Math.floor(
    Math.random() * feePayerKeypairs.length
  )
  return feePayerKeypairs[randomFeePayerIndex]
}

let cachedListenBlocktime = null // in seconds, tracks recent blocktime
let lastRetrievedListenBlocktime = null // in seconds, tracks time when cachedListenBlocktime was fetched

/**
 * Get the blocktime for a recently finalized block, this relative time will be passed into listen transaction.
 * Used to prevent clock skew errors when sol chain halts and sol clock diverges from real clock
 * @param {Object} connection initialized solana connection object
 * @returns Number epoch in seconds
 */
async function getListenTimestamp(connection) {
  const currentEpochInSec = Math.round(Date.now() / 1000)
  if (
    cachedListenBlocktime &&
    Math.abs(lastRetrievedListenBlocktime - currentEpochInSec) < 30
  ) {
    return cachedListenBlocktime
  }

  const slot = await connection.getSlot('finalized')
  const blockTime = await connection.getBlockTime(slot)

  // update cached values
  cachedListenBlocktime = blockTime
  lastRetrievedListenBlocktime = currentEpochInSec

  return blockTime
}

async function createTrackListenInstructions({
  privateKey,
  userId,
  trackId,
  source,
  location,
  connection
}) {
  const validSigner = VALID_SIGNER

  const privKey = Buffer.from(privateKey, 'hex')
  const pubKey = secp256k1.publicKeyCreate(privKey, false).slice(1)

  const validSignerPubK = new solanaWeb3.PublicKey(validSigner)
  const accInfo = await connection.getAccountInfo(validSignerPubK)
  const signerGroup = new solanaWeb3.PublicKey(
    accInfo.data.toJSON().data.slice(1, 33)
  ) // cut off version and eth address from valid signer data

  // max sol tx size is 1232 bytes
  const trackData = new TrackData({
    userId,
    trackId,
    source,
    timestamp:
      (await getListenTimestamp(connection)) ||
      Math.round(new Date().getTime() / 1000)
  })

  const serializedTrackData = borsh.serialize(trackDataSchema, trackData)
  const msgHash = keccak256(serializedTrackData.toJSON().data)

  const sigObj = secp256k1.ecdsaSign(Uint8Array.from(msgHash), privKey)

  const instructionArgs = new InstructionArgs({
    trackData,
    signature: Array.from(sigObj.signature),
    recoveryId: sigObj.recid
  })

  const instructionData = new InstructionEnum({
    instruction: instructionArgs,
    choose: 'instruction'
  })

  const serializedInstructionArgs = borsh.serialize(
    instructionSchema,
    instructionData
  )

  const secpInstruction =
    solanaWeb3.Secp256k1Program.createInstructionWithPublicKey({
      publicKey: pubKey,
      message: serializedTrackData.toJSON().data,
      signature: sigObj.signature,
      recoveryId: sigObj.recid
    })
  const listenInstruction = new solanaWeb3.TransactionInstruction({
    keys: [
      { pubkey: validSignerPubK, isSigner: false, isWritable: false },
      { pubkey: signerGroup, isSigner: false, isWritable: false },
      {
        pubkey: AUDIUS_ETH_REGISTRY_PROGRAM,
        isSigner: false,
        isWritable: false
      },
      { pubkey: INSTRUCTIONS_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: CLOCK_PROGRAM, isSigner: false, isWritable: false }
    ],
    programId: TRACK_LISTEN_PROGRAM,
    data: serializedInstructionArgs
  })

  return [secpInstruction, listenInstruction]
}

module.exports = {
  createTrackListenInstructions,
  getFeePayerKeypair
}
