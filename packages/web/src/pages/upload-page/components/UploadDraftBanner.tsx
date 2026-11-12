import { dayjs } from '@audius/common/utils'
import { Button, Flex, IconCloudUpload, Paper, Text } from '@audius/harmony'

import { getDraftTitle, UploadDraft } from '../store/utils/uploadDraft'

const messages = {
  title: 'Resume your upload?',
  description: (title: string, savedAt: string) =>
    title
      ? `"${title}" was saved as a draft ${savedAt}.`
      : `You have an upload draft saved ${savedAt}.`,
  resume: 'Resume',
  discard: 'Discard Draft'
}

type UploadDraftBannerProps = {
  draft: UploadDraft
  onResume: () => void
  onDiscard: () => void
}

export const UploadDraftBanner = ({
  draft,
  onResume,
  onDiscard
}: UploadDraftBannerProps) => {
  const savedAt = dayjs(draft.savedAt).calendar(null, {
    sameDay: '[today at] h:mm A',
    lastDay: '[yesterday at] h:mm A',
    lastWeek: '[on] dddd',
    sameElse: '[on] MMM D'
  })

  return (
    <Paper
      direction='row'
      alignItems='center'
      justifyContent='space-between'
      wrap='wrap'
      gap='l'
      p='l'
      mb='xl'
      role='region'
      aria-label={messages.title}
    >
      <Flex alignItems='center' gap='m'>
        <IconCloudUpload color='default' />
        <Flex direction='column' gap='xs'>
          <Text variant='title' size='m'>
            {messages.title}
          </Text>
          <Text variant='body' size='s' color='subdued'>
            {messages.description(getDraftTitle(draft), savedAt)}
          </Text>
        </Flex>
      </Flex>
      <Flex gap='s'>
        <Button variant='secondary' size='small' onClick={onDiscard}>
          {messages.discard}
        </Button>
        <Button variant='primary' size='small' onClick={onResume}>
          {messages.resume}
        </Button>
      </Flex>
    </Paper>
  )
}
