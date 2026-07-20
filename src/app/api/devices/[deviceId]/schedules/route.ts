import { NextRequest, NextResponse, after } from 'next/server'
import { auth } from '@/lib/auth'
import { getDevice, putDevice } from '@/lib/dynamo'
import { logAction } from '@/lib/audit'
import { notifyBridgeScheduleChange } from '@/lib/bridgeNotify'
import { Schedule } from '@/app/types'

interface RouteParams { params: Promise<{ deviceId: string }> }

function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export async function GET(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { deviceId } = await params
    const device = await getDevice(session.user.accountId, deviceId)
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

    return NextResponse.json({ schedules: device.schedules ?? [] })
}

export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { deviceId } = await params
    const device = await getDevice(session.user.accountId, deviceId)
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

    const { mode, trigAt, duration, lat, lon } = await req.json()

    if (!['TTR', 'SRS', 'SST'].includes(mode)) {
        return NextResponse.json({ error: 'mode must be TTR, SRS, or SST' }, { status: 400 })
    }
    if (device.type !== 'oms') {
        return NextResponse.json({ error: 'Schedules only apply to OMS switch devices' }, { status: 400 })
    }
    if (typeof duration !== 'number' || duration <= 0) {
        return NextResponse.json({ error: 'duration (minutes) is required' }, { status: 400 })
    }
    if ((mode === 'SRS' || mode === 'SST') && (typeof lat !== 'number' || typeof lon !== 'number')) {
        return NextResponse.json({ error: 'lat/lon are required for sunrise/sunset schedules' }, { status: 400 })
    }

    const schedule: Schedule = {
        scheduleId: generateId(),
        mode,
        trigAt: trigAt ?? '0000',
        duration,
        ...(typeof lat === 'number' ? { lat } : {}),
        ...(typeof lon === 'number' ? { lon } : {}),
        enabled: true,
        createdAt: Date.now(),
    }

    const updatedDevice = { ...device, schedules: [...(device.schedules ?? []), schedule] }
    await putDevice(updatedDevice)

    await logAction(
        session.user.accountId,
        session.user.id,
        session.user.email ?? '',
        'schedule.add',
        deviceId,
        `Added ${mode} schedule to device "${device.name}"`
    )

    after(() => notifyBridgeScheduleChange())

    return NextResponse.json({ schedule }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { deviceId } = await params
    const device = await getDevice(session.user.accountId, deviceId)
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

    const { scheduleId } = await req.json()
    const updatedDevice = {
        ...device,
        schedules: (device.schedules ?? []).filter(s => s.scheduleId !== scheduleId),
    }
    await putDevice(updatedDevice)

    await logAction(
        session.user.accountId,
        session.user.id,
        session.user.email ?? '',
        'schedule.delete',
        deviceId,
        `Removed schedule from device "${device.name}"`
    )

    after(() => notifyBridgeScheduleChange())

    return NextResponse.json({ message: 'Schedule deleted' })
}
