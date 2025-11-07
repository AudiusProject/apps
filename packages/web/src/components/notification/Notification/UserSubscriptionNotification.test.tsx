import { Notification as NotificationObjectType } from '@audius/common/store'
import { Text } from '@audius/harmony'
import { Routes, Route } from 'react-router-dom-v5-compat'
import { describe, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'

import { mockNotification } from 'test/mocks/fixtures/notifications'
import { testTrack } from 'test/mocks/fixtures/tracks'
import { artistUser } from 'test/mocks/fixtures/users'
import { mockUsers, mockTracks } from 'test/msw/mswMocks'
import { mswServer, render, screen, it } from 'test/test-utils'

import { Notification } from './Notification'

const renderNotification = (notification: NotificationObjectType) => {
  mswServer.use(mockUsers([artistUser]), mockTracks([testTrack]))

  return render(
    <Routes>
      <Route path='/' element={<Notification notification={notification} />} />
      <Route
        path={testTrack.permalink}
        element={<Text variant='heading'>{testTrack.title} page</Text>}
      />
    </Routes>
  )
}

describe('UserSubscriptionNotification', () => {
  beforeAll(() => {
    mswServer.listen()
  })

  afterEach(() => {
    mswServer.resetHandlers()
    vi.clearAllMocks()
  })

  afterAll(() => {
    mswServer.close()
  })

  it('renders notification and links to track page correctly', async () => {
    renderNotification(mockNotification)

    // Check that the notification title is rendered
    expect(await screen.findByText('New Release')).toBeInTheDocument()

    // Check that the artist's name is rendered
    expect(await screen.findByText(artistUser.name)).toBeInTheDocument()

    // Check for the time label in the footer
    expect(
      await screen.findByText(mockNotification.timeLabel!)
    ).toBeInTheDocument()

    // Check that the track link with the title in it is rendered
    const trackLink = await screen.findByText(testTrack.title)
    expect(trackLink).toBeInTheDocument()

    // Click the link and check that it goes to the correct page
    trackLink.click()
    expect(
      await screen.findByText(`${testTrack.title} page`)
    ).toBeInTheDocument()
  })
})
