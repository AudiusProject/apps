const currentYear = new Date().getFullYear().toString()

export const settingsMessages = {
  pageTitle: 'Settings',
  version: 'Audius Version',
  copyright: `Copyright © ${currentYear} Audius`,
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  emailSent: 'Email Sent!',
  emailNotSent: 'Something broke! Please try again!',
  darkMode: 'Dark',
  lightMode: 'Light',
  autoMode: 'Auto',
  matrixMode: 'Matrix',
  debugMode: 'Debug',
  signOut: 'Sign Out',

  aiGeneratedCardTitle: 'AI Generated music',
  appearanceTitle: 'Appearance',
  inboxSettingsCardTitle: 'Inbox Settings',
  notificationsCardTitle: 'Configure Notifications',
  accountRecoveryCardTitle: 'Resend Recovery Email',
  changeEmailCardTitle: 'Change Email',
  changePasswordCardTitle: 'Change Password',
  accountsYouManageTitle: 'Accounts You Manage',
  verificationCardTitle: 'Verification',
  desktopAppCardTitle: 'Download the Desktop App',

  aiGeneratedCardDescription:
    'Opt in to allow AI models to be trained on your likeness, and to let users credit you in their AI generated works.',
  appearanceDescription:
    "Enable dark mode or choose 'Auto' to change with your system settings.",
  inboxSettingsCardDescription:
    'Configure who is able to send messages to your inbox.',
  notificationsCardDescription: 'Review your notification preferences.',
  accountRecoveryCardDescription:
    'Resend your password reset email and store it safely. This email is the only way to recover your account if you forget your password.',
  changeEmailCardDescription:
    'Change the email you use to sign in and receive emails.',
  changePasswordCardDescription: 'Change the password to your Audius account.',
  verificationCardDescription:
    'Verify your Audius profile by linking a verified account from Twitter, Instagram, or TikTok.',
  desktopAppCardDescription:
    'For the best experience, we reccomend downloading the Audius Desktop App.',

  aiGeneratedEnabled: 'Enabled',
  aiGeneratedButtonText: 'AI Generated Music Settings',
  inboxSettingsButtonText: 'Inbox Settings',
  notificationsButtonText: 'Configure Notifications',
  accountRecoveryButtonText: 'Resend Email',
  changeEmailButtonText: 'Change Email',
  changePasswordButtonText: 'Change Password',
  desktopAppButtonText: 'Get The App',
  showPrivateKey: 'Show Private Key (Advanced)',
  signOutModalText: `
  Are you sure you want to sign out?
  Double check that you have an account recovery email just in case (resend from your settings).
`
}
