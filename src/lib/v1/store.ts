import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { db, isConditionFailed, TABLES } from './db'
import { ApiError } from './http'

export interface UserItem {
    email: string
    userId: string
    name: string
    passwordHash: string
    createdAt: number
}

export interface DeviceItem {
    deviceId: string
    userId: string
    name: string
    location?: string
    createdAt: number
}

export interface ReadingItem {
    deviceId: string
    ts: number
    sRead: number
    lipo: number
    txNum: number
    rssi: number
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getUser(email: string): Promise<UserItem | null> {
    const res = await db.send(new GetCommand({ TableName: TABLES.users, Key: { email } }))
    return (res.Item as UserItem) ?? null
}

export async function createUser(user: UserItem): Promise<void> {
    try {
        await db.send(new PutCommand({ TableName: TABLES.users, Item: user, ConditionExpression: 'attribute_not_exists(email)' }))
    } catch (err) {
        if (isConditionFailed(err)) throw new ApiError(409, 'email_taken', 'An account with this email already exists')
        throw err
    }
}

// ─── Devices ─────────────────────────────────────────────────────────────────

export async function listDevices(userId: string): Promise<DeviceItem[]> {
    const res = await db.send(new QueryCommand({
        TableName: TABLES.devices,
        IndexName: 'byUser',
        KeyConditionExpression: 'userId = :u',
        ExpressionAttributeValues: { ':u': userId },
    }))
    return (res.Items ?? []) as DeviceItem[]
}

/** The device if it belongs to this user, otherwise 404. */
export async function getOwnDevice(userId: string, deviceId: string): Promise<DeviceItem> {
    const res = await db.send(new GetCommand({ TableName: TABLES.devices, Key: { deviceId } }))
    const device = res.Item as DeviceItem | undefined
    if (!device || device.userId !== userId) throw new ApiError(404, 'not_found', 'Device not found')
    return device
}

export async function addDevice(device: DeviceItem): Promise<void> {
    try {
        await db.send(new PutCommand({ TableName: TABLES.devices, Item: device, ConditionExpression: 'attribute_not_exists(deviceId)' }))
    } catch (err) {
        if (isConditionFailed(err)) throw new ApiError(409, 'device_taken', 'This device is already added to an account')
        throw err
    }
}

export async function updateDevice(device: DeviceItem, patch: { name?: string; location?: string | null }): Promise<DeviceItem> {
    const res = await db.send(new UpdateCommand({
        TableName: TABLES.devices,
        Key: { deviceId: device.deviceId },
        UpdateExpression: 'SET #n = :n, #l = :l',
        ConditionExpression: 'userId = :u',
        ExpressionAttributeNames: { '#n': 'name', '#l': 'location' },
        ExpressionAttributeValues: {
            ':n': patch.name ?? device.name,
            ':l': patch.location === undefined ? device.location ?? null : patch.location,
            ':u': device.userId,
        },
        ReturnValues: 'ALL_NEW',
    }))
    return res.Attributes as DeviceItem
}

export async function deleteDevice(device: DeviceItem): Promise<void> {
    await db.send(new DeleteCommand({
        TableName: TABLES.devices,
        Key: { deviceId: device.deviceId },
        ConditionExpression: 'userId = :u',
        ExpressionAttributeValues: { ':u': device.userId },
    }))
}

// ─── Readings ────────────────────────────────────────────────────────────────

export async function getReadings(deviceId: string, opts: { from?: number; to?: number; limit: number }): Promise<ReadingItem[]> {
    const res = await db.send(new QueryCommand({
        TableName: TABLES.readings,
        KeyConditionExpression: 'deviceId = :d AND #ts BETWEEN :from AND :to',
        ExpressionAttributeNames: { '#ts': 'ts' },
        ExpressionAttributeValues: { ':d': deviceId, ':from': opts.from ?? 0, ':to': opts.to ?? Date.now() },
        ScanIndexForward: false, // newest first
        Limit: opts.limit,
    }))
    return (res.Items ?? []) as ReadingItem[]
}

export async function getLatestReading(deviceId: string): Promise<ReadingItem | null> {
    return (await getReadings(deviceId, { limit: 1 }))[0] ?? null
}

export async function putReading(reading: ReadingItem): Promise<void> {
    await db.send(new PutCommand({ TableName: TABLES.readings, Item: reading }))
}

// ─── API shapes ──────────────────────────────────────────────────────────────

export function readingView(r: ReadingItem) {
    return { ts: r.ts, sRead: r.sRead, lipo: r.lipo, txNum: r.txNum, rssi: r.rssi }
}

export function deviceView(d: DeviceItem, latest: ReadingItem | null) {
    return {
        deviceId: d.deviceId,
        name: d.name,
        location: d.location ?? null,
        createdAt: d.createdAt,
        latest: latest ? readingView(latest) : null,
    }
}
