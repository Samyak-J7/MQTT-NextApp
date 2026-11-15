import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

// Tables for the new mobile app (API v1). Separate from the legacy MQTT* tables.
//   Users    — PK email
//   Devices  — PK deviceId · GSI byUser (userId, createdAt)
//   Readings — PK deviceId, SK ts
export const TABLES = {
    users: 'Users',
    devices: 'Devices',
    readings: 'Readings',
}

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    // Set DYNAMODB_ENDPOINT to use a local DynamoDB during development.
    endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
})

export const db = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
})

export function isConditionFailed(err: unknown): boolean {
    return (err as { name?: string })?.name === 'ConditionalCheckFailedException'
}
