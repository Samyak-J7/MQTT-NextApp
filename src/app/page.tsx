'use client'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useRef } from 'react'

/* ─── Animated counter hook ─────────────────────────────────── */
function useCounter(target: number, duration = 2000, start = false) {
    const [count, setCount] = useState(0)
    useEffect(() => {
        if (!start) return
        let current = 0
        const step = target / (duration / 16)
        const timer = setInterval(() => {
            current += step
            if (current >= target) { setCount(target); clearInterval(timer) }
            else setCount(Math.floor(current))
        }, 16)
        return () => clearInterval(timer)
    }, [target, duration, start])
    return count
}

/* ─── Intersection Observer hook ────────────────────────────── */
function useInView(threshold = 0.2) {
    const ref = useRef<HTMLDivElement>(null)
    const [inView, setInView] = useState(false)
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
        if (ref.current) obs.observe(ref.current)
        return () => obs.disconnect()
    }, [threshold])
    return { ref, inView }
}

/* ─── Reusable components ───────────────────────────────────── */
function FeatureCard({ icon, title, desc, color, glow }: { icon: string; title: string; desc: string; color: string; glow: string }) {
    return (
        <div style={{
            background: 'rgba(17,24,39,0.7)', border: '1px solid var(--border)',
            borderRadius: '20px', padding: '1.75rem',
            transition: 'all 0.3s ease', cursor: 'default',
        }}
            onMouseEnter={e => {
                const t = e.currentTarget
                t.style.transform = 'translateY(-4px)'
                t.style.borderColor = color + '44'
                t.style.boxShadow = `0 16px 48px ${glow}`
            }}
            onMouseLeave={e => {
                const t = e.currentTarget
                t.style.transform = 'none'
                t.style.borderColor = 'var(--border)'
                t.style.boxShadow = 'none'
            }}
        >
            <div style={{
                width: '52px', height: '52px', borderRadius: '14px',
                background: glow, border: `1px solid ${color}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', marginBottom: '1rem',
            }}>{icon}</div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>{title}</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.65 }}>{desc}</p>
        </div>
    )
}

function PricingCard({ name, price, period, desc, features, cta, highlight, color }: {
    name: string; price: string; period: string; desc: string;
    features: string[]; cta: string; highlight: boolean; color: string
}) {
    return (
        <div style={{
            background: highlight ? `linear-gradient(160deg, rgba(59,130,246,0.12), rgba(139,92,246,0.12))` : 'rgba(17,24,39,0.7)',
            border: highlight ? `1px solid rgba(59,130,246,0.4)` : '1px solid var(--border)',
            borderRadius: '24px', padding: '2rem',
            position: 'relative', overflow: 'hidden',
            transform: highlight ? 'scale(1.03)' : 'none',
            boxShadow: highlight ? '0 24px 64px rgba(59,130,246,0.2)' : 'none',
        }}>
            {highlight && (
                <div style={{
                    position: 'absolute', top: '1rem', right: '1rem',
                    background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
                    borderRadius: '20px', padding: '0.25rem 0.75rem',
                    fontSize: '0.72rem', fontWeight: 700, color: 'white', letterSpacing: '0.05em',
                }}>POPULAR</div>
            )}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>{name}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.25rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '2.75rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{price}</span>
                    {period && <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{period}</span>}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{desc}</p>
            </div>
            <Link href="/register" style={{ textDecoration: 'none', display: 'block', marginBottom: '1.5rem' }}>
                <button style={{
                    width: '100%', padding: '0.75rem',
                    background: highlight ? 'linear-gradient(135deg,#3b82f6,#8b5cf6)' : 'transparent',
                    border: highlight ? 'none' : '1px solid var(--border-light)',
                    borderRadius: '12px', color: 'white', fontWeight: 700, fontSize: '0.9rem',
                    cursor: 'pointer', transition: 'all 0.2s',
                    fontFamily: 'inherit',
                }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none' }}
                >{cta}</button>
            </Link>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span style={{ color: '#4ade80', flexShrink: 0, marginTop: '0.05rem' }}>✓</span>
                        {f}
                    </li>
                ))}
            </ul>
        </div>
    )
}

/* ─── Main page ─────────────────────────────────────────────── */
export default function HomePage() {
    const { data: session } = useSession()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const statsRef = useInView()
    const d1 = useCounter(12400, 1800, statsRef.inView)
    const d2 = useCounter(99, 1500, statsRef.inView)
    const d3 = useCounter(340, 1600, statsRef.inView)
    const d4 = useCounter(4, 1200, statsRef.inView)

    const features = [
        { icon: '📡', title: 'Real-Time Monitoring', desc: 'Watch your devices live with automatic online/offline detection. Get instant status updates without refresh.', color: '#60a5fa', glow: 'rgba(59,130,246,0.12)' },
        { icon: '📊', title: 'Advanced Analytics', desc: 'Visualise sensor data with interactive bar, line, and area charts. Toggle between 24h, 7-day, and 30-day windows.', color: '#c084fc', glow: 'rgba(139,92,246,0.12)' },
        { icon: '⏱', title: 'Smart Scheduling', desc: 'Automate device behaviour with time triggers, sunrise/sunset events, and custom relay configurations.', color: '#34d399', glow: 'rgba(52,211,153,0.12)' },
        { icon: '🔒', title: 'Secure Auth', desc: 'JWT-based sessions with bcrypt password hashing. Every API call is authenticated and scoped to your account only.', color: '#fbbf24', glow: 'rgba(251,191,36,0.12)' },
        { icon: '📱', title: 'Mobile Responsive', desc: 'Full dashboard experience on any screen. Collapsible sidebar on desktop, hamburger drawer on mobile.', color: '#f87171', glow: 'rgba(239,68,68,0.12)' },
        { icon: '☁️', title: 'AWS DynamoDB Backend', desc: 'Serverless, infinitely scalable data storage. Readings, devices, users and schedules all on DynamoDB.', color: '#06b6d4', glow: 'rgba(6,182,212,0.12)' },
        { icon: '🔄', title: 'MQTT Protocol', desc: 'Publish messages directly to your IoT broker. Supports QoS levels, retained messages, and custom topics.', color: '#a78bfa', glow: 'rgba(167,139,250,0.12)' },
        { icon: '🗂', title: 'Multi-Device CRUD', desc: 'Add, edit, and remove any number of devices by ID. Search and filter across your entire fleet instantly.', color: '#fb923c', glow: 'rgba(251,146,60,0.12)' },
    ]

    const pricing = [
        {
            name: 'Starter', price: 'Free', period: '', desc: 'For hobbyists and personal projects.',
            features: ['Up to 3 devices', '7-day data history', 'Basic charts', '2 schedules per device', 'Community support'],
            cta: 'Get Started Free', highlight: false, color: '#60a5fa',
        },
        {
            name: 'Pro', price: '$19', period: '/mo', desc: 'For professionals and small teams.',
            features: ['Unlimited devices', '90-day data history', 'Advanced analytics', 'Unlimited schedules', 'Email alerts & webhooks', 'Priority support', 'CSV data export'],
            cta: 'Start Free Trial', highlight: true, color: '#3b82f6',
        },
        {
            name: 'Enterprise', price: '$79', period: '/mo', desc: 'For teams with mission-critical IoT fleets.',
            features: ['Everything in Pro', '1-year data retention', 'Custom MQTT broker', 'Team accounts (up to 20)', 'SSO / SAML support', 'SLA 99.9% uptime', 'Dedicated account manager'],
            cta: 'Contact Sales', highlight: false, color: '#c084fc',
        },
    ]

    const testimonials = [
        { name: 'Rahul Mehta', role: 'CTO @ SmartFarm India', avatar: '🧑‍💼', text: 'We replaced a clunky custom dashboard with MQTT Hub in one weekend. The scheduling features alone saved us 30 hours a month of manual relay work.' },
        { name: 'Priya Nair', role: 'IoT Engineer @ BuildTech', avatar: '👩‍💻', text: 'The real-time online/offline detection is incredibly accurate. The analytics helped us spot a faulty sensor in our warehouse network within hours.' },
        { name: 'Daniel Kim', role: 'Maker & Instructor', avatar: '👨‍🏫', text: 'I use MQTT Hub to manage 15 ESP32 projects for my workshops. My students can see live data the moment they flash their boards. Absolutely love it.' },
    ]

    const steps = [
        { n: '01', title: 'Register & Connect', desc: 'Create a free account and add your IoT devices using their unique Device ID.' },
        { n: '02', title: 'Flash & Stream', desc: 'Point your ESP32 / Arduino to our readings endpoint — data appears on the dashboard instantly.' },
        { n: '03', title: 'Monitor & Automate', desc: 'Set schedules, view charts, and react to your device data — all from one beautiful dashboard.' },
    ]

    return (
        <div style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', background: 'var(--bg-primary)' }}>

            {/* ── Animated background orbs ── */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-5%', left: '15%', width: '700px', height: '700px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'drift1 20s ease-in-out infinite alternate' }} />
                <div style={{ position: 'absolute', top: '30%', right: '5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'drift2 25s ease-in-out infinite alternate' }} />
                <div style={{ position: 'absolute', bottom: '10%', left: '30%', width: '600px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'drift3 18s ease-in-out infinite alternate' }} />
            </div>

            <style>{`
                @keyframes drift1 { from { transform: translate(0,0) scale(1); } to { transform: translate(40px,60px) scale(1.1); } }
                @keyframes drift2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-50px,30px) scale(1.05); } }
                @keyframes drift3 { from { transform: translate(0,0) scale(1); } to { transform: translate(30px,-40px) scale(1.08); } }
                @keyframes floatUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
                @keyframes shimmer { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
                @keyframes spin-slow { to { transform: rotate(360deg); } }
                @keyframes bar-grow { from { height: 0; } }
                .hero-tag { animation: floatUp 0.7s ease forwards; }
                .hero-h1 { animation: floatUp 0.7s 0.1s ease both; }
                .hero-sub { animation: floatUp 0.7s 0.2s ease both; }
                .hero-cta { animation: floatUp 0.7s 0.3s ease both; }
                .hero-card { animation: floatUp 0.8s 0.4s ease both; }
                .nav-link { color: var(--text-secondary); text-decoration:none; font-size:0.875rem; font-weight:500; transition:color 0.15s; }
                .nav-link:hover { color: var(--text-primary); }
                @media (max-width: 768px) {
                    .nav-links { display: none; }
                    .mobile-nav-open { display: flex !important; }
                    .hero-h1-text { font-size: 2.4rem !important; }
                    .features-grid { grid-template-columns: 1fr 1fr !important; }
                    .pricing-grid { grid-template-columns: 1fr !important; }
                    .steps-grid { grid-template-columns: 1fr !important; }
                    .testi-grid { grid-template-columns: 1fr !important; }
                    .stats-grid { grid-template-columns: 1fr 1fr !important; }
                }
                @media (max-width: 480px) {
                    .features-grid { grid-template-columns: 1fr !important; }
                    .hero-h1-text { font-size: 1.9rem !important; }
                    .stats-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>

            {/* ── Navbar ── */}
            <nav style={{
                position: 'sticky', top: 0, zIndex: 100,
                background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '0 1.5rem', height: '65px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                {/* Logo */}
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
                    <div style={{ width: '34px', height: '34px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(59,130,246,0.35)' }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18v-6"/><path d="M10 18V5"/><path d="M14 18v-3"/><path d="M18 18v-8"/></svg>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>MQTT<span style={{ color: '#60a5fa' }}>Hub</span></span>
                </Link>

                {/* Desktop nav links */}
                <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <a href="#features" className="nav-link">Features</a>
                    <a href="#how-it-works" className="nav-link">How it works</a>
                    <a href="#pricing" className="nav-link">Pricing</a>
                    <a href="#testimonials" className="nav-link">Reviews</a>
                </div>

                {/* CTA */}
                <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                    {session ? (
                        <Link href="/dashboard">
                            <button className="btn-primary" style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem' }}>
                                → Dashboard
                            </button>
                        </Link>
                    ) : (
                        <>
                            <Link href="/login" className="nav-link" style={{ fontSize: '0.875rem' }}>Sign in</Link>
                            <Link href="/register">
                                <button className="btn-primary" style={{ padding: '0.5rem 1.1rem', fontSize: '0.875rem' }}>
                                    Get started free
                                </button>
                            </Link>
                        </>
                    )}
                    {/* Mobile hamburger */}
                    <button onClick={() => setMobileMenuOpen(o => !o)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', padding: '0.4rem', cursor: 'pointer', display: 'none' }} className="show-mobile">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                    </button>
                </div>
            </nav>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div style={{ position: 'fixed', top: '65px', left: 0, right: 0, zIndex: 99, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {['#features', '#how-it-works', '#pricing', '#testimonials'].map((h) => (
                        <a key={h} href={h} onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
                            {h.replace('#', '').replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </a>
                    ))}
                </div>
            )}

            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <section style={{ position: 'relative', zIndex: 1, padding: '6rem 1.5rem 5rem', textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
                <div className="hero-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '20px', padding: '0.35rem 1rem', marginBottom: '1.75rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', animation: 'shimmer 2s ease-in-out infinite' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#60a5fa', letterSpacing: '0.03em' }}>Now with AI-powered anomaly detection — coming soon</span>
                </div>

                <h1 className="hero-h1 hero-h1-text" style={{ fontSize: '3.75rem', fontWeight: 900, lineHeight: 1.1, margin: '0 0 1.25rem', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                    The IoT Dashboard<br />
                    <span style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #34d399 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        Built for Makers
                    </span>
                </h1>

                <p className="hero-sub" style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '620px', margin: '0 auto 2.5rem' }}>
                    Monitor every MQTT device in real time, automate with intelligent schedules, and visualise your sensor data — all in one stunning, secure dashboard.
                </p>

                <div className="hero-cta" style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link href={session ? '/dashboard' : '/register'}>
                        <button className="btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem', borderRadius: '14px', gap: '0.5rem' }}>
                            {session ? '→ Go to Dashboard' : '🚀 Start for free'}
                        </button>
                    </Link>
                    <a href="#how-it-works">
                        <button className="btn-ghost" style={{ padding: '0.875rem 2rem', fontSize: '1rem', borderRadius: '14px' }}>
                            See how it works
                        </button>
                    </a>
                </div>

                <p style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    No credit card required · Free plan forever · Setup in under 5 minutes
                </p>

                {/* Hero Dashboard Preview Card */}
                <div className="hero-card" style={{ marginTop: '4rem', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: '-2px', background: 'linear-gradient(135deg, rgba(59,130,246,0.4), rgba(139,92,246,0.3), rgba(6,182,212,0.2))', borderRadius: '24px', filter: 'blur(12px)', opacity: 0.6 }} />
                    <div style={{
                        position: 'relative', background: 'rgba(13,22,40,0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '20px', padding: '1.25rem', textAlign: 'left',
                        backdropFilter: 'blur(20px)',
                    }}>
                        {/* Fake browser bar */}
                        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
                            {['#ef4444','#f59e0b','#22c55e'].map(c => <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />)}
                        </div>
                        {/* Fake UI */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
                            {[
                                { label: 'Devices', value: '24', color: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
                                { label: 'Online', value: '19', color: '#4ade80', bg: 'rgba(34,197,94,0.12)' },
                                { label: 'Offline', value: '5', color: '#f87171', bg: 'rgba(239,68,68,0.1)' },
                                { label: 'Schedules', value: '38', color: '#c084fc', bg: 'rgba(139,92,246,0.12)' },
                            ].map(s => (
                                <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: '12px', padding: '0.75rem' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                        {/* Fake chart bars */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem', marginBottom: '0.75rem' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Sensor Readings — Last 7 days</div>
                            <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'flex-end', height: '60px' }}>
                                {[38,55,42,70,62,85,58].map((h, i) => (
                                    <div key={i} style={{ flex: 1, background: `linear-gradient(to top, #3b82f6, #8b5cf6)`, borderRadius: '4px 4px 0 0', height: `${h}%`, opacity: 0.8, transition: 'height 0.5s ease' }} />
                                ))}
                            </div>
                        </div>
                        {/* Fake device rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {[
                                { name: 'Roof Sensor A', id: 'ESP32_A1B2', online: true },
                                { name: 'Basement Hub', id: 'ESP32_C3D4', online: true },
                                { name: 'Gate Controller', id: 'NODEMCU_F1', online: false },
                            ].map(d => (
                                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: d.online ? '#22c55e' : '#4b5563', boxShadow: d.online ? '0 0 6px #22c55e' : 'none' }} />
                                    <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</span>
                                    <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{d.id}</span>
                                    <span style={{ fontSize: '0.68rem', color: d.online ? '#4ade80' : 'var(--text-muted)', fontWeight: 600 }}>{d.online ? '● Online' : '○ Offline'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Stats ─────────────────────────────────────────────────────── */}
            <section ref={statsRef.ref} style={{ position: 'relative', zIndex: 1, padding: '3rem 1.5rem', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', textAlign: 'center' }}>
                        {[
                            { val: d1.toLocaleString(), suffix: '+', label: 'Connected Devices' },
                            { val: d2, suffix: '.9% uptime', label: 'Reliability SLA' },
                            { val: d3, suffix: '+', label: 'Teams Using MQTTHub' },
                            { val: `<${d4}`, suffix: 's latency', label: 'Average Data Delay' },
                        ].map((s, i) => (
                            <div key={i}>
                                <div style={{ fontSize: '2.25rem', fontWeight: 900, background: 'linear-gradient(135deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1.1 }}>
                                    {s.val}{s.suffix}
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features ──────────────────────────────────────────────────── */}
            <section id="features" style={{ position: 'relative', zIndex: 1, padding: '6rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                    <div style={{ display: 'inline-flex', padding: '0.25rem 0.875rem', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '20px', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#c084fc', letterSpacing: '0.05em' }}>EVERYTHING YOU NEED</span>
                    </div>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 1rem', letterSpacing: '-0.02em' }}>Built for serious IoT work</h2>
                    <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>
                        Every feature was designed around real MQTT workflows — from flashing your first microcontroller to managing an entire device fleet.
                    </p>
                </div>
                <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                    {features.map((f) => <FeatureCard key={f.title} {...f} />)}
                </div>
            </section>

            {/* ── How it works ──────────────────────────────────────────────── */}
            <section id="how-it-works" style={{ position: 'relative', zIndex: 1, padding: '6rem 1.5rem', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', padding: '0.25rem 0.875rem', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: '20px', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#22d3ee', letterSpacing: '0.05em' }}>QUICK SETUP</span>
                    </div>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 1rem', letterSpacing: '-0.02em' }}>Up and running in minutes</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '3.5rem' }}>
                        No complex infrastructure. No DevOps expertise needed. Just plug, flash, and monitor.
                    </p>
                    <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', textAlign: 'left' }}>
                        {steps.map((s, i) => (
                            <div key={i} style={{ position: 'relative', padding: '1.75rem', background: 'rgba(17,24,39,0.7)', border: '1px solid var(--border)', borderRadius: '20px' }}>
                                <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--border-light)', lineHeight: 1, marginBottom: '1rem', letterSpacing: '-0.05em' }}>{s.n}</div>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>{s.title}</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.65 }}>{s.desc}</p>
                                {i < steps.length - 1 && (
                                    <div style={{ position: 'absolute', top: '1.75rem', right: '-0.75rem', zIndex: 2, color: 'var(--text-muted)', fontSize: '1.2rem' }}>→</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Pricing ───────────────────────────────────────────────────── */}
            <section id="pricing" style={{ position: 'relative', zIndex: 1, padding: '6rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                    <div style={{ display: 'inline-flex', padding: '0.25rem 0.875rem', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '20px', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fbbf24', letterSpacing: '0.05em' }}>PRICING</span>
                    </div>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 1rem', letterSpacing: '-0.02em' }}>Simple, honest pricing</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.7 }}>
                        Start free. Scale as you grow. No surprise bills.
                    </p>
                </div>
                <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', alignItems: 'center' }}>
                    {pricing.map(p => <PricingCard key={p.name} {...p} />)}
                </div>
                <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    All plans include AWS-backed storage, MQTT support, and basic analytics. Prices in USD. Billed monthly.
                </p>
            </section>

            {/* ── Testimonials ──────────────────────────────────────────────── */}
            <section id="testimonials" style={{ position: 'relative', zIndex: 1, padding: '6rem 1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <div style={{ display: 'inline-flex', padding: '0.25rem 0.875rem', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '20px', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#34d399', letterSpacing: '0.05em' }}>LOVED BY MAKERS</span>
                        </div>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 1rem', letterSpacing: '-0.02em' }}>Don&apos;t take our word for it</h2>
                    </div>
                    <div className="testi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                        {testimonials.map((t, i) => (
                            <div key={i} style={{ background: 'rgba(17,24,39,0.7)', border: '1px solid var(--border)', borderRadius: '20px', padding: '1.75rem' }}>
                                <div style={{ display: 'flex', gap: '0.15rem', marginBottom: '1rem' }}>
                                    {[...Array(5)].map((_, j) => <span key={j} style={{ color: '#fbbf24', fontSize: '0.9rem' }}>★</span>)}
                                </div>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 1.25rem', fontStyle: 'italic' }}>&ldquo;{t.text}&rdquo;</p>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(139,92,246,0.2))', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>{t.avatar}</div>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Final CTA ─────────────────────────────────────────────────── */}
            <section style={{ position: 'relative', zIndex: 1, padding: '6rem 1.5rem', textAlign: 'center' }}>
                <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: '-40px', background: 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ display: 'inline-flex', padding: '0.25rem 0.875rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '20px', marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#60a5fa', letterSpacing: '0.05em' }}>GET STARTED TODAY</span>
                    </div>
                    <h2 style={{ fontSize: '2.75rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 1.25rem', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                        Your IoT fleet deserves<br />a better dashboard
                    </h2>
                    <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '2.5rem' }}>
                        Join hundreds of engineers and makers who trust MQTTHub to keep their connected devices visible, automated, and under control.
                    </p>
                    <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link href={session ? '/dashboard' : '/register'}>
                            <button className="btn-primary" style={{ padding: '1rem 2.25rem', fontSize: '1rem', borderRadius: '14px' }}>
                                {session ? '→ Go to Dashboard' : '🚀 Start building for free'}
                            </button>
                        </Link>
                        <a href="mailto:hello@mqtthub.io">
                            <button className="btn-ghost" style={{ padding: '1rem 2rem', fontSize: '1rem', borderRadius: '14px' }}>
                                Talk to sales
                            </button>
                        </a>
                    </div>
                </div>
            </section>

            {/* ── Footer ────────────────────────────────────────────────────── */}
            <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid var(--border)', padding: '3rem 1.5rem 2rem' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '2rem', marginBottom: '2.5rem', flexWrap: 'wrap' as const }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                                <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M6 18v-6"/><path d="M10 18V5"/><path d="M14 18v-3"/><path d="M18 18v-8"/></svg>
                                </div>
                                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>MQTT<span style={{ color: '#60a5fa' }}>Hub</span></span>
                            </div>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.7, margin: 0, maxWidth: '240px' }}>
                                The modern IoT management platform for engineers, makers, and teams who rely on MQTT.
                            </p>
                        </div>
                        {[
                            { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
                            { title: 'Developers', links: ['API Docs', 'MQTT Guide', 'SDKs', 'Status'] },
                            { title: 'Company', links: ['About', 'Blog', 'Privacy', 'Terms'] },
                        ].map(col => (
                            <div key={col.title}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem' }}>{col.title}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {col.links.map(l => <a key={l} href="#" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>{l}</a>)}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                            © 2026 MQTTHub. All rights reserved. Built with ❤️ for the IoT community.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            {['Twitter', 'GitHub', 'Discord'].map(s => <a key={s} href="#" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none' }}>{s}</a>)}
                        </div>
                    </div>
                </div>
            </footer>

            <style>{`
                @media (max-width: 900px) {
                    .features-grid { grid-template-columns: 1fr 1fr !important; }
                }
                @media (max-width: 768px) {
                    footer > div > div:first-child { grid-template-columns: 1fr 1fr !important; }
                }
                @media (max-width: 480px) {
                    footer > div > div:first-child { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    )
}
