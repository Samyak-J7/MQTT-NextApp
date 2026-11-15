import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/v1/auth'
import { ApiError, ok, readJson, route, str } from '@/lib/v1/http'
import { getUser } from '@/lib/v1/store'

export const POST = route(async req => {
    const body = await readJson(req)
    const email = str(body.email, 'email', { max: 254 })!.toLowerCase()
    const password = str(body.password, 'password', { max: 128 })!

    const user = await getUser(email)
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        throw new ApiError(401, 'invalid_credentials', 'Invalid email or password')
    }

    const token = await signToken(user)
    return ok({ token, user: { userId: user.userId, email: user.email, name: user.name } })
})
