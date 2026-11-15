import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/v1/auth'
import { ApiError, ok, readJson, route, str } from '@/lib/v1/http'
import { createUser } from '@/lib/v1/store'

export const POST = route(async req => {
    const body = await readJson(req)
    const name = str(body.name, 'name', { max: 80 })!
    const email = str(body.email, 'email', { max: 254 })!.toLowerCase()
    const password = str(body.password, 'password', { max: 128 })!
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'bad_request', 'email is not valid')
    if (password.length < 8) throw new ApiError(400, 'bad_request', 'password must be at least 8 characters')

    const user = { email, userId: randomUUID(), name, passwordHash: await bcrypt.hash(password, 12), createdAt: Date.now() }
    await createUser(user)

    const token = await signToken(user)
    return ok({ token, user: { userId: user.userId, email, name } }, 201)
})
