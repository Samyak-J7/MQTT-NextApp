import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

// Tables for the new mobile app (API v1). Separate from the legacy MQTT* tables.
//   Users    — PK email
//   DeviceClaims — PK deviceId, SK userId · GSI byUser (userId, createdAt); up to 5 owners per device
//   Readings — PK deviceId, SK ts
// The older single-owner Devices table is only read by scripts/migrate-device-claims.mjs.
export const TABLES = {
    users: 'Users',
    deviceClaims: 'DeviceClaims',
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
