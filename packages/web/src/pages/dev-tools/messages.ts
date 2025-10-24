export const messages = {
  pageTitle: 'Developer Tools',
  pageDescription:
    'This page provides utilities for developers to test and debug the application.',
  featureFlagsTitle: 'Feature Flags',
  featureFlagsDescription:
    'Override feature flags for testing purposes. Changes require a page refresh to take effect.',
  featureFlagsButton: 'Open Feature Flag Editor',
  confirmerPreviewTitle: 'Confirmer Preview',
  confirmerPreviewDescription:
    "Preview the state of the confirmer, which manages transaction retries. Alternatively, press 'C' key to toggle this tool.",
  confirmerPreviewButton: 'Open Confirmer Preview',
  signatureDecoderTitle: 'Secp256k1 Instruction Data Decoder',
  signatureDecoderDescription:
    'Input the "Instruction Data" from Solana Explorer for a Secp256k1 SigVerify Precompile instruction to decode the underlying Claimable Tokens message.',
  signatureDecoderInputLabel: 'Secp256k1 Instruction Hex String:',
  signatureDecoderButton: 'Decode Message',
  signatureDecoderOutputLabel: 'Decoded Claimable Tokens Message:',
  signatureDecoderErrorLabel: 'Error:',
  solanaToolsTitle: 'Solana Tools',
  solanaToolsDescription:
    'A collection of tools for interacting with and debugging Solana programs.',
  solanaToolsButton: 'Open Solana Tools',
  userBankDeriverTitle: 'User Bank Address Deriver',
  userBankDeriverDescription:
    'Derive the Program-Owned Associated Token Account (User Bank) address for a given Ethereum wallet address and token. This is where claimable tokens for that user would reside.',
  userBankDeriverEthAddressLabel: 'Ethereum Wallet Address:',
  userBankDeriverEthAddressPlaceholder:
    'Enter Ethereum wallet address (e.g., 0x...)',
  userBankDeriverTokenLabel: 'Token Symbol:',
  userBankDeriverButton: 'Derive User Bank Address',
  userBankDeriverOutputLabel: 'Derived User Bank Address:',
  userBankDeriverErrorLabel: 'Error Deriving Address:',
  aaoTitle: 'Anti-Abuse Oracle (AAO)',
  aaoDescription:
    'Access the Anti-Abuse Oracle attestation interface used to validate reward claims and verify legitimate user activity in the protocol.',
  aaoButton: 'Open AAO UI',
  healthzTitle: 'Health Monitor (Healthz)',
  healthzDescription:
    'Access the health monitoring dashboard for Audius network services including discovery nodes, content nodes, and other protocol infrastructure.',
  healthzButton: 'Open Healthz Dashboard',
  userIdParserTitle: 'User ID Parser',
  userIdParserDescription:
    'Parse hash IDs to decode them into numeric user IDs. Useful for debugging and development work with user identifiers.',
  userIdParserButton: 'Open User ID Parser'
}
