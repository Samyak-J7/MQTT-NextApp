import { requireUser } from '@/lib/v1/auth'
import { deviceId, ok, readJson, route, str } from '@/lib/v1/http'
import { addDevice, deviceView, getLatestReading, listDevices } from '@/lib/v1/store'

/** My devices, each with its latest reading. */
export const GET = route(async req => {
    const user = await requireUser(req)
    const devices = (await listDevices(user.userId)).sort((a, b) => a.createdAt - b.createdAt)
    const latest = await Promise.all(devices.map(d => getLatestReading(d.deviceId)))
    return ok({ devices: devices.map((d, i) => deviceView(d, latest[i])) })
})

/** Add a device by its BLE MAC. */
export const POST = route(async req => {
    const user = await requireUser(req)
    const body = await readJson(req)
    const device = {
        deviceId: deviceId(body.deviceId),
        userId: user.userId,
        name: str(body.name, 'name', { max: 80 })!,
        location: str(body.location, 'location', { required: false, max: 120 }),
        createdAt: Date.now(),
    }
    await addDevice(device)
    return ok({ device: deviceView(device, await getLatestReading(device.deviceId)) }, 201)
})
