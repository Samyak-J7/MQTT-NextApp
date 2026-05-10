import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDevice, putDevice, deleteDevice } from '@/lib/dynamo'
import { logAction } from '@/lib/audit'

interface RouteParams { params: Promise<{ deviceId: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { deviceId } = await params
    const device = await getDevice(session.user.accountId, deviceId)
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

    return NextResponse.json({ device })
}

export async function PATCH(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { deviceId } = await params
    const device = await getDevice(session.user.accountId, deviceId)
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

    const { name, location, description, defaultDuration } = await req.json()
    const updated = {
        ...device,
        ...(name ? { name } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(typeof defaultDuration === 'number' ? { defaultDuration } : {}),
    }

    await putDevice(updated)

    await logAction(
        session.user.accountId,
        session.user.id,
        session.user.email ?? '',
        'device.update',
        deviceId,
        `Updated device "${updated.name}"`
    )

    return NextResponse.json({ device: updated })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { deviceId } = await params
    const device = await getDevice(session.user.accountId, deviceId)
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

    await deleteDevice(session.user.accountId, deviceId)

    await logAction(
        session.user.accountId,
        session.user.id,
        session.user.email ?? '',
        'device.delete',
        deviceId,
        `Deleted device "${device.name}"`
    )

    return NextResponse.json({ message: 'Device deleted' })
}
