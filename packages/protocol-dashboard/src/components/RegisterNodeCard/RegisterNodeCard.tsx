import { useEffect, useState } from 'react'

import { Box, Flex, Text } from '@audius/harmony'

import { Card } from 'components/Card/Card'
import { InfoBox } from 'components/InfoBox/InfoBox'
import { StorageCommitmentInfoTooltip } from 'components/InfoTooltip/InfoTooltips'
import Loading from 'components/Loading'
import { RegisterNewServiceBtn } from 'components/ManageService/RegisterNewServiceBtn'
import { useAccount } from 'store/account/hooks'
import { useCurrentVersion } from 'store/cache/protocol/hooks'
import { ServiceType } from 'types'
import { formatBytes } from 'utils/format'
import { REGISTER_NODE_DOCS_URL } from 'utils/routes'

const messages = {
  registerNode: 'Register a Node',
  registerNodeInfo:
    'Node operators run the decentralized infrastructure that powers the Open Audio Protocol.  To learn more about running a node, please read the docs.',
  registerNodeInfoLink: 'Running a Node',
  storageCommitment: 'Storage Commitment',
  currentVersion: 'Current Version',
  registerNodeCta: 'Register Node'
}

const VALIDATOR_NODE = import.meta.env.VITE_VALIDATOR

export const RegisterNodeCard = () => {
  const { isLoggedIn } = useAccount()
  const [storageCommitment, setStorageCommitment] = useState<string | null>(
    null
  )
  const currentVersion = useCurrentVersion(ServiceType.Validator)

  useEffect(() => {
    const fetchStorageCommitment = async () => {
      try {
        const response = await fetch(
          `${VALIDATOR_NODE}/storage.v1.StorageService/GetStatus`
        )
        const {
          data: { storageExpectation }
        } = await response.json()
        setStorageCommitment(storageExpectation)
      } catch (e) {
        setStorageCommitment('Error')
      }
    }
    fetchStorageCommitment()
  }, [])

  return (
    <Card direction='column'>
      <Flex
        pv='xl'
        ph='xl'
        borderBottom='default'
        justifyContent='space-between'
        alignItems='center'
        wrap='wrap'
        gap='l'
      >
        <Box>
          <Text variant='heading' size='s'>
            {messages.registerNode}
          </Text>
        </Box>
        {isLoggedIn ? (
          <Box>
            <RegisterNewServiceBtn />
          </Box>
        ) : null}
      </Flex>
      <Flex ph='xl' pv='l' gap='xl' column>
        <InfoBox
          description={messages.registerNodeInfo}
          ctaText={messages.registerNodeInfoLink}
          ctaHref={REGISTER_NODE_DOCS_URL}
        />
        <Flex alignItems='center' gap='xl'>
          <Card p='xl' direction='column'>
            <Box>
              {storageCommitment == null ? (
                <Box mb='xs'>
                  <Loading />
                </Box>
              ) : (
                <Text variant='heading' size='s' strength='default'>
                  {currentVersion}
                </Text>
              )}
            </Box>
            <Flex gap='xs' alignItems='center'>
              <Text variant='body' size='m' strength='strong' color='subdued'>
                {messages.currentVersion}
              </Text>
            </Flex>
          </Card>
          <Card p='xl' direction='column'>
            <Box>
              {storageCommitment == null ? (
                <Box mb='xs'>
                  <Loading />
                </Box>
              ) : (
                <Text variant='heading' size='s' strength='default'>
                  {formatBytes(parseInt(storageCommitment, 10))}
                </Text>
              )}
            </Box>
            <Flex gap='xs' alignItems='center'>
              <Text variant='body' size='m' strength='strong' color='subdued'>
                {messages.storageCommitment}
              </Text>
              <StorageCommitmentInfoTooltip color='subdued' />
            </Flex>
          </Card>
        </Flex>
      </Flex>
    </Card>
  )
}
