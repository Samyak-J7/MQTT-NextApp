import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { docClient, putRealtimeReading, getLatestRealtimeReading, upsertAggregate } from '@/lib/dynamo'
import { dayKey, hourKey, dayBucketStart, hourBucketStart } from '@/lib/aggKey'

const BaseFields = {
    device_id: z.string().min(1).max(100).optional(),
    dev_id:    z.string().min(1).max(100).optional(),
}

const FbkItemSchema = z.union([
    z.object({ ...BaseFields, type: z.literal('oms'),         duration: z.number().min(0) }),
    z.object({ ...BaseFields, type: z.literal('liquid_flow'), duration: z.number().min(0), consumption: z.number().min(0) }),
    z.object({ ...BaseFields, type: z.literal('power_meter').optional(),
        volt: z.number(), ampr: z.number(), watt: z.number(),
        unit: z.number(), frqc: z.number(), pf: z.number() }),
])

const PayloadSchema = z.object({
    fbk: z.array(FbkItemSchema).min(1),
})

function checkApiKey(req: NextRequest): boolean {
    const key = process.env.BRIDGE_API_KEY
    if (!key) return true // no key configured — open (dev mode)
    const header = req.headers.get('authorization') ?? ''
    return header === `Bearer ${key}`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    if (!checkApiKey(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let json: unknown
    try {
        json = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = PayloadSchema.safeParse(json)
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const now = Date.now()
    const results: { deviceId: string; status: 'saved' | 'error' }[] = []

    for (const item of parsed.data.fbk) {
        const deviceId = (item.device_id ?? item.dev_id ?? '').trim()
        if (!deviceId) { results.push({ deviceId: '?', status: 'error' }); continue }
        try {
            const base = { deviceId, timestamp: now }

            if ('volt' in item) {
                const record = { ...base, type: 'power_meter' as const,
                    volt: item.volt, ampr: item.ampr, watt: item.watt,
                    unit: item.unit, frqc: item.frqc, pf: item.pf }

                // Delta against the device's previous reading — done before
                // writing the new one so the aggregate update reflects only
                // the energy used since that last reading, not a per-bucket
                // first/last diff (which reports 0 for any bucket that only
                // ever receives a single message).
                const prev = await getLatestRealtimeReading(deviceId)
                const delta = prev?.unit != null ? Math.max(0, record.unit - prev.unit) : 0

                await putRealtimeReading(record)

                const deltaFields = { consumptionKwh: delta, watt: record.watt, volt: record.volt, ampr: record.ampr, frqc: record.frqc, pf: record.pf, unit: record.unit }
                await Promise.all([
                    upsertAggregate(deviceId, hourKey(now), 'hour', hourBucketStart(now), 'power_meter', deltaFields),
                    upsertAggregate(deviceId, dayKey(now), 'day', dayBucketStart(now), 'power_meter', deltaFields),
                ])
            } else if (item.type === 'liquid_flow') {
                const record = { ...base, type: 'liquid_flow', duration: item.duration, consumption: item.consumption }
                await docClient.send(new PutCommand({ TableName: 'SensorReadings', Item: record }))
            } else {
                const record = { ...base, type: 'oms', duration: item.duration }
                await docClient.send(new PutCommand({ TableName: 'SensorReadings', Item: record }))
            }

            results.push({ deviceId, status: 'saved' })
        } catch (err) {
            console.error(`Failed to save reading for ${deviceId}:`, err)
            results.push({ deviceId, status: 'error' })
        }
    }

    const allSaved = results.every(r => r.status === 'saved')
    return NextResponse.json({ results }, { status: allSaved ? 200 : 207 })
}
