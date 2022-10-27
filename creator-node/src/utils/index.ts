/**
 * NOTE: we import everything explicitly an re-export it
 * in order to support both commonjs style exports (`module.exports`)
 * and the new module style exports (`export`).
 * In the future, once we get a significant amount of the codebase
 * typed, we'll remove the commonjs export syntax and just use
 * the new way of importing/exporting
 */
import {
  timeout,
  getRandomInt,
  verifySignature,
  stringifyMap,
  isFqdn
} from './utils'
import {
  validateMetadata,
  validateAssociatedWallets
} from './validateAudiusUserMetadata'
import {
  findCIDInNetwork,
  verifyCIDMatchesExpected,
  EMPTY_FILE_CID
} from './cidUtils'
import {
  createDirForFile,
  writeStreamToFileSystem,
  getIfAttemptedStateFix,
  validateStateForImageDirCIDAndReturnFileUUID,
  _streamFileToDiskHelper
} from './fsUtils'
import { runShellCommand, execShellCommand } from './runShellCommand'
import { currentNodeShouldHandleTranscode } from './contentNodeUtils'
import { clusterUtils } from './clusterUtils'

export type { ValuesOf, RequestWithLogger } from './utils'
export {
  isFqdn,
  timeout,
  getRandomInt,
  verifySignature,
  currentNodeShouldHandleTranscode,
  validateStateForImageDirCIDAndReturnFileUUID,
  findCIDInNetwork,
  getIfAttemptedStateFix,
  createDirForFile,
  writeStreamToFileSystem,
  _streamFileToDiskHelper,
  runShellCommand,
  execShellCommand,
  validateAssociatedWallets,
  validateMetadata,
  stringifyMap,
  clusterUtils
}

module.exports = {
  isFqdn,
  timeout,
  getRandomInt,
  verifySignature,
  currentNodeShouldHandleTranscode,
  validateStateForImageDirCIDAndReturnFileUUID,
  findCIDInNetwork,
  getIfAttemptedStateFix,
  createDirForFile,
  writeStreamToFileSystem,
  _streamFileToDiskHelper,
  runShellCommand,
  execShellCommand,
  validateAssociatedWallets,
  validateMetadata,
  stringifyMap,
  verifyCIDMatchesExpected,
  EMPTY_FILE_CID,
  clusterUtils
}
