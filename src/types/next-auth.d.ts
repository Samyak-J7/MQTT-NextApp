import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
    interface User {
        accountId?: string
    }
    interface Session {
        user: {
            id: string
            accountId: string
        } & DefaultSession['user']
    }
}
