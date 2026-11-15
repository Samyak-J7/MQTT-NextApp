// Creates the mobile-app (API v1) tables. Safe to re-run: existing tables are skipped.
//
//   node --env-file=.env.local scripts/create-v1-tables.mjs

import { CreateTableCommand, DescribeTableCommand, DynamoDBClient, waitUntilTableExists } from '@aws-sdk/client-dynamodb'

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
})

const tables = [
    {
        TableName: 'Users',
        AttributeDefinitions: [{ AttributeName: 'email', AttributeType: 'S' }],
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
    },
    {
        TableName: 'Devices',
        AttributeDefinitions: [
            { AttributeName: 'deviceId', AttributeType: 'S' },
            { AttributeName: 'userId', AttributeType: 'S' },
            { AttributeName: 'createdAt', AttributeType: 'N' },
        ],
        KeySchema: [{ AttributeName: 'deviceId', KeyType: 'HASH' }],
        GlobalSecondaryIndexes: [{
            IndexName: 'byUser',
            KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }, { AttributeName: 'createdAt', KeyType: 'RANGE' }],
            Projection: { ProjectionType: 'ALL' },
        }],
    },
    {
        TableName: 'Readings',
        AttributeDefinitions: [
            { AttributeName: 'deviceId', AttributeType: 'S' },
            { AttributeName: 'ts', AttributeType: 'N' },
        ],
        KeySchema: [{ AttributeName: 'deviceId', KeyType: 'HASH' }, { AttributeName: 'ts', KeyType: 'RANGE' }],
    },
]

for (const table of tables) {
    try {
        await client.send(new DescribeTableCommand({ TableName: table.TableName }))
        console.log(`✓ ${table.TableName} already exists`)
        continue
    } catch (err) {
        if (err.name !== 'ResourceNotFoundException') throw err
    }
    await client.send(new CreateTableCommand({ ...table, BillingMode: 'PAY_PER_REQUEST' }))
    await waitUntilTableExists({ client, maxWaitTime: 300, minDelay: 2, maxDelay: 10 }, { TableName: table.TableName })
    console.log(`+ created ${table.TableName}`)
}
