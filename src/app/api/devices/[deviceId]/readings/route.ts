import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDevice, getReadings, getReadingsPaginated, getSeedReading } from '@/lib/dynamo'
import { ConsumptionBucket, SensorReading } from '@/app/types'

interface RouteParams { params: Promise<{ deviceId: string }> }

const RANGE_MS: Record<string, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

// Aggregates raw readings into fixed-size buckets, computing consumption as
// the diff of the cumulative "unit" register between bucket boundaries
// (never by summing raw unit values, since the register only increases).
// Gaps (buckets with no readings) carry the register value forward from the
// previous bucket, so they correctly show 0 consumption instead of skewing
// the next real diff. Negative diffs (meter reset) are clamped to 0.
function aggregateConsumption(
    readings: SensorReading[],
    seedUnit: number | null,
    fromTs: number,
    toTs: number,
    bucketMs: number
): ConsumptionBucket[] {
    const bucketCount = Math.ceil((toTs - fromTs) / bucketMs)
    const endUnit: (number | null)[] = new Array(bucketCount).fill(null)
    const wattSum: number[] = new Array(bucketCount).fill(0)
    const wattCount: number[] = new Array(bucketCount).fill(0)

    for (const r of readings) {
        const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((r.timestamp - fromTs) / bucketMs)))
        if (typeof r.unit === 'number') endUnit[idx] = r.unit // last reading in bucket wins (readings are ascending)
        if (typeof r.watt === 'number') { wattSum[idx] += r.watt; wattCount[idx]++ }
    }

    const buckets: ConsumptionBucket[] = []
    let prevUnit = seedUnit
    for (let i = 0; i < bucketCount; i++) {
        if (endUnit[i] === null) endUnit[i] = prevUnit // no reading this bucket — carry forward
        const consumption = prevUnit !== null && endUnit[i] !== null
            ? Math.max(0, (endUnit[i] as number) - prevUnit)
            : 0
        buckets.push({
            bucketStart: fromTs + i * bucketMs,
            consumption: parseFloat(consumption.toFixed(4)),
            avgWatt: wattCount[i] > 0 ? parseFloat((wattSum[i] / wattCount[i]).toFixed(1)) : null,
            readingCount: wattCount[i],
        })
        prevUnit = endUnit[i]
    }
    return buckets
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
        if (device.type === 'power_meter' && (range === '7d' || range === '30d')) {
            const [readings, seed] = await Promise.all([
                getReadingsPaginated(deviceId, fromTs, now),
                getSeedReading(deviceId, fromTs),
            ])
            const buckets = aggregateConsumption(
                readings,
                seed?.unit ?? null,
                fromTs,
                now,
                range === '7d' ? HOUR_MS : DAY_MS
            )
            return NextResponse.json({ aggregated: true, buckets })
        }

        // 24h power_meter (raw, higher cap) and all other device types/ranges
        const limit = device.type === 'power_meter' ? 1500 : 500
        const readings = await getReadings(deviceId, fromTs, now, limit)
        return NextResponse.json({ aggregated: false, readings: readings.reverse() })
    } catch (err) {
        console.error('GET /api/devices/[deviceId]/readings:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
