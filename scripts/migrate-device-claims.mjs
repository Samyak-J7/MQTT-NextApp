// Copies every device from the old single-owner `Devices` table into `DeviceClaims`
// (each becomes that owner's claim, and the device's claim count starts at 1).
// Safe to re-run: devices already copied are skipped. Leaves `Devices` untouched.
//
//   node --env-file=.env.local scripts/migrate-device-claims.mjs

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb'

const db = DynamoDBDocumentClient.from(new DynamoDBClient({
    region: process.env.AWS_REGION,
    endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
}), { marshallOptions: { removeUndefinedValues: true } })

let copied = 0
let skipped = 0
let startKey
do {
    const page = await db.send(new ScanCommand({ TableName: 'Devices', ExclusiveStartKey: startKey }))
    for (const device of page.Items ?? []) {
        try {
            await db.send(new TransactWriteCommand({
                TransactItems: [
                    { Put: { TableName: 'DeviceClaims', Item: device, ConditionExpression: 'attribute_not_exists(userId)' } },
                    {
                        Update: {
                            TableName: 'DeviceClaims',
                            Key: { deviceId: device.deviceId, userId: '#count' },
                            UpdateExpression: 'ADD claims :one',
                            ExpressionAttributeValues: { ':one': 1 },
                        },
                    },
                ],
            }))
            copied++
        } catch (err) {
            if (err.name !== 'TransactionCanceledException' || err.CancellationReasons?.[0]?.Code !== 'ConditionalCheckFailed') throw err
            skipped++
        }
    }
    startKey = page.LastEvaluatedKey
} while (startKey)

console.log(`copied ${copied}, already there ${skipped}`)
