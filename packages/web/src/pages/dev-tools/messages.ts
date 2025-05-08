export const messages = {
  pageTitle: 'Developer Tools',
  pageDescription:
    'This page provides utilities for developers to test and debug the application.',
  featureFlagsTitle: 'Feature Flags',
  featureFlagsDescription:
    'Override feature flags for testing purposes. Changes require a page refresh to take effect.',
  featureFlagsButton: 'Open Feature Flag Editor',
  discoveryNodeTitle: 'Discovery Node Selector',
  discoveryNodeDescription:
    "Select a specific Discovery Node to connect to. Alternatively, press 'D' key to toggle this tool.",
  discoveryNodeButton: 'Open Discovery Node Selector',
  confirmerPreviewTitle: 'Confirmer Preview',
  confirmerPreviewDescription:
    "Preview the state of the confirmer, which manages transaction retries. Alternatively, press 'C' key to toggle this tool.",
  confirmerPreviewButton: 'Open Confirmer Preview',
  signatureDecoderTitle: 'Signature Decoder',
  signatureDecoderDescription:
    'Input a raw Secp256k1 instruction hex string (e.g., the "Instruction Data" from Solana Explorer for a Secp256k1 SigVerify Precompile instruction) to decode the underlying Claimable Tokens message.',
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
  userBankDeriverErrorLabel: 'Error Deriving Address:'
}
