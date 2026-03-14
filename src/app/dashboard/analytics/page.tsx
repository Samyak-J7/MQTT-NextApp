'use client'
import { useEffect, useState } from 'react'
import { Device } from '@/app/types'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#a78bfa']

interface ChartEntry {
    day?: string
    month?: string
    readings: number
    volume: number
    online?: number
    uptime?: number
}

// Simulate weekly/monthly data based on devices
function generateWeeklyData(deviceCount: number): ChartEntry[] {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return days.map(day => ({
        day,
        readings: Math.floor(Math.random() * 80 * deviceCount + 20),
        online: Math.floor(Math.random() * deviceCount),
        volume: Math.floor(Math.random() * 500 + 100),
    }))
}

function generateMonthlyData(): ChartEntry[] {
    return Array.from({ length: 12 }, (_, i) => ({
        month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
        readings: Math.floor(Math.random() * 3000 + 500),
        volume: Math.floor(Math.random() * 8000 + 2000),
        uptime: Math.floor(Math.random() * 20 + 80),
    }))
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
    if (active && payload?.length) {
        return (
            <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.82rem',
            }}>
                <p style={{ color: 'var(--text-muted)', margin: '0 0 0.5rem', fontWeight: 600 }}>{label}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color, margin: '0.2rem 0', fontWeight: 600 }}>
                        {p.name}: {p.value.toLocaleString()}
                    </p>
                ))}
            </div>
        )
    }
    return null
}

export default function AnalyticsPage() {
    const [devices, setDevices] = useState<Device[]>([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<'weekly' | 'monthly'>('weekly')

    useEffect(() => {
        fetch('/api/devices').then(r => r.json())
            .then(d => setDevices(d.devices ?? []))
            .finally(() => setLoading(false))
    }, [])

    const weeklyData = generateWeeklyData(devices.length || 1)
    const monthlyData = generateMonthlyData()
    const displayData = view === 'weekly' ? weeklyData : monthlyData
    const xKey = view === 'weekly' ? 'day' : 'month'

    const online = devices.filter(d => d.lastSeen && Date.now() - d.lastSeen < 5 * 60 * 1000).length
    const offline = devices.length - online

    const pieData = devices.length > 0
        ? [
            { name: 'Online', value: online },
            { name: 'Offline', value: offline },
          ].filter(d => d.value > 0)
        : [{ name: 'No Devices', value: 1 }]

    const scheduleTypePie = [
        { name: 'Time Trigger', value: devices.reduce((a, d) => a + (d.schedules ?? []).filter(s => s.mode === 'TTR').length, 0) },
        { name: 'Sunrise', value: devices.reduce((a, d) => a + (d.schedules ?? []).filter(s => s.mode === 'SRS').length, 0) },
        { name: 'Sunset', value: devices.reduce((a, d) => a + (d.schedules ?? []).filter(s => s.mode === 'SST').length, 0) },
        { name: 'Switch', value: devices.reduce((a, d) => a + (d.schedules ?? []).filter(s => s.mode === 'SWITCH').length, 0) },
    ].filter(d => d.value > 0)

    const summaryStats = [
        { label: 'Total Readings (sim.)', value: weeklyData.reduce((a, d) => a + d.readings, 0).toLocaleString(), color: '#60a5fa' },
        { label: 'Avg Daily Volume', value: Math.floor(weeklyData.reduce((a, d) => a + d.volume, 0) / 7).toLocaleString(), color: '#34d399' },
        { label: 'Peak Day', value: weeklyData.reduce((a, d) => d.readings > a.readings ? d : a, weeklyData[0])?.day, color: '#c084fc' },
        { label: 'Device Uptime', value: `${Math.floor(Math.random() * 5 + 95)}%`, color: '#fbbf24' },
    ]

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Analytics</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                        Performance overview across all devices
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                    {(['weekly', 'monthly'] as const).map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={view === v ? 'btn-primary' : 'btn-ghost'}
                            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', textTransform: 'capitalize' }}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {summaryStats.map(s => (
                    <div key={s.label} className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <span className="spinner" style={{ width: '40px', height: '40px' }} />
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                    {/* Bar Chart - Readings */}
                    <div className="glass-card" style={{ padding: '1.25rem' }}>
                        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {view === 'weekly' ? 'Weekly' : 'Monthly'} Sensor Readings
                        </h2>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={displayData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey={xKey} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="readings" name="Readings" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Line Chart - Volume trend */}
                    <div className="glass-card" style={{ padding: '1.25rem' }}>
                        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Volume / Flow Trend
                        </h2>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={displayData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey={xKey} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone" dataKey="volume" name="Volume"
                                    stroke="#06b6d4" strokeWidth={2.5}
                                    dot={{ fill: '#06b6d4', strokeWidth: 0, r: 4 }}
                                    activeDot={{ r: 6, fill: '#06b6d4' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Pie Charts row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                        <div className="glass-card" style={{ padding: '1.25rem' }}>
                            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Device Status Distribution
                            </h2>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={pieData} cx="50%" cy="50%"
                                        innerRadius={55} outerRadius={85}
                                        paddingAngle={4} dataKey="value"
                                    >
                                        {pieData.map((_, i) => (
                                            <Cell key={i} fill={i === 0 ? '#22c55e' : '#4b5563'} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{v}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="glass-card" style={{ padding: '1.25rem' }}>
                            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Schedule Types
                            </h2>
                            {scheduleTypePie.length === 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    No schedules configured
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={scheduleTypePie} cx="50%" cy="50%"
                                            innerRadius={55} outerRadius={85}
                                            paddingAngle={4} dataKey="value"
                                        >
                                            {scheduleTypePie.map((_, i) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{v}</span>} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Device table */}
                    {devices.length > 0 && (
                        <div className="glass-card" style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '1.25rem 1.25rem 0' }}>
                                <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    Device Summary
                                </h2>
                            </div>
                            <table className="table-dark">
                                <thead>
                                    <tr>
                                        <th>Device</th>
                                        <th>Status</th>
                                        <th>Location</th>
                                        <th>Schedules</th>
                                        <th>Last Seen</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {devices.map(d => {
                                        const isOnline = d.lastSeen ? Date.now() - d.lastSeen < 5 * 60 * 1000 : false
                                        return (
                                            <tr key={d.deviceId}>
                                                <td>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</div>
                                                    <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{d.deviceId}</div>
                                                </td>
                                                <td>
                                                    <span className={isOnline ? 'badge-online' : 'badge-offline'}>
                                                        {isOnline ? '● Online' : '○ Offline'}
                                                    </span>
                                                </td>
                                                <td>{d.location ?? '—'}</td>
                                                <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                                    {(d.schedules ?? []).length}
                                                </td>
                                                <td style={{ fontSize: '0.8rem' }}>
                                                    {d.lastSeen ? new Date(d.lastSeen).toLocaleString() : 'Never'}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
