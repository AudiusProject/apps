---
'@audius/sdk': minor
---

User bank creation now also sets the user bank's close authority to the Claimable Tokens rent destination, as required by the Solana relay. Adds `claimableTokensClient.createCloseAuthorityInstructions`. `createUserBankIfNeededInstruction` now returns `instructions` (empty if the user bank exists) instead of `instruction`, and accepts `instructionIndex`. Creating a user bank for a wallet other than the connected one now throws.
