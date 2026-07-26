import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDevice, getReadings, getRealtimeReadings, getAggregates } from '@/lib/dynamo'
import { hourKey, dayKey, dayBucketStart } from '@/lib/aggKey'
import { AggregateBucket, ConsumptionBucket } from '@/app/types'

interface RouteParams { params: Promise<{ deviceId: string }> }

const RANGE_MS: Record<string, number> = {
    live: 2 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
}

// Recomputes each bucket's consumption as (this bucket's lastUnit) − (the
// most recent prior bucket that actually had readings)'s lastUnit, instead
// of trusting the incrementally-accumulated consumptionKwh at face value.
// This is what lastUnit is FOR: it lets the displayed number self-correct
// against any drift from a missed/duplicate message, rather than silently
// compounding it. Falls back to the stored incremental value only for the
// very first active bucket in the window, where there's no prior bucket to
// diff against.
function deriveConsumption(buckets: AggregateBucket[]): AggregateBucket[] {
    let lastKnownUnit: number | null = null
    return buckets.map(b => {
        if (b.readingCount > 0 && typeof b.lastUnit === 'number') {
            const consumptionKwh = lastKnownUnit != null ? Math.max(0, b.lastUnit - lastKnownUnit) : b.consumptionKwh
            lastKnownUnit = b.lastUnit
            return { ...b, consumptionKwh }
        }
        return b
    })
}

function toConsumptionBucket(b: AggregateBucket): ConsumptionBucket {
    return {
        bucketStart: b.periodStart,
        consumption: parseFloat((b.consumptionKwh ?? 0).toFixed(4)),
        avgWatt: b.readingCount > 0 ? parseFloat(((b.sumWatt ?? 0) / b.readingCount).toFixed(1)) : null,
        readingCount: b.readingCount ?? 0,
        lastUnit: b.lastUnit,
    }
}

export async function GET(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { deviceId } = await params
    const device = await getDevice(session.user.accountId, deviceId)
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

    const url = new URL(req.url)
    const range = url.searchParams.get('range') ?? '7d'
    const now = Date.now()
    const fromTs = now - (RANGE_MS[range] ?? RANGE_MS['7d'])

    try {
        if (device.type === 'power_meter') {
            if (range === 'today') {
                const todayStart = dayBucketStart(now)
                const buckets = deriveConsumption(await getAggregates(deviceId, hourKey(todayStart), hourKey(now)))
                return NextResponse.json({ aggregated: true, buckets: buckets.map(toConsumptionBucket) })
            }
            if (range === '7d') {
                const buckets = deriveConsumption(await getAggregates(deviceId, hourKey(fromTs), hourKey(now)))
                return NextResponse.json({ aggregated: true, buckets: buckets.map(toConsumptionBucket) })
            }
            if (range === '30d') {
                const buckets = deriveConsumption(await getAggregates(deviceId, dayKey(fromTs), dayKey(now)))
                return NextResponse.json({ aggregated: true, buckets: buckets.map(toConsumptionBucket) })
            }
            // 'live' (mini gauge chart) and '24h' — raw realtime readings
            const limit = range === 'live' ? 200 : 1500
            const readings = await getRealtimeReadings(deviceId, fromTs, now, limit)
            return NextResponse.json({ aggregated: false, readings: readings.reverse() })
        }

        // oms / liquid_flow — unchanged
        const readings = await getReadings(deviceId, fromTs, now, 500)
        return NextResponse.json({ aggregated: false, readings: readings.reverse() })
    } catch (err) {
        console.error('GET /api/devices/[deviceId]/readings:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
