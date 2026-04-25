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
        <div className="glass-card glass-card-hover p-5">
            <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: glow, color, border: `1px solid ${color}33` }}>
                    {icon}
                </div>
            </div>
            <div className="text-[2rem] font-extrabold text-text-primary leading-none">{value}</div>
            <div className="text-[0.8rem] text-text-secondary mt-1.5">{label}</div>
            {sub && <div className="text-[0.72rem] text-text-muted mt-0.5">{sub}</div>}
        </div>
    )
}

function StatusRow({ device }: { device: Device }) {
    const isOnline = device.lastSeen ? Date.now() - device.lastSeen < 5 * 60 * 1000 : false
    const last = device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : 'Never'

    return (
        <Link href={`/dashboard/devices/${device.deviceId}`} className="no-underline">
            <div className="glass-card-hover flex items-center gap-4 px-4 py-3.5 rounded-xl border border-transparent cursor-pointer">
                <span className={isOnline ? 'status-dot-online' : 'status-dot-offline'} />
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text-primary truncate">{device.name}</div>
                    <div className="text-xs text-text-muted font-mono">{device.deviceId}</div>
                </div>
                {device.location && (
                    <span className="text-xs text-text-muted hidden sm:block">📍 {device.location}</span>
                )}
                <div className="text-right flex-shrink-0">
                    <span className={isOnline ? 'badge-online' : 'badge-offline'}>
                        {isOnline ? '● Online' : '○ Offline'}
                    </span>
                    <div className="text-[0.7rem] text-text-muted mt-1">Last: {last}</div>
                </div>
            </div>
        </Link>
    )
}

export default function DashboardPage() {
    const [devices, setDevices] = useState<Device[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = () =>
            fetch('/api/devices')
                .then(r => r.json())
                .then(d => setDevices(d.devices ?? []))
                .finally(() => setLoading(false))

        load()
        const interval = setInterval(load, 20_000) // refresh live status every 20s
        return () => clearInterval(interval)
    }, [])

    const online = devices.filter(d => d.lastSeen && Date.now() - d.lastSeen < 5 * 60 * 1000).length
    const offline = devices.length - online
    const scheduled = devices.filter(d => (d.schedules ?? []).length > 0).length

    const statCards = [
        {
            label: 'Total Devices', value: devices.length,
            color: '#60a5fa', glow: 'rgba(59,130,246,0.15)',
            sub: `${scheduled} with schedules`,
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>,
        },
        {
            label: 'Online', value: online,
            color: '#4ade80', glow: 'rgba(34,197,94,0.15)',
            sub: 'Active right now',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>,
        },
        {
            label: 'Offline', value: offline,
            color: '#f87171', glow: 'rgba(239,68,68,0.1)',
            sub: 'Check connections',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23" /><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" /><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" /><path d="M10.71 5.05A16 16 0 0 1 22.56 9" /><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>,
        },
        {
            label: 'Schedules', value: devices.reduce((a, d) => a + (d.schedules?.length ?? 0), 0),
            color: '#c084fc', glow: 'rgba(139,92,246,0.15)',
            sub: 'Automated triggers',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
        },
    ]

    const quickActions = [
        { href: '/dashboard/devices', label: 'Add Device', icon: '+', color: '#3b82f6', glow: 'rgba(59,130,246,0.15)' },
        { href: '/dashboard/schedules', label: 'New Schedule', icon: '⏱', color: '#8b5cf6', glow: 'rgba(139,92,246,0.15)' },
        { href: '/dashboard/analytics', label: 'View Analytics', icon: '📊', color: '#06b6d4', glow: 'rgba(6,182,212,0.15)' },
    ]

    return (
        <div className="max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-[1.75rem] font-extrabold text-text-primary m-0">Overview</h1>
                <p className="text-text-secondary mt-1 text-[0.9rem]">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map(c => <StatsCard key={c.label} {...c} />)}
            </div>

            {/* Device list + Quick actions */}
            <div className="flex flex-col gap-6">
                {/* Device Status */}
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-text-primary m-0">Device Status</h2>
                        <Link href="/dashboard/devices" className="text-[#60a5fa] text-[0.8rem] no-underline hover:underline">
                            View all →
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <span className="spinner" />
                        </div>
                    ) : devices.length === 0 ? (
                        <div className="text-center py-10 text-text-muted">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                                className="mx-auto mb-4 opacity-40" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
                            </svg>
                            <p className="m-0 text-[0.9rem]">No devices yet.</p>
                            <Link href="/dashboard/devices" className="text-[#60a5fa] text-[0.85rem] mt-2 block hover:underline">
                                Add your first device →
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {devices.slice(0, 8).map(d => <StatusRow key={d.deviceId} device={d} />)}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="glass-card p-5">
                    <h2 className="text-base font-bold text-text-primary m-0 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {quickActions.map(a => (
                            <Link key={a.href} href={a.href} className="no-underline">
                                <div className="glass-card-hover p-4 rounded-xl text-center cursor-pointer"
                                    style={{ background: a.glow, border: `1px solid ${a.color}22` }}>
                                    <div className="text-2xl mb-2">{a.icon}</div>
                                    <div className="text-sm font-semibold" style={{ color: a.color }}>{a.label}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
