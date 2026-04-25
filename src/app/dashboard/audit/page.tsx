'use client'
import { useEffect, useState, useCallback } from 'react'
import { AuditLog } from '@/app/types'

const ACTION_COLORS: Record<string, { color: string; label: string }> = {
    'device.add':      { color: '#4ade80', label: 'Device Added' },
    'device.update':   { color: '#60a5fa', label: 'Device Updated' },
    'device.delete':   { color: '#f87171', label: 'Device Deleted' },
    'schedule.add':    { color: '#c084fc', label: 'Schedule Added' },
    'schedule.delete': { color: '#fb923c', label: 'Schedule Deleted' },
}

function parseTs(ts: string): number {
    return parseInt(ts.split('#')[0], 10)
}

export default function AuditPage() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    const load = useCallback(() => {
        setLoading(true)
        fetch('/api/audit').then(r => r.json())
            .then(d => setLogs(d.logs ?? []))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => { load() }, [load])

    const filtered = logs.filter(l =>
        !search ||
        l.userEmail.toLowerCase().includes(search.toLowerCase()) ||
        l.action.includes(search.toLowerCase()) ||
        l.resource.toLowerCase().includes(search.toLowerCase()) ||
        (l.details ?? '').toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Audit Log</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                        Track all actions performed in your account
                    </p>
                </div>
                <button onClick={load} className="btn-ghost">
                    ↺ Refresh
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
                    placeholder="Search by user, action, or device..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                />
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <span className="spinner" style={{ width: '40px', height: '40px' }} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
                    <h3 style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>
                        {search ? 'No matching entries' : 'No audit logs yet'}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                        {search ? 'Try a different search.' : 'Actions like adding/removing devices and schedules will appear here.'}
                    </p>
                </div>
            ) : (
                <div className="glass-card" style={{ overflow: 'hidden' }}>
                    <table className="table-dark" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>User</th>
                                <th>Action</th>
                                <th>Device</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((log, i) => {
                                const meta = ACTION_COLORS[log.action] ?? { color: '#94a3b8', label: log.action }
                                const ts = parseTs(log.ts)
                                return (
                                    <tr key={i}>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                            {new Date(ts).toLocaleString()}
                                        </td>
                                        <td style={{ fontSize: '0.82rem' }}>
                                            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                                {log.userEmail}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{
                                                display: 'inline-block',
                                                fontSize: '0.72rem', fontWeight: 600,
                                                color: meta.color,
                                                background: `${meta.color}18`,
                                                border: `1px solid ${meta.color}33`,
                                                borderRadius: '6px',
                                                padding: '2px 8px',
                                            }}>
                                                {meta.label}
                                            </span>
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                            {log.resource}
                                        </td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {log.details ?? '—'}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
