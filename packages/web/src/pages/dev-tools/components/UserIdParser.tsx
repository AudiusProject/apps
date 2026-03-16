import { useState, useEffect } from 'react'

import {
  Box,
  Button,
  Flex,
  Paper,
  Text,
  TextInput,
  makeResponsiveStyles
} from '@audius/harmony'
import { HashId, encodeHashId } from '@audius/sdk/services'

export const useUserIdParserStyles = makeResponsiveStyles(({ theme }) => ({
  root: {
    mobile: {
      width: '100%',
      minWidth: '300px'
    },
    base: {
      width: `calc(50% - ${theme.spacing.xl / 2}px)`
    }
  }
}))

type UserIdParserProps = {
  onParsedIdChange?: (parsedId: number | null) => void
}

export const UserIdParser = ({ onParsedIdChange }: UserIdParserProps) => {
  const [inputValue, setInputValue] = useState('')
  const [parsedId, setParsedId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Reverse parser state
  const [reverseInputValue, setReverseInputValue] = useState('')
  const [encodedId, setEncodedId] = useState<string | null>(null)
  const [reverseError, setReverseError] = useState<string | null>(null)

  const styles = useUserIdParserStyles()

  useEffect(() => {
    onParsedIdChange?.(parsedId)
  }, [parsedId, onParsedIdChange])

  const handleInputChange = (value: string) => {
    setInputValue(value)
    // Clear any previous errors when typing
    if (error) setError(null)
  }

  const handleReverseInputChange = (value: string) => {
    setReverseInputValue(value)
    // Clear any previous errors when typing
    if (reverseError) setReverseError(null)
  }

  const handleSubmit = () => {
    if (!inputValue.trim()) {
      setError('Please enter a hash ID')
      setParsedId(null)
      return
    }

    try {
      const id = HashId.parse(inputValue.trim())
      setParsedId(id)
      setError(null)

      // Auto-populate the reverse input with the parsed numeric ID
      setReverseInputValue(id.toString())
      setEncodedId(inputValue.trim())
      setReverseError(null)
    } catch (err) {
      setError('Invalid hash ID format')
      setParsedId(null)
    }
  }

  const handleReverseSubmit = () => {
    if (!reverseInputValue.trim()) {
      setReverseError('Please enter a numeric ID')
      setParsedId(null)
      return
    }

    try {
      const numericId = parseInt(reverseInputValue.trim(), 10)
      if (isNaN(numericId) || numericId < 0) {
        setReverseError('Please enter a valid positive number')
        setParsedId(null)
        return
      }

      const hashId = encodeHashId(numericId)
      if (hashId === null) {
        setReverseError('Error encoding ID')
        setParsedId(null)
        return
      }

      // Set the parsed ID for user loading and auto-populate the forward input
      setParsedId(numericId)
      setReverseError(null)
      setInputValue(hashId)
      setEncodedId(hashId)
      setError(null)
    } catch (err) {
      setReverseError('Error with numeric ID')
      setParsedId(null)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  const handleReverseKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleReverseSubmit()
    }
  }

  return (
    <Paper
      direction='column'
      alignItems='flex-start'
      gap='l'
      p='l'
      css={styles.root}
    >
      <Flex alignItems='center' gap='m'>
        <Text variant='title' size='l'>
          User ID Parser
        </Text>
      </Flex>
      <Text variant='body'>Convert between hash IDs and numeric user IDs.</Text>

      {/* Forward parser: Hash ID -> Numeric ID */}
      <Flex direction='column' gap='m' css={{ width: '100%' }}>
        <Text variant='body' strength='strong'>
          Hash ID → Numeric ID
        </Text>
        <TextInput
          label='Hash ID'
          placeholder='Enter hash ID (e.g., 12345)'
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyPress}
        />

        <Button variant='primary' fullWidth onClick={handleSubmit}>
          Load User Info
        </Button>

        {parsedId !== null && (
          <Box>
            <Text variant='body' strength='strong'>
              Parsed User ID:
            </Text>
            <Text variant='body'>{parsedId}</Text>
          </Box>
        )}

        {error && (
          <Box>
            <Text variant='body' color='danger'>
              {error}
            </Text>
          </Box>
        )}
      </Flex>

      {/* Reverse parser: Numeric ID -> Hash ID */}
      <Flex direction='column' gap='m' css={{ width: '100%' }}>
        <Text variant='body' strength='strong'>
          Numeric ID → Hash ID
        </Text>
        <TextInput
          label='Numeric ID'
          placeholder='Enter numeric ID (e.g., 1234567)'
          value={reverseInputValue}
          onChange={(e) => handleReverseInputChange(e.target.value)}
          onKeyDown={handleReverseKeyPress}
        />

        <Button variant='secondary' fullWidth onClick={handleReverseSubmit}>
          Load User Info
        </Button>

        {encodedId !== null && (
          <Box>
            <Text variant='body' strength='strong'>
              Encoded Hash ID:
            </Text>
            <Text variant='body'>{encodedId}</Text>
          </Box>
        )}

        {reverseError && (
          <Box>
            <Text variant='body' color='danger'>
              {reverseError}
            </Text>
          </Box>
        )}
      </Flex>
    </Paper>
  )
}
