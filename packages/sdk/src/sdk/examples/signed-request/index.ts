import { sdk, UserAuth, Errors } from '@audius/sdk'
import prompt from 'prompt-sync'

const email = ''
const password = ''
const handle = ''

/**
 * Creates an sdk instance and logs in with user auth
 * Fetches the listening history for that user
 * Please set:
 *  - email
 *  - password
 *  - handle
 */
const main = async () => {
  // Create an sdk with an app name and user auth
  const auth = new UserAuth()
  const audiusSdk = sdk({
    appName: 'Example',
    services: { auth }
  })

  // Sign in as our user, catching the first attempt to add
  // the one-time-pass code.
  try {
    await auth.signIn({
      email,
      password
    })
  } catch (e) {
    if (e instanceof Errors.MissingOtpUserAuthError) {
      const otp = prompt()('Enter email verification code: ')

      await auth.signIn({
        email,
        password,
        otp
      })
    } else {
      throw e
    }
  }

  // Get our user id
  const userId = (
    await audiusSdk.users.getUserByHandle({
      handle
    })
  ).data?.id

  // Get our listening history, which requires us to be logged in
  const history = await audiusSdk.users.getUsersTrackHistory({
    id: userId!,
    limit: 1
  })

  console.info(history)

  // Log our user out
  await auth.signOut()

  process.exit(0)
}

main()
