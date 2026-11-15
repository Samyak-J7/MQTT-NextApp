import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/v1/auth'
import { ApiError, deviceId, ok, readJson, route, str } from '@/lib/v1/http'
import { deleteDevice, deviceView, getLatestReading, getOwnDevice, updateDevice } from '@/lib/v1/store'

interface Ctx { params: Promise<{ deviceId: string }> }

export const GET = route<Ctx>(async (req, { params }) => {
    const user = await requireUser(req)
    const device = await getOwnDevice(user.userId, deviceId((await params).deviceId))
    return ok({ device: deviceView(device, await getLatestReading(device.deviceId)) })
})

/** Rename / move. Send `location: null` to clear it. */
export const PATCH = route<Ctx>(async (req, { params }) => {
    const user = await requireUser(req)
    const device = await getOwnDevice(user.userId, deviceId((await params).deviceId))
    const body = await readJson(req)
    if (body.name === undefined && body.location === undefined) throw new ApiError(400, 'bad_request', 'Nothing to update')
    const updated = await updateDevice(device, {
        name: str(body.name, 'name', { required: false, max: 80 }),
        location: body.location === null ? null : str(body.location, 'location', { required: false, max: 120 }),
    })
    return ok({ device: deviceView(updated, await getLatestReading(device.deviceId)) })
})

/** Remove from my account. Readings are kept. */
export const DELETE = route<Ctx>(async (req, { params }) => {
    const user = await requireUser(req)
    const device = await getOwnDevice(user.userId, deviceId((await params).deviceId))
    await deleteDevice(device)
    return new NextResponse(null, { status: 204 })
})
