import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { basicAuth } from 'hono/basic-auth'
import {
  actionLogForUser,
  getUser,
  getRecentClaims,
  getUserNormalizedScore,
  getUserScore,
  recentTips,
  sql,
  type ActionRow,
  type TrackDetails,
  type UserDetails,
  queryUsers
} from './actionLog'
import { logger } from 'hono/logger'
import { config } from './config'
import { HashId } from '@audius/sdk'
import { SolanaUtils, Utils } from '@audius/sdk-legacy'
import bn from 'bn.js'
import { useEmail, userFingerprints } from './identity'
import { cors } from 'hono/cors'
import { getAudiusSdk } from './sdk'

let CONTENT_NODE = 'https://creatornode2.audius.co'
let FRONTEND = 'https://audius.co'

if (config.environment == 'stage') {
  CONTENT_NODE = 'https://creatornode10.staging.audius.co'
  FRONTEND = 'https://staging.audius.co'
}

let { AAO_AUTH_USER, AAO_AUTH_PASSWORD } = process.env
if (!AAO_AUTH_USER) {
  AAO_AUTH_USER = 'test'
  console.warn('AAO_AUTH_USER not set.  Falling back to: ', AAO_AUTH_USER)
}
if (!AAO_AUTH_PASSWORD) {
  AAO_AUTH_PASSWORD = 'test'
  console.warn(
    'AAO_AUTH_PASSWORD not set.  Falling back to: ',
    AAO_AUTH_PASSWORD
  )
}

const rewardAmountRatio = 10
const skipValidationChallenges = ['dvl']

const sdk = getAudiusSdk()

async function ensureTableExists() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS anti_abuse_blocked_users (
        handle_lc VARCHAR(255) PRIMARY KEY,
        is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
  } catch (error) {
    console.error(
      'Error ensuring anti_abuse_blocked_users table exists:',
      error
    )
    process.exit(1) // Exit the process if table creation fails
  }
}

ensureTableExists()

const app = new Hono()

app.use(logger())
app.use('/attestation/*', cors())

app.get('/attestation/check', async (c) => {
  const wallet = c.req.query('wallet')
  if (!wallet) return c.json({ error: 'wallet is required' }, 400)

  const users =
    await sql`select user_id, wallet from users where wallet = ${wallet.toLowerCase()}`
  const user = users[0]
  if (!user) return c.json({ error: `wallet not found: ${wallet}` }, 404)

  const userScore = await getUserNormalizedScore(user.user_id, user.wallet)
  if (userScore.overallScore < 0) {
    return c.json({ data: 'blocked' }, 400)
  }
  return c.json({ data: 'allowed' }, 200)
})

app.post(
  '/attestation/block-user',
  basicAuth({
    username: AAO_AUTH_USER,
    password: AAO_AUTH_PASSWORD
  }),
  async (c) => {
    const formData = await c.req.parseBody()
    const handle = formData.handle as string
    if (!handle) {
      return c.text('Handle is required', 400)
    }

    try {
      await sql`
      INSERT INTO anti_abuse_blocked_users (
        handle_lc,
        is_blocked,
        created_at,
        updated_at
      ) VALUES (
        ${handle.toLowerCase()},
        TRUE,  -- is_blocked
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (handle_lc)
      DO UPDATE SET
        is_blocked = EXCLUDED.is_blocked,
        updated_at = CURRENT_TIMESTAMP;
    `
      return c.redirect(`/attestation/ui/user?q=${encodeURIComponent(handle)}`)
    } catch (error) {
      console.error('Error blocking user:', error)
      return c.text('Failed to block user', 500)
    }
  }
)

app.post(
  '/attestation/unblock-user',
  basicAuth({
    username: AAO_AUTH_USER,
    password: AAO_AUTH_PASSWORD
  }),
  async (c) => {
    const formData = await c.req.parseBody()

    const handle = formData.handle as string
    if (!handle) {
      return c.text('Handle is required', 400)
    }

    try {
      await sql`
      INSERT INTO anti_abuse_blocked_users (
        handle_lc,
        is_blocked,
        created_at,
        updated_at
      ) VALUES (
        ${handle.toLocaleLowerCase()},
        FALSE,  -- is_blocked
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (handle_lc)
      DO UPDATE SET
        is_blocked = EXCLUDED.is_blocked,
        updated_at = CURRENT_TIMESTAMP;
    `
      return c.redirect(`/attestation/ui/user?q=${encodeURIComponent(handle)}`)
    } catch (error) {
      console.error('Error unblocking user:', error)
      return c.text('Failed to block user', 500)
    }
  }
)

app.post('/attestation/:handle', async (c) => {
  const handle = c.req.param('handle').toLowerCase()
  const { challengeId, challengeSpecifier, amount } = await c.req.json()

  const { data: users } = await sdk.full.users.getUserByHandle({ handle })
  if (!users || !users[0]) {
    return c.json({ error: `handle not found: ${handle}` }, 404)
  }
  const user = users[0]!

  if (!skipValidationChallenges.includes(challengeId)) {
    // pass / fail
    const userScore = await getUserNormalizedScore(
      HashId.parse(user.id),
      user.wallet
    )

    // Reward attestation proportional to user score confidence
    if (userScore.overallScore < (amount as number) / rewardAmountRatio) {
      return c.json({ error: 'denied' }, 400)
    }

    // Custom rules for specific challenges
    if (challengeId === 'e') {
      if (user.totalAudioBalance < 100) {
        return c.json({ error: 'denied' }, 400)
      }
    }
    console.log('userScore', userScore, user)
  }
  try {
    const bnAmount = SolanaUtils.uiAudioToBNWaudio(amount)
    const identifier = SolanaUtils.constructTransferId(
      challengeId,
      challengeSpecifier
    )
    const toSignStr = SolanaUtils.constructAttestation(
      user.wallet,
      bnAmount,
      identifier
    )
    const { signature, recoveryId } = SolanaUtils.signBytes(
      Buffer.from(toSignStr),
      config.privateSignerAddress
    )
    const result = new bn(Uint8Array.of(...signature, recoveryId)).toString(
      'hex'
    )

    return c.json({ result })
  } catch (error) {
    console.log(`Something went wrong: ${error}`)
    return c.json({ error: `Something went wrong` }, 500)
  }
})

//
// UI
//

app.use(
  '/attestation/ui/*',
  basicAuth({
    username: AAO_AUTH_USER,
    password: AAO_AUTH_PASSWORD
  })
)

app.get('/attestation/ui', async (c) => {
  const page = parseInt(c.req.query('page') || '0')
  const recentClaims = await getRecentClaims(page)
  const userScores = Object.fromEntries(
    await Promise.all(
      (recentClaims || []).map(async (claim) => [
        claim.handle,
        await getUserNormalizedScore(claim.user_id, claim.wallet)
      ])
    )
  )
  let lastDate = ''
  function dateHeader(timestamp: Date) {
    const d = timestamp?.toDateString()
    if (d != lastDate) {
      lastDate = d
      return (
        <>
          <tr>
            <td colspan={4}>
              <div class='text-xl font-bold pt-2'>{d}</div>
            </td>
          </tr>
          <tr>
            <th>Claim Timestamp</th>
            <th>Handle</th>
            <th>Sign Up Timestamp</th>
            <th>Score</th>
            <th>Challenge ID</th>
            <th>Amount</th>
          </tr>
        </>
      )
    }
    return null
  }

  return c.html(
    <Layout container>
      <h1 class='text-4xl font-bold mt-8'>Recent Claims</h1>
      <p>
        <span className='bg-red-100'>
          Red rows indicate who would be blocked under current scoring.
        </span>
      </p>
      <table class='table'>
        <tbody>
          {recentClaims?.map((recentClaim) => (
            <>
              {dateHeader(new Date(recentClaim.disbursement_date))}
              <tr
                className={
                  userScores[recentClaim.handle].overallScore <
                  recentClaim.amount / 10
                    ? 'bg-red-100'
                    : ''
                }
              >
                <td>
                  {new Date(recentClaim.disbursement_date).toLocaleTimeString()}
                </td>
                <td>
                  {' '}
                  <a
                    href={`/attestation/ui/user?q=${recentClaim.handle}`}
                    target='_blank'
                  >
                    {recentClaim.handle}
                  </a>
                </td>
                <td>{recentClaim.sign_up_date.toLocaleString()}</td>
                <td>{userScores[recentClaim.handle].overallScore}</td>
                <td>{recentClaim.challenge_id}</td>
                <td>{recentClaim.amount}</td>
              </tr>
            </>
          ))}
        </tbody>
      </table>

      <div class='flex'>
        <a
          href={`/attestation/ui?page=${encodeURIComponent(page - 1)}`}
          class='flex items-center justify-center px-3 h-8 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
        >
          Previous
        </a>

        <a
          href={`/attestation/ui?page=${encodeURIComponent(page + 1)}`}
          class='flex items-center justify-center px-3 h-8 ms-3 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
        >
          Next
        </a>
      </div>
    </Layout>
  )
})

app.get('/attestation/ui/user', async (c) => {
  const idOrHandle = c.req.query('q') || '1'
  const user = await getUser(idOrHandle)
  if (!user) return c.text(`user id not found: ${idOrHandle}`, 404)
  const email = await useEmail(user.id)
  const signals = await getUserScore(user.id)
  const userScore = (await getUserNormalizedScore(user.id, user.wallet))!

  if (!signals) return c.text(`user id not found: ${idOrHandle}`, 404)

  const fingerprints = await userFingerprints(user.id)
  const fingerprintUsers = await queryUsers({
    ids: fingerprints.flatMap((f) => f.userIds)
  })

  let lastDate = ''
  function dateHeader(timestamp: Date) {
    const d = timestamp?.toDateString()
    if (d != lastDate) {
      lastDate = d
      return (
        <tr>
          <td colspan={4}>
            <div class='font-bold pt-2'>{d}</div>
          </td>
        </tr>
      )
    }
    return null
  }

  const rows = await actionLogForUser(user.id)
  return c.html(
    <Layout title={user.handle + ` | AAO`}>
      <div class='px-16 py-8'>
        <div class='flex gap-4 items-center'>
          <Image img={user.img} size={100} />
          <div>
            <div class='text-2xl font-bold'>{user.name}</div>
            <div class='flex gap-4 items-end'>
              <div>
                <a href={`${FRONTEND}/${user.handle}`} target='_blank'>
                  {user.handle} ({email})
                </a>
              </div>
              <div>{user.id}</div>
              <div>{Utils.encodeHashId(user.id)}</div>
              {user.isVerified && <div class='badge'>Verified</div>}
            </div>
            <div class='flex gap-2 mt-2 items-center'>
              <div
                className={`badge badge-xl ${userScore.overallScore < 0 ? 'badge-error' : 'badge-success'}`}
              >
                {userScore.overallScore}
              </div>{' '}
              {Object.entries(signals).map(([name, ok]) => (
                <div
                  class={`badge badge-soft badge-${ok ? 'success' : 'error'}`}
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
        <h3 class='text-lg mt-4'>
          Allowed to claim up to{' '}
          <b>{rewardAmountRatio * userScore.overallScore} $AUDIO</b> per reward.
        </h3>
        <h2 class='text-xl font-bold mt-4'>Score Breakdown</h2>
        <table>
          <thead>
            <tr>
              <th class='text-left'>Play Count</th>
              <th class='text-left'>Follower Count</th>
              <th class='text-left'>Fast Challenge Count</th>
              <th class='text-left'>Following Count</th>
              <th class='text-left'>Chat Block Count</th>
              <th class='text-left'>Has Profile Picture</th>
              <th class='text-left'>Audius Impersonator</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class={userScore.playCount > 0 ? 'text-green-500' : ''}>
                {userScore.playCount}
              </td>
              <td class={userScore.followerCount > 0 ? 'text-green-500' : ''}>
                {userScore.followerCount}
              </td>
              <td class={userScore.challengeCount > 0 ? 'text-red-500' : ''}>
                {userScore.challengeCount}
              </td>
              <td
                class={
                  userScore.followingCount < 5
                    ? 'text-red-500'
                    : 'text-green-500'
                }
              >
                {userScore.followingCount}
              </td>
              <td
                class={
                  userScore.chatBlockCount > 0
                    ? 'text-red-500'
                    : 'text-green-500'
                }
              >
                {userScore.chatBlockCount}
              </td>
              <td
                class={
                  !userScore.hasProfilePicture
                    ? 'text-red-500'
                    : 'text-green-500'
                }
              >
                {userScore.hasProfilePicture.toString()}{' '}
                {!userScore.hasProfilePicture ? '(-100)' : ''}
              </td>
              <td
                class={
                  userScore.isAudiusImpersonator
                    ? 'text-red-500'
                    : 'text-green-500'
                }
              >
                {userScore.isAudiusImpersonator.toString()}
              </td>

              <td
                class={
                  userScore.shadowbanScore < 0
                    ? 'text-red-500'
                    : 'text-green-500'
                }
              >{`${userScore.shadowbanScore < 0 ? 'Shadowbanned' : 'Not shadowbanned'} from notifications.`}</td>
            </tr>
          </tbody>
        </table>
        <table>
          <thead>
            <tr>
              <th class='text-left'>Fingerprint Count</th>
              <th class='text-left'>Deliverable Email</th>
              <th class='text-left'>Override</th>
              <th class='text-left'>Overall Score</th>
            </tr>
          </thead>
          <tbody>
            <td class={userScore.fingerprintCount > 0 ? 'text-red-500' : ''}>
              {userScore.fingerprintCount}
            </td>
            <td class={!userScore.isEmailDeliverable ? 'text-red-500' : ''}>
              {userScore.isEmailDeliverable.toString()}
            </td>
            <td
              class={`${
                userScore.isBlocked
                  ? 'text-red-500'
                  : userScore.isBlocked === false
                    ? 'text-green-500'
                    : ''
              }`}
            >
              {userScore.isBlocked
                ? 'Blocked'
                : userScore.isBlocked === false
                  ? 'Allowed'
                  : 'N/A'}
            </td>
            <td
              class={
                userScore.overallScore >= 0 ? 'text-green-500' : 'text-red-500'
              }
            >
              {userScore.overallScore}
            </td>
            <td
              class={`
                ${userScore.overallScore < 0 ? 'text-red-500' : 'text-green-500'} flex items-center gap-4
              `}
            >
              {`${userScore.overallScore < 0 ? 'Blocked' : 'Not blocked'} from claiming and DMs.`}

              {userScore.overallScore < 0 ? (
                <form method='post' action='/attestation/unblock-user'>
                  <input type='hidden' name='handle' value={user.handle} />
                  <button
                    type='submit'
                    class={
                      'bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full text-xs cursor-pointer'
                    }
                  >
                    Unblock
                  </button>
                </form>
              ) : (
                <form method='post' action='/attestation/block-user'>
                  <input type='hidden' name='handle' value={user.handle} />
                  <button
                    type='submit'
                    class={
                      'bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full text-xs cursor-pointer'
                    }
                  >
                    Block
                  </button>
                </form>
              )}
            </td>
          </tbody>
        </table>

        <h2 class='text-xl font-bold mt-4'>Fingerprints</h2>
        <table>
          <thead>
            <tr>
              <th class='text-left'>Fingerprint</th>
              <th class='text-left'>User Count</th>
              <th class='text-left'>Users</th>
            </tr>
          </thead>
          <tbody>
            {fingerprints.map((f) => (
              <tr>
                <td>{f.fingerprint}</td>
                <td>{f.userCount}</td>
                <td class='flex gap-2'>
                  {f.userIds
                    .slice(0, 20)
                    .map((id) => fingerprintUsers.find((u) => u.id == id))
                    .filter(Boolean)
                    .map((u) => (
                      <a href={`/attestation/ui/user?q=${u!.handle}`}>
                        {u!.handle}
                      </a>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 class='text-xl font-bold mt-4'>Actions</h2>
        <table>
          {rows.map((r) => (
            <>
              {dateHeader(r.timestamp)}
              <tr>
                <td>{r.timestamp?.toLocaleTimeString()}</td>
                <td>{r.verb}</td>
                <td>{r.target}</td>
                <td>{renderDetails(r)}</td>
              </tr>
            </>
          ))}
        </table>
      </div>
      <style>{`
        th, td {
          padding: 10px;
        }
      `}</style>
    </Layout>
  )
})

app.get('/attestation/ui/recent-tips', async (c) => {
  const tips = await recentTips()

  let lastDate = ''
  function dateHeader(timestamp: Date) {
    const d = timestamp?.toDateString()
    if (d != lastDate) {
      lastDate = d
      return (
        <>
          <tr>
            <td colspan={4}>
              <div class='text-xl font-bold pt-2'>{d}</div>
            </td>
          </tr>
          <tr>
            <th>Timestamp</th>
            <th>Sender</th>
            <th>Receiver</th>
            <th>Amount</th>
          </tr>
        </>
      )
    }
    return null
  }

  return c.html(
    <Layout container>
      <h1 class='text-4xl font-bold mt-8'>Recent Tips</h1>
      <table class='table'>
        <tbody>
          {tips.map((tip) => (
            <>
              {dateHeader(tip.timestamp)}
              <tr>
                <td>{tip.timestamp.toLocaleTimeString()}</td>
                <td>
                  <a
                    href={`/attestation/ui/user?q=${encodeURIComponent(tip.sender.handle)}`}
                  >
                    {tip.sender.handle}
                  </a>
                </td>
                <td>
                  <a
                    href={`/attestation/ui/user?q=${encodeURIComponent(tip.receiver.handle)}`}
                  >
                    {tip.receiver.handle}
                  </a>
                </td>
                <td class='text-right'>{tip.amount / 100_000_000}</td>
              </tr>
            </>
          ))}
        </tbody>
      </table>
    </Layout>
  )
})

function renderDetails(row: ActionRow) {
  switch (row.target) {
    case 'track':
    case 'playlist': {
      const track = row.details as TrackDetails
      return (
        <div>
          {/* <Image img={track.img} /> */}
          <b>{track.title}</b>
        </div>
      )
    }
    case 'user': {
      const user = row.details as UserDetails
      return (
        <div class='flex gap-2'>
          {/* <Image img={user.img} /> */}
          {user.amount && <div>${user.amount / 100_000_000}</div>}
          <div class='font-bold'>
            <a href={`/attestation/ui/user?q=${user.handle}`}>{user.handle}</a>
          </div>
        </div>
      )
    }
    default:
      return <pre>{JSON.stringify(row.details)}</pre>
  }
}

function Image({ img, size }: { img: string; size?: number }) {
  size ||= 50
  if (!img)
    return (
      <div
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          background: '#efefef'
        }}
      ></div>
    )
  return (
    <img
      src={`${CONTENT_NODE}/content/${img}/150x150.jpg`}
      width={size}
      height={size}
    />
  )
}

type LayoutProps = {
  title?: string
  container?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any
}
function Layout(props: LayoutProps) {
  return (
    <html lang='en'>
      <head>
        <title>{props.title || 'AAO'}</title>
        <meta charset='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <meta name='color-scheme' content='light' />
        <link
          href='https://cdn.jsdelivr.net/npm/daisyui@5.0.0-beta.8/daisyui.css'
          rel='stylesheet'
          type='text/css'
        />
        <script src='https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4'></script>
      </head>
      <body>
        <main>
          <body>
            <div className='navbar bg-base-100 shadow-sm px-8 gap-4'>
              <div class='font-bold'>
                <a href='/attestation/ui'>AAO</a>
              </div>
              <form action='/attestation/ui/user'>
                <input
                  name='q'
                  type='search'
                  class='input'
                  autocomplete={'off'}
                  placeholder='Search user handle'
                />
              </form>
            </div>
            <div class={props.container ? 'container mx-auto' : ''}>
              {props.children}
            </div>
          </body>
        </main>
      </body>
    </html>
  )
}

const port = config.serverPort || 4200
serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`)
  }
)
