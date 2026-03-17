import {
  Divider,
  Flex,
  IconInfo,
  IconPencil,
  IconVisibilityPublic,
  Paper,
  Text
} from '@audius/harmony-native'

import { messages } from '../messages'

type PermissionsSectionProps = {
  scope: string | null
  userEmail: string | null
  /** Dashboard wallet connect/disconnect — write-once style, no persistent grant */
  tx?: string | null
  txParams?: { wallet: string } | null
}

export const PermissionsSection = ({
  scope,
  userEmail,
  tx,
  txParams
}: PermissionsSectionProps) => {
  const isDashboardWalletFlow =
    tx === 'disconnect_dashboard_wallet' && txParams?.wallet != null

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
              ) : (
                <IconVisibilityPublic color='default' width={16} height={16} />
              )}
              <Text variant='body' size='m' color='default'>
                {scope === 'write'
                  ? isDashboardWalletFlow
                    ? messages.disconnectWalletAccess
                    : messages.writeAccountAccess
                  : messages.readOnlyAccountAccess}
              </Text>
            </Flex>
            {isDashboardWalletFlow ? (
              txParams?.wallet ? (
                <Flex direction='row' gap='s'>
                  <Flex w={16} />
                  <Text variant='body' size='s' color='subdued'>
                    {txParams.wallet.slice(0, 6)}...{txParams.wallet.slice(-4)}
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

          {/* Account data row — not shown for dashboard wallet flow */}
          {!isDashboardWalletFlow && (
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
