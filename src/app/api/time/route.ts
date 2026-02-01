import {NextResponse} from 'next/server'

export async function GET(): Promise<NextResponse> {
    try {
        return NextResponse.json({time: Date.now()}, {status: 200})
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({error: 'Request failed'}, {status: 500})
    }
}
