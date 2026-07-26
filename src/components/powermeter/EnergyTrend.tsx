'use client'
import { useState } from 'react'
import { ConsumptionBucket } from '@/app/types'
import { ChartTooltip } from '@/components/ChartTooltip'
import { SegmentedControl } from './SegmentedControl'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type EnergyRange = 'today' | '7d' | '30d'
const RANGE_LABELS: Record<EnergyRange, string> = { today: 'Today', '7d': '7d', '30d': '30d' }

function fmtHour(ts: number) { return `${String(new Date(ts).getHours()).padStart(2, '0')}:00` }
function fmtDay(ts: number) { return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' }) }

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-[0.7rem] text-text-muted uppercase tracking-wider">{label}</div>
            <div className="text-[1.1rem] font-bold text-text-primary">{value}</div>
        </div>
    )
}

// Energy consumed (kWh) — distinct from the Power Trend chart above, which
// plots instantaneous load (W). This one answers "how many units did I
// actually use": hour-by-hour for today, one bar per day for a week/month.
export function EnergyTrend({
    todayBuckets, monthBuckets,
}: {
    todayBuckets: ConsumptionBucket[]
    monthBuckets: ConsumptionBucket[]
}) {
    const [view, setView] = useState<EnergyRange>('today')
    const isHourly = view === 'today'
    const buckets = isHourly ? todayBuckets : view === '7d' ? monthBuckets.slice(-7) : monthBuckets
    const isEmpty = buckets.length === 0 || buckets.every(b => b.readingCount === 0)

    const totalKwh = buckets.reduce((s, b) => s + b.consumption, 0)
    const activeBuckets = buckets.filter(b => b.readingCount > 0).length
    const avgPerBucket = activeBuckets > 0 ? totalKwh / activeBuckets : 0

    const data = buckets.map(b => ({
        time: isHourly ? fmtHour(b.bucketStart) : fmtDay(b.bucketStart),
        consumption: b.consumption,
    }))

    return (
        <div className="glass-card p-5 mb-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h2 className="m-0 text-base font-bold text-text-primary">Energy Consumption</h2>
                <SegmentedControl
                    options={(['today', '7d', '30d'] as EnergyRange[]).map(r => ({ value: r, label: RANGE_LABELS[r] }))}
                    value={view}
                    onChange={setView}
                />
            </div>

            {isEmpty ? (
                <div className="text-center py-10 text-text-muted text-sm">No consumption data yet for this range.</div>
            ) : (
                <div>
                    <div className="flex gap-6 mb-4 flex-wrap">
                        <MiniStat label="Total Energy" value={`${totalKwh.toFixed(2)} kWh`} />
                        <MiniStat label={isHourly ? 'Avg / Hour' : 'Avg / Day'} value={`${avgPerBucket.toFixed(3)} kWh`} />
                        <MiniStat label={isHourly ? 'Active Hours' : 'Active Days'} value={`${activeBuckets}/${buckets.length}`} />
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" kWh" />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="consumption" name="Consumption (kWh)" fill="#34d399" radius={[4, 4, 0, 0]} opacity={0.85} maxBarSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    )
}
