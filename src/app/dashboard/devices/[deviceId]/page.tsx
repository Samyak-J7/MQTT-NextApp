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
                <div className="flex justify-between items-center mb-5">
                    <h3 className="m-0 text-text-primary text-[1.05rem] font-bold">Add Schedule</h3>
                    <button onClick={onClose} className="btn-ghost px-2 py-1">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.8rem] font-medium text-text-secondary">Trigger Mode</label>
                        <select
                            className="input-dark cursor-pointer"
                            value={form.mode}
                            onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}
                        >
                            <option value="TTR">⏱ Time Trigger</option>
                            <option value="SWITCH">🔘 Switch</option>
                            <option value="SRS">🌅 Sunrise</option>
                            <option value="SST">🌇 Sunset</option>
                        </select>
                    </div>
                    {form.mode === 'TTR' && (
                        <div className="flex gap-3">
                            <div className="flex-1 flex flex-col gap-1.5">
                                <label className="text-[0.8rem] font-medium text-text-secondary">Hour (0-23)</label>
                                <input className="input-dark" type="number" min="0" max="23" value={form.hh}
                                    onChange={e => setForm(f => ({ ...f, hh: e.target.value }))} />
                            </div>
                            <div className="flex-1 flex flex-col gap-1.5">
                                <label className="text-[0.8rem] font-medium text-text-secondary">Minute (0-59)</label>
                                <input className="input-dark" type="number" min="0" max="59" value={form.mm}
                                    onChange={e => setForm(f => ({ ...f, mm: e.target.value }))} />
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-[0.8rem] font-medium text-text-secondary mb-2">Relay Values (seconds on)</label>
                        <div className="grid grid-cols-2 gap-2">
                            {form.relays.map((v, i) => (
                                <div key={i}>
                                    <label className="text-[0.72rem] text-text-muted">Relay {i + 1}</label>
                                    <input className="input-dark mt-1" type="number" min="0" value={v}
                                        onChange={e => setForm(f => {
                                            const r = [...f.relays]; r[i] = e.target.value; return { ...f, relays: r }
                                        })} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-3 mt-1">
                        <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
                        <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Schedule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function formatTime(ts: number) { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
function formatDate(ts: number) { return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' }) }

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
    if (active && payload?.length) {
        return (
            <div className="bg-card border border-border-light rounded-xl px-4 py-3 text-[0.82rem]">
                <p className="text-text-muted m-0 mb-1.5">{label}</p>
                {payload.map((p, i) => (
                    <p key={i} className="text-[#60a5fa] m-0 font-semibold">{p.name}: {p.value}</p>
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
        fetch(`/api/devices/${deviceId}`).then(r => r.json()).then(d => setDevice(d.device ?? null))
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
            <div className="text-center py-16 text-text-muted">
                <p>Device not found.</p>
                <button onClick={() => router.back()} className="btn-ghost mt-4">← Go back</button>
            </div>
        )
    }

    const isOnline = device?.lastSeen ? Date.now() - device.lastSeen < 5 * 60 * 1000 : false

    const chartData = readings.map(r => ({
        time: range === '30d' ? formatDate(r.timestamp) : formatTime(r.timestamp),
        volume: r.volume, temperature: r.temperature, humidity: r.humidity,
    }))

    const displayData = chartData.length > 0 ? chartData : Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        volume: Math.floor(Math.random() * 80 + 20),
        temperature: Math.floor(Math.random() * 10 + 22),
        humidity: Math.floor(Math.random() * 20 + 50),
    }))

    const metaItems = [
        { label: 'Total Readings', value: readings.length || '—' },
        { label: 'Last Seen', value: device?.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never' },
        { label: 'Schedules', value: (device?.schedules ?? []).length },
        { label: 'Added', value: device?.createdAt ? new Date(device.createdAt).toLocaleDateString() : '—' },
    ]

    return (
        <div className="max-w-[1200px] mx-auto">
            {/* Back */}
            <button onClick={() => router.back()} className="btn-ghost mb-5 text-[0.85rem]">
                ← Back to Devices
            </button>

            {/* Header card */}
            <div className="glass-card p-6 mb-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[#60a5fa]"
                             style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(59,130,246,0.3)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-[1.4rem] font-extrabold text-text-primary m-0">
                                {device?.name ?? 'Loading...'}
                            </h1>
                            <p className="text-text-muted text-[0.8rem] m-0 mt-0.5 font-mono">{deviceId}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={isOnline ? 'badge-online' : 'badge-offline'}>
                            {isOnline ? '● Online' : '○ Offline'}
                        </span>
                        {device?.location && (
                            <span className="text-[0.8rem] text-text-secondary">📍 {device.location}</span>
                        )}
                    </div>
                </div>

                {/* Meta row */}
                <div className="flex gap-8 mt-5 flex-wrap">
                    {metaItems.map(m => (
                        <div key={m.label}>
                            <div className="text-[0.72rem] text-text-muted uppercase tracking-wider">{m.label}</div>
                            <div className="text-[0.9rem] font-semibold text-text-secondary mt-0.5">{m.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Charts */}
            <div className="glass-card p-5 mb-6">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <h2 className="m-0 text-base font-bold text-text-primary">Sensor Readings</h2>
                    <div className="flex gap-1.5">
                        {(['24h', '7d', '30d'] as Range[]).map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`${range === r ? 'btn-primary' : 'btn-ghost'} px-3.5 py-1.5 text-[0.8rem]`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="text-xs text-text-muted m-0 mb-4">
                        Volume/Flow — {range} window{chartData.length === 0 ? ' (simulated data)' : ''}
                    </p>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={displayData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
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
                    <div className="mt-5">
                        <p className="text-xs text-text-muted m-0 mb-3">Temperature &amp; Humidity</p>
                        <ResponsiveContainer width="100%" height={160}>
                            <LineChart data={displayData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="temperature" name="Temp °C"   stroke="#f59e0b" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="humidity"    name="Humidity %" stroke="#06b6d4" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Schedules */}
            <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="m-0 text-base font-bold text-text-primary">Schedules</h2>
                    <button onClick={() => setShowSchedule(true)} className="btn-primary px-3.5 py-1.5 text-[0.82rem]">
                        + Add Schedule
                    </button>
                </div>

                {(device?.schedules ?? []).length === 0 ? (
                    <div className="text-center py-8 text-text-muted text-sm">
                        No schedules configured yet.
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {device!.schedules!.map(s => (
                            <div key={s.scheduleId} className="glass-card-hover flex items-center gap-4 px-4 py-3.5 rounded-xl border border-border-subtle">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                                     style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
                                    {s.mode === 'TTR' ? '⏱' : s.mode === 'SRS' ? '🌅' : s.mode === 'SST' ? '🌇' : '🔘'}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-text-primary">
                                        {s.mode === 'TTR' ? `${s.trigAt?.slice(0,2)}:${s.trigAt?.slice(2,4)}` : s.mode}
                                    </div>
                                    <div className="text-[0.72rem] text-text-muted">Relays: [{s.relays.join(', ')}]</div>
                                </div>
                                <button onClick={() => deleteSchedule(s.scheduleId)} className="btn-danger px-2.5 py-1 text-xs">
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
