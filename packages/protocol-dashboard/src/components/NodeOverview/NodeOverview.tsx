import { ReactNode } from 'react'

import { Box, Flex, Text } from '@audius/harmony'
import { ButtonType } from '@audius/stems'
import clsx from 'clsx'

import IconValidationCheck from 'assets/img/iconValidationCheck.svg'
import IconWarning from 'assets/img/iconWarning.svg'
import Button from 'components/Button'
import { Card } from 'components/Card/Card'
import {
  AppliedInfoTooltipProps,
  NodeOperatorInfoTooltip
} from 'components/InfoTooltip/InfoTooltips'
import Loading from 'components/Loading'
import { DelegateInfo } from 'components/ManageAccountCard/ManageAccountCard'
import ModifyServiceModal from 'components/ModifyServiceModal'
import RegisterServiceModal from 'components/RegisterServiceModal'
import useNodeHealth from 'hooks/useNodeHealth'
import { Address, ServiceType } from 'types'
import { useModalControls } from 'utils/hooks'
import { createStyles } from 'utils/mobile'

import desktopStyles from './NodeOverview.module.css'
import mobileStyles from './NodeOverviewMobile.module.css'

const styles = createStyles({ desktopStyles, mobileStyles })

const messages = {
  dp: 'Discovery Node',
  cn: 'Content Node',
  unknown: 'Unknown',
  version: 'Version',
  deregistered: 'Deregistered',
  endpoint: 'Endpoint',
  operator: 'Node Operator',
  nodeWalletAddress: 'Node Wallet Address',
  register: 'Register Service',
  modify: 'Manage Node',
  health: 'Health',
  errors: 'Errors',
  uptime: 'Uptime',
  diskHealth: 'Disk Health',
  dbHealth: 'Database Health',
  healthyPeers2m: 'Healthy Peers',
  chain: 'Audius Chain',
  peerReachability: 'Peer Reachability',
  uploadsCountErr: 'Error Reading Uploads Count',
  seedingDataLabel: 'Seeding Data',
  failedFetch: 'Failed to fetch health data',
  peerReachabilityWarning: 'Check firewall and connection to/from peers',
  checkDiskWarning: 'Check disk/mount',
  seedingDataText: 'Awaiting completion',
  uptimeWarning: 'Failed to determine when the server last restarted',
  pending: 'Loading...'
}

type ServiceDetailProps = {
  label: string
  value: ReactNode
  tooltipComponent?: React.ComponentType<AppliedInfoTooltipProps>
}

const ServiceDetail = ({
  label,
  value,
  tooltipComponent
}: ServiceDetailProps) => {
  const TooltipComponent = tooltipComponent
  return (
    <div className={styles.descriptor}>
      <Text variant='heading' size='s'>
        {value}
      </Text>
      <Flex inline gap='xs' alignItems='center'>
        <Text variant='body' size='m' strength='strong' color='subdued'>
          {label}
        </Text>
        {TooltipComponent == null ? null : <TooltipComponent color='subdued' />}
      </Flex>
    </div>
  )
}

const TextWithIcon = ({ text, icon }: { text: string; icon: ReactNode }) => {
  return (
    <div className={styles.textWithIcon}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.text}>{text}</div>
    </div>
  )
}

type NodeOverviewProps = {
  spID?: number
  serviceType: ServiceType
  version?: string
  endpoint: string
  operatorWallet: Address
  delegateOwnerWallet?: Address
  isOwner?: boolean
  isDeregistered?: boolean
  isUnregistered?: boolean
  isLoading?: boolean
}

const NodeOverview = ({
  spID,
  serviceType,
  version,
  endpoint,
  operatorWallet,
  delegateOwnerWallet,
  isOwner,
  isDeregistered,
  isUnregistered,
  isLoading
}: NodeOverviewProps) => {
  const { isOpen, onClick, onClose } = useModalControls()
  const { health, status, error } = useNodeHealth(endpoint, serviceType)

  let healthDetails = null
  if (status === 'pending') {
    healthDetails = (
      <ServiceDetail
        label={messages.health}
        value={<TextWithIcon icon={<Loading />} text={messages.pending} />}
      />
    )
  } else if (status === 'error') {
    healthDetails = (
      <ServiceDetail
        label={messages.health}
        value={
          <TextWithIcon
            icon={<IconWarning />}
            text={`${messages.failedFetch}: ${error}`}
          />
        }
      />
    )
  } else {
    healthDetails = (
      <>
        {/* First, display unhealthy aspects */}
        {health?.otherErrors && (
          <ServiceDetail
            label={messages.errors}
            value={
              <TextWithIcon
                icon={<IconWarning />}
                text={health.otherErrors.join(', ')}
              />
            }
          />
        )}
        {!health?.diskGbSize && (
          <ServiceDetail
            label={messages.diskHealth}
            value={
              <TextWithIcon
                icon={<IconWarning />}
                text={messages.checkDiskWarning}
              />
            }
          />
        )}
        {health?.dbSizeErr && (
          <ServiceDetail
            label={messages.dbHealth}
            value={
              <TextWithIcon
                icon={<IconWarning />}
                text={`Failed to read database usage: ${health?.dbSizeErr}`}
              />
            }
          />
        )}
        {health?.uploadsCountErr && (
          <ServiceDetail
            label={messages.uploadsCountErr}
            value={
              <TextWithIcon
                icon={<IconWarning />}
                text={health?.uploadsCountErr}
              />
            }
          />
        )}
        {health?.isSeeding && (
          <ServiceDetail
            label={messages.seedingDataLabel}
            value={
              <TextWithIcon
                icon={<IconWarning />}
                text={messages.seedingDataText}
              />
            }
          />
        )}
        {health?.failsPeerReachability && (
          <ServiceDetail
            label={messages.peerReachability}
            value={
              <TextWithIcon
                icon={<IconWarning />}
                text={messages.peerReachabilityWarning}
              />
            }
          />
        )}
        {!health?.startedAt && (
          <ServiceDetail
            label={messages.uptime}
            value={
              <TextWithIcon
                icon={<IconWarning />}
                text={messages.uptimeWarning}
              />
            }
          />
        )}

        {/* Then, display high-level details of healthy aspects */}
        {health?.startedAt && (
          <ServiceDetail
            label={messages.uptime}
            value={
              <TextWithIcon
                icon={<>{timeSince(health.startedAt)}</>}
                text={`(${health.startedAt.toLocaleString()})`}
              />
            }
          />
        )}
        {health?.healthyPeers2m && (
          <ServiceDetail
            label={messages.healthyPeers2m}
            value={`${health?.healthyPeers2m} in the last 2 minutes`}
          />
        )}
        {health?.diskGbSize && (
          <ServiceDetail
            label={messages.diskHealth}
            value={
              <TextWithIcon
                icon={<IconValidationCheck />}
                text={`${health.diskGbUsed} / ${health.diskGbSize} GB used`}
              />
            }
          />
        )}
        {health?.dbGbUsed !== null && health?.dbGbUsed !== undefined && (
          <ServiceDetail
            label={messages.dbHealth}
            value={
              <TextWithIcon
                icon={<IconValidationCheck />}
                text={`${health?.dbGbUsed} GB used`}
              />
            }
          />
        )}
      </>
    )
  }

  return (
    <Card direction='column' p='xl' w='100%'>
      {isLoading ? (
        <Loading className={styles.loading} />
      ) : (
        <Flex gap='l' wrap='wrap' css={{ overflow: 'scroll' }}>
          <Box pv='s' ph='l'>
            <Text variant='heading' size='s'>
              {isDeregistered
                ? messages.deregistered
                : health?.version || version || messages.unknown}
            </Text>
            <Text variant='body' size='m' strength='strong' color='subdued'>
              {messages.version}
            </Text>
          </Box>
          <Box pv='s' ph='l'>
            <ServiceDetail label={messages.endpoint} value={endpoint} />
            {(delegateOwnerWallet || health?.delegateOwnerWallet) && (
              <ServiceDetail
                label={messages.nodeWalletAddress}
                value={delegateOwnerWallet || health.delegateOwnerWallet}
              />
            )}
            {operatorWallet || health?.operatorWallet ? (
              <Card pv='l' ph='xl' mb='xl'>
                <Flex direction='column' gap='l'>
                  <Flex inline gap='xs' alignItems='center'>
                    <Text
                      variant='body'
                      size='l'
                      color='subdued'
                      strength='strong'
                    >
                      {messages.operator}
                    </Text>
                    <NodeOperatorInfoTooltip color='subdued' />
                  </Flex>
                  <DelegateInfo
                    longFormat
                    wallet={operatorWallet || health?.operatorWallet}
                  />
                </Flex>
              </Card>
            ) : null}
            {healthDetails}
          </Box>
          <Flex
            pv='s'
            ph='l'
            w='100%'
            gap='l'
            direction='column'
            alignItems='flex-end'
          >
            {!isDeregistered && isUnregistered && (
              <Box>
                <Button
                  onClick={onClick}
                  type={ButtonType.PRIMARY}
                  text={messages.register}
                  textClassName={styles.registerBtnText}
                />
                <RegisterServiceModal
                  isOpen={isOpen}
                  onClose={onClose}
                  defaultDelegateOwnerWallet={
                    delegateOwnerWallet || health?.delegateOwnerWallet || ''
                  }
                  defaultEndpoint={endpoint}
                />
              </Box>
            )}
            {!isDeregistered && isOwner && (
              <Box>
                <Button
                  onClick={onClick}
                  type={ButtonType.PRIMARY}
                  text={messages.modify}
                  className={clsx(styles.modifyBtn)}
                  textClassName={styles.modifyBtnText}
                />
                <ModifyServiceModal
                  isOpen={isOpen}
                  onClose={onClose}
                  spID={spID}
                  serviceType={serviceType}
                  endpoint={endpoint}
                  delegateOwnerWallet={health?.delegateOwnerWallet}
                />
              </Box>
            )}
          </Flex>
        </Flex>
      )}
    </Card>
  )
}

export function RelTime({ date }: { date: Date | string }) {
  if (!date) return null
  if (typeof date === 'string') {
    date = new Date(date)
  }
  return (
    <span title={date.toLocaleString()}>
      <b>{timeSince(date)}</b> ago
    </span>
  )
}

export function timeSince(date: Date) {
  if (!date || date.toString() === '0001-01-01T00:00:00Z') return null
  if (typeof date === 'string') {
    date = new Date(date)
  }
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  return secondsToReadableDuration(seconds)
}

export function nanosToReadableDuration(nanos: number) {
  const seconds = nanos / 1e9 // Convert nanoseconds to seconds
  return secondsToReadableDuration(seconds)
}

function secondsToReadableDuration(seconds: number) {
  let interval = seconds / 31536000
  if (interval >= 1) {
    const val = Math.floor(interval)
    return val + (val > 1 ? ' years' : ' year')
  }
  interval = seconds / 2592000
  if (interval >= 1) {
    const val = Math.floor(interval)
    return val + (val > 1 ? ' months' : 'month')
  }
  interval = seconds / 86400
  if (interval >= 1) {
    const val = Math.floor(interval)
    return val + (val > 1 ? ' days' : ' day')
  }
  interval = seconds / 3600
  if (interval >= 1) {
    const val = Math.floor(interval)
    return val + (val > 1 ? ' hours' : ' hour')
  }
  interval = seconds / 60
  if (interval >= 1) {
    const val = Math.floor(interval)
    return val + (val > 1 ? ' minutes' : 'minute')
  }
  return Math.floor(seconds) + ' seconds'
}

export default NodeOverview
