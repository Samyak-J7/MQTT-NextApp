import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDevice, putDevice } from '@/lib/dynamo'
import { Schedule } from '@/app/types'

interface RouteParams { params: Promise<{ deviceId: string }> }

function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export async function GET(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { deviceId } = await params
    const device = await getDevice(session.user.id, deviceId)
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

    return NextResponse.json({ schedules: device.schedules ?? [] })
}

export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { deviceId } = await params
    const device = await getDevice(session.user.id, deviceId)
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

    const { mode, trigAt, relays } = await req.json()
    const schedule: Schedule = {
        scheduleId: generateId(),
        mode,
        trigAt: trigAt ?? '0000',
        relays: relays ?? [0, 0, 0, 0],
        enabled: true,
        createdAt: Date.now(),
    }

    const updatedDevice = { ...device, schedules: [...(device.schedules ?? []), schedule] }
    await putDevice(updatedDevice)

    return NextResponse.json({ schedule }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { deviceId } = await params
    const device = await getDevice(session.user.id, deviceId)
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

    const { scheduleId } = await req.json()
    const updatedDevice = {
        ...device,
        schedules: (device.schedules ?? []).filter(s => s.scheduleId !== scheduleId),
    }
    await putDevice(updatedDevice)

    return NextResponse.json({ message: 'Schedule deleted' })
}
