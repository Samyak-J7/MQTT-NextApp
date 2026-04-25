import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getHeartbeats } from '@/lib/dynamo'

interface RouteParams { params: Promise<{ deviceId: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { deviceId } = await params
    const heartbeats = await getHeartbeats([deviceId])
    return NextResponse.json({ lastSeen: heartbeats[deviceId] ?? null })
}
