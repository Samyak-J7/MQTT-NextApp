'use client'
import { SensorReading } from '@/app/types'
import { ChartTooltip } from '@/components/ChartTooltip'
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts'
import { VOLT_ZONES, AMPR_ZONES, FRQC_ZONES, PF_ZONES, STALE_AFTER_MS, loadStatusColor, zoneColor } from './constants'

function fmtWatt(w: number): string {
    return w >= 1000 ? `${(w / 1000).toFixed(2)} kW` : `${w.toFixed(0)} W`
}

// Featured mini-chart for the live trend — a real (hoverable) area chart,
// not a decorative squiggle, so the "cool" factor also does useful work.
function LiveSparkChart({ data, color }: { data: { time: string; watt: number }[]; color: string }) {
    if (data.length < 2) return null
    const gradId = `heroSparkGrad-${color.replace('#', '')}`
    return (
        <ResponsiveContainer width="100%" height={90}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="watt" name="Power (W)" stroke={color} strokeWidth={2.5} fill={`url(#${gradId})`} />
            </AreaChart>
        </ResponsiveContainer>
    )
}

function LiveDot({ color, pulse }: { color: string; pulse: boolean }) {
    return (
        <span className="relative flex h-2 w-2 shrink-0">
            {pulse && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: color }} />}
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: color }} />
        </span>
    )
}

const VoltIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
)
const CurrentIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h4l2-7 4 14 2-7h8" />
    </svg>
)
const FreqIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12c1.5 0 1.5-6 3-6s1.5 12 3 12 1.5-12 3-12 1.5 6 3 6 1.5-6 3-6 1.5 6 3 6" />
    </svg>
)
const PfIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M9 12.5 11 15l4.5-6" />
    </svg>
)

function MetricChip({ icon, label, value, unit, status }: { icon: React.ReactNode; label: string; value: string; unit: string; status: string }) {
    return (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${status}1a`, color: status }}>
                {icon}
            </div>
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
    // Stale data never wears the "everything's fine" green/status color —
    // it goes neutral gray so a glance can't mistake a frozen last-known
    // reading for a live one, no matter how small the "Stale" label is.
    const color = stale ? '#64748b' : loadStatusColor(watt)
    const dotColor = stale ? '#f87171' : '#4ade80'
    const sparkData = liveReadings.slice(-40).map(x => ({
        time: new Date(x.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        watt: parseFloat((x.watt ?? 0).toFixed(1)),
    }))

    return (
        <div className="glass-card p-5 mb-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                    <h2 className="m-0 text-base font-bold text-text-primary">Live Now</h2>
                    {location && <p className="m-0 text-xs text-text-muted mt-0.5">{location}</p>}
                </div>
                <span className="flex items-center gap-2 text-xs" style={{ color: dotColor }}>
                    <LiveDot color={dotColor} pulse={!stale} />
                    {stale
                        ? (r ? `Stale — last seen ${new Date(r.timestamp).toLocaleTimeString()}` : 'Waiting for data…')
                        : `Live · updated ${new Date(r!.timestamp).toLocaleTimeString()}`}
                </span>
            </div>

            {!r ? (
                <div className="text-center py-10 text-text-muted text-sm">No live reading yet — waiting for the meter.</div>
            ) : (
                <div className={`transition-opacity duration-300 ${stale ? 'opacity-55' : ''}`}>
                    <div className="text-[3.2rem] font-extrabold leading-none" style={{ color }}>{fmtWatt(watt)}</div>
                    <div className="text-xs text-text-muted mt-1.5">
                        Current load{stale ? ' (stale)' : ''}
                        <span className="mx-1.5">·</span>
                        Today <span className="font-bold" style={{ color: '#34d399' }}>{todayKwh.toFixed(2)} kWh</span>
                    </div>

                    {sparkData.length > 1 && (
                        <div className="mt-2 mb-4">
                            <LiveSparkChart data={sparkData} color={color} />
                        </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <MetricChip icon={<VoltIcon />} label="Voltage" value={(r.volt ?? 0).toFixed(1)} unit="V" status={zoneColor(r.volt ?? 0, VOLT_ZONES, '#60a5fa')} />
                        <MetricChip icon={<CurrentIcon />} label="Current" value={(r.ampr ?? 0).toFixed(2)} unit="A" status={zoneColor(r.ampr ?? 0, AMPR_ZONES, '#60a5fa')} />
                        <MetricChip icon={<FreqIcon />} label="Frequency" value={(r.frqc ?? 0).toFixed(1)} unit="Hz" status={zoneColor(r.frqc ?? 0, FRQC_ZONES, '#60a5fa')} />
                        <MetricChip icon={<PfIcon />} label="Power Factor" value={(r.pf ?? 0).toFixed(2)} unit="" status={zoneColor(r.pf ?? 0, PF_ZONES, '#60a5fa')} />
                    </div>
                </div>
            )}
        </div>
    )
}
