import { NextRequest, NextResponse } from 'next/server'
import { getAllEnabledSchedules } from '@/lib/dynamo'

function checkApiKey(req: NextRequest): boolean {
    const key = process.env.BRIDGE_API_KEY
    if (!key) return true // no key configured — open (dev mode)
    return req.headers.get('authorization') === `Bearer ${key}`
}

// Bridge-only endpoint — returns every enabled schedule across all accounts
// so the bridge can compute exact fire times locally.
export async function GET(req: NextRequest): Promise<NextResponse> {
    if (!checkApiKey(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const schedules = await getAllEnabledSchedules()
        return NextResponse.json({ schedules })
    } catch (err) {
        console.error('GET /api/schedules/all:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
