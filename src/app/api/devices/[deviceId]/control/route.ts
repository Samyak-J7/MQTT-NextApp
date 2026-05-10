import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDevice } from '@/lib/dynamo'
import { publishMessage } from '@/lib/mqtt-pub'

const OMS_TOPIC = 'pit_oms_g2one'

interface RouteParams { params: Promise<{ deviceId: string }> }

export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { deviceId } = await params
    const body = await req.json()
    const duration: unknown = body.duration

    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0) {
        return NextResponse.json({ error: 'duration must be a non-negative number (milliseconds)' }, { status: 400 })
    }

    const device = await getDevice(session.user.accountId, deviceId)
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    if (device.type !== 'oms') return NextResponse.json({ error: 'Device is not an OMS switch' }, { status: 400 })

    const payload = { dev_id: deviceId, rly0: duration / 1000 }
    await publishMessage(OMS_TOPIC, payload)

    return NextResponse.json({ ok: true, topic: OMS_TOPIC, payload })
}
