import { GetCommand, PutCommand, QueryCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
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
// A device can be claimed by up to MAX_OWNERS accounts. Each claim is its own row
// (deviceId, userId) holding that user's name and location for it. The claim count
// sits in a row whose userId is COUNT_ROW and that has no createdAt, so the byUser
// index never sees it; updating it in the same transaction keeps the limit exact
// when several people add the device at once.

export const MAX_OWNERS = 5
const COUNT_ROW = '#count'

export async function listDevices(userId: string): Promise<DeviceItem[]> {
    const res = await db.send(new QueryCommand({
        TableName: TABLES.deviceClaims,
        IndexName: 'byUser',
        KeyConditionExpression: 'userId = :u',
        ExpressionAttributeValues: { ':u': userId },
    }))
    return (res.Items ?? []) as DeviceItem[]
}

/** This user's claim on the device, otherwise 404. */
export async function getOwnDevice(userId: string, deviceId: string): Promise<DeviceItem> {
    const res = await db.send(new GetCommand({ TableName: TABLES.deviceClaims, Key: { deviceId, userId } }))
    const device = res.Item as DeviceItem | undefined
    if (!device) throw new ApiError(404, 'not_found', 'Device not found')
    return device
}

export async function addDevice(device: DeviceItem): Promise<void> {
    try {
        await db.send(new TransactWriteCommand({
            TransactItems: [
                {
                    Put: {
                        TableName: TABLES.deviceClaims,
                        Item: device,
                        ConditionExpression: 'attribute_not_exists(userId)',
                    },
                },
                {
                    Update: {
                        TableName: TABLES.deviceClaims,
                        Key: { deviceId: device.deviceId, userId: COUNT_ROW },
                        UpdateExpression: 'ADD claims :one',
                        ConditionExpression: 'attribute_not_exists(claims) OR claims < :max',
                        ExpressionAttributeValues: { ':one': 1, ':max': MAX_OWNERS },
                    },
                },
            ],
        }))
    } catch (err) {
        const [claim, count] = cancellationReasons(err)
        if (claim === 'ConditionalCheckFailed') throw new ApiError(409, 'already_added', 'This device is already in your account')
        if (count === 'ConditionalCheckFailed') {
            throw new ApiError(409, 'device_full', `This device is already added to ${MAX_OWNERS} accounts`)
        }
        throw err
    }
}

export async function updateDevice(device: DeviceItem, patch: { name?: string; location?: string | null }): Promise<DeviceItem> {
    const res = await db.send(new UpdateCommand({
        TableName: TABLES.deviceClaims,
        Key: { deviceId: device.deviceId, userId: device.userId },
        UpdateExpression: 'SET #n = :n, #l = :l',
        ConditionExpression: 'attribute_exists(userId)',
        ExpressionAttributeNames: { '#n': 'name', '#l': 'location' },
        ExpressionAttributeValues: {
            ':n': patch.name ?? device.name,
            ':l': patch.location === undefined ? device.location ?? null : patch.location,
        },
        ReturnValues: 'ALL_NEW',
    }))
    return res.Attributes as DeviceItem
}

/** Removes only this user's claim; the other owners keep the device. */
export async function deleteDevice(device: DeviceItem): Promise<void> {
    try {
        await db.send(new TransactWriteCommand({
            TransactItems: [
                {
                    Delete: {
                        TableName: TABLES.deviceClaims,
                        Key: { deviceId: device.deviceId, userId: device.userId },
                        ConditionExpression: 'attribute_exists(userId)',
                    },
                },
                {
                    Update: {
                        TableName: TABLES.deviceClaims,
                        Key: { deviceId: device.deviceId, userId: COUNT_ROW },
                        UpdateExpression: 'ADD claims :minusOne',
                        ExpressionAttributeValues: { ':minusOne': -1 },
                    },
                },
            ],
        }))
    } catch (err) {
        // A concurrent request already removed it, which is the state the caller asked for.
        if (cancellationReasons(err)[0] === 'ConditionalCheckFailed') return
        throw err
    }
}

/** Per-item reason codes of a cancelled transaction, in TransactItems order. */
function cancellationReasons(err: unknown): (string | undefined)[] {
    const e = err as { name?: string; CancellationReasons?: { Code?: string }[] }
    if (e?.name !== 'TransactionCanceledException') return []
    return (e.CancellationReasons ?? []).map(r => r.Code)
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
