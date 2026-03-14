import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDevicesByUser, putDevice } from '@/lib/dynamo'
import { Device } from '@/app/types'

export async function GET(): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const devices = await getDevicesByUser(session.user.id)
    return NextResponse.json({ devices })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deviceId, name, location, description } = await req.json()

    if (!deviceId || !name) {
        return NextResponse.json({ error: 'deviceId and name are required' }, { status: 400 })
    }

    const device: Device = {
        userId: session.user.id,
        deviceId: deviceId.trim(),
        name: name.trim(),
        location: location?.trim(),
        description: description?.trim(),
        createdAt: Date.now(),
        schedules: [],
    }

    await putDevice(device)
    return NextResponse.json({ device }, { status: 201 })
}
