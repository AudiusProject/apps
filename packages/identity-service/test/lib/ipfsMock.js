const sinon = require('sinon')

function getIPFSMock() {
  const ipfsMock = {
    types: {
      Buffer
    },
    files: {
      add: sinon.mock()
    },
    pin: {
      add: sinon.mock()
    }
  }
  ipfsMock.files.add.returns([{ hash: 'testCIDLink' }])

  return ipfsMock
}

module.exports = { getIPFSMock }
