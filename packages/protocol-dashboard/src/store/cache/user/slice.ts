import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { Status, User, Operator } from 'types'

export type State = {
  accounts: { [wallet: string]: User | Operator }
  status?: Status
  error?: string
}

export const initialState: State = {
  accounts: {}
}

type SetUsers =
  | {
      status?: Status.Success
      users: { [wallet: string]: User | Operator }
    }
  | {
      status: Status.Failure
      error: string
    }

type SetUserProfile = { wallet: string; image: string; name?: string }

const slice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setLoading: (state) => {
      state.status = Status.Loading
    },
    setUsers: (state, action: PayloadAction<SetUsers>) => {
      if ('status' in action.payload) state.status = action.payload.status

      if ('users' in action.payload) {
        const newUsers = { ...action.payload.users }
        Object.keys(newUsers).forEach((wallet) => {
          if (wallet in state.accounts) {
            newUsers[wallet] = {
              ...newUsers[wallet],
              image: state.accounts[wallet].image,
              name: state.accounts[wallet].name
            }
          }
        })
        state.accounts = {
          ...state.accounts,
          ...newUsers
        }
      } else if ('error' in action.payload) {
        state.error = action.payload.error
      }
    },
    setUserProfile: (state, action: PayloadAction<SetUserProfile>) => {
      const { wallet, image, name } = action.payload
      if (wallet in state.accounts) {
        state.accounts[wallet].image = image
        if (name) {
          state.accounts[wallet].name = name
        }
      }
    }
  }
})

export const { setLoading, setUsers, setUserProfile } = slice.actions

export default slice.reducer
