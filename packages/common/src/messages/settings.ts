const currentYear = new Date().getFullYear().toString()

export const settingsMessages = {
  pageTitle: 'Settings',
  version: 'Audius Version',
  copyright: `Copyright © ${currentYear} Audius`,
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  fanClubTerms: 'Fan Club Terms',
  apiTerms: 'API Terms',
  emailSent: 'Email Sent!',
  emailNotSent: 'Something broke! Please try again!',
  darkMode: 'Dark',
  lightMode: 'Light',
  autoMode: 'Auto',
  matrixMode: 'Matrix',
  defaultPalette: 'Default',
  classicPalette: 'Classic',
  themeLabel: 'Color Theme',
  colorModeLabel: 'Light / Dark',
  surfaceStyleLabel: 'Glass Effect',
  surfaceStyleSolid: 'Solid',
  surfaceStyleSubtle: 'Subtle',
  surfaceStyleDefault: 'Default',
  surfaceStyleStrong: 'Strong',
  signOut: 'Sign Out',

  appearanceTitle: 'Appearance',
  inboxSettingsCardTitle: 'Inbox Settings',
  commentSettingsCardTitle: 'Comment Settings',
  labelAccountCardTitle: 'Label Account',
  notificationsCardTitle: 'Configure Notifications',
  accountRecoveryCardTitle: 'Resend Recovery Email',
  emailVerificationCardTitle: 'Email Verification',
  changeEmailCardTitle: 'Change Email',
  changePasswordCardTitle: 'Change Password',
  accountsYouManageTitle: 'Accounts You Manage',
  verificationCardTitle: 'Verification',
  desktopAppCardTitle: 'Download the Desktop App',

  appearanceDescription:
    'Customize colors, light/dark mode, and glass effects.',
  inboxSettingsCardDescription:
    'Configure who is able to send messages to your inbox.',
  commentSettingsCardDescription:
    'Prevent certain users from commenting on your tracks.',
  notificationsCardDescription: 'Review your notification preferences.',
  accountRecoveryCardDescription:
    'Resend your password reset email and store it safely. This email is the only way to recover your account if you forget your password.',
  emailVerificationCardDescription:
    'Verify that you can receive email at the address connected to your Audius account.',
  changeEmailCardDescription:
    'Change the email you use to sign in and receive emails.',
  changePasswordCardDescription: 'Change the password to your Audius account.',
  verificationCardDescription:
    'Verify your Audius profile by completing identity verification',
  desktopAppCardDescription:
    'For the best experience, we recommend downloading the Audius App.',
  labelAccountCardDescription:
    'Identify as a record label on your Audius profile.',

  verificationCardButtonText: 'Get Verified',
  inboxSettingsButtonText: 'Inbox Settings',
  commentSettingsButtonText: 'Comment Settings',
  notificationsButtonText: 'Configure Notifications',
  accountRecoveryButtonText: 'Resend Email',
  emailVerificationButtonText: 'Resend Verification Email',
  emailVerificationSent: 'Verification email sent!',
  emailVerificationAlreadyVerified: 'Your email is already verified.',
  emailVerificationNotSent:
    'Unable to send verification email. Please try again!',
  emailVerifiedStatus: 'Email verified',
  emailNotVerifiedStatus: 'Email not verified',
  changeEmailButtonText: 'Change Email',
  changePasswordButtonText: 'Change Password',
  desktopAppButtonText: 'Get The App',
  showPrivateKey: 'Show Private Key (Advanced)',
  labelAccountButtonText: 'Change',
  signOutModalText: `
  Are you sure you want to sign out?
  Double check that you have an account recovery email just in case (resend from your settings).
`
}
