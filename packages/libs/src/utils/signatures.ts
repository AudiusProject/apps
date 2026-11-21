import { pack } from '@ethersproject/solidity'
import { BN, ecsign, toBuffer } from 'ethereumjs-util'
import type Web3 from 'web3'

import { Utils } from './utils'

export const sign = (digest: any, privateKey: Buffer) => {
  const buffer = toBuffer(digest)
  const signature = ecsign(buffer, privateKey)
  return signature
}

let _permitTypehash: null | string = null
const getPermitTypehash = () => {
  if (!_permitTypehash) {
    _permitTypehash = Utils.keccak256(
      'Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'
    )
  }
  return _permitTypehash
}

let _transferTokensTypehash: null | string = null
const getTransferTokensTypeHash = () => {
  if (!_transferTokensTypehash) {
    _transferTokensTypehash = Utils.keccak256(
      'TransferTokens(address from,uint256 amount,uint16 recipientChain,bytes32 recipient,uint256 artbiterFee,uint32 nonce,uint256 deadline)'
    )
  }
  return _transferTokensTypehash
}

export interface ApproveTokens {
  owner: string
  spender: string
  value: BN
}

export function getPermitDigest(
  web3: Web3,
  name: string,
  address: string,
  chainId: number,
  approve: ApproveTokens,
  nonce: number,
  deadline: number
) {
  const DOMAIN_SEPARATOR = getDomainSeparator(web3, name, address, chainId)

  const innerEncoded = web3.eth.abi.encodeParameters(
    ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
    [
      getPermitTypehash(),
      approve.owner,
      approve.spender,
      approve.value,
      nonce,
      deadline
    ]
  )
  const encoded = pack(
    ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
    ['0x19', '0x01', DOMAIN_SEPARATOR, Utils.keccak256(innerEncoded)]
  )
  return Utils.keccak256(encoded)
}

export interface TransferTokens {
  from: string
  amount: BN
  recipientChain: number
  recipient: Buffer
  arbiterFee: BN
}

export function getTransferTokensDigest(
  web3: Web3,
  name: string,
  address: string,
  chainId: number,
  transferTokens: TransferTokens,
  nonce: number,
  deadline: number
) {
  const DOMAIN_SEPARATOR = getDomainSeparator(web3, name, address, chainId)
  const innerEncoded = web3.eth.abi.encodeParameters(
    [
      'bytes32',
      'address',
      'uint256',
      'uint16',
      'bytes32',
      'uint256',
      'uint32',
      'uint256'
    ],
    [
      getTransferTokensTypeHash(),
      transferTokens.from,
      transferTokens.amount,
      transferTokens.recipientChain,
      transferTokens.recipient,
      transferTokens.arbiterFee,
      nonce,
      deadline
    ]
  )
  const encoded = pack(
    ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
    ['0x19', '0x01', DOMAIN_SEPARATOR, Utils.keccak256(innerEncoded)]
  )
  return Utils.keccak256(encoded)
}

function getDomainSeparator(
  web3: Web3,
  name: string,
  contractAddress: string,
  chainId: number
) {
  const encoded = web3.eth.abi.encodeParameters(
    ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
    [
      Utils.keccak256(
        'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
      ),
      Utils.keccak256(name),
      Utils.keccak256('1'),
      chainId,
      contractAddress
    ]
  )
  return Utils.keccak256(encoded)
}
