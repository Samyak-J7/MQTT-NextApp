import mqtt, { MqttClient } from 'mqtt'

let _client: MqttClient | null = null

function getClient(): MqttClient {
    if (_client && (_client.connected || _client.reconnecting)) return _client
    if (_client) { _client.end(true); _client = null }

    const broker   = process.env.MQTT_BROKER
    const port     = parseInt(process.env.MQTT_PORT ?? '8883')
    const username = process.env.MQTT_USERNAME
    const password = process.env.MQTT_PASSWORD
    const useTls   = process.env.MQTT_USE_TLS !== 'false'

    if (!broker) throw new Error('MQTT_BROKER is not configured')

    const url = `${useTls ? 'mqtts' : 'mqtt'}://${broker}:${port}`

    _client = mqtt.connect(url, {
        clientId:        `nextjs-ctrl-${process.pid}-${Date.now()}`,
        username,
        password,
        connectTimeout:  10_000,
        reconnectPeriod: 5_000,
        clean:           true,
    })

    _client.on('error', err => console.error('[mqtt-pub] error:', err.message))

    return _client
}

export function publishMessage(topic: string, payload: object): Promise<void> {
    return new Promise((resolve, reject) => {
        const c = getClient()
        const json = JSON.stringify(payload)

        const doPublish = () => {
            c.publish(topic, json, { qos: 1 }, err => {
                if (err) reject(err)
                else resolve()
            })
        }

        if (c.connected) {
            doPublish()
        } else {
            const timeout = setTimeout(() => {
                c.off('connect', onConnect)
                reject(new Error('MQTT connection timeout (12 s)'))
            }, 12_000)

            const onConnect = () => {
                clearTimeout(timeout)
                doPublish()
            }

            c.once('connect', onConnect)
        }
    })
}
