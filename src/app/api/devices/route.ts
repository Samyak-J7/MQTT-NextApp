import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDevicesByAccount, putDevice, getHeartbeats } from '@/lib/dynamo'
import { Device, DeviceType } from '@/app/types'
import { logAction } from '@/lib/audit'

const VALID_TYPES: DeviceType[] = ['oms', 'liquid_flow']

export async function GET(): Promise<NextResponse> {
    try {
        const session = await auth()
        if (!session?.user?.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const devices = await getDevicesByAccount(session.user.accountId)

        const heartbeats = await getHeartbeats(devices.map(d => d.deviceId))
        const merged = devices.map(d => ({
            ...d,
            lastSeen: heartbeats[d.deviceId] ?? d.lastSeen,
        }))

        return NextResponse.json({ devices: merged })
    } catch (err) {
        console.error('GET /api/devices:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { deviceId, name, type, location, description } = await req.json()

    if (!deviceId || !name) {
        return NextResponse.json({ error: 'deviceId and name are required' }, { status: 400 })
    }
    if (!type || !VALID_TYPES.includes(type)) {
        return NextResponse.json({ error: 'type must be oms or liquid_flow' }, { status: 400 })
    }

    const device: Device = {
        accountId: session.user.accountId,
        deviceId: deviceId.trim(),
        name: name.trim(),
        type: type as DeviceType,
        location: location?.trim(),
        description: description?.trim(),
        addedBy: session.user.id,
        createdAt: Date.now(),
        schedules: [],
    }

    await putDevice(device)

    await logAction(
        session.user.accountId,
        session.user.id,
        session.user.email ?? '',
        'device.add',
        device.deviceId,
        `Added ${type} device "${name}"`
    )

    return NextResponse.json({ device }, { status: 201 })
}
