'use client'
import { useEffect, useState, useCallback } from 'react'
import { Device } from '@/app/types'
import { toast } from 'sonner'
import Link from 'next/link'

function AddDeviceModal({ onClose, onAdded }: { onClose: () => void; onAdded: (d: Device) => void }) {
    const [form, setForm] = useState({ deviceId: '', name: '', location: '', description: '' })
    const [loading, setLoading] = useState(false)

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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Add New Device</h2>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: '0.3rem 0.5rem' }}>✕</button>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                        { label: 'Device ID *', key: 'deviceId', placeholder: 'e.g. ESP32_ABC123', required: true },
                        { label: 'Device Name *', key: 'name', placeholder: 'e.g. Living Room Sensor', required: true },
                        { label: 'Location', key: 'location', placeholder: 'e.g. Floor 2, Room A', required: false },
                        { label: 'Description', key: 'description', placeholder: 'Optional description', required: false },
                    ].map(field => (
                        <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{field.label}</label>
                            <input
                                className="input-dark"
                                placeholder={field.placeholder}
                                value={form[field.key as keyof typeof form]}
                                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                                required={field.required}
                            />
                        </div>
                    ))}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
                            {loading ? 'Adding...' : '+ Add Device'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function DeviceCard({ device, onDelete }: { device: Device; onDelete: (id: string) => void }) {
    const isOnline = device.lastSeen ? Date.now() - device.lastSeen < 5 * 60 * 1000 : false
    const [deleting, setDeleting] = useState(false)

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
        <Link href={`/dashboard/devices/${device.deviceId}`} style={{ textDecoration: 'none' }}>
            <div className="glass-card glass-card-hover" style={{ padding: '1.25rem', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa',
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                        </svg>
                    </div>
                    <span className={isOnline ? 'badge-online' : 'badge-offline'}>
                        {isOnline ? '● Online' : '○ Offline'}
                    </span>
                </div>

                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
                    {device.name}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', margin: '0 0 0.75rem' }}>
                    ID: {device.deviceId}
                </p>

                {device.location && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem' }}>
                        📍 {device.location}
                    </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
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

export default function DevicesPage() {
    const [devices, setDevices] = useState<Device[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [search, setSearch] = useState('')

    const load = useCallback(() => {
        fetch('/api/devices').then(r => r.json()).then(d => setDevices(d.devices ?? [])).finally(() => setLoading(false))
    }, [])

    useEffect(() => { load() }, [load])

    const filtered = devices.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.deviceId.toLowerCase().includes(search.toLowerCase()) ||
        (d.location ?? '').toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
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

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
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

            {/* Grid */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <span className="spinner" style={{ width: '40px', height: '40px' }} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 1rem', display: 'block', color: 'var(--text-muted)', opacity: 0.5 }} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                    </svg>
                    <h3 style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>No devices found</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
                        {search ? 'Try a different search term.' : 'Add your first device to get started.'}
                    </p>
                    {!search && (
                        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Device</button>
                    )}
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '1rem'
                }}>
                    {filtered.map(d => (
                        <DeviceCard key={d.deviceId} device={d} onDelete={id => setDevices(ds => ds.filter(x => x.deviceId !== id))} />
                    ))}
                </div>
            )}

            {showAdd && (
                <AddDeviceModal
                    onClose={() => setShowAdd(false)}
                    onAdded={d => setDevices(ds => [...ds, d])}
                />
            )}
        </div>
    )
}
