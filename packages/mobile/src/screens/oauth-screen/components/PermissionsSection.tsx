import {
  Divider,
  Flex,
  IconInfo,
  IconPencil,
  IconVisibilityPublic,
  IconWallet,
  Paper,
  Text
} from '@audius/harmony-native'

import { messages } from '../messages'

type PermissionsSectionProps = {
  scope: string | null
  userEmail: string | null
  /** wallet address for write_once/disconnect flows */
  wallet?: string | null
}

export const PermissionsSection = ({
  scope,
  userEmail,
  wallet
}: PermissionsSectionProps) => {
  const isWriteOnce = scope === 'write_once'

  return (
    <Flex direction='column' gap='s'>
      <Text variant='body' size='m' color='subdued'>
        {messages.permissionsRequestedHeader}
      </Text>
      <Paper shadow='flat' backgroundColor='white' borderRadius='s'>
        <Flex pv='l' direction='column' gap='l'>
          {/* Access level */}
          <Flex direction='column' gap='xs'>
            <Flex direction='row' gap='s' alignItems='center'>
              {scope === 'write' ? (
                <IconPencil color='default' width={16} height={16} />
              ) : isWriteOnce ? (
                <IconWallet color='default' width={16} height={16} />
              ) : (
                <IconVisibilityPublic color='default' width={16} height={16} />
              )}
              <Text variant='body' size='m' color='default'>
                {scope === 'write'
                  ? messages.writeAccountAccess
                  : isWriteOnce
                    ? messages.disconnectWalletAccess
                    : messages.readOnlyAccountAccess}
              </Text>
            </Flex>
            {isWriteOnce ? (
              wallet ? (
                <Flex direction='row' gap='s'>
                  <Flex w={16} />
                  <Text variant='body' size='s' color='subdued'>
                    {wallet.slice(0, 6)}...{wallet.slice(-4)}
                  </Text>
                </Flex>
              ) : null
            ) : (
              <Flex direction='row' gap='s'>
                <Flex w={16} />
                <Text variant='body' size='s' color='subdued' flexShrink={1}>
                  {scope === 'write'
                    ? messages.writeAccessGrants
                    : messages.readOnlyGrants}
                </Text>
              </Flex>
            )}
          </Flex>

          {/* Account data row — not shown for write_once */}
          {!isWriteOnce && (
            <>
              <Divider />
              <Flex direction='row' gap='s' alignItems='center'>
                <IconInfo color='default' width={16} height={16} />
                <Text variant='body' size='m' color='default' flexShrink={1}>
                  {messages.yourAccountData}
                </Text>
              </Flex>
            </>
          )}
        </Flex>
      </Paper>
    </Flex>
  )
}
