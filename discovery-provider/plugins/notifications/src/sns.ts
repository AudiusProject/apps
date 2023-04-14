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
    console.log('Error', err.stack)
  }
}

export const publishBatch = async (params: PublishBatchCommandInput) => {
  try {
    const data = await snsClient.send(new PublishBatchCommand(params))
    return data
  } catch (err) {
    console.log('Error', err.stack)
  }
}

export const sendIOSMessage = async ({
  title,
  body,
  badgeCount,
  data,
  playSound = true,
  targetARN
}: {
  title: string
  body: string
  badgeCount: number
  data?: object
  playSound: boolean
  targetARN: string
}) => {
  let arn
  if (targetARN.includes('APNS_SANDBOX')) arn = 'APNS_SANDBOX'
  else if (targetARN.includes('APNS')) arn = 'APNS'
  const message = JSON.stringify({
    ['default']: body,
    [arn]: JSON.stringify({
      aps: {
        alert: {
          title,
          body
        },
        sound: playSound && 'default',
        badge: badgeCount
      },
      data
    })
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
  playSound = true
}: {
  title: string
  body: string
  targetARN: string
  data: object
  playSound: boolean
}) => {
  const message = JSON.stringify({
    default: body,
    GCM: {
      notification: {
        ...(title ? { title } : {}),
        body,
        sound: playSound && 'default'
      },
      data
    }
  })

  await publish({
    TargetArn: targetARN,
    Message: message,
    MessageStructure: 'json'
  })
}

const formatPushMessage = ({
  device,
  title,
  body,
  targetARN,
  data = {},
  playSound = true
}: {
  device: Device
  title: string
  body: string
  targetARN: string
  data: object
  playSound: boolean
}): string => {
  if (device.type == "android") {
    return JSON.stringify({
      default: body,
      GCM: {
        notification: {
          ...(title ? { title } : {}),
          body,
          sound: playSound && 'default'
        },
        data
      }
    })
  }
  else if (device.type == "ios") {
    let arn: string
    if (targetARN.includes('APNS_SANDBOX')) arn = 'APNS_SANDBOX'
    else if (targetARN.includes('APNS')) arn = 'APNS'
    return JSON.stringify({
      ['default']: body,
      [arn]: JSON.stringify({
        aps: {
          alert: {
            title,
            body
          },
          sound: playSound && 'default',
          badge: device.badgeCount
        },
        data
      })
    })
  }
}

type Device = {
  type: DeviceType
  targetARN: string
  badgeCount: number
}
type Message = { title: string; body: string; data: object }

export const sendPushNotification = async (
  device: Device,
  message: Message
) => {
  if (device.type == 'ios') {
    await sendIOSMessage({
      title: message.title,
      body: message.body,
      badgeCount: device.badgeCount,
      data: message.data,
      playSound: true,
      targetARN: device.targetARN
    })
  } else if (device.type == 'android') {
    await sendAndroidMessage({
      title: message.title,
      body: message.body,
      data: message.data,
      playSound: true,
      targetARN: device.targetARN
    })
  }
}

export const sendPushNotificationBatch = async (
  messages: [Device, Message][]
) => {
  const batchArgs = messages.reduce((acc, message) => {}, new PublishBatchCommand({
    TopicArn: undefined,
    PublishBatchRequestEntries: []
  }))
}
