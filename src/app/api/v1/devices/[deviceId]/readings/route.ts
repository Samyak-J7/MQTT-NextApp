import { requireUser } from '@/lib/v1/auth'
import { ApiError, deviceId, ok, route } from '@/lib/v1/http'
import { getOwnDevice, getReadings, readingView } from '@/lib/v1/store'

interface Ctx { params: Promise<{ deviceId: string }> }

function intParam(value: string | null, name: string): number | undefined {
    if (value === null || value === '') return undefined
    const n = Number(value)
    if (!Number.isInteger(n) || n < 0) throw new ApiError(400, 'bad_request', `${name} must be a non-negative integer`)
    return n
}

/** Readings newest first. ?from=&to= (epoch ms), ?limit= (1–1000, default 200). */
export const GET = route<Ctx>(async (req, { params }) => {
    const user = await requireUser(req)
    const device = await getOwnDevice(user.userId, deviceId((await params).deviceId))
    const q = req.nextUrl.searchParams
    const limit = Math.min(intParam(q.get('limit'), 'limit') ?? 200, 1000) || 200
    const readings = await getReadings(device.deviceId, {
        from: intParam(q.get('from'), 'from'),
        to: intParam(q.get('to'), 'to'),
        limit,
    })
    return ok({ deviceId: device.deviceId, readings: readings.map(readingView) })
})
