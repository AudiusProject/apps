export const messages = {
  // Shared
  allow: 'Allow Audius to Connect to',
  permissionsRequestedHeader: 'This application will receive',
  authorizeButton: 'Sign In & Authorize',
  continueButton: 'Continue',
  signedInAs: "You're Signed in as",
  signInFirst:
    'You must be signed in to the Audius app to authorize this request.',
  cancelButton: 'Cancel',
  miscError: 'An error has occurred. Please try again.',
  // Permission labels
  readOnlyAccountAccess: 'Read-only Access',
  readOnlyGrants:
    'This app cannot interact with or make changes to your account.',
  writeAccountAccess: 'Read/Write Access',
  writeAccessGrants:
    'Grant this app permission to make changes to your account on your behalf.',
  disconnectWalletAccess: 'Permission to unlink this wallet from your account',
  yourAccountData: 'Your Audius Account Data',
  yourAccountDataAccess:
    'Account activity, and identifying information, including the email address',
  yourAccountDataAccessNoEmail: 'Account activity and identifying information.',
  // Validation errors
  redirectURIInvalidError:
    'Whoops, this is an invalid link (redirect URI missing or invalid).',
  responseModeInvalidError:
    'Whoops, this is an invalid link (response_mode is invalid).',
  missingAppNameError: 'Whoops, this is an invalid link (app name missing).',
  scopeError: 'Whoops, this is an invalid link (scope missing or invalid).',
  missingApiKeyError: 'Whoops, this is an invalid link (app API Key missing)',
  invalidApiKeyError: 'Whoops, this is an invalid link (app API Key invalid)',
  missingCodeChallengeError:
    'Whoops, this is an invalid link (code_challenge is required for PKCE flow).',
  invalidCodeChallengeMethodError:
    'Whoops, this is an invalid link (code_challenge_method must be S256).',
  writeOnceTxError: `Whoops, this is an invalid link ('tx' missing or invalid).`,
  writeOnceParamsError:
    'Whoops, this is an invalid link (transaction params missing or invalid).',
  connectWalletNotSupportedError:
    'Connecting a dashboard wallet is not supported in the native app.',
  disconnectWalletNotConnectedError:
    'Whoops, this is an invalid link (the specified wallet is not connected to an Audius account).',
  disconnectDashboardWalletWrongUserError:
    'This account is not connected to that wallet.',
  // Payment flow
  confirmTransaction: 'Confirm Transaction',
  balance: 'Balance',
  recipient: 'Recipient',
  amount: 'Amount',
  coin: 'Coin',
  confirm: 'Confirm',
  insufficientBalance: 'Insufficient balance',
  userDoesNotHoldMint: 'You do not hold this coin.',
  transactionComplete: 'Your transaction is complete!',
  missingParamsError:
    'Whoops, this is an invalid link (missing required parameters).',
  invalidRecipientError:
    'Whoops, this is an invalid link (recipient address is invalid).',
  invalidAmountError: 'Whoops, this is an invalid link (amount is invalid).',
  missingMintError: 'Whoops, this is an invalid link (mint address is missing).'
}
