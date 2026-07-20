'use client'
import { useEffect, useState, useCallback } from 'react'
import { Device, Schedule } from '@/app/types'
import { toast } from 'sonner'
import Link from 'next/link'
import { CityPicker, CitySelection } from '@/components/CityPicker'

interface DeviceWithSchedules extends Device {
    schedules: Schedule[]
}

function computeDurationMinutes(startHh: string, startMm: string, endHh: string, endMm: string): number {
    const start = Number(startHh) * 60 + Number(startMm)
    let end = Number(endHh) * 60 + Number(endMm)
    if (end <= start) end += 24 * 60 // wraps past midnight
    return end - start
}

function AddScheduleModal({ devices, onClose, onAdded }: {
    devices: Device[]
    onClose: () => void
    onAdded: () => void
}) {
    const omsDevices = devices.filter(d => d.type === 'oms')
    const [form, setForm] = useState({
        deviceId: omsDevices[0]?.deviceId ?? '',
        mode: 'TTR',
        hh: '08', mm: '00',
        endMode: 'duration' as 'duration' | 'until',
        duration: '5',
        endHh: '08', endMm: '30',
    })
    const [city, setCity] = useState<CitySelection | null>(null)
    const [loading, setLoading] = useState(false)
    const needsSun = form.mode === 'SRS' || form.mode === 'SST'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (needsSun && !city) { toast.error('Pick a city first'); return }

        setLoading(true)
        try {
            const trigAt = form.mode === 'TTR'
                ? `${form.hh.padStart(2, '0')}${form.mm.padStart(2, '0')}`
                : '0000'
            const duration = form.mode === 'TTR' && form.endMode === 'until'
                ? computeDurationMinutes(form.hh, form.mm, form.endHh, form.endMm)
                : Number(form.duration)

            const res = await fetch(`/api/devices/${form.deviceId}/schedules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: form.mode,
                    trigAt,
                    duration,
                    ...(needsSun && city ? { lat: city.lat, lon: city.lon } : {}),
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success('Schedule added!')
            onAdded()
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
                {omsDevices.length === 0 ? (
                    <p className="text-sm text-text-muted">Schedules only apply to OMS switch devices. Add one first.</p>
                ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Device</label>
                        <select className="input-dark" value={form.deviceId}
                            onChange={e => setForm(f => ({ ...f, deviceId: e.target.value }))}>
                            {omsDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.name}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Mode</label>
                        <select className="input-dark" value={form.mode}
                            onChange={e => { setForm(f => ({ ...f, mode: e.target.value })); setCity(null) }}>
                            <option value="TTR">⏱ Time Trigger</option>
                            <option value="SRS">🌅 Sunrise</option>
                            <option value="SST">🌇 Sunset</option>
                        </select>
                    </div>

                    {form.mode === 'TTR' && (
                        <>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Start Hour</label>
                                    <input className="input-dark" type="number" min="0" max="23" value={form.hh}
                                        onChange={e => setForm(f => ({ ...f, hh: e.target.value }))} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Start Minute</label>
                                    <input className="input-dark" type="number" min="0" max="59" value={form.mm}
                                        onChange={e => setForm(f => ({ ...f, mm: e.target.value }))} />
                                </div>
                            </div>

                            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                {(['duration', 'until'] as const).map(m => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, endMode: m }))}
                                        className={form.endMode === m ? 'btn-primary flex-1 justify-center py-1.5 text-sm' : 'btn-ghost flex-1 justify-center py-1.5 text-sm'}
                                    >
                                        {m === 'duration' ? 'Run for...' : 'Until time...'}
                                    </button>
                                ))}
                            </div>

                            {form.endMode === 'duration' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>ON Duration (minutes)</label>
                                    <input className="input-dark" type="number" min="1" value={form.duration}
                                        onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} required />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>End Hour</label>
                                        <input className="input-dark" type="number" min="0" max="23" value={form.endHh}
                                            onChange={e => setForm(f => ({ ...f, endHh: e.target.value }))} />
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>End Minute</label>
                                        <input className="input-dark" type="number" min="0" max="59" value={form.endMm}
                                            onChange={e => setForm(f => ({ ...f, endMm: e.target.value }))} />
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {needsSun && (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Location</label>
                                <CityPicker value={city} onChange={setCity} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>ON Duration (minutes)</label>
                                <input className="input-dark" type="number" min="1" value={form.duration}
                                    onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} required />
                            </div>
                        </>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                        <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
                            {loading ? 'Adding...' : 'Add Schedule'}
                        </button>
                    </div>
                </form>
                )}
            </div>
        </div>
    )
}

export default function SchedulesPage() {
    const [devices, setDevices] = useState<DeviceWithSchedules[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)

    const load = useCallback(() => {
        setLoading(true)
        fetch('/api/devices').then(r => r.json())
            .then(d => setDevices((d.devices ?? []).map((dev: Device) => ({ ...dev, schedules: dev.schedules ?? [] }))))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => { load() }, [load])

    const deleteSchedule = async (deviceId: string, scheduleId: string) => {
        try {
            await fetch(`/api/devices/${deviceId}/schedules`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scheduleId }),
            })
            toast.success('Schedule removed')
            load()
        } catch { toast.error('Failed') }
    }

    const allSchedules = devices.flatMap(d => d.schedules.map(s => ({ ...s, device: d })))

    const modeIcon = (m: string) => ({ TTR: '⏱', SRS: '🌅', SST: '🌇' } as Record<string, string>)[m] ?? '📅'
    const modeLabel = (s: Schedule) =>
        s.mode === 'TTR' ? `${s.trigAt?.slice(0, 2)}:${s.trigAt?.slice(2, 4)}` :
        s.mode === 'SRS' ? 'At Sunrise' :
        s.mode === 'SST' ? 'At Sunset' : s.mode

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Schedules</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                        Automated triggers across all your devices
                    </p>
                </div>
                <button onClick={() => setShowAdd(true)} className="btn-primary" disabled={devices.length === 0}>
                    + Add Schedule
                </button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Total Schedules', value: allSchedules.length, color: '#60a5fa', glow: 'rgba(59,130,246,0.12)' },
                    { label: 'Time Triggers', value: allSchedules.filter(s => s.mode === 'TTR').length, color: '#c084fc', glow: 'rgba(139,92,246,0.12)' },
                    { label: 'Sun Triggers', value: allSchedules.filter(s => s.mode === 'SRS' || s.mode === 'SST').length, color: '#fbbf24', glow: 'rgba(251,191,36,0.12)' },
                    { label: 'Devices Used', value: devices.filter(d => d.schedules.length > 0).length, color: '#34d399', glow: 'rgba(52,211,153,0.12)' },
                ].map(s => (
                    <div key={s.label} className="glass-card" style={{ padding: '1rem', textAlign: 'center', background: s.glow, border: `1px solid ${s.color}22` }}>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <span className="spinner" style={{ width: '40px', height: '40px' }} />
                </div>
            ) : allSchedules.length === 0 ? (
                <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏱</div>
                    <h3 style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>No schedules yet</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
                        {devices.length === 0 ? (
                            <>Add a device first. <Link href="/dashboard/devices" style={{ color: '#60a5fa' }}>Add device →</Link></>
                        ) : 'Set up automated triggers for your devices.'}
                    </p>
                    {devices.length > 0 && <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Schedule</button>}
                </div>
            ) : (
                <div className="glass-card" style={{ overflow: 'hidden' }}>
                    <table className="table-dark" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th>Device</th>
                                <th>Mode</th>
                                <th>Trigger</th>
                                <th>Duration</th>
                                <th>Added</th>
                                <th style={{ width: '80px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {allSchedules.map(s => (
                                <tr key={s.scheduleId}>
                                    <td>
                                        <Link href={`/dashboard/devices/${s.device.deviceId}`} style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 500 }}>
                                            {s.device.name}
                                        </Link>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.875rem' }}>{modeIcon(s.mode)} {s.mode}</span>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>
                                        {modeLabel(s)}
                                    </td>
                                    <td style={{ fontSize: '0.8rem' }}>
                                        {s.duration ?? '—'} min
                                    </td>
                                    <td style={{ fontSize: '0.78rem' }}>
                                        {new Date(s.createdAt).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => deleteSchedule(s.device.deviceId, s.scheduleId)}
                                            className="btn-danger"
                                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showAdd && devices.length > 0 && (
                <AddScheduleModal devices={devices} onClose={() => setShowAdd(false)} onAdded={load} />
            )}
        </div>
    )
}
