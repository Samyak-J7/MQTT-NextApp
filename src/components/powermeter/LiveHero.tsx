'use client'
import { SensorReading } from '@/app/types'
import { PowerGauge, zoneColor } from '@/components/PowerGauge'
import { LOAD_MAX_WATT, VOLT_ZONES, AMPR_ZONES, FRQC_ZONES, PF_ZONES, STALE_AFTER_MS, loadStatusColor } from './constants'

function fmtWatt(w: number): string {
    return w >= 1000 ? `${(w / 1000).toFixed(2)} kW` : `${w.toFixed(0)} W`
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
    if (data.length < 2) return null
    const w = 110, h = 30
    const min = Math.min(...data), max = Math.max(...data)
    const range = max - min || 1
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ')
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
            <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
        </svg>
    )
}

function MetricChip({ label, value, unit, status }: { label: string; value: string; unit: string; status: string }) {
    return (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: status, boxShadow: `0 0 5px ${status}` }} />
            <div className="min-w-0">
                <div className="text-[0.66rem] text-text-muted uppercase tracking-wide truncate">{label}</div>
                <div className="text-sm font-bold text-text-primary">
                    {value}<span className="text-[0.68rem] font-medium text-text-muted ml-0.5">{unit}</span>
                </div>
            </div>
        </div>
    )
}

export function LiveHero({
    latestReading, liveReadings, location, todayKwh,
}: {
    latestReading: SensorReading | null
    liveReadings: SensorReading[]
    location?: string
    todayKwh: number
}) {
    const r = latestReading
    const stale = !r || Date.now() - r.timestamp > STALE_AFTER_MS
    const watt = r?.watt ?? 0
    const color = loadStatusColor(watt)
    const sparkData = liveReadings.slice(-30).map(x => x.watt ?? 0)

    return (
        <div className="glass-card p-5 mb-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                    <h2 className="m-0 text-base font-bold text-text-primary">Live Now</h2>
                    {location && <p className="m-0 text-xs text-text-muted mt-0.5">{location}</p>}
                </div>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: stale ? '#f87171' : '#4ade80' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: stale ? '#f87171' : '#4ade80', boxShadow: stale ? 'none' : '0 0 6px #4ade80' }} />
                    {stale
                        ? (r ? `Stale — last seen ${new Date(r.timestamp).toLocaleTimeString()}` : 'Waiting for data…')
                        : `Live · updated ${new Date(r!.timestamp).toLocaleTimeString()}`}
                </span>
            </div>

            {!r ? (
                <div className="text-center py-10 text-text-muted text-sm">No live reading yet — waiting for the meter.</div>
            ) : (
                <div className="flex flex-col md:flex-row gap-6 md:items-center">
                    <div className="flex items-center gap-4 shrink-0">
                        <PowerGauge gaugeId="hero-load" label="Load" value={watt} unit="W" min={0} max={LOAD_MAX_WATT} decimals={0} color={color} size={150} />
                        <div>
                            <div className="text-[2.1rem] font-extrabold leading-none" style={{ color }}>{fmtWatt(watt)}</div>
                            <div className="text-xs text-text-muted mt-1">Current load{stale ? ' (stale)' : ''}</div>
                            {sparkData.length > 1 && <div className="mt-2 opacity-90"><Sparkline data={sparkData} color={color} /></div>}
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <MetricChip label="Voltage" value={(r.volt ?? 0).toFixed(1)} unit="V" status={zoneColor(r.volt ?? 0, VOLT_ZONES, '#60a5fa')} />
                        <MetricChip label="Current" value={(r.ampr ?? 0).toFixed(2)} unit="A" status={zoneColor(r.ampr ?? 0, AMPR_ZONES, '#60a5fa')} />
                        <MetricChip label="Frequency" value={(r.frqc ?? 0).toFixed(1)} unit="Hz" status={zoneColor(r.frqc ?? 0, FRQC_ZONES, '#60a5fa')} />
                        <MetricChip label="Power Factor" value={(r.pf ?? 0).toFixed(2)} unit="" status={zoneColor(r.pf ?? 0, PF_ZONES, '#60a5fa')} />
                    </div>
                </div>
            )}

            <div className="flex gap-6 mt-5 pt-4 flex-wrap" style={{ borderTop: '1px solid var(--border)' }}>
                <div>
                    <div className="text-[0.72rem] text-text-muted uppercase tracking-wider">Today so far</div>
                    <div className="text-[1.3rem] font-extrabold" style={{ color: '#34d399' }}>{todayKwh.toFixed(2)} kWh</div>
                </div>
            </div>
        </div>
    )
}
