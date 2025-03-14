import { NextRequest, NextResponse } from 'next/server'
import { MqttMessagePayload } from '@/app/types'
import mqtt from 'mqtt'

export async function POST (req: NextRequest): Promise<NextResponse> {
  try {
    const body: MqttMessagePayload = await req.json()
    const { MQTT_BROKER, MQTT_USERNAME, MQTT_PASSWORD, MQTT_TOPIC } = process.env

    if (!MQTT_BROKER || !MQTT_USERNAME || !MQTT_PASSWORD || !MQTT_TOPIC) {
      console.error('Missing required environment variables')
      return NextResponse.json({ error: 'Invalid server configuration' }, { status: 500 })
    }

    const options = { username: MQTT_USERNAME, password: MQTT_PASSWORD }
    const client = mqtt.connect(MQTT_BROKER, options)

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => {
        const message = JSON.stringify(body)
        client.publish(MQTT_TOPIC, message, { qos: 1, retain: true }, (err) => {
          client.end()
          if (err) reject(err)
          else resolve()
        })
      })

      client.on('error', (err) => {
        client.end()
        reject(err)
      })
    })

    return NextResponse.json({ message: 'Success' }, { status: 200 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}
