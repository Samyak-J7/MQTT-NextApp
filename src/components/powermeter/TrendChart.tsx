'use client'
import { SensorReading, ConsumptionBucket } from '@/app/types'
import { resampleSeries } from '@/lib/resample'
import { ChartTooltip } from '@/components/ChartTooltip'
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

export type PMRange = 'live' | '24h' | '7d' | '30d'

const RANGE_LABELS: Record<PMRange, string> = { live: 'Live', '24h': '24h', '7d': '7d', '30d': '30d' }

function fmtTime(ts: number) { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
function fmtDate(ts: number) { return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' }) }

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-[0.7rem] text-text-muted uppercase tracking-wider">{label}</div>
            <div className="text-[1.1rem] font-bold text-text-primary">{value}</div>
        </div>
    )
}

// Raw watt trend (live / 24h) — resampled to a fixed point count so the
// chart stays smooth and readable whether the device reported 10 times or
// 10,000 times in the window, instead of one bar per raw message.
function RawArea({ readings, maxPoints }: { readings: SensorReading[]; maxPoints: number }) {
    const points = resampleSeries(readings.map(r => ({ timestamp: r.timestamp, value: r.watt ?? 0 })), maxPoints)
    const data = points.map(p => ({ time: fmtTime(p.time), watt: p.avg }))
    const avg = points.length ? points.reduce((s, p) => s + p.avg, 0) / points.length : 0
    const peak = points.length ? Math.max(...points.map(p => p.max)) : 0

    return (
        <div>
            <div className="flex gap-6 mb-4 flex-wrap">
                <MiniStat label="Avg Power" value={`${avg.toFixed(0)} W`} />
                <MiniStat label="Peak Power" value={`${peak.toFixed(0)} W`} />
                <MiniStat label="Raw Readings" value={`${readings.length}`} />
            </div>
            <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="wattGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f472b6" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" W" />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="watt" name="Power (W)" stroke="#f472b6" strokeWidth={2} fill="url(#wattGrad)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

function HourlyArea({ buckets }: { buckets: ConsumptionBucket[] }) {
    const data = buckets.map(b => ({ time: fmtTime(b.bucketStart), watt: b.avgWatt ?? 0 }))
    const totalKwh = buckets.reduce((s, b) => s + b.consumption, 0)
    const activeHours = buckets.filter(b => b.readingCount > 0).length

    return (
        <div>
            <div className="flex gap-6 mb-4 flex-wrap">
                <MiniStat label="Total Energy" value={`${totalKwh.toFixed(2)} kWh`} />
                <MiniStat label="Active Hours" value={`${activeHours}/${buckets.length}`} />
            </div>
            <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="wattGrad7d" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" W" />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="watt" name="Avg Power (W)" stroke="#60a5fa" strokeWidth={2} fill="url(#wattGrad7d)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

function DailyBars({ buckets }: { buckets: ConsumptionBucket[] }) {
    const data = buckets.map(b => ({ time: fmtDate(b.bucketStart), consumption: b.consumption }))
    const totalKwh = buckets.reduce((s, b) => s + b.consumption, 0)
    const activeDays = buckets.filter(b => b.readingCount > 0).length

    return (
        <div>
            <div className="flex gap-6 mb-4 flex-wrap">
                <MiniStat label="Total Energy" value={`${totalKwh.toFixed(2)} kWh`} />
                <MiniStat label="Active Days" value={`${activeDays}/${buckets.length}`} />
                <MiniStat label="Avg / Day" value={`${(activeDays > 0 ? totalKwh / activeDays : 0).toFixed(2)} kWh`} />
            </div>
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" kWh" />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="consumption" name="Consumption (kWh)" fill="#34d399" radius={[4, 4, 0, 0]} opacity={0.85} maxBarSize={36} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

export function TrendChart({
    range, onRangeChange, readings, buckets, loading,
}: {
    range: PMRange
    onRangeChange: (r: PMRange) => void
    readings: SensorReading[]
    buckets: ConsumptionBucket[]
    loading: boolean
}) {
    const isRaw = range === 'live' || range === '24h'
    const isEmpty = isRaw ? readings.length === 0 : buckets.every(b => b.readingCount === 0)

    return (
        <div className="glass-card p-5 mb-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h2 className="m-0 text-base font-bold text-text-primary">Power Trend</h2>
                <div className="flex gap-1.5">
                    {(['live', '24h', '7d', '30d'] as PMRange[]).map(r => (
                        <button key={r} onClick={() => onRangeChange(r)}
                            className={`${range === r ? 'btn-primary' : 'btn-ghost'} px-3.5 py-1.5 text-[0.8rem]`}>
                            {RANGE_LABELS[r]}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-10"><span className="spinner" /></div>
            ) : isEmpty ? (
                <div className="text-center py-10 text-text-muted text-sm">No readings yet for this range.</div>
            ) : range === '30d' ? (
                <DailyBars buckets={buckets} />
            ) : range === '7d' ? (
                <HourlyArea buckets={buckets} />
            ) : (
                <RawArea readings={readings} maxPoints={range === 'live' ? 60 : 100} />
            )}
        </div>
    )
}
