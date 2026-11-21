const assert = require('assert')
const sinon = require('sinon')

const { ContractClient } = require('../src/services/contracts/ContractClient')
const { Web3Manager } = require('../src/services/web3Manager')
const { EthWeb3Manager } = require('../src/services/ethWeb3Manager')

const CONTRACT_INIT_MAX_ATTEMPTS = 5

let contractClient

describe('Testing ContractClient class with ProviderSelection', () => {
  afterEach(async () => {
    sinon.restore()
  })

  it('should use initial audius gateway if healthy', async () => {
    contractClient = createContractClientWithInternalWeb3()
    sinon
      .stub(contractClient.web3Manager.web3.eth, 'Contract')
      .callsFake((arg1, arg2) => {
        return arg1
      })
    const initWithProviderSelectionSpy = sinon.spy(contractClient, 'init')
    const consoleSpy = sinon.spy(console, 'error')

    await contractClient.init()

    assert.strictEqual(
      contractClient.web3Manager.getWeb3().currentProvider.host,
      'https://audius.poa.network'
    )
    assert(initWithProviderSelectionSpy.calledOnce)
    assert(consoleSpy.notCalled)
  })

  it('should log error if both audius gateway and public gateway are unhealthy', async () => {
    contractClient = createContractClientWithInternalWeb3()
    sinon
      .stub(contractClient.web3Manager.web3.eth, 'Contract')
      .callsFake((arg1, arg2) => {
        throw new Error('Bad provider')
      })
    const initWithProviderSelectionSpy = sinon.spy(contractClient, 'init')
    const consoleSpy = sinon.spy(console, 'error')

    await contractClient.init()

    assert(
      initWithProviderSelectionSpy.callCount === CONTRACT_INIT_MAX_ATTEMPTS
    )
    assert(consoleSpy.callCount === CONTRACT_INIT_MAX_ATTEMPTS)
  })

  it('should use initial gateway url if web3Manager is instanceof ethWeb3Manager and contract logic passes', async () => {
    contractClient = createContractClientWithEthWeb3Manager()
    sinon
      .stub(contractClient.web3Manager.web3.eth, 'Contract')
      .callsFake((arg1, arg2) => {
        return arg1
      })
    const initWithProviderSelectionSpy = sinon.spy(contractClient, 'init')
    const consoleSpy = sinon.spy(console, 'error')

    await contractClient.init()

    assert.strictEqual(
      contractClient.web3Manager.getWeb3().currentProvider.host,
      'https://eth.network'
    )
    assert(initWithProviderSelectionSpy.calledOnce)
    assert(consoleSpy.notCalled)
  })

  it('should log error if web3Manager is instanceof ethWeb3Manager and contract logic fails', async () => {
    contractClient = createContractClientWithEthWeb3Manager()
    sinon
      .stub(contractClient.web3Manager.web3.eth, 'Contract')
      .callsFake((arg1, arg2) => {
        throw new Error('Bad provider')
      })
    const initWithProviderSelectionSpy = sinon.spy(contractClient, 'init')
    const consoleSpy = sinon.spy(console, 'error')

    await contractClient.init()

    assert.strictEqual(
      contractClient.web3Manager.getWeb3().currentProvider.host,
      'https://eth.network'
    )
    assert(
      initWithProviderSelectionSpy.callCount === CONTRACT_INIT_MAX_ATTEMPTS
    )
    assert(consoleSpy.callCount === CONTRACT_INIT_MAX_ATTEMPTS)
  })

  it('should use initial gateway url if useExternalWeb3 is true and contract logic passes', async () => {
    contractClient = createContractClientWithExternalWeb3()
    sinon
      .stub(contractClient.web3Manager.web3.eth, 'Contract')
      .callsFake((arg1, arg2) => {
        return arg1
      })
    const initWithProviderSelectionSpy = sinon.spy(contractClient, 'init')
    const consoleSpy = sinon.spy(console, 'error')

    await contractClient.init()

    assert.strictEqual(
      contractClient.web3Manager.getWeb3().currentProvider.host,
      'https://audius.poa.network'
    )
    assert(initWithProviderSelectionSpy.calledOnce)
    assert(consoleSpy.notCalled)
  })

  it('should log error if useExternalWeb3 is true and contract logic fails', async () => {
    contractClient = createContractClientWithExternalWeb3()
    sinon
      .stub(contractClient.web3Manager.web3.eth, 'Contract')
      .callsFake((arg1, arg2) => {
        throw new Error('Bad provider')
      })
    const initWithProviderSelectionSpy = sinon.spy(contractClient, 'init')
    const consoleSpy = sinon.spy(console, 'error')

    await contractClient.init()

    assert(
      initWithProviderSelectionSpy.callCount === CONTRACT_INIT_MAX_ATTEMPTS
    )
    assert(consoleSpy.callCount === CONTRACT_INIT_MAX_ATTEMPTS)
  })
})

const gateways = ['https://audius.poa.network', 'https://public.poa.network']

function createWeb3Obj(host) {
  return {
    currentProvider: {
      host
    },
    eth: {
      Contract: () => {}
    }
  }
}

function createContractClient(web3Manager) {
  const getRegistryAddressFn = () => {
    return '0xaaaaaaaaaaaaaaaaaaa'
  }

  if (web3Manager instanceof Web3Manager) {
    sinon.stub(web3Manager, 'provider').callsFake((arg1, arg2) => {
      return arg1
    })
  }

  return new ContractClient(
    web3Manager,
    'contractABI',
    'contractRegistryKey',
    getRegistryAddressFn
  )
}

function createContractClientWithInternalWeb3() {
  const web3Config = {
    useExternalWeb3: false,
    internalWeb3Config: {
      web3ProviderEndpoints: gateways
    }
  }
  const web3Manager = new Web3Manager({})
  web3Manager.web3 = createWeb3Obj('https://audius.poa.network')
  web3Manager.web3Config = web3Config
  return createContractClient(web3Manager)
}

function createContractClientWithExternalWeb3() {
  const web3Config = {
    useExternalWeb3: true,
    internalWeb3Config: {
      web3ProviderEndpoints: gateways
    }
  }
  const web3Manager = new Web3Manager({})
  web3Manager.web3 = createWeb3Obj('https://audius.poa.network')
  web3Manager.web3Config = web3Config
  return createContractClient(web3Manager)
}

function createContractClientWithEthWeb3Manager() {
  const web3Config = {
    providers: ['https://audius.eth.network'],
    ownerWallet: '0xwallet'
  }
  const ethWeb3Manager = new EthWeb3Manager({ web3Config })
  ethWeb3Manager.web3 = createWeb3Obj('https://eth.network')
  return createContractClient(ethWeb3Manager)
}
