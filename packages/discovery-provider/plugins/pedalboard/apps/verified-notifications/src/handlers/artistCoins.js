import { dp_db } from '../db.js'
import { slack } from '../slack.js'
import dotenv from 'dotenv'

dotenv.config()
const { ARTIST_COINS_SLACK_CHANNEL } = process.env

export default async (row) => {
  const { name, mint, ticker, description, user_id } = row

  const user = await dp_db('users')
    .select('users.user_id', 'users.handle', 'users.name')
    .where('users.user_id', '=', user_id)
    .first()
    .catch(console.error)

  if (!user) {
    console.error({ user_id }, 'user not found')
    return
  }

  const { sendMsg } = slack
  const header = `*${user.name}* (@${user.handle}) just launched ${name} ($${ticker})!`
  const data = {
    'Coin Name': name,
    'Coin Mint': mint,
    'Coin Ticker': ticker,
    'Coin Description': description,
    'User Name': user.name,
    'User Handle': user.handle
  }

  await sendMsg(ARTIST_COINS_SLACK_CHANNEL, header, data).catch(console.error)
}
