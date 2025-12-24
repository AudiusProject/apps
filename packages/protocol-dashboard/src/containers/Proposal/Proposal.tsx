import { useEffect, useState } from 'react'

import Markdown from 'react-markdown'
import { useParams } from 'react-router'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

import Loading from 'components/Loading'
import Page from 'components/Page'
import Paper from 'components/Paper'
import ProposalHero from 'components/ProposalHero'
import VotesTable from 'components/VotesTable'
import { decodeProposalCallData } from 'services/Audius/helpers'
import { IS_PRODUCTION } from 'services/Audius/setup'
import { useProposal } from 'store/cache/proposals/hooks'
import { useUserVote, useVotes } from 'store/cache/votes/hooks'
import { Outcome } from 'types'
import { createStyles } from 'utils/mobile'

import desktopStyles from './Proposal.module.css'
import mobileStyles from './ProposalMobile.module.css'

const styles = createStyles({ desktopStyles, mobileStyles })

const messages = {
  active: 'Active Proposal',
  resolved: 'Resolved Proposal',
  proposal: '',
  previousPage: 'All Proposals',
  descriptionTitle: 'Description',
  callDataTitle: 'Call Data',
  targetContract: 'Target Contract',
  function: 'Function',
  data: 'Data'
}

const getContractLink = (address: string) => {
  if (IS_PRODUCTION) {
    return `https://etherscan.io/address/${address}`
  }
  return `https://sepolia.etherscan.io/address/${address}`
}

const Proposal = () => {
  const { proposalId: proposalIdParam } = useParams<{ proposalId: string }>()
  const proposalId = parseInt(proposalIdParam, 10)
  const { proposal } = useProposal(proposalId)
  const { votesFor, votesAgainst } = useVotes(proposalId)
  const { userVote } = useUserVote(proposalId)
  const [callData, setCallData] = useState<string | null>(null)

  const title = proposal
    ? proposal.outcome === Outcome.InProgress
      ? messages.active
      : messages.resolved
    : messages.proposal

  useEffect(() => {
    if (proposal) {
      setCallData(decodeProposalCallData(proposal))
    }
  }, [proposal])

  return (
    <Page title={title}>
      <ProposalHero userVote={userVote} proposal={proposal} />
      <Paper className={styles.description}>
        <div className={styles.descriptionTitleContainer}>
          <div className={styles.descriptionTitle}>
            {messages.descriptionTitle}
          </div>
        </div>
        {proposal ? (
          <div className={styles.descriptionBody}>
            <Markdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                a: ({ node, ...props }) => (
                  <a {...props} target='_blank' rel='noopener noreferrer' />
                ),
                ul: ({ node, ...props }) => (
                  <ul
                    style={{
                      listStyleType: 'disc',
                      paddingLeft: '1.5rem',
                      marginLeft: '1rem',
                      marginBottom: '1rem'
                    }}
                    {...props}
                  />
                ),
                p: ({ node, ...props }) => (
                  <p style={{ marginBottom: '1rem' }} {...props} />
                )
              }}
            >
              {proposal.description || ''}
            </Markdown>
          </div>
        ) : (
          <Loading className={styles.loading} />
        )}
      </Paper>
      <Paper className={styles.description}>
        <div className={styles.callDataTitleContainer}>
          <div className={styles.callDataTitle}>{messages.callDataTitle}</div>
        </div>
        {proposal ? (
          <div className={styles.callDataBody}>
            <div className={styles.targetContract}>
              <p className={styles.callDataSectionHeader}>
                {messages.targetContract}
              </p>
              <p className={styles.callDataSectionBody}>
                <a
                  href={getContractLink(proposal.targetContractAddress)}
                  target='_blank'
                  rel='noreferrer'
                >
                  {proposal.targetContractAddress}
                </a>
              </p>
            </div>
            <div className={styles.function}>
              <p className={styles.callDataSectionHeader}>
                {messages.function}
              </p>
              <p className={styles.callDataSectionBody}>
                {proposal.functionSignature}
              </p>
            </div>
            <div className={styles.data}>
              <p className={styles.callDataSectionHeader}>{messages.data}</p>
              <p className={styles.callDataSectionBody}>{callData || ''}</p>
            </div>
          </div>
        ) : (
          <Loading className={styles.loading} />
        )}
      </Paper>
      <div className={styles.votes}>
        {<VotesTable title='For' votes={votesFor} />}
        {<VotesTable title='Against' votes={votesAgainst} />}
      </div>
    </Page>
  )
}

export default Proposal
