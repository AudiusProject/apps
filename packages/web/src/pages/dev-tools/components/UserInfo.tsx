import { useUser } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { Box, Flex, Paper, Text, makeResponsiveStyles } from '@audius/harmony'

export const useUserInfoStyles = makeResponsiveStyles(({ theme }) => ({
  root: {
    mobile: {
      width: '100%',
      minWidth: '300px',
      maxWidth: '100%'
    },
    base: {
      width: `calc(50% - ${theme.spacing.xl / 2}px)`,
      maxWidth: `calc(50% - ${theme.spacing.xl / 2}px)`,
      minWidth: 0
    }
  },
  jsonContainer: {
    backgroundColor: theme.color.neutral.n50,
    border: `1px solid ${theme.color.neutral.n100}`,
    borderRadius: theme.cornerRadius.m,
    padding: theme.spacing.l,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    overflow: 'visible',
    boxSizing: 'border-box'
  },
  jsonText: {
    fontFamily:
      '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Consolas", monospace',
    fontSize: '13px',
    lineHeight: '1.6',
    wordBreak: 'break-all',
    overflowWrap: 'break-word',
    maxWidth: '100%',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    margin: 0,
    color: theme.color.neutral.n800
  }
}))

type UserInfoProps = {
  userId: ID | null
}

const formatUserData = (user: any): string => {
  const cleanUser = {
    user_id: user.user_id,
    handle: user.handle,
    name: user.name,
    bio: user.bio,
    location: user.location,
    is_verified: user.is_verified,
    is_deactivated: user.is_deactivated,
    follower_count: user.follower_count,
    followee_count: user.followee_count,
    track_count: user.track_count,
    playlist_count: user.playlist_count,
    album_count: user.album_count,
    profile_picture: user.profile_picture,
    cover_photo: user.cover_photo,
    wallet: user.wallet,
    associated_wallets: user.associated_wallets,
    created_at: user.created_at,
    updated_at: user.updated_at
  }

  const jsonString = JSON.stringify(cleanUser, null, 4)

  let result = jsonString
    // Escape HTML characters first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const lines = result.split('\n')
  const processedLines = lines.map((line) => {
    const leadingSpaces = (line.match(/^ */) || [''])[0].length
    const indentLevel = Math.floor(leadingSpaces / 4)
    const content = line.trim()

    if (content === '') return '<div></div>'

    const paddingLeft = indentLevel * 2
    return `<div style="padding-left: ${paddingLeft}em; text-indent: -${paddingLeft}em; margin-left: ${paddingLeft}em;">${content}</div>`
  })

  result = processedLines.join('')

  result = result.replace(
    /"([^"]+)":/g,
    '<span style="color: #0066cc; font-weight: 600; word-break: break-all; overflow-wrap: break-word;">"$1"</span>:'
  )

  result = result.replace(
    /:\s*"([^"]*)"/g,
    ': <span style="color: #008000; word-break: break-all; overflow-wrap: break-word;">"$1"</span>'
  )

  result = result.replace(
    /:\s*(true|false)(?=\s*[,\n\r}])/g,
    ': <span style="color: #d73a49; font-weight: 600; word-break: break-all; overflow-wrap: break-word;">$1</span>'
  )

  result = result.replace(
    /:\s*(\d+)(?=\s*[,\n\r}])/g,
    ': <span style="color: #6f42c1; font-weight: 600; word-break: break-all; overflow-wrap: break-word;">$1</span>'
  )

  result = result.replace(
    /:\s*(null)(?=\s*[,\n\r}])/g,
    ': <span style="color: #6a737d; font-style: italic; word-break: break-all; overflow-wrap: break-word;">$1</span>'
  )

  return result
}

export const UserInfo = ({ userId }: UserInfoProps) => {
  const styles = useUserInfoStyles()
  const { data: user, isLoading, error } = useUser(userId ?? undefined)

  if (!userId) {
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
            User Information
          </Text>
        </Flex>
        <Text variant='body' color='subdued'>
          Parse a user ID to see user information here.
        </Text>
      </Paper>
    )
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
          User Information
        </Text>
      </Flex>

      {isLoading && <Text variant='body'>Loading user data...</Text>}

      {error && (
        <Text variant='body' color='danger'>
          Error loading user: {error.message}
        </Text>
      )}

      {user && (
        <Box css={styles.jsonContainer}>
          <div
            css={styles.jsonText}
            style={{
              userSelect: 'text',
              WebkitUserSelect: 'text',
              MozUserSelect: 'text',
              msUserSelect: 'text',
              cursor: 'text'
            }}
            dangerouslySetInnerHTML={{ __html: formatUserData(user) }}
          />
        </Box>
      )}

      {!user && !isLoading && !error && (
        <Text variant='body' color='subdued'>
          No user found with ID: {userId}
        </Text>
      )}
    </Paper>
  )
}
