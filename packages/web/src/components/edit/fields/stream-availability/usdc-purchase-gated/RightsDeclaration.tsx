import { useCallback } from 'react'

import { Box, Checkbox, Flex, Text } from '@audius/harmony'
import { css } from '@emotion/react'
import { useField } from 'formik'

import { IS_OWNED_BY_USER } from '../../types'

const messages = {
  publishingRights: {
    checkboxLabel: 'Direct Publishing Payments',
    confirmationText:
      'In order to receive direct publishing payments from Audius, I hereby confirm:',
    bulletPoints: [
      'I own all publishing rights to this music, including performance rights',
      'I am not registered with a Performing Rights Organization or collection society'
    ]
  }
}

export const RightsDeclaration = () => {
  const [
    { value: isFullyOwnedByUser },
    _ignored1,
    { setValue: setIsFullyOwnedByUser }
  ] = useField<boolean>(IS_OWNED_BY_USER)

  const handleBoxClick = useCallback(() => {
    setIsFullyOwnedByUser(!isFullyOwnedByUser)
  }, [isFullyOwnedByUser, setIsFullyOwnedByUser])

  return (
    <Box onClick={handleBoxClick}>
      <Flex alignItems='center' justifyContent='flex-start' mb='s' gap='xs'>
        <Checkbox name={IS_OWNED_BY_USER} checked={!!isFullyOwnedByUser} />
        <Text variant='title'>{messages.publishingRights.checkboxLabel}</Text>
      </Flex>
      <Text variant='body'>{messages.publishingRights.confirmationText}</Text>
      <Box as='ul' ml='l' p='s' css={css({ listStyleType: 'disc' })}>
        {messages.publishingRights.bulletPoints.map((point, index) => (
          <Box as='li' key={index}>
            <Text variant='body'>{point}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
