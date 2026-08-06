import type { TypedData } from 'viem'

import type { AudiusWalletClient } from '../AudiusWalletClient'

/**
 * EIP-712 typed data for the signature a client presents when starting an
 * upload. It proves which wallet is asking to upload, before any content
 * exists to name.
 *
 * Typed data rather than a hashed JSON payload for two reasons. It removes
 * JSON canonicalization from the protocol entirely — the type definition is
 * the encoding, so there is no key ordering or number formatting for client
 * and server to agree on and later drift apart over. And it provides domain
 * separation, which a bare hashed payload does not: without a domain, a
 * signature produced for any other purpose over the same two fields would be
 * replayable as an upload authorization.
 *
 * This mirrors how the SDK already signs entity-manager writes, so both sides
 * use standard calls — `signTypedData` here, go-ethereum's `apitypes` on the
 * validator — rather than a hand-rolled hashing scheme.
 *
 * The domain carries name and version only. `verifyingContract` is omitted
 * because uploads are not a contract interaction, and `chainId` is omitted so
 * storage nodes need no chain configuration to verify. Keep these in lockstep
 * with pkg/core/server/upload_request_eip712.go — a mismatch in any field
 * makes every signature fail to recover.
 */
const UPLOAD_REQUEST_DOMAIN = {
  name: 'Audius Upload',
  version: '1'
} as const

const UPLOAD_REQUEST_TYPES = {
  UploadRequest: [
    { name: 'userId', type: 'uint256' },
    { name: 'timestamp', type: 'uint256' }
  ]
} as const satisfies TypedData

/**
 * A signature plus the message it commits to. Every field the verifier needs
 * to rebuild the typed data is returned together, because an EIP-712 signature
 * does not carry its own message — recovery needs the exact fields that were
 * signed. Returning only some of them would leave the caller to re-derive the
 * rest and risk them drifting from what was actually signed.
 */
export type UploadRequestSignature = {
  /** Hex signature over the typed data. */
  signature: string
  /** User id covered by the signature. */
  userId: number
  /** Millisecond timestamp covered by the signature. */
  timestamp: number
}

/**
 * Signs an upload request for the given user.
 *
 * The payload deliberately does not name the content: at the time an upload is
 * created the bytes have not been sent, so nobody — client or node — knows the
 * cid yet. Binding to content happens on the other side, when the storage node
 * attests to the cids it produced from the bytes this wallet sent, and that
 * attestation is what entitles the wallet to claim them on a track.
 *
 * The timestamp is returned alongside the signature because the verifier needs
 * it to reconstruct the typed data. It is reproduced inside the signed payload,
 * so altering it in transit only breaks recovery.
 */
export const signUpload = async ({
  audiusWalletClient,
  userId,
  timestamp = Date.now()
}: {
  audiusWalletClient: AudiusWalletClient
  userId: number
  timestamp?: number
}): Promise<UploadRequestSignature> => {
  const [account] = await audiusWalletClient.getAddresses()
  if (!account) {
    throw new Error('No wallet available to sign upload')
  }

  const signature = await audiusWalletClient.signTypedData({
    account,
    domain: UPLOAD_REQUEST_DOMAIN,
    types: UPLOAD_REQUEST_TYPES,
    primaryType: 'UploadRequest',
    message: {
      userId: BigInt(userId),
      timestamp: BigInt(timestamp)
    }
  })

  return { signature, userId, timestamp }
}
