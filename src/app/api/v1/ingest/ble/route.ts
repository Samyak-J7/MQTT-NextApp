import { requireBridge } from '@/lib/v1/auth'
import { ApiError, ok, readJson, route } from '@/lib/v1/http'
import { getLatestReading, putReading } from '@/lib/v1/store'

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/**
 * Called by the mqtt-bridge for every message on pit_fbk/ble, body as published:
 *   {"fbk":[{"ble":"E072A16F6B1A","s_Read":66,"Lipo":2383,"txNum":1878,"rssi":-33}]}
 * Readings are stored for every beacon, so history exists before a user adds it.
 * The same frame relayed by two phones (same txNum) is stored once.
 */
export const POST = route(async req => {
    requireBridge(req)
    const body = await readJson(req)
    if (!Array.isArray(body.fbk)) throw new ApiError(400, 'bad_request', 'fbk array is required')

    let saved = 0
    let duplicate = 0
    let invalid = 0
    for (const item of body.fbk as Record<string, unknown>[]) {
        const id = typeof item?.ble === 'string' ? item.ble.replace(/[:\-\s]/g, '').toUpperCase() : ''
        if (!/^[0-9A-F]{12}$/.test(id) || !isNum(item.s_Read) || !isNum(item.Lipo) || !isNum(item.txNum) || !isNum(item.rssi)) {
            invalid++
            continue
        }
        const last = await getLatestReading(id)
        if (last && last.txNum === item.txNum) {
            duplicate++
            continue
        }
        await putReading({ deviceId: id, ts: Date.now(), sRead: item.s_Read, lipo: item.Lipo, txNum: item.txNum, rssi: item.rssi })
        saved++
    }
    return ok({ saved, duplicate, invalid })
})
