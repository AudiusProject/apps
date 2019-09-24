const sinon = require('sinon')

function getLibsMock () {
  const libsMock = {
    ethContracts: {
      ServiceProviderFactoryClient: {
        getServiceProviderInfoFromAddress: sinon.mock()
      }
    },
    User: {
      getUsers: sinon.mock()
    },
    discoveryProvider: {
      discoveryProviderEndpoint: 'http://docker.for.mac.localhost:5000'
    }
  }
  libsMock.ethContracts.ServiceProviderFactoryClient.getServiceProviderInfoFromAddress.returns([{ 'endpoint': 'http://localhost:5000' }])
  libsMock.User.getUsers.returns([{ 'creator_node_endpoint': 'http://localhost:5000', 'blocknumber': 10, 'track_blocknumber': 10 }])

  return libsMock
}

module.exports = { getLibsMock }
