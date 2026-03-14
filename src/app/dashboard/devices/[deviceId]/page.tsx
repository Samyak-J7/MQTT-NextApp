'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Device, Schedule, SensorReading } from '@/app/types'
import { toast } from 'sonner'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line
} from 'recharts'

type Range = '24h' | '7d' | '30d'

function ScheduleModal({ deviceId, onClose, onAdded }: { deviceId: string; onClose: () => void; onAdded: (s: Schedule) => void }) {
    const [form, setForm] = useState({ mode: 'TTR', hh: '08', mm: '00', relays: ['0', '0', '0', '0'] })
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const trigAt = form.mode === 'TTR' ? `${form.hh.padStart(2,'0')}${form.mm.padStart(2,'0')}` : '0000'
            const res = await fetch(`/api/devices/${deviceId}/schedules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: form.mode, trigAt, relays: form.relays.map(Number) }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success('Schedule added!')
            onAdded(data.schedule)
            onClose()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 700 }}>Add Schedule</h3>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: '0.3rem 0.5rem' }}>✕</button>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Trigger Mode</label>
                        <select
                            className="input-dark"
                            value={form.mode}
                            onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}
                            style={{ cursor: 'pointer' }}
                        >
                            <option value="TTR">⏱ Time Trigger</option>
                            <option value="SWITCH">🔘 Switch</option>
                            <option value="SRS">🌅 Sunrise</option>
                            <option value="SST">🌇 Sunset</option>
                        </select>
                    </div>
                    {form.mode === 'TTR' && (
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Hour (0-23)</label>
                                <input className="input-dark" type="number" min="0" max="23" value={form.hh}
                                    onChange={e => setForm(f => ({ ...f, hh: e.target.value }))} />
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Minute (0-59)</label>
                                <input className="input-dark" type="number" min="0" max="59" value={form.mm}
                                    onChange={e => setForm(f => ({ ...f, mm: e.target.value }))} />
                            </div>
                        </div>
                    )}
                    <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Relay Values (seconds on)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            {form.relays.map((v, i) => (
                                <div key={i}>
                                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Relay {i + 1}</label>
                                    <input className="input-dark" type="number" min="0" value={v} style={{ marginTop: '0.25rem' }}
                                        onChange={e => setForm(f => {
                                            const r = [...f.relays]; r[i] = e.target.value; return { ...f, relays: r }
                                        })} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                        <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
                            {loading ? 'Adding...' : 'Add Schedule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
    if (active && payload?.length) {
        return (
            <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.82rem',
            }}>
                <p style={{ color: 'var(--text-muted)', margin: '0 0 0.375rem' }}>{label}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: '#60a5fa', margin: 0, fontWeight: 600 }}>
                        {p.name}: {p.value}
                    </p>
                ))}
            </div>
        )
    }
    return null
}

export default function DeviceDetailPage() {
    const { deviceId } = useParams() as { deviceId: string }
    const router = useRouter()
    const [device, setDevice] = useState<Device | null>(null)
    const [readings, setReadings] = useState<SensorReading[]>([])
    const [range, setRange] = useState<Range>('7d')
    const [loading, setLoading] = useState(true)
    const [showSchedule, setShowSchedule] = useState(false)

    const loadDevice = useCallback(() => {
        fetch(`/api/devices/${deviceId}`)
            .then(r => r.json())
            .then(d => setDevice(d.device ?? null))
    }, [deviceId])

    const loadReadings = useCallback(() => {
        fetch(`/api/devices/${deviceId}/readings?range=${range}`)
            .then(r => r.json())
            .then(d => setReadings(d.readings ?? []))
            .finally(() => setLoading(false))
    }, [deviceId, range])

    useEffect(() => { loadDevice(); loadReadings() }, [loadDevice, loadReadings])

    const deleteSchedule = async (scheduleId: string) => {
        try {
            await fetch(`/api/devices/${deviceId}/schedules`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scheduleId }),
            })
            toast.success('Schedule removed')
            loadDevice()
        } catch { toast.error('Failed to remove schedule') }
    }

    if (!device && !loading) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <p>Device not found.</p>
                <button onClick={() => router.back()} className="btn-ghost" style={{ marginTop: '1rem' }}>← Go back</button>
            </div>
        )
    }

    const isOnline = device?.lastSeen ? Date.now() - device.lastSeen < 5 * 60 * 1000 : false

    const chartData = readings.map(r => ({
        time: range === '30d' ? formatDate(r.timestamp) : formatTime(r.timestamp),
        volume: r.volume,
        temperature: r.temperature,
        humidity: r.humidity,
    }))

    // Generate mock data if no readings
    const displayData = chartData.length > 0 ? chartData : Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        volume: Math.floor(Math.random() * 80 + 20),
        temperature: Math.floor(Math.random() * 10 + 22),
        humidity: Math.floor(Math.random() * 20 + 50),
    }))

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Back */}
            <button onClick={() => router.back()} className="btn-ghost" style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                ← Back to Devices
            </button>

            {/* Header */}
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '16px',
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
                            border: '1px solid rgba(59,130,246,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa',
                        }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                            </svg>
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                                {device?.name ?? 'Loading...'}
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.2rem 0 0', fontFamily: 'monospace' }}>
                                {deviceId}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className={isOnline ? 'badge-online' : 'badge-offline'}>
                            {isOnline ? '● Online' : '○ Offline'}
                        </span>
                        {device?.location && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>📍 {device.location}</span>
                        )}
                    </div>
                </div>

                {/* Meta row */}
                <div style={{ display: 'flex', gap: '2rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                    {[
                        { label: 'Total Readings', value: readings.length || '—' },
                        { label: 'Last Seen', value: device?.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never' },
                        { label: 'Schedules', value: (device?.schedules ?? []).length },
                        { label: 'Added', value: device?.createdAt ? new Date(device.createdAt).toLocaleDateString() : '—' },
                    ].map(m => (
                        <div key={m.label}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{m.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Charts */}
            <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sensor Readings</h2>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                        {(['24h', '7d', '30d'] as Range[]).map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={range === r ? 'btn-primary' : 'btn-ghost'}
                                style={{ padding: '0.3rem 0.875rem', fontSize: '0.8rem' }}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
                        Volume/Flow — {range} window{chartData.length === 0 ? ' (simulated data)' : ''}
                    </p>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={displayData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="volume" name="Volume" stroke="#3b82f6" strokeWidth={2} fill="url(#volumeGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {displayData[0]?.temperature !== undefined && (
                    <div style={{ marginTop: '1.25rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>Temperature & Humidity</p>
                        <ResponsiveContainer width="100%" height={160}>
                            <LineChart data={displayData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="temperature" name="Temp °C" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="humidity" name="Humidity %" stroke="#06b6d4" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Schedules */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Schedules</h2>
                    <button onClick={() => setShowSchedule(true)} className="btn-primary" style={{ padding: '0.4rem 0.875rem', fontSize: '0.82rem' }}>
                        + Add Schedule
                    </button>
                </div>

                {(device?.schedules ?? []).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        No schedules configured yet.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {device!.schedules!.map(s => (
                            <div key={s.scheduleId} className="glass-card-hover" style={{
                                display: 'flex', alignItems: 'center', gap: '1rem',
                                padding: '0.875rem 1rem', borderRadius: '10px',
                                border: '1px solid var(--border)',
                            }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                                }}>
                                    {s.mode === 'TTR' ? '⏱' : s.mode === 'SRS' ? '🌅' : s.mode === 'SST' ? '🌇' : '🔘'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {s.mode === 'TTR' ? `${s.trigAt?.slice(0,2)}:${s.trigAt?.slice(2,4)}` : s.mode}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        Relays: [{s.relays.join(', ')}]
                                    </div>
                                </div>
                                <button onClick={() => deleteSchedule(s.scheduleId)} className="btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showSchedule && (
                <ScheduleModal
                    deviceId={deviceId}
                    onClose={() => setShowSchedule(false)}
                    onAdded={() => { loadDevice(); setShowSchedule(false) }}
                />
            )}
        </div>
    )
}
