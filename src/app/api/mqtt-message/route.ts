import { NextRequest, NextResponse } from 'next/server'
import { MQTTFormData } from '@/app/types'
import mqtt from 'mqtt'

export async function POST (req: NextRequest) {
  try {
    const body: MQTTFormData = await req.json()
    const brokerUrl = process.env.MQTT_BROKER || ''
    const options = {
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
    }
    const client = mqtt.connect(brokerUrl, options)
    const topic = process.env.MQTT_TOPIC || ''
    const message = JSON.stringify(body)
    if (!brokerUrl || !topic || !message || !options.username || !options.password) {
      return NextResponse.json({ error: 'Invalid Configuration' }, { status: 500 })
    }
    client.publish(topic, message, { qos: 1, retain: true }, (err) => {
        if (err) {
          console.error(err)
          return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
        }
        client.end()
      }
    )

    client.on('error', (err) => {
      console.error('MQTT Error:', err)
      client.end()
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    })
    return NextResponse.json({ message: 'Success' }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Invalid Data Format' }, { status: 400 })
  }
}
