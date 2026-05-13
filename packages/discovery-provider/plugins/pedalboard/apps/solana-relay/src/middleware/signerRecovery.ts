import { Table, Users } from '@pedalboard/storage'
import { recoverPersonalSignature } from 'eth-sig-util'
import { NextFunction, Request, Response } from 'express'

import { db as discoveryDb } from '../db'
import { getCachedDiscoveryNodes } from '../redis'

export const userSignerRecoveryMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = req.get('Encoded-Data-Message')
    const sig = req.get('Encoded-Data-Signature')

    if (!sig || !data) {
      return next()
    }
    const walletAddress = recoverPersonalSignature({ data, sig })
    const user = await discoveryDb<Users>(Table.Users)
      .where('wallet', '=', walletAddress)
      .first()
    res.locals.signerUser = user
    if (!user) {
      res.locals.logger.warn(
        { walletAddress },
        'No user found matching signature'
      )
    }
    next()
  } catch (e) {
    next(e)
  }
}

export const discoveryNodeSignerRecoveryMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = JSON.stringify(req.body)
    const sig = req.get('Discovery-Signature')
    if (!sig) {
      res.locals.isSignedByDiscovery = false
      return next()
    }
    const walletAddress = recoverPersonalSignature({ data, sig })
    const discoveryWallets = await getCachedDiscoveryNodes()
    const isSignedByDiscovery = discoveryWallets
      .map(({ delegateOwnerWallet }) => delegateOwnerWallet.toLowerCase())
      .includes(walletAddress)
    res.locals.isSignedByDiscovery = isSignedByDiscovery
    if (!isSignedByDiscovery) {
      res.locals.logger.warn(
        { walletAddress, discoveryWallets },
        'Bad Discovery Signature'
      )
    }
    next()
  } catch (e) {
    next(e)
  }
}
