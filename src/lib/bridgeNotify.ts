// Notifies the MQTT bridge to immediately re-sync its in-memory schedule
// timers, instead of waiting for its periodic safety refresh. Fire-and-forget
// — a missed notification just means the bridge picks up the change on its
// next periodic refresh instead of instantly.
export async function notifyBridgeScheduleChange(): Promise<void> {
    const bridgeUrl = process.env.BRIDGE_URL
    if (!bridgeUrl) return

    const key = process.env.BRIDGE_API_KEY
    try {
        await fetch(`${bridgeUrl.replace(/\/$/, '')}/refresh-schedules`, {
            method: 'POST',
            headers: key ? { Authorization: `Bearer ${key}` } : {},
            signal: AbortSignal.timeout(5000),
        })
    } catch (err) {
        console.error('Bridge schedule-refresh notify failed:', err)
    }
}
