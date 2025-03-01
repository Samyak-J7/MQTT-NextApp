import { NextRequest, NextResponse } from 'next/server'
import { MQTTFormData } from '@/app/types'

export async function POST (req: NextRequest) {
  try {
    const body: MQTTFormData = await req.json()
    return NextResponse.json({ message: 'Success' }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Invalid Data Format' }, { status: 400 })
  }
}
