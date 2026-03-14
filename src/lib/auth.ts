import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getUserByEmail } from '@/lib/dynamo'

export const { handlers, signIn, signOut, auth } = NextAuth({
    session: { strategy: 'jwt' },
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.userId = user.id
                token.name = user.name
                token.email = user.email
            }
            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.userId as string
                session.user.name = token.name as string
                session.user.email = token.email as string
            }
            return session
        },
    },
    providers: [
        Credentials({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                const { email, password } = credentials as { email: string; password: string }
                if (!email || !password) return null

                const user = await getUserByEmail(email)
                if (!user) return null

                const valid = await bcrypt.compare(password, user.passwordHash)
                if (!valid) return null

                return { id: user.userId, name: user.name, email: user.email }
            },
        }),
    ],
})
