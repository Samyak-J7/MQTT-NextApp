'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

export default function RegisterPage() {
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
        if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
        setLoading(true)
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success('Account created! Please sign in.')
            router.push('/login')
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    const fields = [
        { label: 'Full Name',        key: 'name',     type: 'text',     placeholder: 'John Doe' },
        { label: 'Email address',    key: 'email',    type: 'email',    placeholder: 'you@example.com' },
        { label: 'Password',         key: 'password', type: 'password', placeholder: '••••••••' },
        { label: 'Confirm Password', key: 'confirm',  type: 'password', placeholder: '••••••••' },
    ]

    return (
        <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
            {/* Background orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[20%] right-[15%] w-[400px] h-[400px] rounded-full"
                     style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
                <div className="absolute bottom-[5%] left-[10%] w-[500px] h-[400px] rounded-full"
                     style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />
            </div>

            <div className="relative z-10 w-full max-w-[420px]">
                {/* Logo heading */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                         style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', boxShadow: '0 8px 32px rgba(139,92,246,0.3)' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                            <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                        </svg>
                    </div>
                    <h1 className="gradient-text text-[1.75rem] font-extrabold m-0">Create Account</h1>
                    <p className="text-text-secondary mt-2 text-sm">Start monitoring your IoT devices</p>
                </div>

                {/* Card */}
                <div className="glass-card p-8">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-[1.125rem]">
                        {fields.map(field => (
                            <div key={field.key} className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-text-secondary">{field.label}</label>
                                <input
                                    className="input-dark"
                                    type={field.type}
                                    placeholder={field.placeholder}
                                    value={form[field.key as keyof typeof form]}
                                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                                    required
                                />
                            </div>
                        ))}
                        <button
                            type="submit"
                            className="btn-primary w-full justify-center py-3 text-[0.95rem] mt-1"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner w-4 h-4 border-2" />
                                    Creating account...
                                </>
                            ) : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-border-subtle text-center text-sm text-text-muted">
                        Already have an account?{' '}
                        <Link href="/login" className="text-[#60a5fa] font-semibold no-underline hover:underline">
                            Sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
