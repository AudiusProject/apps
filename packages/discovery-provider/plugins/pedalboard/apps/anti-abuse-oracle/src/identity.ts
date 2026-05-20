import 'dotenv/config'

import postgres from 'postgres'

export const sql = postgres(process.env.IDENTITY_DB_URL || '')

export async function useEmailDeliverable(wallet: string) {
  const rows = await sql`
    select "isEmailDeliverable" from "Users" where "walletAddress" = ${wallet}
  `
  return rows[0].isEmailDeliverable
}

export async function useEmail(userId: number) {
  const rows = await sql`
    select "email" from "Users" where "blockchainUserId" = ${userId}
  `
  return rows[0].email
}
