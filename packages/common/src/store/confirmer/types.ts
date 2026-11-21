type Confirmable = {
  index: number
  calls: Call[]
}

export type ConfirmationOptions = {
  operationId?: string

  squashable?: boolean

  parallelizable?: boolean

  useOnlyLastSuccessCall?: boolean
}

type Call = {
  call: any
  result: any
  cancelled?: boolean
} & ConfirmationOptions

export interface ConfirmerState {
  confirm: { [key: string]: Confirmable }
  complete: { [key: string]: any[] }
  operationSuccessCallIdx: { [key: string]: { [key: string]: number } }
}

export type RequestConfirmationError = {
  message: string
  error: Error
  timeout: boolean
}
