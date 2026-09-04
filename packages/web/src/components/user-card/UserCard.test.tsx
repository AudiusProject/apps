import { SquareSizes } from '@audius/common/models'
import { PROFILE_PAGE } from '@audius/common/src/utils/route'
import { Text } from '@audius/harmony'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, beforeAll, afterEach, afterAll } from 'vitest'

import { artistUser } from 'test/mocks/fixtures/users'
import { mockUsers } from 'test/msw/mswMocks'
import {
  RenderOptions,
  mswServer,
  render,
  screen,
  it,
  fireEvent,
  waitFor
} from 'test/test-utils'

import { UserCard } from './UserCard'

function renderUserCard(
  user: typeof artistUser & any,
  options?: RenderOptions
) {
  mswServer.use(mockUsers([user]))

  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path='/' element={<UserCard id={1} size='s' />} />
        <Route
          path={PROFILE_PAGE}
          element={<Text variant='heading'>Test User Page</Text>}
        />
      </Routes>
    </MemoryRouter>,
    { ...options, skipRouter: true }
  )
}

describe('UserCard', () => {
  beforeAll(() => {
    mswServer.listen()
  })

  afterEach(() => {
    mswServer.resetHandlers()
  })

  afterAll(() => {
    mswServer.close()
  })

  it('renders with a label comprising the display name, handle, and follower count', async () => {
    renderUserCard(artistUser)

    // Check for the individual elements instead of trying to match the full button label
    expect(await screen.findByText(artistUser.name)).toBeInTheDocument()
    expect(await screen.findByText(`@${artistUser.handle}`)).toBeInTheDocument()

    expect(await screen.findByText('1.23K Followers')).toBeInTheDocument()
  })

  it('navigates to the user page when clicked', async () => {
    renderUserCard(artistUser)
    const userCard = await screen.findByRole('button', { name: /test user/i })
    userCard.click()
    expect(
      await screen.findByRole('heading', { name: /test user page/i })
    ).toBeInTheDocument()
  })

  it('renders the profile picture', async () => {
    renderUserCard(artistUser)
    expect(await screen.findByRole('img')).toHaveAttribute(
      'src',
      `${artistUser.profile_picture['480x480']}`
    )
  })

  it('retries a mirror when the primary host fails to render', async () => {
    // A content node that answers /health_check but 502s on the blob still
    // gets handed out as the primary, so the avatar has to survive an <img>
    // error by moving to a mirror rather than latching the empty placeholder.
    const deadUrl =
      'https://dead-node.test/artist-user-image-profile-medium.jpg'
    renderUserCard({
      ...artistUser,
      profile_picture: {
        ...artistUser.profile_picture,
        [SquareSizes.SIZE_480_BY_480]: deadUrl
      }
    })

    fireEvent.error(await screen.findByRole('img'))

    await waitFor(async () => {
      const src = (await screen.findByRole('img')).getAttribute('src')
      expect(src).not.toMatch(/^data:/)
      expect(new URL(src!).hostname).toBe(
        new URL(artistUser.profile_picture.mirrors[0]).hostname
      )
    })
  })

  it('handles users with large follow counts correctly', async () => {
    renderUserCard({ ...artistUser, follower_count: 1000 })
    expect(await screen.findByText('1K Followers')).toBeInTheDocument()
  })
})
