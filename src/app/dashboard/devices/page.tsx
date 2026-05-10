'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Device, DeviceType, DEVICE_TYPE_LABELS } from '@/app/types'
import { toast } from 'sonner'
import Link from 'next/link'

const TYPE_COLORS: Record<DeviceType, { bg: string; border: string; text: string; badge: string }> = {
    oms:          { bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  text: '#fbbf24', badge: 'OMS' },
    liquid_flow:  { bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.25)',   text: '#22d3ee', badge: 'Flow' },
    power_meter:  { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)', text: '#a78bfa', badge: 'Power' },
}

const TYPE_ICON: Record<DeviceType, React.ReactNode> = {
    oms: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18.36 6.64A9 9 0 0 1 20.77 15"/><path d="M6.16 6.16a9 9 0 1 0 12.68 12.68"/>
            <line x1="12" y1="2" x2="12" y2="12"/><line x1="2" y1="2" x2="22" y2="22"/>
        </svg>
    ),
    liquid_flow: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.5 11 2 15.4 2 17.5 2 20.5 6.7 23 12 23s10-2.5 10-5.5C22 15.4 17.5 11 12 2z"/>
        </svg>
    ),
    power_meter: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
    ),
}

// ── QR Scanner ────────────────────────────────────────────────────────────────

function QRScannerView({ onScan, onCancel }: { onScan: (text: string) => void; onCancel: () => void }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null)

    useEffect(() => {
        let stopped = false

        import('html5-qrcode').then(({ Html5Qrcode }) => {
            if (stopped || !containerRef.current) return
            const scanner = new Html5Qrcode('qr-reader-div')
            scannerRef.current = scanner

            scanner.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 240, height: 240 } },
                (text) => {
                    if (!stopped) {
                        stopped = true
                        scanner.stop().catch(() => {}).finally(() => onScan(text))
                    }
                },
                undefined
            ).catch((err: unknown) => {
                if (!stopped) toast.error('Camera access denied or unavailable')
                console.warn('QR scanner:', err)
            })
        })

        return () => {
            stopped = true
            scannerRef.current?.stop().catch(() => {})
        }
    }, [onScan])

    return (
        <div className="flex flex-col gap-3">
            <p className="text-[0.8rem] text-text-muted text-center">
                Point camera at the device QR code.<br/>
                QR content: device ID or <code className="text-[#60a5fa]">{`{"id":"DEV-001","type":"oms"}`}</code>
            </p>
            <div ref={containerRef} id="qr-reader-div" className="rounded-xl overflow-hidden w-full" />
            <button type="button" onClick={onCancel} className="btn-ghost w-full justify-center">
                Cancel Scan
            </button>
        </div>
    )
}

// ── Add Device Modal ──────────────────────────────────────────────────────────

function AddDeviceModal({ onClose, onAdded }: { onClose: () => void; onAdded: (d: Device) => void }) {
    const [tab, setTab] = useState<'manual' | 'qr'>('manual')
    const [form, setForm] = useState({ deviceId: '', name: '', type: 'oms' as DeviceType, location: '', description: '' })
    const [loading, setLoading] = useState(false)

    const handleQRScan = useCallback((text: string) => {
        let id = text
        let type: DeviceType | undefined
        try {
            const parsed = JSON.parse(text)
            if (parsed.id) id = parsed.id
            if (parsed.type === 'oms' || parsed.type === 'liquid_flow') type = parsed.type
        } catch {
            // plain string — treat as device ID
        }
        setForm(f => ({ ...f, deviceId: id.trim(), ...(type ? { type } : {}) }))
        setTab('manual')
        toast.success('QR scanned — review and confirm below')
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch('/api/devices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success('Device added!')
            onAdded(data.device)
            onClose()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to add device')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Add New Device
                    </h2>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: '0.3rem 0.5rem' }}>✕</button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 mb-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {(['manual', 'qr'] as const).map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTab(t)}
                            className={tab === t ? 'btn-primary flex-1 justify-center py-1.5 text-sm' : 'btn-ghost flex-1 justify-center py-1.5 text-sm'}
                        >
                            {t === 'manual' ? '⌨ Manual' : '📷 Scan QR'}
                        </button>
                    ))}
                </div>

                {tab === 'qr' ? (
                    <QRScannerView onScan={handleQRScan} onCancel={() => setTab('manual')} />
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                Device ID *
                            </label>
                            <input
                                className="input-dark"
                                placeholder="e.g. DEV-001"
                                value={form.deviceId}
                                onChange={e => setForm(f => ({ ...f, deviceId: e.target.value }))}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                Device Name *
                            </label>
                            <input
                                className="input-dark"
                                placeholder="e.g. Main Water Meter"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                Device Type *
                            </label>
                            <select
                                className="input-dark cursor-pointer"
                                value={form.type}
                                onChange={e => setForm(f => ({ ...f, type: e.target.value as DeviceType }))}
                            >
                                <option value="oms">⚡ On/Off Switch (OMS)</option>
                                <option value="liquid_flow">💧 Liquid Flow Sensor</option>
                                <option value="power_meter">🔌 Power / Energy Meter</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                Location
                            </label>
                            <input
                                className="input-dark"
                                placeholder="e.g. Floor 2, Room A"
                                value={form.location}
                                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                Description
                            </label>
                            <input
                                className="input-dark"
                                placeholder="Optional"
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
                                {loading ? 'Adding...' : '+ Add Device'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}

// ── Device Card ───────────────────────────────────────────────────────────────

function fmtDur(ms: number): string {
    if (ms < 60_000)    return `${parseFloat((ms / 1_000).toFixed(1))} s`
    if (ms < 3_600_000) return `${parseFloat((ms / 60_000).toFixed(1))} min`
    return `${parseFloat((ms / 3_600_000).toFixed(1))} hr`
}

function DeviceCard({ device, onDelete }: { device: Device; onDelete: (id: string) => void }) {
    const isOnline = device.lastSeen ? Date.now() - device.lastSeen < 5 * 60 * 1000 : false
    const [deleting, setDeleting] = useState(false)
    const [switching, setSwitching] = useState<'on' | 'off' | null>(null)
    const colors = TYPE_COLORS[device.type] ?? TYPE_COLORS.oms

    const handleSwitch = async (e: React.MouseEvent, type: 'on' | 'off') => {
        e.preventDefault()
        e.stopPropagation()
        if (switching) return
        const duration = type === 'on' ? (device.defaultDuration ?? 2_400) : 100
        setSwitching(type)
        try {
            const res = await fetch(`/api/devices/${device.deviceId}/control`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ duration }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success(type === 'on' ? `⚡ ON — ${fmtDur(duration)}` : '⏻ Switch OFF')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to send command')
        } finally {
            setSwitching(null)
        }
    }

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!confirm(`Delete "${device.name}"? This cannot be undone.`)) return
        setDeleting(true)
        try {
            await fetch(`/api/devices/${device.deviceId}`, { method: 'DELETE' })
            toast.success('Device removed')
            onDelete(device.deviceId)
        } catch {
            toast.error('Failed to delete device')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <Link href={`/dashboard/devices/${device.deviceId}`} style={{ textDecoration: 'none', height: '100%' }}>
            <div className="glass-card glass-card-hover" style={{
                padding: '1.25rem', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', height: '100%', minHeight: '200px',
            }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                        background: colors.bg, border: `1px solid ${colors.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.text,
                    }}>
                        {TYPE_ICON[device.type]}
                    </div>
                    <span className={isOnline ? 'badge-online' : 'badge-offline'}>
                        {isOnline ? '● Online' : '○ Offline'}
                    </span>
                </div>

                {/* Body — grows to fill space so footer stays at bottom */}
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
                        {device.name}
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', margin: '0 0 0.375rem' }}>
                        {device.deviceId}
                    </p>
                    <span style={{
                        display: 'inline-block', fontSize: '0.68rem', fontWeight: 600,
                        color: colors.text, background: colors.bg, border: `1px solid ${colors.border}`,
                        borderRadius: '6px', padding: '1px 7px', marginBottom: '0.5rem',
                    }}>
                        {DEVICE_TYPE_LABELS[device.type]}
                    </span>

                    {device.location && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
                            📍 {device.location}
                        </p>
                    )}
                </div>

                {/* Quick ON/OFF — OMS only */}
                {device.type === 'oms' && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem' }} onClick={e => e.preventDefault()}>
                        <button
                            onClick={e => handleSwitch(e, 'on')}
                            disabled={!!switching}
                            style={{
                                flex: 1, padding: '0.45rem 0',
                                borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700,
                                border: '1px solid rgba(251,191,36,0.35)',
                                background: switching === 'on' ? 'rgba(251,191,36,0.25)' : 'rgba(251,191,36,0.1)',
                                color: '#fbbf24', cursor: switching ? 'not-allowed' : 'pointer',
                                transition: 'background 0.15s',
                                opacity: switching && switching !== 'on' ? 0.5 : 1,
                            }}
                        >
                            {switching === 'on'
                                ? '···'
                                : `⚡ ON${device.defaultDuration ? ` · ${fmtDur(device.defaultDuration)}` : ''}`}
                        </button>
                        <button
                            onClick={e => handleSwitch(e, 'off')}
                            disabled={!!switching}
                            style={{
                                flex: 1, padding: '0.45rem 0',
                                borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700,
                                border: '1px solid rgba(239,68,68,0.28)',
                                background: switching === 'off' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.07)',
                                color: '#f87171', cursor: switching ? 'not-allowed' : 'pointer',
                                transition: 'background 0.15s',
                                opacity: switching && switching !== 'off' ? 0.5 : 1,
                            }}
                        >
                            {switching === 'off' ? '···' : '⏻ OFF'}
                        </button>
                    </div>
                )}

                {/* Footer — always at bottom */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', marginTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {(device.schedules ?? []).length} schedule{(device.schedules ?? []).length !== 1 ? 's' : ''}
                    </span>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="btn-danger"
                        style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem' }}
                    >
                        {deleting ? '...' : '🗑 Remove'}
                    </button>
                </div>
            </div>
        </Link>
    )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DevicesPage() {
    const [devices, setDevices] = useState<Device[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState<DeviceType | 'all'>('all')

    const load = useCallback(() => {
        fetch('/api/devices')
            .then(r => r.json())
            .then(d => {
                if (d.error) console.error('GET /api/devices:', d.error)
                setDevices(d.devices ?? [])
            })
            .catch(err => console.error('GET /api/devices fetch failed:', err))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        load()
        const interval = setInterval(load, 20_000) // refresh live status every 20s
        return () => clearInterval(interval)
    }, [load])

    const filtered = devices.filter(d => {
        const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
            d.deviceId.toLowerCase().includes(search.toLowerCase()) ||
            (d.location ?? '').toLowerCase().includes(search.toLowerCase())
        const matchType = typeFilter === 'all' || d.type === typeFilter
        return matchSearch && matchType
    })

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Devices</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                        Manage and monitor your IoT devices
                    </p>
                </div>
                <button onClick={() => setShowAdd(true)} className="btn-primary">
                    <span>+</span> Add Device
                </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                    </span>
                    <input
                        className="input-dark"
                        placeholder="Search devices..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: '2.5rem' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {(['all', 'oms', 'liquid_flow', 'power_meter'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={typeFilter === t ? 'btn-primary px-3 py-1.5 text-sm' : 'btn-ghost px-3 py-1.5 text-sm'}
                        >
                            {t === 'all' ? 'All' : t === 'oms' ? '⚡ OMS' : t === 'liquid_flow' ? '💧 Flow' : '🔌 Power'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <span className="spinner" style={{ width: '40px', height: '40px' }} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📡</div>
                    <h3 style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>No devices found</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
                        {search || typeFilter !== 'all' ? 'Try adjusting your filters.' : 'Add your first device to get started.'}
                    </p>
                    {!search && typeFilter === 'all' && (
                        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Device</button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', alignItems: 'stretch' }}>
                    {filtered.map(d => (
                        <DeviceCard key={d.deviceId} device={d} onDelete={id => setDevices(ds => ds.filter(x => x.deviceId !== id))} />
                    ))}
                </div>
            )}

            {showAdd && (
                <AddDeviceModal
                    onClose={() => setShowAdd(false)}
                    onAdded={d => { setDevices(ds => [...ds, d]); load() }}
                />
            )}
        </div>
    )
}
