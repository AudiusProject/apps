import {
  SNSClient,
  PublishCommand,
  PublishBatchCommand,
  PublishBatchCommandInput,
  PublishCommandInput
} from '@aws-sdk/client-sns'
import { logger } from './logger'
import { DeviceType } from './processNotifications/mappers/userNotificationSettings'

const region = process.env.AWS_REGION
const accessKeyId = process.env.AWS_ACCESS_KEY_ID
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

// Create SNS service object.
const snsClient = new SNSClient({
  region,
  credentials: { accessKeyId, secretAccessKey }
})

export const publish = async (params: PublishCommandInput) => {
  try {
    const data = await snsClient.send(new PublishCommand(params))
    return data
  } catch (err) {
    logger.warn(
      `Error publishing push notification for awsARN ${params.TargetArn}: ${err.stack}`
    )
    throw err.Error
  }
}

export const publishBatch = async (params: PublishBatchCommandInput) => {
  try {
    const data = await snsClient.send(new PublishBatchCommand(params))
    return data
  } catch (err) {
    logger.warn(`Error publishing push notifications: ${err.stack}`)
  }
}

export const sendIOSMessage = async ({
  title,
  body,
  badgeCount,
  data,
  playSound = true,
  targetARN,
  imageUrl
}: {
  title: string
  body: string
  badgeCount: number
  data?: object
  playSound: boolean
  targetARN: string
  imageUrl?: string
}) => {
  let arn: string | undefined
  if (targetARN.includes('APNS_SANDBOX')) arn = 'APNS_SANDBOX'
  else if (targetARN.includes('APNS')) arn = 'APNS'

  const apnsConfig: any = {
    aps: {
      alert: {
        title,
        body
      },
      sound: playSound && 'default',
      badge: badgeCount
    },
    data
  }

  // Enable rich notifications when image is provided (People Thumbnail notifications)
  if (imageUrl) {
    apnsConfig.aps['mutable-content'] = 1
    apnsConfig['media-url'] = imageUrl
    // Add People Thumbnail notification features
    apnsConfig.aps.category = 'communication'
    apnsConfig.headers = {
      'apns-push-type': 'communication',
      'apns-priority': '10'
    }
  }

  const message = JSON.stringify({
    ['default']: body,
    [arn]: JSON.stringify(apnsConfig)
  })

  await publish({
    TargetArn: targetARN,
    Message: message,
    MessageStructure: 'json'
  })
}

export const sendAndroidMessage = async ({
  title,
  body,
  targetARN,
  data = {},
  playSound = true,
  imageUrl
}: {
  title: string
  body: string
  targetARN: string
  data: object
  playSound: boolean
  imageUrl?: string
}) => {
  const message = JSON.stringify({
    default: body,
    GCM: JSON.stringify({
      notification: {
        ...(title ? { title } : {}),
        body,
        sound: playSound && 'default',
        ...(imageUrl ? { image: imageUrl } : {})
      },
      data: {
        ...data,
        ...(imageUrl ? { imageUrl } : {})
      }
    })
  })
  await publish({
    TargetArn: targetARN,
    Message: message,
    MessageStructure: 'json'
  })
}

type Device = {
  type: DeviceType
  targetARN: string
  badgeCount: number
}
type Message = { title: string; body: string; data: object; imageUrl?: string }

export type SendPushNotificationResult<T extends boolean> = T extends true
  ? { endpointDisabled: true; arn: string }
  : { endpointDisabled: false }

export const sendPushNotification = async (
  device: Device,
  message: Message
): Promise<SendPushNotificationResult<boolean>> => {
  try {
    if (device.type == 'ios') {
      await sendIOSMessage({
        title: message.title,
        body: message.body,
        badgeCount: device.badgeCount,
        data: message.data,
        playSound: true,
        targetARN: device.targetARN,
        imageUrl: message.imageUrl
      })
    } else if (device.type == 'android') {
      await sendAndroidMessage({
        title: message.title,
        body: message.body,
        data: message.data,
        playSound: true,
        targetARN: device.targetARN,
        imageUrl: message.imageUrl
      })
    }
  } catch (e) {
    if (e?.Code === 'EndpointDisabled' || e?.Code === 'InvalidParameter') {
      return { endpointDisabled: true, arn: device.targetARN }
    }
  }
  return { endpointDisabled: false }
}
