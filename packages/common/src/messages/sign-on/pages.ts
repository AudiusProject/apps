export const signInPageMessages = {
  metaTitle: 'Sign In • Audius',
  metaDescription: 'Sign into your Audius account',
  title: 'Sign Into Audius',
  emailLabel: 'Email',
  passwordLabel: 'Password',
  signIn: 'Sign In',
  newToAudius: 'New to Audius?',
  createAccount: 'Create an Account',
  forgotPassword: 'Forgot password?'
}

export const confirmEmailMessages = {
  title: 'Confirm Email',
  description: 'Enter the verification code sent to your email.',
  otpLabel: 'Code',
  otpPlaceholder: '123 456',
  noEmailNotice: "Didn't get an email?",
  resendCode: 'Resend Code',
  resentToast: 'Verification code resent.',
  finishSigningUp: 'Finish Signing Up'
}

export const createEmailPageMessages = {
  title: 'Sign Up For Audius',
  emailLabel: 'Email',
  signUp: 'Sign Up Free',
  haveAccount: 'Already have an account?',
  signIn: 'Sign In',
  socialsDividerText: 'Or, get started with one of your socials',
  unknownError: 'Unknown error occurred.',
  metaMaskNotRecommended: 'Signing up with MetaMask is not recommended.',
  signUpMetamask: 'Sign Up With MetaMask',
  learnMore: 'Learn More',
  finishSigningUp: 'Finish Signing Up'
}

export type CompletionChecklistType =
  | 'hasNumber'
  | 'minLength'
  | 'notCommon'
  | 'matches'

export const createPasswordPageMessages = {
  createYourPassword: 'Create Your Password',
  description: "Create a password that's secure and easy to remember.",
  yourEmail: 'Your Email',
  passwordLabel: 'Password',
  confirmPasswordLabel: 'Confirm Password',
  completionChecklist: {
    hasNumber: 'Must contain numbers',
    minLength: 'At least 8 characters',
    matches: 'Passwords match',
    notCommon: 'Hard to guess'
  }
}

export const pickHandlePageMessages = {
  title: 'Pick Your Handle',
  description:
    'This is how others find and tag you. It is totally unique to you & cannot be changed later.',
  handle: 'Handle',
  or: 'or',
  claimHandleHeaderPrefix: 'Claim Your Verified',
  claimHandleDescription:
    'Verify your Audius account by linking a verified social media account.',
  claimHandleHeadsUp:
    'Heads up! 👋 Picking a handle that doesn’t match your verified account cannot be undone later.',
  handleAvailable: 'Handle available!',
  linkToClaim: 'Link to claim.'
}

export const finishProfilePageMessages = {
  header: 'Finish Your Profile',
  description:
    'Your photos & Display Name is how others see you. Customize with special characters, spaces, emojis, whatever!',
  displayName: 'Display Name',
  inputPlaceholder: 'express yourself 💫',
  goBack: 'Go back',
  profileImageUploadError: 'There was an issue uploading your profile image.',
  coverPhotoUploadError: 'There was an issue uploading your cover photo image.',
  bothImageUploadError:
    'There was an issue uploading your profile and cover photo image.'
}

export const selectGenresPageMessages = {
  header: 'Select Your Genres',
  description: 'Start by picking some of your favorite genres.',
  continue: 'Continue'
}

export const reviewHandlePageMessages = {
  heading: 'Review Your Handle',
  handle: 'Handle',
  description:
    "We've connected your social account but need your help with an issue we encountered. "
}

export const createLoginDetailsPageMessages = {
  title: 'Create Login Details',
  description: 'Enter your email and create a password.',
  emailLabel: 'Email',
  handleLabel: 'Handle',
  passwordLabel: 'Password',
  confirmPasswordLabel: 'Confirm Password',
  signIn: 'Sign In'
}

export const selectArtistsPageMessages = {
  header: 'Follow At Least 3 Artists',
  description:
    'Curate your feed with tracks uploaded or reposted by anyone you follow. Click the artist’s photo to preview their music.',
  genresLabel: 'Genre',
  pickArtists: (genre: string) => `Pick ${genre} Artists`,
  selected: 'Selected',
  backToGenres: 'Back To Genres',
  noResults:
    "Looks like we don't have any results for this genre at the moment."
}

export const welcomeModalMessages = {
  welcome: 'Welcome to Audius%0! 🎉',
  startListening: 'Start Listening',
  upload: 'Upload',
  youreIn:
    "You're in! Discover music from our talented DJs, producers, and artists."
}

export const skipButtonMessages = {
  skipThisStep: 'Skip'
}
