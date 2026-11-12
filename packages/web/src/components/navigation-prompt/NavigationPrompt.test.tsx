import { Link, RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { fireEvent, render, screen, waitFor } from 'test/test-utils'

import { NavigationPrompt } from './NavigationPrompt'

const messages = {
  title: 'Discard upload?',
  body: 'Any changes you have made will be lost.',
  cancel: 'Cancel',
  proceed: 'Discard'
}

const renderAt = (blockInAppNavigation: boolean, when = true) => {
  const router = createMemoryRouter(
    [
      {
        path: '/upload',
        element: (
          <>
            <NavigationPrompt
              when={when}
              blockInAppNavigation={blockInAppNavigation}
              messages={messages}
            />
            <Link to='/hugs'>Go to profile</Link>
          </>
        )
      },
      { path: '/hugs', element: <div>Profile page</div> }
    ],
    { initialEntries: ['/upload'] }
  )
  render(<RouterProvider router={router} />, { skipRouter: true })
  return router
}

describe('NavigationPrompt', () => {
  it('asks before following an in-app link and stays on Cancel', async () => {
    const router = renderAt(true)
    fireEvent.click(screen.getByText('Go to profile'))

    expect(await screen.findByText(messages.title)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/upload')

    fireEvent.click(screen.getByRole('button', { name: messages.cancel }))
    await waitFor(() =>
      expect(screen.queryByText(messages.title)).not.toBeInTheDocument()
    )
    expect(router.state.location.pathname).toBe('/upload')
  })

  it('leaves the page on Discard', async () => {
    const router = renderAt(true)
    fireEvent.click(screen.getByText('Go to profile'))
    fireEvent.click(
      await screen.findByRole('button', { name: messages.proceed })
    )

    expect(await screen.findByText('Profile page')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/hugs')
  })

  it('lets in-app links through when only back/forward is guarded', async () => {
    renderAt(false)
    fireEvent.click(screen.getByText('Go to profile'))
    expect(await screen.findByText('Profile page')).toBeInTheDocument()
  })

  it('does nothing when there are no unsaved changes', async () => {
    renderAt(true, false)
    fireEvent.click(screen.getByText('Go to profile'))
    expect(await screen.findByText('Profile page')).toBeInTheDocument()
  })
})
