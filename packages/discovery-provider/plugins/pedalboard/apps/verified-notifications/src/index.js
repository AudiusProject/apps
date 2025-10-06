import dotenv from 'dotenv'

import listenOn from './db.js'
import tracksHandler from './handlers/tracks.js'
import usersHandler from './handlers/users.js'
import purchasesHandler from './handlers/purchases.js'
import artistCoinsHandler from './handlers/artistCoins.js'
import { Server } from './server/index.js'

const main = async () => {
  const server = new Server()
  await server.init()

  console.log('verified uploads bot starting')
  const tracks = listenOn('tracks', tracksHandler).catch(console.error)
  const users = listenOn('users', usersHandler).catch(console.error)
  const purchases = listenOn('usdc_purchases', purchasesHandler).catch(
    console.error
  )
  const artistCoins = listenOn('artist_coins', artistCoinsHandler).catch(
    console.error
  )
  await Promise.allSettled([tracks, users, purchases, artistCoins])
}

main()
