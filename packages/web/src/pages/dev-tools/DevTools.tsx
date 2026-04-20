import { modalsActions, useCoinSuccessModal } from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  Box,
  Button,
  Flex,
  IconSettings,
  IconSolana,
  IconShieldCheck,
  IconDashboard,
  IconFanClub,
  IconUser,
  Paper,
  Text,
  makeResponsiveStyles
} from '@audius/harmony'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router'

import { Header } from 'components/header/desktop/Header'
import { Page } from 'components/page/Page'
import { env } from 'services/env'

import { messages } from './messages'

const { USER_ID_PARSER_PAGE } = route

type DevToolCardProps = {
  icon: React.ElementType
  title: string
  description: string
  buttonText: string
  onButtonClick: () => void
  buttonDisabled?: boolean
}

/**
 * Dev Tools page - only available in development environment
 * This page contains tools and utilities for developers to test and debug the application
 */

export const useDevToolCardStyles = makeResponsiveStyles(({ theme }) => ({
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

const DevToolCard = (props: DevToolCardProps) => {
  const {
    icon: Icon,
    title,
    description,
    buttonText,
    onButtonClick,
    buttonDisabled
  } = props
  const styles = useDevToolCardStyles()

  return (
    <Paper
      direction='column'
      alignItems='flex-start'
      gap='l'
      p='l'
      css={styles.root}
    >
      <Flex alignItems='center' gap='m'>
        <Icon size='l' color='default' />
        <Text variant='title' size='l'>
          {title}
        </Text>
      </Flex>
      <Text variant='body'>{description}</Text>
      <Button
        variant='secondary'
        fullWidth
        onClick={onButtonClick}
        disabled={buttonDisabled}
      >
        {buttonText}
      </Button>
    </Paper>
  )
}

const COIN_SUCCESS_MODAL_PREVIEW_DATA = {
  mint: 'DLJDqsFSgA94QUuFjTbQtEu3oP3mLS1AAAAAAAAAAAAAAAA',
  name: 'Breadcrumb The Golden',
  ticker: 'BRED',
  logoUri: 'https://picsum.photos/seed/audiuscoin/200/200',
  amountUi: '2,612.2151391',
  amountUsd: '2,134.67'
} as const

export const DevTools = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { onOpen: openCoinSuccessModal } = useCoinSuccessModal()

  const handleOpenFeatureFlags = () => {
    dispatch(
      modalsActions.setVisibility({
        modal: 'FeatureFlagOverride',
        visible: true
      })
    )
  }

  const ensureDevModeEnabledInProduction = () => {
    const key = 'enable-dev-mode-01-21-2025'
    if (env.ENVIRONMENT === 'production' && !localStorage.getItem(key)) {
      localStorage.setItem(key, 'true')
    }
  }

  const handleOpenConfirmerPreview = () => {
    ensureDevModeEnabledInProduction()
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'c', keyCode: 67, bubbles: true })
    )
  }

  const handleOpenSolanaTools = () => {
    navigate('/dev-tools/solana')
  }

  const handleOpenAAOUI = () => {
    window.open('https://discoveryprovider.audius.co/attestation/ui', '_blank')
  }

  const handleOpenHealthzDashboard = () => {
    window.open('https://healthz.audius.co/', '_blank')
  }

  const handleOpenUserIdParser = () => {
    navigate(USER_ID_PARSER_PAGE)
  }

  const handleOpenCoinSuccessModalPreview = () => {
    openCoinSuccessModal({ ...COIN_SUCCESS_MODAL_PREVIEW_DATA })
  }

  return (
    <Page
      title={messages.pageTitle}
      description={messages.pageDescription}
      header={<Header primary={messages.pageTitle} />}
    >
      <Box p='l'>
        <Flex
          direction='row'
          wrap='wrap'
          gap='xl'
          justifyContent='flex-start'
          css={{
            width: '100%'
          }}
        >
          <DevToolCard
            icon={IconSettings}
            title={messages.featureFlagsTitle}
            description={messages.featureFlagsDescription}
            buttonText={messages.featureFlagsButton}
            onButtonClick={handleOpenFeatureFlags}
          />

          <DevToolCard
            icon={IconSettings}
            title={messages.confirmerPreviewTitle}
            description={messages.confirmerPreviewDescription}
            buttonText={messages.confirmerPreviewButton}
            onButtonClick={handleOpenConfirmerPreview}
          />

          <DevToolCard
            icon={IconSolana}
            title={messages.solanaToolsTitle}
            description={messages.solanaToolsDescription}
            buttonText={messages.solanaToolsButton}
            onButtonClick={handleOpenSolanaTools}
          />

          <DevToolCard
            icon={IconShieldCheck}
            title={messages.aaoTitle}
            description={messages.aaoDescription}
            buttonText={messages.aaoButton}
            onButtonClick={handleOpenAAOUI}
          />

          <DevToolCard
            icon={IconDashboard}
            title={messages.healthzTitle}
            description={messages.healthzDescription}
            buttonText={messages.healthzButton}
            onButtonClick={handleOpenHealthzDashboard}
          />

          <DevToolCard
            icon={IconUser}
            title={messages.userIdParserTitle}
            description={messages.userIdParserDescription}
            buttonText={messages.userIdParserButton}
            onButtonClick={handleOpenUserIdParser}
          />

          <DevToolCard
            icon={IconFanClub}
            title={messages.coinSuccessModalPreviewTitle}
            description={messages.coinSuccessModalPreviewDescription}
            buttonText={messages.coinSuccessModalPreviewButton}
            onButtonClick={handleOpenCoinSuccessModalPreview}
          />
        </Flex>
      </Box>
    </Page>
  )
}

export default DevTools
