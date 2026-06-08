import React from 'react'

import type { ID } from '@audius/common/models'

import { Button, Flex, IconCloudUpload } from '@audius/harmony-native'
import { useEnterContest } from 'app/hooks/useEnterContest'

const messages = {
  contestEnded: 'Contest Ended',
  contestDeadline: 'Contest Deadline',
  uploadRemixButtonText: 'Upload Your Remix'
}

type UploadRemixFooterProps = {
  trackId: ID
}

/**
 * Footer component for uploading remixes in the remix contest section
 */
export const UploadRemixFooter = ({ trackId }: UploadRemixFooterProps) => {
  const handlePressSubmitRemix = useEnterContest(trackId)

  return (
    <Flex
      borderTop='default'
      pv='l'
      ph='xl'
      alignItems='center'
      justifyContent='center'
    >
      <Button
        variant='secondary'
        size='small'
        iconLeft={IconCloudUpload}
        onPress={handlePressSubmitRemix}
        fullWidth
      >
        {messages.uploadRemixButtonText}
      </Button>
    </Flex>
  )
}
