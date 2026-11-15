import { requireUser } from '@/lib/v1/auth'
import { ApiError, ok, route } from '@/lib/v1/http'
import { getUser } from '@/lib/v1/store'

/** Who am I — the app calls this on start to check the saved token still works. */
export const GET = route(async req => {
    const auth = await requireUser(req)
    const user = await getUser(auth.email)
    if (!user) throw new ApiError(401, 'unauthorized', 'Account no longer exists')
    return ok({ user: { userId: user.userId, email: user.email, name: user.name } })
})
