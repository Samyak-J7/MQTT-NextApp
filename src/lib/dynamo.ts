import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    DeleteCommand,
    QueryCommand,
    ScanCommand,
} from '@aws-sdk/lib-dynamodb'
import { User, Device, SensorReading } from '@/app/types'

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
})

export const docClient = DynamoDBDocumentClient.from(client)

// ─── Users ────────────────────────────────────────────────────────────────────

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

export async function getDevicesByUser(userId: string): Promise<Device[]> {
    const res = await docClient.send(new QueryCommand({
        TableName: 'MQTTDevices',
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
    }))
    return (res.Items as Device[]) ?? []
}

export async function getDevice(userId: string, deviceId: string): Promise<Device | null> {
    const res = await docClient.send(new GetCommand({
        TableName: 'MQTTDevices',
        Key: { userId, deviceId },
    }))
    return (res.Item as Device) ?? null
}

export async function putDevice(device: Device): Promise<void> {
    await docClient.send(new PutCommand({
        TableName: 'MQTTDevices',
        Item: device,
    }))
}

export async function deleteDevice(userId: string, deviceId: string): Promise<void> {
    await docClient.send(new DeleteCommand({
        TableName: 'MQTTDevices',
        Key: { userId, deviceId },
    }))
}

// ─── Readings ─────────────────────────────────────────────────────────────────

export async function getReadings(
    deviceId: string,
    fromTs?: number,
    toTs?: number,
    limit = 200
): Promise<SensorReading[]> {
    const needsTimestamp = Boolean(fromTs || toTs)

    const params = needsTimestamp
        ? {
            TableName: 'SensorReadings',
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
            TableName: 'SensorReadings',
            KeyConditionExpression: 'deviceId = :did',
            ExpressionAttributeValues: { ':did': deviceId },
            ScanIndexForward: false,
            Limit: limit,
          }

    const res = await docClient.send(new QueryCommand(params))
    return (res.Items as SensorReading[]) ?? []
}

export async function getAllDeviceReadingsSummary(): Promise<Record<string, SensorReading>> {
    // Scan all readings, return last reading per device (for dashboard status)
    const res = await docClient.send(new ScanCommand({ TableName: 'SensorReadings' }))
    const items = (res.Items as SensorReading[]) ?? []
    const map: Record<string, SensorReading> = {}
    for (const item of items) {
        const existing = map[item.deviceId]
        if (!existing || item.timestamp > existing.timestamp) {
            map[item.deviceId] = item
        }
    }
    return map
}
