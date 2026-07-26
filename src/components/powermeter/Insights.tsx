'use client'
import { useEffect, useState } from 'react'
import { SensorReading } from '@/app/types'

const Icon = {
    peak: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17 9 11l4 4 8-8" /><path d="M17 7h4v4" />
        </svg>
    ),
    avg: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    ),
    min: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7 9 13l4-4 8 8" /><path d="M17 17h4v-4" />
        </svg>
    ),
    factor: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
        </svg>
    ),
    pf: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M9 12.5 11 15l4.5-6" />
        </svg>
    ),
    delta: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" />
        </svg>
    ),
    coin: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5c0-1.5 1-2.5 2.5-2.5s2.5.8 2.5 2c0 1.5-1.5 2-2.5 2.5S9.5 12.5 9.5 14c0 1.2 1 2 2.5 2s2.5-1 2.5-2.5" />
        </svg>
    ),
    calendar: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
    ),
}

function InsightCard({ icon, label, value, hint, color }: { icon: React.ReactNode; label: string; value: string; hint: string; color: string }) {
    return (
        <div className="glass-card glass-card-hover p-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}1a`, color, border: `1px solid ${color}33` }}>
                {icon}
            </div>
            <div className="text-[1.3rem] font-extrabold leading-tight" style={{ color }}>{value}</div>
            <div className="text-[0.72rem] text-text-secondary font-semibold mt-1">{label}</div>
            <div className="text-[0.68rem] text-text-muted mt-1">{hint}</div>
        </div>
    )
}

function CostCard({ icon, label, kwh, rate, hint }: { icon: React.ReactNode; label: string; kwh: number; rate: number; hint: string }) {
    const cost = !isNaN(rate) && rate > 0 ? kwh * rate : null
    return (
        <div className="glass-card glass-card-hover p-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                {icon}
            </div>
            <div className="text-[1.3rem] font-extrabold text-[#fbbf24] leading-tight">{cost != null ? `₹${cost.toFixed(2)}` : '—'}</div>
            <div className="text-[0.72rem] text-text-secondary font-semibold mt-1">{label}</div>
            <div className="text-[0.68rem] text-text-muted mt-1">{hint}</div>
        </div>
    )
}

export function Insights({
    last24hReadings, todayKwh, yesterdayKwh, monthKwh, deviceId,
}: {
    last24hReadings: SensorReading[]
    todayKwh: number
    yesterdayKwh: number | null
    monthKwh: number
    deviceId: string
}) {
    const [tariff, setTariff] = useState('')
    const [editingTariff, setEditingTariff] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem(`powerTariff:${deviceId}`)
        if (saved) setTariff(saved)
    }, [deviceId])

    const saveTariff = (v: string) => {
        setTariff(v)
        if (v) localStorage.setItem(`powerTariff:${deviceId}`, v)
        else localStorage.removeItem(`powerTariff:${deviceId}`)
    }

    const watts = last24hReadings.map(r => r.watt ?? 0)
    const pfs = last24hReadings.map(r => r.pf ?? 0).filter(v => v > 0)
    const peak = watts.length ? Math.max(...watts) : 0
    const min = watts.length ? Math.min(...watts) : 0
    const avg = watts.length ? watts.reduce((a, b) => a + b, 0) / watts.length : 0
    const avgPf = pfs.length ? pfs.reduce((a, b) => a + b, 0) / pfs.length : 0
    const loadFactor = peak > 0 ? (avg / peak) * 100 : 0

    const changePct = yesterdayKwh != null && yesterdayKwh > 0
        ? ((todayKwh - yesterdayKwh) / yesterdayKwh) * 100
        : null

    const rate = parseFloat(tariff)

    return (
        <div className="mb-6">
            <h2 className="text-base font-bold text-text-primary mb-3">Insights</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <InsightCard icon={<Icon.peak />} label="Peak Power (24h)" value={`${peak.toFixed(0)} W`} color="#f472b6"
                    hint="Highest instantaneous load in the last 24 hours." />
                <InsightCard icon={<Icon.avg />} label="Avg Power (24h)" value={`${avg.toFixed(0)} W`} color="#60a5fa"
                    hint="Average load across all readings in the last 24 hours." />
                <InsightCard icon={<Icon.min />} label="Min Power (24h)" value={watts.length ? `${min.toFixed(0)} W` : '—'} color="#22d3ee"
                    hint="Lowest instantaneous load — your baseline/standby draw." />
                <InsightCard icon={<Icon.factor />} label="Load Factor" value={watts.length ? `${loadFactor.toFixed(0)}%` : '—'} color="#c084fc"
                    hint="Avg ÷ peak power. Higher = steadier usage." />
                <InsightCard icon={<Icon.pf />} label="Avg Power Factor (24h)" value={pfs.length ? avgPf.toFixed(2) : '—'} color="#fb923c"
                    hint="1.0 is perfectly efficient; lower means wasted current." />
                <InsightCard icon={<Icon.delta />}
                    label="Vs. Yesterday"
                    value={changePct != null ? `${changePct > 0 ? '+' : ''}${changePct.toFixed(0)}%` : '—'}
                    color={changePct != null && changePct > 0 ? '#f87171' : '#4ade80'}
                    hint="Today's energy so far vs. yesterday's total." />
                <div className="glass-card glass-card-hover p-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                        <Icon.coin />
                    </div>
                    {editingTariff || !tariff ? (
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-text-muted">₹</span>
                            <input
                                type="number" step="0.01" min="0" placeholder="rate/kWh" defaultValue={tariff}
                                onBlur={e => { saveTariff(e.target.value); setEditingTariff(false) }}
                                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                                className="input-dark text-sm w-20" style={{ padding: '4px 8px' }}
                                autoFocus={editingTariff}
                            />
                        </div>
                    ) : (
                        <div className="text-[1.3rem] font-extrabold text-[#fbbf24] leading-tight cursor-pointer" onClick={() => setEditingTariff(true)}>
                            {!isNaN(rate) && rate > 0 ? `₹${(todayKwh * rate).toFixed(2)}` : '—'}
                        </div>
                    )}
                    <div className="text-[0.72rem] text-text-secondary font-semibold mt-1">Est. Cost Today</div>
                    <div className="text-[0.68rem] text-text-muted mt-1">
                        {tariff ? `At ₹${tariff}/kWh · tap to edit` : 'Set your ₹/kWh rate to estimate cost'}
                    </div>
                </div>
                <CostCard icon={<Icon.calendar />} label="Est. Cost This Month" kwh={monthKwh} rate={rate}
                    hint={tariff ? `Last 30 days at ₹${tariff}/kWh.` : 'Set your ₹/kWh rate above to estimate.'} />
            </div>
        </div>
    )
}
