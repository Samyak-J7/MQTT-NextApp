import {NextRequest, NextResponse} from 'next/server'
import {z} from 'zod'
import {DynamoDBClient} from '@aws-sdk/client-dynamodb'
import {DynamoDBDocumentClient, PutCommand} from '@aws-sdk/lib-dynamodb'

const SensorReadingSchema = z.object({
    deviceId: z.string().min(3).max(100),
    volume: z.number().min(0).max(10000)
})

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
})
const docClient = DynamoDBDocumentClient.from(client)

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const json = await req.json().catch(() => null)
        if (!json) {
            return NextResponse.json(
                {error: "Invalid JSON body"},
                {status: 400}
            )
        }

        const parsed = SensorReadingSchema.safeParse(json)
        if (!parsed.success) {
            return NextResponse.json(
                {error: parsed.error.flatten()},
                {status: 400}
            )
        }

        const body = parsed.data
        await docClient.send(
            new PutCommand({
                TableName: "SensorReadings",
                Item: {
                    deviceId: body.deviceId,
                    timestamp: Date.now(),
                    volume: body.volume,
                },
            })
        )

        return NextResponse.json({message: 'Saved'}, {status: 200})
    } catch (error) {
        console.error("Dynamo write failed:", error)
        return NextResponse.json(
            {error: "Internal server error"},
            {status: 500}
        )
    }
}
