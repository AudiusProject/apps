import { Base, BaseConstructorArgs } from './base'

export class Reactions extends Base {
  constructor(...args: BaseConstructorArgs) {
    super(...args)
    this.submitReaction = this.submitReaction.bind(this)
  }

  async submitReaction({
    reactedTo,
    reactionValue,
    logger = console
  }: {
    reactedTo: string
    reactionValue: number
    logger: any
  }): Promise<{ success: boolean; error: string | null }> {
    try {
      await this.identityService.submitReaction({
        reactedTo,
        reactionValue
      })
      logger.info(
        `Successfully submitted reaction for entity ${reactedTo} and reaction value ${reactionValue}.`
      )
      return { success: true, error: null }
    } catch (e) {
      const errorMessage = (e as Error).message
      logger.error(
        `Could not successfully submit reaction for entity ${reactedTo} and reaction value ${reactionValue}. Error: ${errorMessage}`
      )
      return { success: false, error: errorMessage }
    }
  }
}
