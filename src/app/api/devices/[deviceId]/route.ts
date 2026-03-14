import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDevice, putDevice, deleteDevice } from '@/lib/dynamo'

interface RouteParams { params: Promise<{ deviceId: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { deviceId } = await params
    const device = await getDevice(session.user.id, deviceId)
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

    return NextResponse.json({ device })
}

export async function PATCH(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { deviceId } = await params
    const device = await getDevice(session.user.id, deviceId)
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

    const { name, location, description } = await req.json()
    const updated = {
        ...device,
        ...(name ? { name } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(description !== undefined ? { description } : {}),
    }

    await putDevice(updated)
    return NextResponse.json({ device: updated })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { deviceId } = await params
    await deleteDevice(session.user.id, deviceId)
    return NextResponse.json({ message: 'Device deleted' })
}
