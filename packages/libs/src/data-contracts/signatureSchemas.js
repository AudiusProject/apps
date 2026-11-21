const domains = {}

function getDomainData(
  contractName,
  signatureVersion,
  chainId,
  contractAddress
) {
  return {
    name: contractName,
    version: signatureVersion,
    chainId: chainId,
    verifyingContract: contractAddress
  }
}

domains.getEntityManagerDomain = function (chainId, contractAddress) {
  return getDomainData('Entity Manager', '1', chainId, contractAddress)
}

const schemas = {}

schemas.domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' }
]

schemas.manageEntity = [
  { name: 'userId', type: 'uint' },
  { name: 'entityType', type: 'string' },
  { name: 'entityId', type: 'uint' },
  { name: 'action', type: 'string' },
  { name: 'metadata', type: 'string' },
  { name: 'nonce', type: 'bytes32' }
]

const generators = {}

function getRequestData(
  domainDataFn,
  chainId,
  contractAddress,
  messageTypeName,
  messageSchema,
  message
) {
  const domainData = domainDataFn(chainId, contractAddress)
  const types = {
    EIP712Domain: schemas.domain
  }
  types[messageTypeName] = messageSchema
  return {
    types: types,
    domain: domainData,
    primaryType: messageTypeName,
    message: message
  }
}

generators.getAddUserRequestData = function (
  chainId,
  contractAddress,
  handle,
  nonce
) {
  const message = {
    handle: handle,
    nonce: nonce
  }
  return getRequestData(
    domains.getUserFactoryDomain,
    chainId,
    contractAddress,
    'AddUserRequest',
    schemas.addUserRequest,
    message
  )
}

generators.getManageEntityData = function (
  chainId,
  contractAddress,
  userId,
  entityType,
  entityId,
  action,
  metadata,
  nonce
) {
  const message = {
    userId,
    entityType,
    entityId,
    action,
    metadata,
    nonce
  }
  return getRequestData(
    domains.getEntityManagerDomain,
    chainId,
    contractAddress,
    'ManageEntity',
    schemas.manageEntity,
    message
  )
}

function browserRandomHash(nChar) {
  var nBytes = Math.ceil((nChar = (+nChar || 8) / 2))

  var u = new Uint8Array(nBytes)

  window.crypto.getRandomValues(u)

  var zpad = function (str) {
    return '00'.slice(str.length) + str
  }
  var a = Array.prototype.map.call(u, function (x) {
    return zpad(x.toString(16))
  })

  var str = a.join('').toLowerCase()
  if (nChar % 2) str = str.slice(1)

  return str
}

async function getNonce() {
  let nodeCrypto
  try {
    nodeCrypto = await import('crypto')
  } catch (e) {
    nodeCrypto = null
  }
  if (typeof window === 'undefined' || window === null) {
    return '0x' + nodeCrypto.randomBytes(32).toString('hex')
  } else {
    return '0x' + browserRandomHash(64)
  }
}

module.exports = { domains, schemas, generators, getNonce }
