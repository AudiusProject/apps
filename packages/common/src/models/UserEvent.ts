import { ID } from './Identifiers'

export type UserEvent = {
  is_current?: boolean
  user_id?: ID
  referrer?: ID
  is_mobile_user?: boolean
}
