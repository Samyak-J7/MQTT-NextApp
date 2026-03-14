'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Device } from '@/app/types'

interface StatsCardProps {
    label: string
    value: string | number
    icon: React.ReactNode
    color: string
    glow: string
    sub?: string
}

function StatsCard({ label, value, icon, color, glow, sub }: StatsCardProps) {
    return (
        <div className="glass-card glass-card-hover" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: glow, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color, border: `1px solid ${color}33`,
                }}>
                    {icon}
                </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.375rem' }}>{label}</div>
            {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{sub}</div>}
        </div>
    )
}

function StatusRow({ device }: { device: Device }) {
    const isOnline = device.lastSeen ? Date.now() - device.lastSeen < 5 * 60 * 1000 : false
    const last = device.lastSeen
        ? new Date(device.lastSeen).toLocaleTimeString()
        : 'Never'

    return (
        <Link href={`/dashboard/devices/${device.deviceId}`} style={{ textDecoration: 'none' }}>
            <div className="glass-card-hover" style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.875rem 1rem', borderRadius: '10px',
                border: '1px solid transparent', cursor: 'pointer',
            }}>
                <span className={isOnline ? 'status-dot-online' : 'status-dot-offline'} />
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{device.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{device.deviceId}</div>
                </div>
                {device.location && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 {device.location}</span>
                )}
                <div style={{ textAlign: 'right' }}>
                    <span className={isOnline ? 'badge-online' : 'badge-offline'}>
                        {isOnline ? '● Online' : '○ Offline'}
                    </span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Last: {last}</div>
                </div>
            </div>
        </Link>
    )
}

export default function DashboardPage() {
    const [devices, setDevices] = useState<Device[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/devices')
            .then(r => r.json())
            .then(d => setDevices(d.devices ?? []))
            .finally(() => setLoading(false))
    }, [])

    const online = devices.filter(d => d.lastSeen && Date.now() - d.lastSeen < 5 * 60 * 1000).length
    const offline = devices.length - online
    const scheduled = devices.filter(d => (d.schedules ?? []).length > 0).length

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Overview
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {/* Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem', marginBottom: '2rem'
            }}>
                <StatsCard
                    label="Total Devices" value={devices.length}
                    color="#60a5fa" glow="rgba(59,130,246,0.15)"
                    sub={`${scheduled} with schedules`}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>}
                />
                <StatsCard
                    label="Online" value={online}
                    color="#4ade80" glow="rgba(34,197,94,0.15)"
                    sub="Active right now"
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>}
                />
                <StatsCard
                    label="Offline" value={offline}
                    color="#f87171" glow="rgba(239,68,68,0.1)"
                    sub="Check connections"
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>}
                />
                <StatsCard
                    label="Schedules" value={devices.reduce((a, d) => a + (d.schedules?.length ?? 0), 0)}
                    color="#c084fc" glow="rgba(139,92,246,0.15)"
                    sub="Automated triggers"
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                />
            </div>

            {/* Device Status List */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                            Device Status
                        </h2>
                        <Link href="/dashboard/devices" style={{ color: '#60a5fa', fontSize: '0.8rem', textDecoration: 'none' }}>
                            View all →
                        </Link>
                    </div>

                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                            <span className="spinner" />
                        </div>
                    ) : devices.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} strokeLinecap="round" strokeLinejoin="round">
                                <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                            </svg>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>No devices yet.</p>
                            <Link href="/dashboard/devices" style={{ color: '#60a5fa', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
                                Add your first device →
                            </Link>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {devices.slice(0, 8).map(d => <StatusRow key={d.deviceId} device={d} />)}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>
                        Quick Actions
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                        {[
                            { href: '/dashboard/devices', label: 'Add Device', icon: '+', color: '#3b82f6', glow: 'rgba(59,130,246,0.15)' },
                            { href: '/dashboard/schedules', label: 'New Schedule', icon: '⏱', color: '#8b5cf6', glow: 'rgba(139,92,246,0.15)' },
                            { href: '/dashboard/analytics', label: 'View Analytics', icon: '📊', color: '#06b6d4', glow: 'rgba(6,182,212,0.15)' },
                        ].map(a => (
                            <Link key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
                                <div className="glass-card-hover" style={{
                                    padding: '1rem', borderRadius: '12px', textAlign: 'center',
                                    background: a.glow, border: `1px solid ${a.color}22`,
                                    cursor: 'pointer',
                                }}>
                                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{a.icon}</div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: a.color }}>{a.label}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
