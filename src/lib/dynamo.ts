import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    DeleteCommand,
    QueryCommand,
    ScanCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import { User, Device, SensorReading, AuditLog, Schedule, AggregateBucket, DeviceType } from '@/app/types'

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
})

export const docClient = DynamoDBDocumentClient.from(client)

// ─── Users ────────────────────────────────────────────────────────────────────
// Table: MQTTUsers — PK: email

export async function getUserByEmail(email: string): Promise<User | null> {
    const res = await docClient.send(new GetCommand({
        TableName: 'MQTTUsers',
        Key: { email },
    }))
    return (res.Item as User) ?? null
}

export async function createUser(user: User): Promise<void> {
    await docClient.send(new PutCommand({
        TableName: 'MQTTUsers',
        Item: user,
        ConditionExpression: 'attribute_not_exists(email)',
    }))
}

// ─── Devices ──────────────────────────────────────────────────────────────────
// Table: MQTTDevices — PK: accountId (string), SK: deviceId (string)
// Note: recreate table if migrating from old schema where PK was userId

export async function getDevicesByAccount(accountId: string): Promise<Device[]> {
    const res = await docClient.send(new QueryCommand({
        TableName: 'MQTTDevices',
        KeyConditionExpression: 'accountId = :aid',
        ExpressionAttributeValues: { ':aid': accountId },
    }))
    return (res.Items as Device[]) ?? []
}

export async function getDevice(accountId: string, deviceId: string): Promise<Device | null> {
    const res = await docClient.send(new GetCommand({
        TableName: 'MQTTDevices',
        Key: { accountId, deviceId },
    }))
    return (res.Item as Device) ?? null
}

export async function putDevice(device: Device): Promise<void> {
    await docClient.send(new PutCommand({
        TableName: 'MQTTDevices',
        Item: device,
    }))
}

export async function deleteDevice(accountId: string, deviceId: string): Promise<void> {
    await docClient.send(new DeleteCommand({
        TableName: 'MQTTDevices',
        Key: { accountId, deviceId },
    }))
}

// Bridge-only: full scan across all accounts, used by the scheduler to sync
// its in-memory fire timers. Infrequent (on startup + on schedule change) so
// a Scan is fine at prototype scale.
export async function getAllEnabledSchedules(): Promise<(Schedule & { deviceId: string })[]> {
    const out: (Schedule & { deviceId: string })[] = []
    let ExclusiveStartKey: Record<string, unknown> | undefined

    do {
        const res = await docClient.send(new ScanCommand({
            TableName: 'MQTTDevices',
            ProjectionExpression: '#did, #sch',
            ExpressionAttributeNames: { '#did': 'deviceId', '#sch': 'schedules' },
            ExclusiveStartKey,
        }))
        for (const item of (res.Items ?? []) as { deviceId: string; schedules?: Schedule[] }[]) {
            for (const s of item.schedules ?? []) {
                if (s.enabled) out.push({ ...s, deviceId: item.deviceId })
            }
        }
        ExclusiveStartKey = res.LastEvaluatedKey
    } while (ExclusiveStartKey)

    return out
}

// ─── Readings ─────────────────────────────────────────────────────────────────
// Table: SensorReadings — PK: deviceId (string), SK: timestamp (number)
// oms / liquid_flow only. power_meter uses DeviceReadingsRealtime below.

async function queryReadings(
    tableName: string,
    deviceId: string,
    fromTs?: number,
    toTs?: number,
    limit = 200
): Promise<SensorReading[]> {
    const needsTimestamp = Boolean(fromTs || toTs)

    const params = needsTimestamp
        ? {
            TableName: tableName,
            KeyConditionExpression: fromTs && toTs
                ? 'deviceId = :did AND #ts BETWEEN :from AND :to'
                : 'deviceId = :did AND #ts >= :from',
            ExpressionAttributeNames: { '#ts': 'timestamp' } as Record<string, string>,
            ExpressionAttributeValues: {
                ':did': deviceId,
                ...(fromTs ? { ':from': fromTs } : {}),
                ...(toTs ? { ':to': toTs } : {}),
            },
            ScanIndexForward: false,
            Limit: limit,
          }
        : {
            TableName: tableName,
            KeyConditionExpression: 'deviceId = :did',
            ExpressionAttributeValues: { ':did': deviceId },
            ScanIndexForward: false,
            Limit: limit,
          }

    const res = await docClient.send(new QueryCommand(params))
    return (res.Items as SensorReading[]) ?? []
}

export async function getReadings(
    deviceId: string,
    fromTs?: number,
    toTs?: number,
    limit = 200
): Promise<SensorReading[]> {
    return queryReadings('SensorReadings', deviceId, fromTs, toTs, limit)
}

export async function getLatestReading(deviceId: string): Promise<SensorReading | null> {
    const readings = await getReadings(deviceId, undefined, undefined, 1)
    return readings[0] ?? null
}

// ─── Realtime readings (power_meter) ───────────────────────────────────────────
// Table: DeviceReadingsRealtime — PK: deviceId (string), SK: timestamp (number)
// Same discriminated-by-type row shape as SensorReadings, plus a `ttl`
// attribute (epoch seconds) so DynamoDB auto-expires rows after ~24h. Only
// power_meter writes here today; other device types may move onto this same
// table later as they migrate to the fbk/logg pipeline.

export async function putRealtimeReading(reading: SensorReading): Promise<void> {
    const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60
    await docClient.send(new PutCommand({
        TableName: 'DeviceReadingsRealtime',
        Item: { ...reading, ttl },
    }))
}

export async function getRealtimeReadings(
    deviceId: string,
    fromTs?: number,
    toTs?: number,
    limit = 200
): Promise<SensorReading[]> {
    return queryReadings('DeviceReadingsRealtime', deviceId, fromTs, toTs, limit)
}

export async function getLatestRealtimeReading(deviceId: string): Promise<SensorReading | null> {
    const readings = await getRealtimeReadings(deviceId, undefined, undefined, 1)
    return readings[0] ?? null
}

// ─── Aggregates (daily/weekly/monthly rollups) ─────────────────────────────────
// Table: DeviceAggregates — PK: deviceId (string), SK: aggKey (string),
// formatted "H#2026-07-26T14" (hourly) or "D#2026-07-26" (daily). Updated
// incrementally on every ingested reading (see upsertAggregate) instead of
// recomputed from raw history, so 7d/30d/weekly/monthly stats never require
// scanning the full reading history. Sums (not averages) are stored since
// avg-of-avgs isn't additive across incremental updates — derive averages
// at read time as sum / readingCount.

export async function upsertAggregate(
    deviceId: string,
    aggKey: string,
    granularity: 'hour' | 'day',
    periodStart: number,
    type: DeviceType,
    delta: { consumptionKwh: number; watt: number; volt: number; ampr: number; frqc: number; pf: number; unit: number }
): Promise<void> {
    await docClient.send(new UpdateCommand({
        TableName: 'DeviceAggregates',
        Key: { deviceId, aggKey },
        UpdateExpression:
            'ADD consumptionKwh :c, sumWatt :w, sumVolt :v, sumAmpr :a, sumFrqc :f, sumPf :p, readingCount :one ' +
            'SET lastUnit = :unit, updatedAt = :now, ' +
            'periodStart = if_not_exists(periodStart, :ps), ' +
            'granularity = if_not_exists(granularity, :gran), ' +
            '#typ = if_not_exists(#typ, :typ)',
        ExpressionAttributeNames: { '#typ': 'type' },
        ExpressionAttributeValues: {
            ':c': delta.consumptionKwh,
            ':w': delta.watt,
            ':v': delta.volt,
            ':a': delta.ampr,
            ':f': delta.frqc,
            ':p': delta.pf,
            ':one': 1,
            ':unit': delta.unit,
            ':now': Date.now(),
            ':ps': periodStart,
            ':gran': granularity,
            ':typ': type,
        },
    }))
}

export async function getAggregates(deviceId: string, fromKey: string, toKey: string): Promise<AggregateBucket[]> {
    const res = await docClient.send(new QueryCommand({
        TableName: 'DeviceAggregates',
        KeyConditionExpression: 'deviceId = :did AND aggKey BETWEEN :from AND :to',
        ExpressionAttributeValues: { ':did': deviceId, ':from': fromKey, ':to': toKey },
        ScanIndexForward: true,
    }))
    return (res.Items as AggregateBucket[]) ?? []
}

// ─── Heartbeats ───────────────────────────────────────────────────────────────
// Table: DeviceHeartbeats — PK: deviceId (string)
// Simple upsert — always one row per device, unknown IDs are harmless (never queried).

export async function putHeartbeat(deviceId: string): Promise<void> {
    await docClient.send(new PutCommand({
        TableName: 'DeviceHeartbeats',
        Item: { deviceId, lastSeen: Date.now() },
    }))
}

export async function getHeartbeats(deviceIds: string[]): Promise<Record<string, number>> {
    if (deviceIds.length === 0) return {}

    // BatchGet in chunks of 100 (DynamoDB limit)
    const map: Record<string, number> = {}
    const chunks: string[][] = []
    for (let i = 0; i < deviceIds.length; i += 100) chunks.push(deviceIds.slice(i, i + 100))

    const { BatchGetCommand } = await import('@aws-sdk/lib-dynamodb')
    for (const chunk of chunks) {
        try {
            const res = await docClient.send(new BatchGetCommand({
                RequestItems: {
                    DeviceHeartbeats: {
                        Keys: chunk.map(id => ({ deviceId: id })),
                    },
                },
            }))
            const items = res.Responses?.DeviceHeartbeats ?? []
            for (const item of items) {
                map[item.deviceId as string] = item.lastSeen as number
            }
        } catch (err) {
            console.error('getHeartbeats BatchGet failed:', err)
        }
    }
    return map
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────
// Table: AuditLogs — PK: accountId (string), SK: ts (string, format: timestamp#logId)

export async function putAuditLog(log: AuditLog): Promise<void> {
    await docClient.send(new PutCommand({
        TableName: 'AuditLogs',
        Item: log,
    }))
}

export async function getAuditLogs(accountId: string, limit = 100): Promise<AuditLog[]> {
    const res = await docClient.send(new QueryCommand({
        TableName: 'AuditLogs',
        KeyConditionExpression: 'accountId = :aid',
        ExpressionAttributeValues: { ':aid': accountId },
        ScanIndexForward: false,
        Limit: limit,
    }))
    return (res.Items as AuditLog[]) ?? []
}
