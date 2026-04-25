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

const FbkItemSchema = z.discriminatedUnion('type', [
    z.object({
        device_id: z.string().min(1).max(100),
        type: z.literal('oms'),
        duration: z.number().min(0),
    }),
    z.object({
        device_id: z.string().min(1).max(100),
        type: z.literal('liquid_flow'),
        duration: z.number().min(0),
        consumption: z.number().min(0),
    }),
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
        try {
            await docClient.send(new PutCommand({
                TableName: 'SensorReadings',
                Item: {
                    deviceId: item.device_id,
                    timestamp: now,
                    type: item.type,
                    duration: item.duration,
                    ...(item.type === 'liquid_flow' ? { consumption: item.consumption } : {}),
                },
            }))

            results.push({ deviceId: item.device_id, status: 'saved' })
        } catch (err) {
            console.error(`Failed to save reading for ${item.device_id}:`, err)
            results.push({ deviceId: item.device_id, status: 'error' })
        }
    }

    const allSaved = results.every(r => r.status === 'saved')
    return NextResponse.json({ results }, { status: allSaved ? 200 : 207 })
}
