import { NextRequest, NextResponse } from 'next/server'

// Errors are always { error: { code, message } } so the app can switch on code.
export class ApiError extends Error {
    constructor(public status: number, public code: string, message: string) {
        super(message)
    }
}

export function ok(body: unknown, status = 200): NextResponse {
    return NextResponse.json(body, { status })
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<NextResponse>

export function route<C = unknown>(handler: Handler<C>): Handler<C> {
    return async (req, ctx) => {
        try {
            return await handler(req, ctx)
        } catch (err) {
            if (err instanceof ApiError) {
                return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status })
            }
            console.error(`[api/v1] ${req.method} ${req.nextUrl.pathname}:`, err)
            return NextResponse.json({ error: { code: 'internal', message: 'Internal server error' } }, { status: 500 })
        }
    }
}

export async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
    try {
        const body = await req.json()
        if (body && typeof body === 'object' && !Array.isArray(body)) return body
    } catch {
        // fall through
    }
    throw new ApiError(400, 'bad_request', 'Body must be a JSON object')
}

export function str(value: unknown, field: string, { required = true, max = 100 } = {}): string | undefined {
    if (value === undefined || value === null || value === '') {
        if (required) throw new ApiError(400, 'bad_request', `${field} is required`)
        return undefined
    }
    if (typeof value !== 'string' || value.trim().length > max) {
        throw new ApiError(400, 'bad_request', `${field} must be a string of at most ${max} characters`)
    }
    return value.trim()
}

/** BLE MAC as 12 upper-case hex digits; accepts "e0:72:a1:..." too. */
export function deviceId(value: unknown): string {
    const id = typeof value === 'string' ? value.replace(/[:\-\s]/g, '').toUpperCase() : ''
    if (!/^[0-9A-F]{12}$/.test(id)) throw new ApiError(400, 'bad_request', 'deviceId must be a 12-digit hex BLE MAC')
    return id
}
