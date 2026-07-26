'use client'
import { useEffect, useState } from 'react'
import { SensorReading } from '@/app/types'

function InsightCard({ label, value, hint, color }: { label: string; value: string; hint: string; color: string }) {
    return (
        <div className="glass-card p-4" title={hint}>
            <div className="text-[0.7rem] text-text-muted uppercase tracking-wider mb-1">{label}</div>
            <div className="text-[1.25rem] font-extrabold" style={{ color }}>{value}</div>
            <div className="text-[0.68rem] text-text-muted mt-1">{hint}</div>
        </div>
    )
}

function CostCard({ label, kwh, rate, hint }: { label: string; kwh: number; rate: number; hint: string }) {
    const cost = !isNaN(rate) && rate > 0 ? kwh * rate : null
    return (
        <div className="glass-card p-4">
            <div className="text-[0.7rem] text-text-muted uppercase tracking-wider mb-1">{label}</div>
            <div className="text-[1.25rem] font-extrabold text-[#fbbf24]">{cost != null ? `₹${cost.toFixed(2)}` : '—'}</div>
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
                <InsightCard label="Peak Power (24h)" value={`${peak.toFixed(0)} W`} color="#f472b6"
                    hint="Highest instantaneous load in the last 24 hours." />
                <InsightCard label="Avg Power (24h)" value={`${avg.toFixed(0)} W`} color="#60a5fa"
                    hint="Average load across all readings in the last 24 hours." />
                <InsightCard label="Min Power (24h)" value={watts.length ? `${min.toFixed(0)} W` : '—'} color="#22d3ee"
                    hint="Lowest instantaneous load in the last 24 hours — your baseline/standby draw." />
                <InsightCard label="Load Factor" value={watts.length ? `${loadFactor.toFixed(0)}%` : '—'} color="#c084fc"
                    hint="Avg ÷ peak power. Higher = steadier usage; lower = spiky, peaky demand." />
                <InsightCard label="Avg Power Factor (24h)" value={pfs.length ? avgPf.toFixed(2) : '—'} color="#fb923c"
                    hint="1.0 is perfectly efficient; lower means more current drawn than actually used." />
                <InsightCard
                    label="Vs. Yesterday"
                    value={changePct != null ? `${changePct > 0 ? '+' : ''}${changePct.toFixed(0)}%` : '—'}
                    color={changePct != null && changePct > 0 ? '#f87171' : '#4ade80'}
                    hint="Today's energy so far vs. yesterday's total." />
                <div className="glass-card p-4">
                    <div className="text-[0.7rem] text-text-muted uppercase tracking-wider mb-1">Est. Cost Today</div>
                    {editingTariff || !tariff ? (
                        <div className="flex items-center gap-1.5 mt-1">
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
                        <div className="text-[1.25rem] font-extrabold text-[#fbbf24] cursor-pointer" onClick={() => setEditingTariff(true)}>
                            {!isNaN(rate) && rate > 0 ? `₹${(todayKwh * rate).toFixed(2)}` : '—'}
                        </div>
                    )}
                    <div className="text-[0.68rem] text-text-muted mt-1">
                        {tariff ? `At ₹${tariff}/kWh · tap to edit` : 'Set your ₹/kWh rate to estimate cost'}
                    </div>
                </div>
                <CostCard label="Est. Cost This Month" kwh={monthKwh} rate={rate}
                    hint={tariff ? `Last 30 days at ₹${tariff}/kWh.` : 'Set your ₹/kWh rate above to estimate cost.'} />
            </div>
        </div>
    )
}
