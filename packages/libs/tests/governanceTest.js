const assert = require('assert')

const time = require('@openzeppelin/test-helpers/src/time')
const nock = require('nock')

const { AudiusLibs } = require('../src/AudiusLibs')
const { Vote } = require('../src/services/ethContracts/GovernanceClient')

const { initializeLibConfig, convertAudsToWeiBN } = require('./helpers')
const helpers = require('./helpers')

const { audiusInstance: audius0, getRandomLocalhost } = helpers

let audius1
let audius2
let accounts = null
let web3 = null
let toBN = null
let sp1
let sp2
const DEFAULT_STAKE = 210000
const PROPOSAL_DESCRIPTION = 'TestDescription'
const PROPOSAL_NAME = 'TestName'
const testServiceType = 'discovery-provider'

const setupAccounts = async () => {
  await audius0.init()
  web3 = audius0.ethWeb3Manager.getWeb3()
  toBN = web3.utils.toBN
  accounts = await web3.eth.getAccounts()
  sp1 = accounts[1]
  sp2 = accounts[2]
  const libsConf1 = await initializeLibConfig(sp1)
  const libsConf2 = await initializeLibConfig(sp2)
  audius1 = new AudiusLibs(libsConf1)
  audius2 = new AudiusLibs(libsConf2)

  await Promise.all([audius1.init(), audius2.init()])

  const inittedLibs = [audius0, audius1, audius2]
  const defaultStake = convertAudsToWeiBN(
    audius0.ethWeb3Manager.getWeb3(),
    DEFAULT_STAKE
  )
  for (const lib of inittedLibs) {
    const testEndpoint = getRandomLocalhost()
    nock(testEndpoint)
      .get('/health_check?allow_unregistered=true')
      .reply(200, {
        data: {
          service: testServiceType,
          version: '0.0.1'
        }
      })

    await lib.ethContracts.ServiceProviderFactoryClient.register(
      testServiceType,
      testEndpoint,
      defaultStake
    )
  }
}

const cleanupAccounts = async () => {
  try {
    await helpers.deregisterSPEndpoint(audius1, sp1, testServiceType)
    await helpers.deregisterSPEndpoint(audius2, sp2, testServiceType)
  } catch (e) {
    console.error(e)
    // no-op -- was already registered
  }
}

const createProposal = () => {
  const targetContractRegistryKey = web3.utils.utf8ToHex('DelegateManager')

  const callValue = web3.utils.toWei('0', 'ether')
  const functionSignature = 'slash(uint256,address)'
  const slashAmount = web3.utils.toWei('500', 'ether')
  const targetAddress = accounts[1]
  const callData = [slashAmount, targetAddress]
  const description = PROPOSAL_DESCRIPTION
  const name = PROPOSAL_NAME

  return {
    targetContractRegistryKey,
    callValue,
    functionSignature,
    callData,
    name,
    description
  }
}

const submitProposal = async () => {
  const proposal = createProposal()
  return audius0.ethContracts.GovernanceClient.submitProposal(proposal)
}

const evaluateProposal = async (id, shouldVote = true) => {
  if (shouldVote) {
    const voteYes = Vote.yes
    await audius0.ethContracts.GovernanceClient.submitVote({
      proposalId: id,
      vote: voteYes
    })
  }

  const currentBlock = (await web3.eth.getBlock('latest')).number
  const desired = currentBlock + 20
  await time.advanceBlockTo(desired)

  await audius0.ethContracts.GovernanceClient.evaluateProposalOutcome(id)
}

describe('Governance tests', function () {
  this.timeout(5000)

  before(async function () {
    await setupAccounts()
    await audius0.ethContracts.GovernanceClient.setVotingPeriod(10)
    await audius0.ethContracts.GovernanceClient.setExecutionDelay(10)
  })

  afterEach(async function () {
    const ids =
      await audius0.ethContracts.GovernanceClient.getInProgressProposals()
    for (const id of ids) {
      await evaluateProposal(id, false)
    }
  })

  after(async function () {
    await cleanupAccounts()
  })

  it('Submits a proposal successfully', async function () {
    const id = await submitProposal()
    assert.ok(id >= 0)
  })

  it('Gets submitted proposal by ID', async function () {
    const id = await submitProposal()
    const proposal =
      await audius0.ethContracts.GovernanceClient.getProposalById(id)

    assert.equal(proposal.proposalId, id)
  })

  it('Votes on proposals', async function () {
    const id = await submitProposal()

    const voteYes = Vote.yes
    await audius0.ethContracts.GovernanceClient.submitVote({
      proposalId: id,
      vote: voteYes
    })
    const proposal =
      await audius0.ethContracts.GovernanceClient.getProposalById(id)
    const bnZero = toBN(0)
    assert.ok(proposal.voteMagnitudeNo.eq(bnZero))
    assert.ok(proposal.voteMagnitudeYes.gt(bnZero))

    const voteNo = Vote.no
    await audius0.ethContracts.GovernanceClient.updateVote({
      proposalId: id,
      vote: voteNo
    })
    const proposal2 =
      await audius0.ethContracts.GovernanceClient.getProposalById(id)
    assert.ok(proposal2.voteMagnitudeYes.eq(bnZero))
    assert.ok(proposal2.voteMagnitudeNo.gt(bnZero))
  })

  it('Queries for votes', async function () {
    const id = await submitProposal()
    const proposal =
      await audius0.ethContracts.GovernanceClient.getProposalById(id)
    const queryStartBlock = proposal.submissionBlockNumber
    const voteYes = Vote.yes
    await audius0.ethContracts.GovernanceClient.submitVote({
      proposalId: id,
      vote: voteYes
    })
    const votes = await audius0.ethContracts.GovernanceClient.getVotes({
      proposalId: id,
      queryStartBlock
    })
    assert.equal(votes.length, 1)
    assert.equal(votes[0].vote, 2)

    const voteNo = Vote.no
    await audius0.ethContracts.GovernanceClient.updateVote({
      proposalId: id,
      vote: voteNo
    })
    const updateVotes =
      await audius0.ethContracts.GovernanceClient.getVoteUpdates({
        proposalId: id,
        queryStartBlock
      })
    assert.equal(updateVotes.length, 1)
    assert.equal(updateVotes[0].vote, 1)
  })

  it('Gets in progress proposals', async function () {
    const id = await submitProposal()
    const inProgressIds =
      await audius0.ethContracts.GovernanceClient.getInProgressProposals()
    assert.equal(inProgressIds.length, 1)
    assert.equal(inProgressIds[0], id)

    await evaluateProposal(id)
    const inProgressIds2 =
      await audius0.ethContracts.GovernanceClient.getInProgressProposals()
    assert.equal(inProgressIds2.length, 0)
  })

  it('Gets all proposals', async function () {
    const blockNumber = await audius0.ethWeb3Manager
      .getWeb3()
      .eth.getBlockNumber()

    const id = await submitProposal()
    const inProgressIds =
      await audius0.ethContracts.GovernanceClient.getProposals(blockNumber)
    assert.equal(inProgressIds.length, 1)
    assert.equal(inProgressIds[0].proposalId, id)

    await evaluateProposal(id)
    const inProgressIds2 =
      await audius0.ethContracts.GovernanceClient.getProposals(blockNumber)
    assert.equal(inProgressIds.length, 1)
    assert.equal(inProgressIds[0].proposalId, id)
  })

  it('Gets a proposal evaluation', async function () {
    const blockNumber = await audius0.ethWeb3Manager
      .getWeb3()
      .eth.getBlockNumber()

    const id = await submitProposal()
    await evaluateProposal(id)
    const evaluation =
      await audius0.ethContracts.GovernanceClient.getProposalEvaluation(id)
    assert.equal(evaluation.length, 1)
    assert.equal(evaluation[0].returnValues._numVotes, '1')
  })

  it('Gets a proposal submisson', async function () {
    const blockNumber = await audius0.ethWeb3Manager
      .getWeb3()
      .eth.getBlockNumber()

    const id = await submitProposal()
    const submission =
      await audius0.ethContracts.GovernanceClient.getProposalSubmission(id)
    assert.equal(submission.description, PROPOSAL_DESCRIPTION)
    assert.equal(submission.name, PROPOSAL_NAME)
  })

  it('Gets votes by address', async function () {
    const id = await submitProposal()
    const proposal =
      await audius0.ethContracts.GovernanceClient.getProposalById(id)
    const queryStartBlock = proposal.submissionBlockNumber

    const voteYes = Vote.yes
    const voteNo = Vote.no
    await audius1.ethContracts.GovernanceClient.submitVote({
      proposalId: id,
      vote: voteYes
    })
    await audius2.ethContracts.GovernanceClient.submitVote({
      proposalId: id,
      vote: voteNo
    })

    await audius1.ethContracts.GovernanceClient.updateVote({
      proposalId: id,
      vote: voteNo
    })
    await audius2.ethContracts.GovernanceClient.updateVote({
      proposalId: id,
      vote: voteYes
    })

    const account1Submissions =
      await audius0.ethContracts.GovernanceClient.getVoteSubmissionsByAddress({
        addresses: [accounts[1]],
        queryStartBlock
      })
    const account2Updates =
      await audius0.ethContracts.GovernanceClient.getVoteUpdatesByAddress({
        addresses: [accounts[2]],
        queryStartBlock
      })

    assert.equal(account1Submissions.length, 1)
    assert.equal(account1Submissions[0].voter, accounts[1])
    assert.equal(account2Updates.length, 1)
    assert.equal(account2Updates[0].voter, accounts[2])
  })

  it('Gets Quorum Percent', async function () {
    const percent =
      await audius0.ethContracts.GovernanceClient.getVotingQuorumPercent()
    assert.ok(typeof percent === 'number')
  })

  it('Gets voting period', async function () {
    const period = await audius0.ethContracts.GovernanceClient.getVotingPeriod()
    assert.ok(typeof period === 'number')
  })

  it('Gets execution delay', async function () {
    const delay =
      await audius0.ethContracts.GovernanceClient.getExecutionDelay()
    assert.ok(typeof delay === 'number')
  })

  it('Gets target contract hash', async function () {
    const id = await submitProposal()
    const hash =
      await audius0.ethContracts.GovernanceClient.getProposalTargetContractHash(
        id
      )
    assert.ok(typeof hash === 'string')
    assert.ok(hash.length > 0)
  })

  it('Gets vote by proposal and voter', async function () {
    const id = await submitProposal()

    const voteYes = Vote.yes
    const voteNo = Vote.no
    await audius1.ethContracts.GovernanceClient.submitVote({
      proposalId: id,
      vote: voteYes
    })
    const result =
      await audius0.ethContracts.GovernanceClient.getVoteByProposalAndVoter({
        proposalId: id,
        voterAddress: accounts[1]
      })
    assert.equal(result, 2)

    await audius2.ethContracts.GovernanceClient.submitVote({
      proposalId: id,
      vote: voteYes
    })
    await audius2.ethContracts.GovernanceClient.updateVote({
      proposalId: id,
      vote: voteNo
    })
    const result2 =
      await audius0.ethContracts.GovernanceClient.getVoteByProposalAndVoter({
        proposalId: id,
        voterAddress: accounts[2]
      })
    assert.equal(result2, 1)
  })
})
