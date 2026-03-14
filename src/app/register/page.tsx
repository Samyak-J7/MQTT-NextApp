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
        if (form.password !== form.confirm) {
            toast.error('Passwords do not match')
            return
        }
        if (form.password.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }
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

    return (
        <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
            <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                <div style={{
                    position: 'absolute', top: '20%', right: '15%',
                    width: '400px', height: '400px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
                    filter: 'blur(40px)'
                }} />
                <div style={{
                    position: 'absolute', bottom: '5%', left: '10%',
                    width: '500px', height: '400px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
                    filter: 'blur(40px)'
                }} />
            </div>

            <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '56px', height: '56px',
                        background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                        borderRadius: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1rem',
                        boxShadow: '0 8px 32px rgba(139,92,246,0.3)',
                    }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                            <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                        </svg>
                    </div>
                    <h1 className="gradient-text" style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
                        Create Account
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                        Start monitoring your IoT devices
                    </p>
                </div>

                <div className="glass-card" style={{ padding: '2rem' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                        {[
                            { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Doe' },
                            { label: 'Email address', key: 'email', type: 'email', placeholder: 'you@example.com' },
                            { label: 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
                            { label: 'Confirm Password', key: 'confirm', type: 'password', placeholder: '••••••••' },
                        ].map(field => (
                            <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                    {field.label}
                                </label>
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
                            className="btn-primary"
                            disabled={loading}
                            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem', marginTop: '0.25rem' }}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                                    Creating account...
                                </>
                            ) : 'Create Account'}
                        </button>
                    </form>

                    <div style={{
                        marginTop: '1.5rem', paddingTop: '1.5rem',
                        borderTop: '1px solid var(--border)',
                        textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)'
                    }}>
                        Already have an account?{' '}
                        <Link href="/login" style={{ color: '#60a5fa', fontWeight: 600, textDecoration: 'none' }}>
                            Sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
