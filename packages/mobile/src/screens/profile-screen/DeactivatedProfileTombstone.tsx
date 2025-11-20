import { useCallback } from 'react'

import { route } from '@audius/common/utils'
import { useLinkTo } from '@react-navigation/native'

import { Button, Flex, IconArrowRight, Text } from '@audius/harmony-native'
import { makeStyles } from 'app/styles'

const { FEED_PAGE } = route

const messages = {
  helpText: 'This Account No Longer Exists',
  buttonText: 'Take Me Back To The Music'
}

const useStyles = makeStyles(({ spacing }) => ({
  container: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(6),
    alignItems: 'center'
  },
  text: {
    marginBottom: spacing(3),
    textAlign: 'center'
  },
  button: {
    width: '100%'
  }
}))

export const DeactivatedProfileTombstone = () => {
  const styles = useStyles()
  const linkTo = useLinkTo()

  const handlePress = useCallback(() => {
    linkTo(FEED_PAGE)
  }, [linkTo])

  return (
    <Flex style={styles.container}>
      <Text variant='body' strength='default' style={styles.text}>
        {messages.helpText}
      </Text>
      <Button
        variant='primary'
        fullWidth
        iconRight={IconArrowRight}
        onPress={handlePress}
        style={styles.button}
      >
        {messages.buttonText}
      </Button>
    </Flex>
  )
}

