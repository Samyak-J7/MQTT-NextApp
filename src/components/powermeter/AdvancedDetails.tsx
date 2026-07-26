'use client'
import { useState } from 'react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { SensorReading, ConsumptionBucket } from '@/app/types'
import { PMRange } from './TrendChart'

function ChevronIcon({ open }: { open: boolean }) {
    return (
        <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className="transition-transform duration-200"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
            <path d="m6 9 6 6 6-6" />
        </svg>
    )
}

function stat(nums: number[]) {
    if (nums.length === 0) return { min: 0, avg: 0, max: 0 }
    return { min: Math.min(...nums), avg: nums.reduce((a, b) => a + b, 0) / nums.length, max: Math.max(...nums) }
}

function StatRow({ label, unit, values }: { label: string; unit: string; values: number[] }) {
    const s = stat(values)
    return (
        <tr className="border-b border-border-subtle last:border-0 hover:bg-card-hover transition-colors">
            <td className="py-2.5 px-3 text-text-secondary font-medium">{label}</td>
            <td className="py-2.5 px-3 text-text-primary font-mono tabular-nums">{s.min.toFixed(2)}{unit}</td>
            <td className="py-2.5 px-3 text-text-primary font-mono tabular-nums">{s.avg.toFixed(2)}{unit}</td>
            <td className="py-2.5 px-3 text-text-primary font-mono tabular-nums">{s.max.toFixed(2)}{unit}</td>
        </tr>
    )
}

function RawStats({ readings }: { readings: SensorReading[] }) {
    if (readings.length === 0) return <p className="text-sm text-text-muted">No raw readings in this range.</p>
    return (
        <>
            <p className="text-xs text-text-muted mb-3">Min / avg / max across {readings.length} raw readings in the selected range.</p>
            <div className="rounded-xl border border-border-subtle overflow-hidden mb-5">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="text-text-muted text-[0.7rem] uppercase tracking-wide" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <th className="text-left py-2.5 px-3 font-semibold">Metric</th><th className="text-left py-2.5 px-3 font-semibold">Min</th><th className="text-left py-2.5 px-3 font-semibold">Avg</th><th className="text-left py-2.5 px-3 font-semibold">Max</th>
                            </tr>
                        </thead>
                        <tbody>
                            <StatRow label="Voltage" unit="V" values={readings.map(r => r.volt ?? 0)} />
                            <StatRow label="Current" unit="A" values={readings.map(r => r.ampr ?? 0)} />
                            <StatRow label="Power" unit="W" values={readings.map(r => r.watt ?? 0)} />
                            <StatRow label="Frequency" unit="Hz" values={readings.map(r => r.frqc ?? 0)} />
                            <StatRow label="Power Factor" unit="" values={readings.map(r => r.pf ?? 0)} />
                        </tbody>
                    </table>
                </div>
            </div>

            <p className="text-xs text-text-muted mb-2">Most recent readings</p>
            <div className="rounded-xl border border-border-subtle overflow-hidden">
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="text-text-muted uppercase tracking-wide" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <th className="text-left py-2 px-3 font-semibold">Time</th><th className="text-left py-2 px-3 font-semibold">V</th><th className="text-left py-2 px-3 font-semibold">A</th>
                                <th className="text-left py-2 px-3 font-semibold">W</th><th className="text-left py-2 px-3 font-semibold">Hz</th><th className="text-left py-2 px-3 font-semibold">PF</th><th className="text-left py-2 px-3 font-semibold">Meter (kWh)</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono tabular-nums">
                            {readings.slice(-15).reverse().map(r => (
                                <tr key={r.timestamp} className="text-text-secondary border-b border-border-subtle last:border-0 hover:bg-card-hover transition-colors">
                                    <td className="py-2 px-3">{new Date(r.timestamp).toLocaleTimeString()}</td>
                                    <td className="py-2 px-3">{r.volt?.toFixed(1)}</td>
                                    <td className="py-2 px-3">{r.ampr?.toFixed(2)}</td>
                                    <td className="py-2 px-3">{r.watt?.toFixed(1)}</td>
                                    <td className="py-2 px-3">{r.frqc?.toFixed(1)}</td>
                                    <td className="py-2 px-3">{r.pf?.toFixed(2)}</td>
                                    <td className="py-2 px-3">{r.unit?.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )
}

function BucketStats({ buckets, range }: { buckets: ConsumptionBucket[]; range: PMRange }) {
    if (buckets.length === 0) return <p className="text-sm text-text-muted">No aggregate data in this range.</p>
    const isDaily = range === '30d'
    return (
        <>
            <p className="text-xs text-text-muted mb-3">
                kWh comes straight from your meter&apos;s own reading each {isDaily ? 'day' : 'hour'}, not an
                add-as-we-go total — so it stays correct even if a message or two gets missed.
            </p>
            <div className="rounded-xl border border-border-subtle overflow-hidden">
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="text-text-muted uppercase tracking-wide" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <th className="text-left py-2 px-3 font-semibold">{isDaily ? 'Date' : 'Hour'}</th><th className="text-left py-2 px-3 font-semibold">Avg W</th>
                                <th className="text-left py-2 px-3 font-semibold">kWh</th><th className="text-left py-2 px-3 font-semibold">Meter</th><th className="text-left py-2 px-3 font-semibold">Readings</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono tabular-nums">
                            {buckets.filter(b => b.readingCount > 0).slice().reverse().map(b => (
                                <tr key={b.bucketStart} className="text-text-secondary border-b border-border-subtle last:border-0 hover:bg-card-hover transition-colors">
                                    <td className="py-2 px-3">{isDaily ? new Date(b.bucketStart).toLocaleDateString() : new Date(b.bucketStart).toLocaleTimeString([], { hour: '2-digit' })}</td>
                                    <td className="py-2 px-3">{b.avgWatt?.toFixed(1) ?? '—'}</td>
                                    <td className="py-2 px-3">{b.consumption.toFixed(3)}</td>
                                    <td className="py-2 px-3">{b.lastUnit?.toFixed(2) ?? '—'}</td>
                                    <td className="py-2 px-3">{b.readingCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )
}

function Explainers() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div>
                <div className="text-xs font-bold text-text-primary mb-1">Power Factor</div>
                <p className="text-[0.72rem] text-text-muted m-0">Ratio of real power (W) to apparent power (V×A). 1.0 is perfectly efficient; lower values mean more current is drawn than the load actually uses productively.</p>
            </div>
            <div>
                <div className="text-xs font-bold text-text-primary mb-1">Load Factor</div>
                <p className="text-[0.72rem] text-text-muted m-0">Average power ÷ peak power over a period. High load factor means steady, predictable usage; low means spiky demand with short bursts.</p>
            </div>
            <div>
                <div className="text-xs font-bold text-text-primary mb-1">Frequency</div>
                <p className="text-[0.72rem] text-text-muted m-0">Grid frequency should stay close to 50Hz. Sustained drift usually points at grid instability, not your load.</p>
            </div>
        </div>
    )
}

export function AdvancedDetails({ range, readings, buckets }: { range: PMRange; readings: SensorReading[]; buckets: ConsumptionBucket[] }) {
    const [open, setOpen] = useState(true)
    const isRaw = range === 'live' || range === '24h'

    return (
        <Collapsible open={open} onOpenChange={setOpen} className="glass-card p-5 mb-6">
            <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full text-left cursor-pointer">
                    <h2 className="m-0 text-base font-bold text-text-primary">Advanced Details</h2>
                    <span className="flex items-center gap-1.5 text-text-muted text-sm">
                        {open ? 'Hide' : 'Show'}
                        <ChevronIcon open={open} />
                    </span>
                </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
                {isRaw ? <RawStats readings={readings} /> : <BucketStats buckets={buckets} range={range} />}
                <Explainers />
            </CollapsibleContent>
        </Collapsible>
    )
}
