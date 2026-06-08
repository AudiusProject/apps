import { ReactNode } from 'react'

import { Button, Flex, Text, useTheme } from '@audius/harmony'

import { usePortal } from 'hooks/usePortal'
import { useMainContentRef } from 'pages/MainContentContext'

import { usePlaylistEditMode } from './PlaylistEditModeContext'

const messages = {
  pending: 'You have unsaved changes',
  createPrompt: 'Finish setting up your playlist',
  conflictTitle: 'Out of date',
  conflictBody:
    'Someone else updated this playlist while you were editing it. Reload to start over.',
  apply: 'Apply',
  create: 'Create',
  discard: 'Discard',
  cancel: 'Cancel',
  reload: 'Reload'
}

const AnchoredBar = ({ children }: { children: ReactNode }) => {
  const { color } = useTheme()
  // Portal out of the main content wrapper — its `transform` creates a
  // containing block that breaks position:fixed relative to the viewport.
  // Anchor to the app shell so the bar sits above the play bar and inherits
  // the --nav-width / --play-bar-height vars.
  const mainContentRef = useMainContentRef()
  const Portal = usePortal({
    container: mainContentRef.current?.parentElement ?? undefined
  })

  return (
    <Portal>
      <Flex
        css={{
          position: 'fixed',
          bottom: 'var(--play-bar-height)',
          left: 'var(--nav-width)',
          width: 'calc(100% - var(--nav-width))',
          zIndex: 11,
          backgroundColor: color.background.surface1,
          borderTop: `1px solid ${color.border.strong}`,
          boxShadow: '0 -4px 10px rgba(0,0,0,0.08)'
        }}
        p='l'
        gap='xl'
        alignItems='center'
        justifyContent='space-between'
      >
        {children}
      </Flex>
    </Portal>
  )
}

export const PlaylistEditModeBar = () => {
  const {
    isEditMode,
    isCreate,
    hasChanges,
    canApply,
    status,
    apply,
    discard,
    resolveConflict
  } = usePlaylistEditMode()

  if (!isEditMode) return null

  if (status === 'conflict') {
    return (
      <>
        {/* Reserve space so the fixed bar never covers page content */}
        <div css={{ height: 80 }} />
        <AnchoredBar>
          <Flex direction='column' gap='xs'>
            <Text variant='title' size='m' color='danger'>
              {messages.conflictTitle}
            </Text>
            <Text variant='body' color='subdued'>
              {messages.conflictBody}
            </Text>
          </Flex>
          <Button
            variant='primary'
            onClick={() => {
              resolveConflict()
              window.location.reload()
            }}
          >
            {messages.reload}
          </Button>
        </AnchoredBar>
      </>
    )
  }

  const isSaving = status === 'saving'

  return (
    <>
      <div css={{ height: 80 }} />
      <AnchoredBar>
        <Text variant='body' strength='strong'>
          {isCreate
            ? messages.createPrompt
            : hasChanges
              ? messages.pending
              : ''}
        </Text>
        <Flex gap='m'>
          <Button variant='secondary' onClick={discard} disabled={isSaving}>
            {isCreate ? messages.cancel : messages.discard}
          </Button>
          <Button
            variant='primary'
            onClick={apply}
            isLoading={isSaving}
            disabled={isSaving || !canApply}
          >
            {isCreate ? messages.create : messages.apply}
          </Button>
        </Flex>
      </AnchoredBar>
    </>
  )
}
