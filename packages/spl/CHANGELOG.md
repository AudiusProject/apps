# @audius/spl

## 2.1.0

### Minor Changes

- 284302b: add revoke manager instructions

## 2.0.2

### Patch Changes

- 2fb34d2: Add support for encoding createSenderPublic attestations, fix instruction to not require signers for senders

## 2.0.1

### Patch Changes

- 9402210: move solana/web3.js to peer deps

## 2.0.0

### Major Changes

- e28b82b: Fixed bug where RewardsProgram only handled 3 total attestations in the account.
  Changed IDs and specifiers for rewards claiming to be shorter so they can fit in a single Solana transaction.

  To update: Update usages of `decodeAttestationsAccountData` to include `maxAttestations`, which should be `minVotes + 1` from `rewardManagerStateData`.

## 1.0.1

### Patch Changes

- 9a50c42: Fix instanceof check for version mismatches of @solana/web3.js and skip preflight on evaluateAttestations
- 975b630: Improve error messages from Claimable Tokens program

## 1.0.0

### Major Changes

- 75169cf: Update to use PaymentRouterProgram in @audius/spl and enable track purchase in SDK

### Patch Changes

- b65db45: Fixes RewardManagerProgram getSubmittedAttestations to account for the program padding the verified messages to 128 bytes
- b65db45: Fixes RewardManagerProgram signature parsing when service attestation signature is less than 64 bytes
- deb3f2a: Add Secp256k1Program extensions to @audius/spl to aid in decoding and debugging secp256k1 instructions
