import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUserByEmail, createUser } from '@/lib/dynamo'

function generateId(): string {
    // Use crypto.randomUUID if available, otherwise manual fallback
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const { name, email, password } = await req.json()

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
        }

        const existing = await getUserByEmail(email)
        if (existing) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
        }

        const passwordHash = await bcrypt.hash(password, 12)

        await createUser({
            userId: generateId(),
            email,
            name,
            passwordHash,
            createdAt: Date.now(),
        })

        return NextResponse.json({ message: 'Account created successfully' }, { status: 201 })
    } catch (error) {
        console.error('Register error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
