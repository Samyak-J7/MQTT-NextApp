import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getReadings } from '@/lib/dynamo'

interface RouteParams { params: Promise<{ deviceId: string }> }

export async function GET(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { deviceId } = await params
    const url = new URL(req.url)
    const range = url.searchParams.get('range') ?? '7d'

    const now = Date.now()
    const rangeMs: Record<string, number> = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
    }

    const fromTs = now - (rangeMs[range] ?? rangeMs['7d'])
    const readings = await getReadings(deviceId, fromTs, now, 500)

    return NextResponse.json({ readings: readings.reverse() })
}
