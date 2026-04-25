import { NextRequest, NextResponse } from 'next/server'
import { putHeartbeat } from '@/lib/dynamo'

function checkApiKey(req: NextRequest): boolean {
    const key = process.env.BRIDGE_API_KEY
    if (!key) return true
    return req.headers.get('authorization') === `Bearer ${key}`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    if (!checkApiKey(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let device_id: string | undefined
    try {
        const body = await req.json()
        device_id = typeof body?.device_id === 'string' ? body.device_id.trim() : undefined
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (!device_id) {
        return NextResponse.json({ error: 'device_id required' }, { status: 400 })
    }

    await putHeartbeat(device_id)
    return NextResponse.json({ ok: true })
}
