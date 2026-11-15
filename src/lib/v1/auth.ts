import { timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'
import { ApiError } from './http'

// One long-lived bearer token per login (no refresh tokens yet).
const TOKEN_TTL = '30d'

function secret(): Uint8Array {
    const s = process.env.API_JWT_SECRET
    if (!s || s.length < 32) throw new Error('API_JWT_SECRET must be set (at least 32 characters)')
    return new TextEncoder().encode(s)
}

export interface AuthUser {
    userId: string
    email: string
}

export function signToken(user: AuthUser): Promise<string> {
    return new SignJWT({ email: user.email })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(user.userId)
        .setIssuedAt()
        .setExpirationTime(TOKEN_TTL)
        .sign(secret())
}

function bearer(req: NextRequest): string | null {
    const m = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') ?? '')
    return m ? m[1].trim() : null
}

export async function requireUser(req: NextRequest): Promise<AuthUser> {
    const token = bearer(req)
    if (!token) throw new ApiError(401, 'unauthorized', 'Login required')
    try {
        const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] })
        return { userId: String(payload.sub), email: String(payload.email) }
    } catch {
        throw new ApiError(401, 'unauthorized', 'Session expired, please log in again')
    }
}

/** The mqtt-bridge authenticates with the shared BRIDGE_API_KEY. */
export function requireBridge(req: NextRequest): void {
    const key = process.env.BRIDGE_API_KEY
    const token = bearer(req)
    const valid = !!key && !!token && token.length === key.length && timingSafeEqual(Buffer.from(token), Buffer.from(key))
    if (!valid) throw new ApiError(401, 'unauthorized', 'Invalid bridge key')
}
