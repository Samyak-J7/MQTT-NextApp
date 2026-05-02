import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
})
const docClient = DynamoDBDocumentClient.from(client)

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
            let record: Record<string, unknown>

            if ('volt' in item) {
                record = { ...base, type: 'power_meter',
                    volt: item.volt, ampr: item.ampr, watt: item.watt,
                    unit: item.unit, frqc: item.frqc, pf: item.pf }
            } else if (item.type === 'liquid_flow') {
                record = { ...base, type: 'liquid_flow', duration: item.duration, consumption: item.consumption }
            } else {
                record = { ...base, type: 'oms', duration: item.duration }
            }

            await docClient.send(new PutCommand({ TableName: 'SensorReadings', Item: record }))
            results.push({ deviceId, status: 'saved' })
        } catch (err) {
            console.error(`Failed to save reading for ${deviceId}:`, err)
            results.push({ deviceId, status: 'error' })
        }
    }

    const allSaved = results.every(r => r.status === 'saved')
    return NextResponse.json({ results }, { status: allSaved ? 200 : 207 })
}
