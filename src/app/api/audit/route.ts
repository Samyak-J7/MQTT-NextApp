import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAuditLogs } from '@/lib/dynamo'

export async function GET(req: NextRequest): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100'), 500)

    const logs = await getAuditLogs(session.user.accountId, limit)
    return NextResponse.json({ logs })
}
