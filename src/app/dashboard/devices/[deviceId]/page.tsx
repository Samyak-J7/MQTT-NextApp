'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Device, Schedule, SensorReading, DeviceType, DEVICE_TYPE_LABELS } from '@/app/types'
import { toast } from 'sonner'
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line
} from 'recharts'

type Range = '24h' | '7d' | '30d'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(ts: number) { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
function fmtDate(ts: number) { return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' }) }
function fmtTs(ts: number, range: Range) { return range === '30d' ? fmtDate(ts) : fmtTime(ts) }

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color?: string }>; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-card border border-border-light rounded-xl px-4 py-3 text-[0.82rem]">
            <p className="text-text-muted m-0 mb-1.5">{label}</p>
            {payload.map((p, i) => (
                <p key={i} className="m-0 font-semibold" style={{ color: p.color ?? '#60a5fa' }}>
                    {p.name}: {p.value}
                </p>
            ))}
        </div>
    )
}

// ── Graphs: OMS ────────────────────────────────────────────────────────────────

function OmsCharts({ readings, range }: { readings: SensorReading[]; range: Range }) {
    const data = readings.map(r => ({
        time: fmtTs(r.timestamp, range),
        duration_min: parseFloat((r.duration / 60).toFixed(1)),
    }))

    const totalMin = readings.reduce((s, r) => s + r.duration, 0) / 60
    const sessions = readings.length

    return (
        <div>
            <div className="flex gap-6 mb-5 flex-wrap">
                <div>
                    <div className="text-[0.72rem] text-text-muted uppercase tracking-wider">Sessions</div>
                    <div className="text-[1.4rem] font-extrabold text-[#fbbf24]">{sessions}</div>
                </div>
                <div>
                    <div className="text-[0.72rem] text-text-muted uppercase tracking-wider">Total Active</div>
                    <div className="text-[1.4rem] font-extrabold text-[#fbbf24]">{totalMin.toFixed(1)} min</div>
                </div>
                <div>
                    <div className="text-[0.72rem] text-text-muted uppercase tracking-wider">Avg Duration</div>
                    <div className="text-[1.4rem] font-extrabold text-[#fbbf24]">
                        {sessions > 0 ? (totalMin / sessions).toFixed(1) : '—'} min
                    </div>
                </div>
            </div>

            <p className="text-xs text-text-muted m-0 mb-3">Session Duration (minutes)</p>
            <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" min" />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="duration_min" name="Duration (min)" fill="#fbbf24" radius={[4, 4, 0, 0]} opacity={0.85} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

// ── Graphs: Liquid Flow ───────────────────────────────────────────────────────

function FlowCharts({ readings, range }: { readings: SensorReading[]; range: Range }) {
    let cumulative = 0
    const data = readings.map(r => {
        cumulative += r.consumption ?? 0
        const rate = r.duration > 0 && r.consumption != null
            ? parseFloat(((r.consumption / r.duration) * 3600).toFixed(2))
            : 0
        return {
            time: fmtTs(r.timestamp, range),
            consumption: parseFloat((r.consumption ?? 0).toFixed(2)),
            cumulative: parseFloat(cumulative.toFixed(2)),
            rate_per_hour: rate,
        }
    })

    const totalConsumption = readings.reduce((s, r) => s + (r.consumption ?? 0), 0)
    const avgRate = data.length > 0
        ? data.reduce((s, d) => s + d.rate_per_hour, 0) / data.length
        : 0

    return (
        <div>
            <div className="flex gap-6 mb-5 flex-wrap">
                <div>
                    <div className="text-[0.72rem] text-text-muted uppercase tracking-wider">Total Consumption</div>
                    <div className="text-[1.4rem] font-extrabold text-[#22d3ee]">{totalConsumption.toFixed(1)} L</div>
                </div>
                <div>
                    <div className="text-[0.72rem] text-text-muted uppercase tracking-wider">Avg Flow Rate</div>
                    <div className="text-[1.4rem] font-extrabold text-[#22d3ee]">{avgRate.toFixed(1)} L/hr</div>
                </div>
                <div>
                    <div className="text-[0.72rem] text-text-muted uppercase tracking-wider">Readings</div>
                    <div className="text-[1.4rem] font-extrabold text-[#22d3ee]">{readings.length}</div>
                </div>
            </div>

            <p className="text-xs text-text-muted m-0 mb-3">Consumption per session (L)</p>
            <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" L" />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="consumption" name="Consumption (L)" stroke="#22d3ee" strokeWidth={2} fill="url(#flowGrad)" />
                </AreaChart>
            </ResponsiveContainer>

            <p className="text-xs text-text-muted m-0 mt-5 mb-3">Cumulative total (L)</p>
            <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" L" />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="cumulative" name="Cumulative (L)" stroke="#818cf8" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

// ── Schedule Modal ────────────────────────────────────────────────────────────

function ScheduleModal({ deviceId, onClose, onAdded }: {
    deviceId: string
    onClose: () => void
    onAdded: (s: Schedule) => void
}) {
    const [form, setForm] = useState({ mode: 'TTR', hh: '08', mm: '00' })
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const trigAt = form.mode === 'TTR'
                ? `${form.hh.padStart(2, '0')}${form.mm.padStart(2, '0')}`
                : '0000'
            const res = await fetch(`/api/devices/${deviceId}/schedules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: form.mode, trigAt }),
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

// ── Page ──────────────────────────────────────────────────────────────────────

const TYPE_ACCENT: Record<DeviceType, string> = { oms: '#fbbf24', liquid_flow: '#22d3ee' }

export default function DeviceDetailPage() {
    const { deviceId } = useParams() as { deviceId: string }
    const router = useRouter()
    const [device, setDevice] = useState<Device | null>(null)
    const [lastSeen, setLastSeen] = useState<number | null>(null)
    const [readings, setReadings] = useState<SensorReading[]>([])
    const [range, setRange] = useState<Range>('7d')
    const [loading, setLoading] = useState(true)
    const [showSchedule, setShowSchedule] = useState(false)

    const loadDevice = useCallback(() => {
        fetch(`/api/devices/${deviceId}`).then(r => r.json()).then(d => setDevice(d.device ?? null))
    }, [deviceId])

    const pollStatus = useCallback(() => {
        fetch(`/api/devices/${deviceId}/status`)
            .then(r => r.json())
            .then(d => { if (d.lastSeen !== undefined) setLastSeen(d.lastSeen) })
            .catch(() => {})
    }, [deviceId])

    const loadReadings = useCallback(() => {
        fetch(`/api/devices/${deviceId}/readings?range=${range}`)
            .then(r => r.json())
            .then(d => setReadings(d.readings ?? []))
            .finally(() => setLoading(false))
    }, [deviceId, range])

    useEffect(() => {
        loadDevice()
        loadReadings()
        pollStatus()
        const interval = setInterval(pollStatus, 20_000)
        return () => clearInterval(interval)
    }, [loadDevice, loadReadings, pollStatus])

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

    const effectiveLastSeen = lastSeen ?? device?.lastSeen ?? null
    const isOnline = effectiveLastSeen ? Date.now() - effectiveLastSeen < 5 * 60 * 1000 : false
    const accent = device?.type ? TYPE_ACCENT[device.type] : '#60a5fa'

    const metaItems = [
        { label: 'Type',          value: device?.type ? DEVICE_TYPE_LABELS[device.type] : '—' },
        { label: 'Total Readings', value: readings.length || '—' },
        { label: 'Last Seen',     value: effectiveLastSeen ? new Date(effectiveLastSeen).toLocaleString() : 'Never' },
        { label: 'Schedules',     value: (device?.schedules ?? []).length },
        { label: 'Added',         value: device?.createdAt ? new Date(device.createdAt).toLocaleDateString() : '—' },
    ]

    return (
        <div className="max-w-[1200px] mx-auto">
            <button onClick={() => router.back()} className="btn-ghost mb-5 text-[0.85rem]">
                ← Back to Devices
            </button>

            {/* Header card */}
            <div className="glass-card p-6 mb-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                             style={{
                                 background: `linear-gradient(135deg, ${accent}22, ${accent}11)`,
                                 border: `1px solid ${accent}44`,
                                 color: accent,
                             }}>
                            {device?.type === 'liquid_flow' ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2C6.5 11 2 15.4 2 17.5 2 20.5 6.7 23 12 23s10-2.5 10-5.5C22 15.4 17.5 11 12 2z"/>
                                </svg>
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18.36 6.64A9 9 0 0 1 20.77 15"/><path d="M6.16 6.16a9 9 0 1 0 12.68 12.68"/>
                                    <line x1="12" y1="2" x2="12" y2="12"/><line x1="2" y1="2" x2="22" y2="22"/>
                                </svg>
                            )}
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
                    <h2 className="m-0 text-base font-bold text-text-primary">
                        {device?.type === 'oms' ? 'Switch Activity' : 'Flow & Consumption'}
                    </h2>
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

                {loading ? (
                    <div className="flex justify-center py-10">
                        <span className="spinner" />
                    </div>
                ) : readings.length === 0 ? (
                    <div className="text-center py-10 text-text-muted text-sm">
                        No readings yet for this range.
                    </div>
                ) : device?.type === 'oms' ? (
                    <OmsCharts readings={readings} range={range} />
                ) : (
                    <FlowCharts readings={readings} range={range} />
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
                                        {s.mode === 'TTR'
                                            ? `${s.trigAt?.slice(0, 2)}:${s.trigAt?.slice(2, 4)}`
                                            : s.mode === 'SRS' ? 'At Sunrise'
                                            : s.mode === 'SST' ? 'At Sunset'
                                            : 'Switch'}
                                    </div>
                                    <div className="text-[0.72rem] text-text-muted">
                                        Added {new Date(s.createdAt).toLocaleDateString()}
                                    </div>
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
