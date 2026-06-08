import { useState, type KeyboardEvent } from 'react'

import {
  createKeyboardActivationHandler,
  ExpandableNavItem,
  HoverCardHeader,
  IconArrowRight,
  IconTokenAUDIO,
  IconTrending,
  Image,
  isKeyboardActivationKey,
  Modal,
  ModalHeader,
  ModalTitle,
  Paper,
  PopupMenu,
  removeHotkeys,
  setupHotkeys
} from '@audius/harmony'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, vi } from 'vitest'

import { TextLink as WebTextLink } from 'components/link/TextLink'
import { LeftNavLink } from 'components/nav/desktop/LeftNavLink'
import { fireEvent, render, screen, it, waitFor } from 'test/test-utils'

const createSpaceKeyDown = (target: Element) => {
  const event = new window.KeyboardEvent('keydown', {
    key: ' ',
    bubbles: true
  })
  Object.defineProperty(event, 'keyCode', { value: 32 })
  Object.defineProperty(event, 'target', { value: target })
  return event
}

describe('accessibility primitives', () => {
  let hotkeyHook: ((event: globalThis.KeyboardEvent) => void) | null = null

  afterEach(() => {
    if (hotkeyHook) {
      removeHotkeys(hotkeyHook)
      hotkeyHook = null
    }
  })

  describe('keyboard activation utility', () => {
    it('recognizes Enter, Space, and legacy Spacebar as activation keys', () => {
      expect(isKeyboardActivationKey({ key: 'Enter' })).toBe(true)
      expect(isKeyboardActivationKey({ key: ' ' })).toBe(true)
      expect(isKeyboardActivationKey({ key: 'Spacebar' })).toBe(true)
      expect(isKeyboardActivationKey({ key: 'Escape' })).toBe(false)
    })

    it('activates for keyboard activation keys only', () => {
      const handleActivate = vi.fn()
      render(
        <div
          role='button'
          tabIndex={0}
          onKeyDown={createKeyboardActivationHandler<HTMLDivElement>({
            onActivate: handleActivate
          })}
        >
          Activate utility
        </div>
      )

      const button = screen.getByRole('button', { name: 'Activate utility' })
      fireEvent.keyDown(button, { key: 'Enter' })
      fireEvent.keyDown(button, { key: ' ' })
      fireEvent.keyDown(button, { key: 'Spacebar' })
      fireEvent.keyDown(button, { key: 'Escape' })

      expect(handleActivate).toHaveBeenCalledTimes(3)
    })

    it('does not activate when disabled', () => {
      const handleActivate = vi.fn()
      render(
        <div
          role='button'
          tabIndex={0}
          onKeyDown={createKeyboardActivationHandler<HTMLDivElement>({
            onActivate: handleActivate,
            disabled: true
          })}
        >
          Disabled utility
        </div>
      )

      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })

      expect(handleActivate).not.toHaveBeenCalled()
    })

    it('runs custom key handling first and respects preventDefault', () => {
      const handleActivate = vi.fn()
      const handleKeyDown = vi.fn((event: KeyboardEvent<HTMLDivElement>) => {
        event.preventDefault()
      })
      render(
        <div
          role='button'
          tabIndex={0}
          onKeyDown={createKeyboardActivationHandler<HTMLDivElement>({
            onActivate: handleActivate,
            onKeyDown: handleKeyDown
          })}
        >
          Custom utility
        </div>
      )

      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })

      expect(handleKeyDown).toHaveBeenCalledTimes(1)
      expect(handleActivate).not.toHaveBeenCalled()
    })

    it('ignores descendant key events by default', () => {
      const handleActivate = vi.fn()
      render(
        <div
          role='button'
          aria-label='Parent utility'
          tabIndex={0}
          onKeyDown={createKeyboardActivationHandler<HTMLDivElement>({
            onActivate: handleActivate
          })}
        >
          <button type='button'>Nested action</button>
        </div>
      )

      fireEvent.keyDown(screen.getByRole('button', { name: 'Nested action' }), {
        key: 'Enter'
      })

      expect(handleActivate).not.toHaveBeenCalled()
    })
  })

  describe('Image', () => {
    it('renders a named image when alt text is provided', () => {
      render(<Image alt='Track artwork' src='track.jpg' />)

      expect(
        screen.getByRole('img', { name: 'Track artwork' })
      ).toBeInTheDocument()
    })

    it('hides decorative images from assistive technology', () => {
      render(<Image data-testid='dynamic-image' alt='' src='track.jpg' />)
      const image = screen.getByTestId('dynamic-image')

      expect(image).toHaveAttribute('aria-hidden', 'true')
      expect(image).not.toHaveAttribute('role')
      expect(image).not.toHaveAttribute('aria-label')
    })

    it('does not expose unnamed images as images', () => {
      render(<Image data-testid='dynamic-image' src='track.jpg' />)
      const image = screen.getByTestId('dynamic-image')

      expect(image).not.toHaveAttribute('role')
      expect(image).not.toHaveAttribute('aria-label')
      expect(image).not.toHaveAttribute('aria-hidden')
    })
  })

  describe('Paper', () => {
    it('activates interactive paper with Enter and Space', () => {
      const handleClick = vi.fn()
      const handleKeyDown = vi.fn()
      render(
        <Paper onClick={handleClick} onKeyDown={handleKeyDown}>
          Open details
        </Paper>
      )

      const paper = screen.getByRole('button', { name: /open details/i })
      fireEvent.keyDown(paper, { key: 'Enter' })
      fireEvent.keyDown(paper, { key: ' ' })

      expect(handleKeyDown).toHaveBeenCalledTimes(2)
      expect(handleClick).toHaveBeenCalledTimes(2)
    })

    it('does not activate when custom key handling prevents default', () => {
      const handleClick = vi.fn()
      const handleKeyDown = vi.fn((event: KeyboardEvent<HTMLDivElement>) => {
        event.preventDefault()
      })
      render(
        <Paper onClick={handleClick} onKeyDown={handleKeyDown}>
          Open details
        </Paper>
      )

      const paper = screen.getByRole('button', { name: /open details/i })
      fireEvent.keyDown(paper, { key: 'Enter' })

      expect(handleKeyDown).toHaveBeenCalledTimes(1)
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('does not activate from a focused nested control', () => {
      const handleClick = vi.fn()
      render(
        <Paper onClick={handleClick} aria-label='Parent paper'>
          <button type='button'>Nested action</button>
        </Paper>
      )

      const childButton = screen.getByRole('button', { name: 'Nested action' })
      fireEvent.keyDown(childButton, { key: 'Enter' })
      fireEvent.keyDown(childButton, { key: ' ' })

      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Modal', () => {
    const ModalFocusExample = () => {
      const [isOpen, setIsOpen] = useState(false)

      return (
        <>
          <button type='button' onClick={() => setIsOpen(true)}>
            Open modal
          </button>
          <button type='button'>Page action</button>
          <Modal
            modalKey='accessibility-test-modal'
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
          >
            <ModalHeader>
              <ModalTitle title='Dialog title' />
            </ModalHeader>
            <button type='button'>First modal action</button>
            <button type='button'>Last modal action</button>
          </Modal>
        </>
      )
    }

    it('moves focus into the dialog and keeps tab focus inside', async () => {
      render(<ModalFocusExample />)

      const openButton = screen.getByRole('button', { name: 'Open modal' })
      openButton.focus()
      fireEvent.click(openButton)

      const dialog = await screen.findByRole('dialog', {
        name: 'Dialog title'
      })
      expect(dialog).toHaveAttribute('aria-modal', 'true')

      const dismissButton = screen.getByRole('button', {
        name: 'dismiss dialog'
      })
      const lastButton = screen.getByRole('button', {
        name: 'Last modal action'
      })

      await waitFor(() => expect(dismissButton).toHaveFocus())

      lastButton.focus()
      fireEvent.keyDown(lastButton, { key: 'Tab' })
      expect(dismissButton).toHaveFocus()

      fireEvent.keyDown(dismissButton, { key: 'Tab', shiftKey: true })
      expect(lastButton).toHaveFocus()
    })
  })

  describe('ExpandableNavItem', () => {
    it('activates with Enter and Space', () => {
      const handleClick = vi.fn()
      render(<ExpandableNavItem label='Playlists' onClick={handleClick} />)

      const button = screen.getByRole('button', {
        name: 'Playlists navigation section'
      })
      fireEvent.keyDown(button, { key: 'Enter' })
      fireEvent.keyDown(button, { key: ' ' })

      expect(handleClick).toHaveBeenCalledTimes(2)
    })
  })

  describe('HoverCardHeader', () => {
    it('gives the detail and close actions distinct labels', () => {
      render(
        <HoverCardHeader
          iconLeft={IconTokenAUDIO}
          iconRight={IconArrowRight}
          title='Gold Badge'
          onClick={vi.fn()}
          onClose={vi.fn()}
        />
      )

      expect(
        screen.getByRole('button', { name: 'View Gold Badge details' })
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    })
  })

  describe('LeftNavLink', () => {
    it('keeps desktop nav links in the tab order', () => {
      render(
        <MemoryRouter>
          <LeftNavLink
            to='/trending'
            leftIcon={IconTrending}
            restriction='none'
          >
            Trending
          </LeftNavLink>
        </MemoryRouter>,
        { skipRouter: true }
      )

      const link = screen.getByRole('link', { name: 'Trending' })

      expect(link).toHaveAttribute('href', '/trending')
      expect(link).toHaveAttribute('tabindex', '0')

      link.focus()
      expect(link).toHaveFocus()
    })

    it('does not manually activate nav links with Space', () => {
      const handleClick = vi.fn()
      render(
        <MemoryRouter>
          <LeftNavLink
            to='/trending'
            leftIcon={IconTrending}
            restriction='none'
            onClick={handleClick}
          >
            Trending
          </LeftNavLink>
        </MemoryRouter>,
        { skipRouter: true }
      )

      fireEvent.keyDown(screen.getByRole('link', { name: 'Trending' }), {
        key: ' '
      })

      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('TextLink', () => {
    it('does not manually activate links with Space', () => {
      const handleClick = vi.fn()
      render(
        <MemoryRouter>
          <WebTextLink to='/tracks/test' onClick={handleClick}>
            Track
          </WebTextLink>
        </MemoryRouter>,
        { skipRouter: true }
      )

      fireEvent.keyDown(screen.getByRole('link', { name: 'Track' }), {
        key: ' '
      })

      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('PopupMenu', () => {
    it('focuses menu items and activates them with the keyboard', async () => {
      const handleDelete = vi.fn()
      render(
        <PopupMenu
          items={[
            { text: 'Edit', onClick: vi.fn() },
            { text: 'Delete', onClick: handleDelete }
          ]}
          renderTrigger={(ref, triggerPopup, triggerProps) => (
            <button ref={ref} onClick={() => triggerPopup()} {...triggerProps}>
              More
            </button>
          )}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'More' }))

      const editItem = await screen.findByRole('menuitem', { name: 'Edit' })
      const deleteItem = await screen.findByRole('menuitem', {
        name: 'Delete'
      })

      await waitFor(() => expect(editItem).toHaveFocus())
      expect(deleteItem).toHaveAttribute('tabIndex', '0')

      fireEvent.keyDown(editItem, { key: 'ArrowDown' })
      expect(deleteItem).toHaveFocus()

      fireEvent.keyDown(deleteItem, { key: 'Enter' })
      expect(handleDelete).toHaveBeenCalledTimes(1)
    })
  })

  describe('global hotkeys', () => {
    it('fires from the page shell', () => {
      let calls = 0
      hotkeyHook = setupHotkeys(
        {
          32: () => {
            calls += 1
          }
        },
        0
      )
      render(
        <main role='main' tabIndex={-1}>
          App shell
        </main>
      )

      const main = screen.getByRole('main')
      main.focus()
      hotkeyHook?.(createSpaceKeyDown(main))

      expect(calls).toBe(1)
    })

    it('fires from ordinary focused containers', () => {
      let calls = 0
      hotkeyHook = setupHotkeys(
        {
          32: () => {
            calls += 1
          }
        },
        0
      )
      render(<div tabIndex={0}>App surface</div>)

      const surface = screen.getByText('App surface')
      surface.focus()
      hotkeyHook?.(createSpaceKeyDown(surface))

      expect(calls).toBe(1)
    })

    it('does not intercept focused buttons', () => {
      let calls = 0
      hotkeyHook = setupHotkeys(
        {
          32: () => {
            calls += 1
          }
        },
        0
      )
      render(<button type='button'>Play</button>)

      const button = screen.getByRole('button', { name: 'Play' })
      button.focus()
      hotkeyHook?.(createSpaceKeyDown(button))

      expect(calls).toBe(0)
    })

    it('does not intercept focused role buttons', () => {
      let calls = 0
      hotkeyHook = setupHotkeys(
        {
          32: () => {
            calls += 1
          }
        },
        0
      )
      render(
        <div role='button' tabIndex={0}>
          Open
        </div>
      )

      const button = screen.getByRole('button', { name: 'Open' })
      button.focus()
      hotkeyHook?.(createSpaceKeyDown(button))

      expect(calls).toBe(0)
    })

    it('does not intercept focused links or selects', () => {
      let calls = 0
      hotkeyHook = setupHotkeys(
        {
          32: () => {
            calls += 1
          }
        },
        0
      )
      render(
        <>
          <a href='/track'>Track</a>
          <select aria-label='Sort'>
            <option>Newest</option>
          </select>
        </>
      )

      const link = screen.getByRole('link', { name: 'Track' })
      link.focus()
      hotkeyHook?.(createSpaceKeyDown(link))

      const select = screen.getByRole('combobox', { name: 'Sort' })
      select.focus()
      hotkeyHook?.(createSpaceKeyDown(select))

      expect(calls).toBe(0)
    })
  })
})
