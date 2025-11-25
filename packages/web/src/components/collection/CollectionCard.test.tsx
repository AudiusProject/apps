import { PROFILE_PAGE, TRACK_PAGE } from '@audius/common/src/utils/route'
import { Text } from '@audius/harmony'
import { developmentConfig } from '@audius/sdk'
import { setupServer } from 'msw/node'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, expect, beforeAll, afterEach, afterAll } from 'vitest'

import { testCollection } from 'test/mocks/fixtures/collections'
import { mockCollectionById } from 'test/msw/mswMocks'
import { render, screen, it } from 'test/test-utils'

import { CollectionCard } from './CollectionCard'

const { apiEndpoint } = developmentConfig.network
const server = setupServer()

const renderCollectionCard = (collection: typeof testCollection & any) => {
  server.use(mockCollectionById(collection))

  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path='/' element={<CollectionCard id={1} size='s' />} />
        <Route
          path={TRACK_PAGE}
          element={<Text variant='heading'>Test Collection Page</Text>}
        />
        <Route
          path={PROFILE_PAGE}
          element={<Text variant='heading'>Test User Page</Text>}
        />
      </Routes>
    </MemoryRouter>,
    { skipRouter: true }
  )
}

describe('CollectionCard', () => {
  beforeAll(() => {
    server.listen()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  it('renders a button with the label comprising the collection and artist name, and favorites and reposts', async () => {
    renderCollectionCard(testCollection)

    expect(
      await screen.findByRole('button', {
        name: /test collection test user reposts 10 favorites 5/i
      })
    ).toBeInTheDocument()
  })

  it('navigates to collection page when clicked', async () => {
    renderCollectionCard(testCollection)

    const collectionCard = await screen.findByRole('button', {
      name: /test collection/i
    })

    collectionCard.click()

    expect(
      await screen.findByRole('heading', { name: /test collection page/i })
    ).toBeInTheDocument()
  })

  it('renders the cover image', async () => {
    renderCollectionCard(testCollection)

    expect(await screen.findByTestId('cover-art-1')).toHaveAttribute(
      'src',
      `${apiEndpoint}/image-collection-medium.jpg`
    )
  })

  it('renders the collection owner link which navigates to user page', async () => {
    renderCollectionCard(testCollection)

    const userLink = await screen.findByRole('link', {
      name: 'Test User'
    })
    userLink.click()

    expect(
      await screen.findByRole('heading', { name: /test user page/i })
    ).toBeInTheDocument()
  })

  it('hidden collections are show as hidden', async () => {
    renderCollectionCard({ ...testCollection, is_private: true })

    expect(
      await screen.findByRole('button', {
        name: /test collection test user hidden/i
      })
    ).toBeInTheDocument()
  })

  it('premium locked collections are rendered correctly', async () => {
    renderCollectionCard({
      ...testCollection,
      access: { stream: false },
      stream_conditions: {
        usdc_purchase: { price: 10, albumTrackPrice: 1, splits: {} }
      }
    })

    expect(
      await screen.findByRole('button', {
        name: /test collection test user reposts 10 favorites 5 available for purchase/i
      })
    ).toBeInTheDocument()
  })

  it('premium unlocked collections are rendered correctly', async () => {
    renderCollectionCard({
      ...testCollection,
      access: { stream: true, download: true },
      stream_conditions: {
        usdc_purchase: { price: 10, albumTrackPrice: 1, splits: {} }
      }
    })

    expect(
      await screen.findByRole('button', {
        name: /test collection test user reposts 10 favorites 5 purchased/i
      })
    ).toBeInTheDocument()
  })

  it('premium collections owned by user are rendered correctly', async () => {
    renderCollectionCard({
      ...testCollection,
      playlist_owner_id: 2 // Same as current user
    })

    expect(
      await screen.findByRole('button', {
        name: 'Test Collection Test User Reposts 10 Favorites 5'
      })
    ).toBeInTheDocument()
  })
})
