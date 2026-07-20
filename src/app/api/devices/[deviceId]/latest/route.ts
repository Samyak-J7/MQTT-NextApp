import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDevice, getLatestReading } from '@/lib/dynamo'

interface RouteParams { params: Promise<{ deviceId: string }> }

// Lightweight endpoint for the live status line — polled frequently, so it
// only fetches the single most recent reading rather than a whole range.
export async function GET(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { deviceId } = await params
    const device = await getDevice(session.user.accountId, deviceId)
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

    try {
        const reading = await getLatestReading(deviceId)
        return NextResponse.json({ reading })
    } catch (err) {
        console.error('GET /api/devices/[deviceId]/latest:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
