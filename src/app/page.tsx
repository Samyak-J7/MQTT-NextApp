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

/* ─── Feature Card ───────────────────────────────────────────── */
function FeatureCard({ icon, title, desc, color, glow }: { icon: string; title: string; desc: string; color: string; glow: string }) {
    return (
        <div
            className="rounded-[20px] p-7 transition-all duration-300 cursor-default border border-border-subtle"
            style={{ background: 'rgba(17,24,39,0.7)' }}
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
            <div className="w-13 h-13 rounded-2xl flex items-center justify-center text-2xl mb-4"
                 style={{ background: glow, border: `1px solid ${color}33`, width: '52px', height: '52px' }}>
                {icon}
            </div>
            <h3 className="text-[1.05rem] font-bold text-text-primary m-0 mb-2">{title}</h3>
            <p className="text-sm text-text-secondary m-0 leading-relaxed">{desc}</p>
        </div>
    )
}

/* ─── Pricing Card ───────────────────────────────────────────── */
function PricingCard({ name, price, period, desc, features, cta, highlight, color }: {
    name: string; price: string; period: string; desc: string;
    features: string[]; cta: string; highlight: boolean; color: string
}) {
    return (
        <div className="rounded-3xl p-8 relative overflow-hidden"
             style={{
                 background: highlight ? 'linear-gradient(160deg, rgba(59,130,246,0.12), rgba(139,92,246,0.12))' : 'rgba(17,24,39,0.7)',
                 border: highlight ? '1px solid rgba(59,130,246,0.4)' : '1px solid var(--border)',
                 transform: highlight ? 'scale(1.03)' : 'none',
                 boxShadow: highlight ? '0 24px 64px rgba(59,130,246,0.2)' : 'none',
             }}>
            {highlight && (
                <div className="absolute top-4 right-4 rounded-2xl px-3 py-1 text-[0.72rem] font-bold text-white tracking-widest uppercase"
                     style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' }}>
                    POPULAR
                </div>
            )}
            <div className="mb-6">
                <div className="text-[0.85rem] font-semibold uppercase tracking-wider mb-2" style={{ color }}>{name}</div>
                <div className="flex items-end gap-1 mb-2">
                    <span className="text-[2.75rem] font-black text-text-primary leading-none">{price}</span>
                    {period && <span className="text-sm text-text-muted mb-1.5">{period}</span>}
                </div>
                <p className="text-[0.85rem] text-text-secondary m-0">{desc}</p>
            </div>
            <Link href="/register" className="no-underline block mb-6">
                <button className="w-full py-3 rounded-xl text-white font-bold text-[0.9rem] cursor-pointer transition-all duration-200 hover:opacity-85 hover:-translate-y-px"
                        style={{
                            background: highlight ? 'linear-gradient(135deg,#3b82f6,#8b5cf6)' : 'transparent',
                            border: highlight ? 'none' : '1px solid var(--border-light)',
                        }}>
                    {cta}
                </button>
            </Link>
            <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
                {features.map((f, i) => (
                    <li key={i} className="flex gap-2.5 items-start text-[0.85rem] text-text-secondary">
                        <span className="text-[#4ade80] flex-shrink-0 mt-[0.05rem]">✓</span>
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
    const d2 = useCounter(99,    1500, statsRef.inView)
    const d3 = useCounter(340,   1600, statsRef.inView)
    const d4 = useCounter(4,     1200, statsRef.inView)

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
        { name: 'Starter', price: 'Free', period: '', desc: 'For hobbyists and personal projects.',
          features: ['Up to 3 devices', '7-day data history', 'Basic charts', '2 schedules per device', 'Community support'],
          cta: 'Get Started Free', highlight: false, color: '#60a5fa' },
        { name: 'Pro', price: '$19', period: '/mo', desc: 'For professionals and small teams.',
          features: ['Unlimited devices', '90-day data history', 'Advanced analytics', 'Unlimited schedules', 'Email alerts & webhooks', 'Priority support', 'CSV data export'],
          cta: 'Start Free Trial', highlight: true, color: '#3b82f6' },
        { name: 'Enterprise', price: '$79', period: '/mo', desc: 'For teams with mission-critical IoT fleets.',
          features: ['Everything in Pro', '1-year data retention', 'Custom MQTT broker', 'Team accounts (up to 20)', 'SSO / SAML support', 'SLA 99.9% uptime', 'Dedicated account manager'],
          cta: 'Contact Sales', highlight: false, color: '#c084fc' },
    ]

    const testimonials = [
        { name: 'Rahul Mehta',  role: 'CTO @ SmartFarm India', avatar: '🧑‍💼', text: 'We replaced a clunky custom dashboard with MQTT Hub in one weekend. The scheduling features alone saved us 30 hours a month of manual relay work.' },
        { name: 'Priya Nair',   role: 'IoT Engineer @ BuildTech', avatar: '👩‍💻', text: 'The real-time online/offline detection is incredibly accurate. The analytics helped us spot a faulty sensor in our warehouse network within hours.' },
        { name: 'Daniel Kim',   role: 'Maker & Instructor', avatar: '👨‍🏫', text: 'I use MQTT Hub to manage 15 ESP32 projects for my workshops. My students can see live data the moment they flash their boards. Absolutely love it.' },
    ]

    const steps = [
        { n: '01', title: 'Register & Connect', desc: 'Create a free account and add your IoT devices using their unique Device ID.' },
        { n: '02', title: 'Flash & Stream', desc: 'Point your ESP32 / Arduino to our readings endpoint — data appears on the dashboard instantly.' },
        { n: '03', title: 'Monitor & Automate', desc: 'Set schedules, view charts, and react to your device data — all from one beautiful dashboard.' },
    ]

    const navLinks = [
        { href: '#features', label: 'Features' },
        { href: '#how-it-works', label: 'How it works' },
        { href: '#pricing', label: 'Pricing' },
        { href: '#testimonials', label: 'Reviews' },
    ]

    const mobileNavLinks = ['#features', '#how-it-works', '#pricing', '#testimonials']

    return (
        <div className="min-h-screen font-sans bg-surface">
            {/* Animated background orbs */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute rounded-full animate-drift1"
                     style={{ top: '-5%', left: '15%', width: '700px', height: '700px', background: 'radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 70%)', filter: 'blur(60px)' }} />
                <div className="absolute rounded-full animate-drift2"
                     style={{ top: '30%', right: '5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />
                <div className="absolute rounded-full animate-drift3"
                     style={{ bottom: '10%', left: '30%', width: '600px', height: '400px', background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />
            </div>

            {/* ── Navbar ── */}
            <nav className="sticky top-0 z-[100] h-[65px] flex items-center justify-between px-6 border-b"
                 style={{ background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.06)' }}>
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 no-underline">
                    <div className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center"
                         style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', boxShadow: '0 4px 14px rgba(59,130,246,0.35)' }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 18v-6"/><path d="M10 18V5"/><path d="M14 18v-3"/><path d="M18 18v-8"/>
                        </svg>
                    </div>
                    <span className="font-extrabold text-base text-text-primary">MQTT<span className="text-[#60a5fa]">Hub</span></span>
                </Link>

                {/* Desktop nav links */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map(l => (
                        <a key={l.href} href={l.href} className="nav-link">{l.label}</a>
                    ))}
                </div>

                {/* Desktop CTA */}
                <div className="hidden md:flex gap-2.5 items-center">
                    {session ? (
                        <Link href="/dashboard">
                            <button className="btn-primary px-4 py-2 text-[0.85rem]">→ Dashboard</button>
                        </Link>
                    ) : (
                        <>
                            <Link href="/login" className="nav-link text-[0.875rem]">Sign in</Link>
                            <Link href="/register">
                                <button className="btn-primary px-4 py-2 text-[0.875rem]">Get started free</button>
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile hamburger */}
                <button
                    onClick={() => setMobileMenuOpen(o => !o)}
                    className="flex md:hidden items-center justify-center p-1.5 rounded-lg border border-border-subtle text-text-secondary cursor-pointer bg-transparent"
                    aria-label="Open menu"
                >
                    {mobileMenuOpen
                        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                    }
                </button>
            </nav>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="fixed top-[65px] left-0 right-0 z-[99] bg-card border-b border-border-subtle px-6 py-5 flex flex-col gap-3">
                    {mobileNavLinks.map(h => (
                        <a key={h} href={h} onClick={() => setMobileMenuOpen(false)}
                           className="text-text-secondary no-underline text-[0.9rem] font-medium py-1.5">
                            {h.replace('#','').replace(/-/g,' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </a>
                    ))}
                    <div className="border-t border-border-subtle pt-3 flex flex-col gap-2">
                        {session ? (
                            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                                <button className="btn-primary w-full justify-center py-2.5">→ Dashboard</button>
                            </Link>
                        ) : (
                            <>
                                <Link href="/login" onClick={() => setMobileMenuOpen(false)}
                                      className="text-text-secondary no-underline text-[0.9rem] font-medium py-1.5">
                                    Sign in
                                </Link>
                                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                                    <button className="btn-primary w-full justify-center py-2.5">Get started free</button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Hero ── */}
            <section className="relative z-10 px-6 pt-24 pb-20 text-center max-w-[900px] mx-auto">
                <div className="animate-float-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-7 border"
                     style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.25)' }}>
                    <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-shimmer"
                          style={{ boxShadow: '0 0 6px #22c55e' }} />
                    <span className="text-[0.8rem] font-semibold text-[#60a5fa] tracking-wide">
                        Now with AI-powered anomaly detection — coming soon
                    </span>
                </div>

                <h1 className="animate-float-up-1 text-[3.75rem] leading-[1.1] font-black m-0 mb-5 tracking-tight text-text-primary
                               text-[2.4rem] sm:text-[3.75rem]">
                    The IoT Dashboard<br />
                    <span style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #34d399 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        Built for Makers
                    </span>
                </h1>

                <p className="animate-float-up-2 text-[1.15rem] text-text-secondary leading-relaxed max-w-[620px] mx-auto mb-10">
                    Monitor every MQTT device in real time, automate with intelligent schedules, and visualise your sensor data — all in one stunning, secure dashboard.
                </p>

                <div className="animate-float-up-3 flex gap-3.5 justify-center flex-wrap">
                    <Link href={session ? '/dashboard' : '/register'}>
                        <button className="btn-primary px-8 py-3.5 text-base rounded-2xl gap-2">
                            {session ? '→ Go to Dashboard' : '🚀 Start for free'}
                        </button>
                    </Link>
                    <a href="#how-it-works">
                        <button className="btn-ghost px-8 py-3.5 text-base rounded-2xl">See how it works</button>
                    </a>
                </div>

                <p className="mt-5 text-xs text-text-muted">
                    No credit card required · Free plan forever · Setup in under 5 minutes
                </p>

                {/* Hero dashboard preview */}
                <div className="animate-float-up-4 mt-16 relative">
                    <div className="absolute inset-[-2px] rounded-3xl opacity-60"
                         style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.4), rgba(139,92,246,0.3), rgba(6,182,212,0.2))', filter: 'blur(12px)' }} />
                    <div className="relative rounded-[20px] p-5 text-left"
                         style={{ background: 'rgba(13,22,40,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
                        {/* Browser dots */}
                        <div className="flex gap-1.5 mb-4">
                            {['#ef4444','#f59e0b','#22c55e'].map(c => (
                                <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                            ))}
                        </div>
                        {/* Stat tiles */}
                        <div className="grid grid-cols-4 gap-2.5 mb-4">
                            {[
                                { label: 'Devices',   value: '24', color: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
                                { label: 'Online',    value: '19', color: '#4ade80', bg: 'rgba(34,197,94,0.12)' },
                                { label: 'Offline',   value: '5',  color: '#f87171', bg: 'rgba(239,68,68,0.1)' },
                                { label: 'Schedules', value: '38', color: '#c084fc', bg: 'rgba(139,92,246,0.12)' },
                            ].map(s => (
                                <div key={s.label} className="rounded-xl p-3"
                                     style={{ background: s.bg, border: `1px solid ${s.color}22` }}>
                                    <div className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
                                    <div className="text-[0.7rem] text-text-muted">{s.label}</div>
                                </div>
                            ))}
                        </div>
                        {/* Fake chart */}
                        <div className="rounded-xl p-4 mb-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <div className="text-[0.72rem] text-text-muted mb-3">Sensor Readings — Last 7 days</div>
                            <div className="flex gap-1.5 items-end h-[60px]">
                                {[38,55,42,70,62,85,58].map((h, i) => (
                                    <div key={i} className="flex-1 rounded-t-sm opacity-80"
                                         style={{ height: `${h}%`, background: 'linear-gradient(to top, #3b82f6, #8b5cf6)' }} />
                                ))}
                            </div>
                        </div>
                        {/* Fake device rows */}
                        <div className="flex flex-col gap-1.5">
                            {[
                                { name: 'Roof Sensor A',  id: 'ESP32_A1B2',  online: true },
                                { name: 'Basement Hub',   id: 'ESP32_C3D4',  online: true },
                                { name: 'Gate Controller',id: 'NODEMCU_F1', online: false },
                            ].map(d => (
                                <div key={d.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                                     style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    <span className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                                          style={{ background: d.online ? '#22c55e' : '#4b5563', boxShadow: d.online ? '0 0 6px #22c55e' : 'none' }} />
                                    <span className="flex-1 text-[0.78rem] font-semibold text-text-primary">{d.name}</span>
                                    <span className="text-[0.68rem] font-mono text-text-muted">{d.id}</span>
                                    <span className="text-[0.68rem] font-semibold" style={{ color: d.online ? '#4ade80' : 'var(--text-muted)' }}>
                                        {d.online ? '● Online' : '○ Offline'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Stats ── */}
            <section ref={statsRef.ref} className="relative z-10 py-12 px-6 border-t border-b border-border-subtle" style={{ background: 'rgba(255,255,255,0.01)' }}>
                <div className="max-w-[900px] mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                        {[
                            { val: d1.toLocaleString(), suffix: '+',         label: 'Connected Devices' },
                            { val: d2,                   suffix: '.9% uptime',label: 'Reliability SLA' },
                            { val: d3,                   suffix: '+',         label: 'Teams Using MQTTHub' },
                            { val: `<${d4}`,             suffix: 's latency', label: 'Average Data Delay' },
                        ].map((s, i) => (
                            <div key={i}>
                                <div className="text-[2.25rem] font-black leading-tight gradient-text">{s.val}{s.suffix}</div>
                                <div className="text-[0.82rem] text-text-muted mt-1.5">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section id="features" className="relative z-10 py-24 px-6 max-w-[1200px] mx-auto">
                <div className="text-center mb-14">
                    <div className="inline-flex px-3.5 py-1 rounded-full mb-4 border"
                         style={{ background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.25)' }}>
                        <span className="text-[0.78rem] font-semibold text-[#c084fc] tracking-wider uppercase">Everything You Need</span>
                    </div>
                    <h2 className="text-[2.5rem] font-black text-text-primary m-0 mb-4 tracking-tight">Built for serious IoT work</h2>
                    <p className="text-base text-text-secondary max-w-[520px] mx-auto leading-relaxed">
                        Every feature was designed around real MQTT workflows — from flashing your first microcontroller to managing an entire device fleet.
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {features.map(f => <FeatureCard key={f.title} {...f} />)}
                </div>
            </section>

            {/* ── How it works ── */}
            <section id="how-it-works" className="relative z-10 py-24 px-6 border-t border-b border-border-subtle" style={{ background: 'rgba(255,255,255,0.01)' }}>
                <div className="max-w-[900px] mx-auto text-center">
                    <div className="inline-flex px-3.5 py-1 rounded-full mb-4 border"
                         style={{ background: 'rgba(6,182,212,0.1)', borderColor: 'rgba(6,182,212,0.25)' }}>
                        <span className="text-[0.78rem] font-semibold text-[#22d3ee] tracking-wider uppercase">Quick Setup</span>
                    </div>
                    <h2 className="text-[2.5rem] font-black text-text-primary m-0 mb-4 tracking-tight">Up and running in minutes</h2>
                    <p className="text-text-secondary text-base leading-relaxed mb-14">
                        No complex infrastructure. No DevOps expertise needed. Just plug, flash, and monitor.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                        {steps.map((s, i) => (
                            <div key={i} className="relative p-7 rounded-[20px] border border-border-subtle" style={{ background: 'rgba(17,24,39,0.7)' }}>
                                <div className="text-[3rem] font-black text-border-light leading-none mb-4 tracking-tighter">{s.n}</div>
                                <h3 className="text-[1.05rem] font-bold text-text-primary m-0 mb-2">{s.title}</h3>
                                <p className="text-sm text-text-secondary m-0 leading-relaxed">{s.desc}</p>
                                {i < steps.length - 1 && (
                                    <div className="absolute top-7 -right-3 z-20 text-text-muted text-xl hidden md:block">→</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Pricing ── */}
            <section id="pricing" className="relative z-10 py-24 px-6 max-w-[1100px] mx-auto">
                <div className="text-center mb-14">
                    <div className="inline-flex px-3.5 py-1 rounded-full mb-4 border"
                         style={{ background: 'rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.25)' }}>
                        <span className="text-[0.78rem] font-semibold text-[#fbbf24] tracking-wider uppercase">Pricing</span>
                    </div>
                    <h2 className="text-[2.5rem] font-black text-text-primary m-0 mb-4 tracking-tight">Simple, honest pricing</h2>
                    <p className="text-text-secondary text-base leading-relaxed">Start free. Scale as you grow. No surprise bills.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
                    {pricing.map(p => <PricingCard key={p.name} {...p} />)}
                </div>
                <p className="text-center mt-8 text-[0.82rem] text-text-muted">
                    All plans include AWS-backed storage, MQTT support, and basic analytics. Prices in USD. Billed monthly.
                </p>
            </section>

            {/* ── Testimonials ── */}
            <section id="testimonials" className="relative z-10 py-24 px-6 border-t border-border-subtle" style={{ background: 'rgba(255,255,255,0.01)' }}>
                <div className="max-w-[1100px] mx-auto">
                    <div className="text-center mb-14">
                        <div className="inline-flex px-3.5 py-1 rounded-full mb-4 border"
                             style={{ background: 'rgba(52,211,153,0.1)', borderColor: 'rgba(52,211,153,0.25)' }}>
                            <span className="text-[0.78rem] font-semibold text-[#34d399] tracking-wider uppercase">Loved by Makers</span>
                        </div>
                        <h2 className="text-[2.5rem] font-black text-text-primary m-0 mb-4 tracking-tight">Don&apos;t take our word for it</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {testimonials.map((t, i) => (
                            <div key={i} className="rounded-[20px] p-7 border border-border-subtle" style={{ background: 'rgba(17,24,39,0.7)' }}>
                                <div className="flex gap-0.5 mb-4">
                                    {[...Array(5)].map((_, j) => <span key={j} className="text-[#fbbf24] text-[0.9rem]">★</span>)}
                                </div>
                                <p className="text-[0.9rem] text-text-secondary leading-relaxed m-0 mb-5 italic">&ldquo;{t.text}&rdquo;</p>
                                <div className="flex gap-3 items-center">
                                    <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-[1.1rem]"
                                         style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(139,92,246,0.2))', border: '1px solid rgba(59,130,246,0.3)' }}>
                                        {t.avatar}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-text-primary">{t.name}</div>
                                        <div className="text-xs text-text-muted">{t.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Final CTA ── */}
            <section className="relative z-10 py-24 px-6 text-center">
                <div className="max-w-[700px] mx-auto relative">
                    <div className="absolute inset-[-40px] pointer-events-none"
                         style={{ background: 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%)' }} />
                    <div className="inline-flex px-3.5 py-1 rounded-full mb-6 border"
                         style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.25)' }}>
                        <span className="text-[0.78rem] font-semibold text-[#60a5fa] tracking-wider uppercase">Get Started Today</span>
                    </div>
                    <h2 className="text-[2.75rem] font-black text-text-primary m-0 mb-5 tracking-tight leading-[1.15]">
                        Your IoT fleet deserves<br />a better dashboard
                    </h2>
                    <p className="text-base text-text-secondary leading-relaxed mb-10">
                        Join hundreds of engineers and makers who trust MQTTHub to keep their connected devices visible, automated, and under control.
                    </p>
                    <div className="flex gap-3.5 justify-center flex-wrap">
                        <Link href={session ? '/dashboard' : '/register'}>
                            <button className="btn-primary px-9 py-4 text-base rounded-2xl">
                                {session ? '→ Go to Dashboard' : '🚀 Start building for free'}
                            </button>
                        </Link>
                        <a href="mailto:hello@mqtthub.io">
                            <button className="btn-ghost px-8 py-4 text-base rounded-2xl">Talk to sales</button>
                        </a>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="relative z-10 border-t border-border-subtle pt-12 pb-8 px-6">
                <div className="max-w-[1100px] mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center gap-2 mb-3.5">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                                     style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                                        <path d="M6 18v-6"/><path d="M10 18V5"/><path d="M14 18v-3"/><path d="M18 18v-8"/>
                                    </svg>
                                </div>
                                <span className="font-extrabold text-[0.9rem] text-text-primary">MQTT<span className="text-[#60a5fa]">Hub</span></span>
                            </div>
                            <p className="text-[0.82rem] text-text-muted leading-relaxed m-0 max-w-[240px]">
                                The modern IoT management platform for engineers, makers, and teams who rely on MQTT.
                            </p>
                        </div>
                        {[
                            { title: 'Product',    links: ['Features','Pricing','Changelog','Roadmap'] },
                            { title: 'Developers', links: ['API Docs','MQTT Guide','SDKs','Status'] },
                            { title: 'Company',    links: ['About','Blog','Privacy','Terms'] },
                        ].map(col => (
                            <div key={col.title}>
                                <div className="text-[0.78rem] font-bold text-text-secondary uppercase tracking-wider mb-3.5">{col.title}</div>
                                <div className="flex flex-col gap-2">
                                    {col.links.map(l => (
                                        <a key={l} href="#" className="text-[0.82rem] text-text-muted no-underline transition-colors duration-150 hover:text-text-secondary">{l}</a>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between pt-6 border-t border-border-subtle flex-wrap gap-3">
                        <p className="text-[0.78rem] text-text-muted m-0">
                            © 2026 MQTTHub. All rights reserved. Built with ❤️ for the IoT community.
                        </p>
                        <div className="flex gap-4">
                            {['Twitter','GitHub','Discord'].map(s => (
                                <a key={s} href="#" className="text-[0.78rem] text-text-muted no-underline hover:text-text-secondary">{s}</a>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
