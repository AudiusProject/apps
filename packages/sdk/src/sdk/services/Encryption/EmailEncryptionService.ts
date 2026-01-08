import { base64 } from '@scure/base'

import type { Configuration } from '../..'
import { BaseAPI } from '../..'
import { CryptoUtils } from '../../utils/crypto'
import type { AudiusWalletClient } from '../AudiusWalletClient'

import type {
  EncryptedEmailsResult,
  EncryptedKey,
  SharedSymmetricKey
} from './types'

export class EmailEncryptionService extends BaseAPI {
  private readonly symmetricKeyCache = new Map<string, Promise<Uint8Array>>()
  private readonly sharedSecretCache = new Map<string, Promise<Uint8Array>>()
  private readonly cacheSize = 1000

  /**
   * Constructs a new EmailEncryptionService instance
   * @param config - SDK configuration object
   * @param audiusWalletClient - Configured AudiusWalletClient instance for cryptographic operations
   */
  constructor(
    config: Configuration,
    private readonly audiusWalletClient: AudiusWalletClient
  ) {
    super(config)
  }

  /**
   * Creates a new symmetric key for email encryption
   * @returns The symmetric key as Uint8Array
   */
  createSymmetricKey(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32))
  }

  /**
   * Encrypts a symmetric key for a user using their public key and shared secret
   * @param userId - The ID of the user to encrypt for
   * @param symmetricKey - The symmetric key to encrypt
   * @returns The encrypted key as a base64 string
   */
  async encryptSymmetricKey(
    userId: string,
    symmetricKey: Uint8Array
  ): Promise<string> {
    const userPublicKey = await this.getPublicKey(userId)
    const sharedSecret = await this.audiusWalletClient.getSharedSecret({
      publicKey: userPublicKey
    })
    const encryptedKeyBytes = await CryptoUtils.encrypt(
      sharedSecret,
      symmetricKey
    )
    return base64.encode(encryptedKeyBytes)
  }

  /**
   * Decrypts a symmetric key using cached shared secrets
   * @param encryptedKey - The encrypted symmetric key as a base64 string
   * @param userId - The ID of the user who encrypted the key
   * @param pubkeyBase64 - Optional pre-provided public key to avoid API calls
   * @returns The decrypted symmetric key from cache or new decryption
   * @remarks Uses LRU caching for symmetric keys and shared secrets to improve performance
   */
  async decryptSymmetricKey(
    encryptedKey: string,
    userId: string,
    pubkeyBase64?: string
  ): Promise<Uint8Array> {
    const cacheKey = `${userId}-${encryptedKey}`

    if (!this.symmetricKeyCache.has(cacheKey)) {
      // Store the promise in the cache to handle concurrent requests
      this.symmetricKeyCache.set(
        cacheKey,
        pubkeyBase64
          ? this.decryptSymmetricKeyWithPublicKey(encryptedKey, pubkeyBase64)
          : this.decryptSymmetricKeyDirect(encryptedKey, userId)
      )

      // Remove oldest entries if caches get too large
      if (this.symmetricKeyCache.size >= this.cacheSize) {
        this.removeOldestEntries(this.symmetricKeyCache)
      }
      if (this.sharedSecretCache.size >= this.cacheSize) {
        this.removeOldestEntries(this.sharedSecretCache)
      }
    }

    return this.symmetricKeyCache.get(cacheKey)!
  }

  /**
   * Encrypts an email using a symmetric key
   * @param email - The email to encrypt
   * @param symmetricKey - The symmetric key to use
   * @returns The encrypted email as a base64 string
   */
  async encryptEmail(email: string, symmetricKey: Uint8Array): Promise<string> {
    const encryptedBytes = await CryptoUtils.encryptString(symmetricKey, email)
    return base64.encode(encryptedBytes)
  }

  /**
   * Decrypts an email using a symmetric key
   * @param encryptedEmail - The encrypted email as a base64 string
   * @param symmetricKey - The symmetric key to use
   * @returns The decrypted email
   */
  async decryptEmail(
    encryptedEmail: string,
    symmetricKey: Uint8Array
  ): Promise<string> {
    return await CryptoUtils.decryptString(
      symmetricKey,
      base64.decode(encryptedEmail)
    )
  }

  /**
   * Creates and distributes a symmetric key between an email owner and recipients
   * @param emailOwnerId - The ID of the email owner
   * @param receivingIds - List of user IDs who will receive access
   * @param grantorId - The ID of the user granting access
   * @returns The encrypted symmetric keys for storage
   * @remarks Includes the email owner in the recipient list automatically
   */
  async createSharedKey(
    emailOwnerId: string,
    receivingIds: string[],
    grantorId: string
  ): Promise<SharedSymmetricKey> {
    // Generate random symmetric key
    const symmetricKey = this.createSymmetricKey()

    // Include email owner in the list of recipients
    const allRecipientIds = [emailOwnerId, ...receivingIds]

    // Encrypt for each receiving user including the owner
    const receiverEncryptedKeys: EncryptedKey[] = await Promise.all(
      allRecipientIds.map(async (receivingId) => {
        const encryptedKey = await this.encryptSymmetricKey(
          receivingId,
          symmetricKey
        )
        return {
          receivingId,
          encryptedKey,
          grantorId
        }
      })
    )

    return {
      symmetricKey,
      receiverEncryptedKeys
    }
  }

  /**
   * Encrypts emails for multiple recipients using a shared symmetric key
   * @param emailOwnerId - The ID of the email owner
   * @param receivingIds - List of user IDs who will receive access
   * @param grantorId - The ID of the user granting access
   * @param emails - List of emails to encrypt
   * @returns Object containing encrypted emails and encrypted symmetric keys
   */
  async encryptEmails(
    emailOwnerId: string,
    receivingIds: string[],
    grantorId: string,
    emails: string[]
  ): Promise<EncryptedEmailsResult> {
    // Create symmetric key for all recipients
    const { symmetricKey, receiverEncryptedKeys } = await this.createSharedKey(
      emailOwnerId,
      receivingIds,
      grantorId
    )

    // Encrypt emails with symmetric key
    const encryptedEmails = await Promise.all(
      emails.map((email) => this.encryptEmail(email, symmetricKey))
    )

    return {
      encryptedEmails,
      receiverEncryptedKeys
    }
  }

  // Caching Infrastructure
  /**
   * Removes oldest entries from a cache map when size limit is reached
   * @param map - The cache map to prune
   * @remarks Implements LRU-like cache eviction by removing oldest 1/3 of entries
   * @private Internal cache maintenance utility
   */
  private removeOldestEntries<K, V>(map: Map<K, V>) {
    const entries = Array.from(map.keys())
    entries.slice(0, this.cacheSize / 3).forEach((key) => map.delete(key))
  }

  // Core Decryption Implementations
  /**
   * Direct decryption path using user ID to fetch public key
   * @param encryptedKey - Base64 encoded encrypted symmetric key
   * @param userId - ID of user who encrypted the key
   * @returns Decrypted symmetric key bytes
   * @private Internal decryption implementation
   */
  private async decryptSymmetricKeyDirect(
    encryptedKey: string,
    userId: string
  ): Promise<Uint8Array> {
    const userPublicKey = await this.getPublicKey(userId)
    const sharedSecret = await this.getSharedSecretWithCache(userPublicKey)
    return await CryptoUtils.decrypt(sharedSecret, base64.decode(encryptedKey))
  }

  /**
   * Optimized decryption path using pre-provided public key
   * @param encryptedKey - Base64 encoded encrypted symmetric key
   * @param pubkeyBase64 - Base64 encoded public key of encrypting user
   * @returns Decrypted symmetric key bytes
   * @private Internal decryption implementation
   * @remarks Bypasses public key API call when key is already known
   */
  private async decryptSymmetricKeyWithPublicKey(
    encryptedKey: string,
    pubkeyBase64: string
  ): Promise<Uint8Array> {
    const userPublicKey = base64.decode(pubkeyBase64)
    const sharedSecret = await this.getSharedSecretWithCache(userPublicKey)
    return await CryptoUtils.decrypt(sharedSecret, base64.decode(encryptedKey))
  }

  /**
   * Gets the public key for a user from the comms API
   * @param userId - The ID of the user to get the public key for
   * @returns The user's public key as a Uint8Array
   * @private Internal API call wrapper
   */
  private async getPublicKey(userId: string): Promise<Uint8Array> {
    const response = await this.request({
      path: `/comms/pubkey/${userId}`,
      method: 'GET',
      headers: {}
    })
    const json = await response.json()
    return base64.decode(json.data)
  }

  /**
   * Retrieves shared secret with caching mechanism
   * @param publicKey - Public key to derive shared secret from
   * @returns Cached shared secret promise
   * @private Manages LRU cache for shared secrets
   */
  private async getSharedSecretWithCache(
    publicKey: Uint8Array
  ): Promise<Uint8Array> {
    const cacheKey = Buffer.from(publicKey).toString('base64')
    if (!this.sharedSecretCache.has(cacheKey)) {
      this.sharedSecretCache.set(
        cacheKey,
        this.audiusWalletClient.getSharedSecret({ publicKey })
      )
    }
    return this.sharedSecretCache.get(cacheKey)!
  }
}
