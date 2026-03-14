'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const result = await signIn('credentials', { email, password, redirect: false })
            if (result?.error) {
                toast.error('Invalid email or password')
            } else {
                router.push('/dashboard')
                router.refresh()
            }
        } catch {
            toast.error('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
            {/* Background orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[10%] left-[20%] w-[500px] h-[500px] rounded-full"
                     style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
                <div className="absolute bottom-[10%] right-[15%] w-[400px] h-[400px] rounded-full"
                     style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', filter: 'blur(40px)' }} />
            </div>

            <div className="relative z-10 w-full max-w-[420px]">
                {/* Logo heading */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                         style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', boxShadow: '0 8px 32px rgba(59,130,246,0.3)' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 18v-6"/><path d="M10 18V5"/><path d="M14 18v-3"/><path d="M18 18v-8"/>
                        </svg>
                    </div>
                    <h1 className="gradient-text text-[1.75rem] font-extrabold m-0">MQTT Dashboard</h1>
                    <p className="text-text-secondary mt-2 text-sm">Sign in to manage your IoT devices</p>
                </div>

                {/* Card */}
                <div className="glass-card p-8">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-text-secondary">Email address</label>
                            <input
                                className="input-dark"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-text-secondary">Password</label>
                            <input
                                className="input-dark"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn-primary w-full justify-center py-3 text-[0.95rem] mt-1"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner w-4 h-4 border-2" />
                                    Signing in...
                                </>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-border-subtle text-center text-sm text-text-muted">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-[#60a5fa] font-semibold no-underline hover:underline">
                            Create one
                        </Link>
                    </div>
                </div>

                <p className="text-center mt-6 text-xs text-text-muted">
                    © 2026 MQTT Dashboard. All rights reserved.
                </p>
            </div>
        </div>
    )
}
