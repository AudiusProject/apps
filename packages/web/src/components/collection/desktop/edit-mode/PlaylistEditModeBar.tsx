import { Button, Flex, Text, useTheme } from '@audius/harmony'

import { usePlaylistEditMode } from './PlaylistEditModeContext'

const messages = {
  pending: 'You have unsaved changes',
  conflictTitle: 'Out of date',
  conflictBody:
    'Someone else updated this playlist while you were editing it. Reload to start over.',
  apply: 'Apply',
  discard: 'Discard',
  reload: 'Reload'
}

export const PlaylistEditModeBar = () => {
  const { color } = useTheme()
  const { isEditMode, hasChanges, status, apply, discard, resolveConflict } =
    usePlaylistEditMode()

  if (!isEditMode) return null

  if (status === 'conflict') {
    return (
      <Flex
        css={{
          position: 'sticky',
          bottom: 0,
          zIndex: 5,
          backgroundColor: color.background.surface1,
          borderTop: `1px solid ${color.border.strong}`,
          boxShadow: '0 -4px 10px rgba(0,0,0,0.08)'
        }}
        p='l'
        gap='xl'
        alignItems='center'
        justifyContent='space-between'
      >
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
      </Flex>
    )
  }

  if (!hasChanges && status !== 'saving') {
    // Still in edit mode but no pending changes — show a slim bar with Discard
    // (which exits edit mode).
    return (
      <Flex
        css={{
          position: 'sticky',
          bottom: 0,
          zIndex: 5,
          backgroundColor: color.background.surface1,
          borderTop: `1px solid ${color.border.strong}`
        }}
        p='m'
        gap='m'
        alignItems='center'
        justifyContent='flex-end'
      >
        <Button variant='secondary' size='small' onClick={discard}>
          {messages.discard}
        </Button>
        <Button variant='primary' size='small' disabled>
          {messages.apply}
        </Button>
      </Flex>
    )
  }

  return (
    <Flex
      css={{
        position: 'sticky',
        bottom: 0,
        zIndex: 5,
        backgroundColor: color.background.surface1,
        borderTop: `1px solid ${color.border.strong}`,
        boxShadow: '0 -4px 10px rgba(0,0,0,0.08)'
      }}
      p='l'
      gap='xl'
      alignItems='center'
      justifyContent='space-between'
    >
      <Text variant='body' strength='strong'>
        {messages.pending}
      </Text>
      <Flex gap='m'>
        <Button
          variant='secondary'
          onClick={discard}
          disabled={status === 'saving'}
        >
          {messages.discard}
        </Button>
        <Button
          variant='primary'
          onClick={apply}
          isLoading={status === 'saving'}
          disabled={status === 'saving'}
        >
          {messages.apply}
        </Button>
      </Flex>
    </Flex>
  )
}
