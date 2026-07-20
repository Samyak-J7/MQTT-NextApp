'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Device, Schedule, SensorReading, DeviceType, DEVICE_TYPE_LABELS } from '@/app/types'
import { toast } from 'sonner'
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line
} from 'recharts'
import { CityPicker, CitySelection } from '@/components/CityPicker'

function computeDurationMinutes(startHh: string, startMm: string, endHh: string, endMm: string): number {
    const start = Number(startHh) * 60 + Number(startMm)
    let end = Number(endHh) * 60 + Number(endMm)
    if (end <= start) end += 24 * 60 // wraps past midnight
    return end - start
}
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from '@/components/ui/select'

type Range = '24h' | '7d' | '30d'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(ts: number) { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
function fmtDate(ts: number) { return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' }) }
function fmtTs(ts: number, range: Range) { return range === '30d' ? fmtDate(ts) : fmtTime(ts) }

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color?: string }>; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-card border border-border-light rounded-xl px-4 py-3 text-[0.82rem]">
            <p className="text-text-muted m-0 mb-1.5">{label}</p>
            {payload.map((p, i) => (
                <p key={i} className="m-0 font-semibold" style={{ color: p.color ?? '#60a5fa' }}>
                    {p.name}: {p.value}
                </p>
            ))}
        </div>
    )
}

// ── Graphs: OMS ────────────────────────────────────────────────────────────────

function OmsCharts({ readings, range }: { readings: SensorReading[]; range: Range }) {
    const data = readings.map(r => ({
        time: fmtTs(r.timestamp, range),
        duration_min: parseFloat(((r.duration ?? 0) / 60).toFixed(1)),
    }))

    const totalMin = readings.reduce((s, r) => s + (r.duration ?? 0), 0) / 60
    const sessions = readings.length

    return (
        <div>
            <div className="flex gap-6 mb-5 flex-wrap">
                <div>
                    <div className="text-[0.72rem] text-text-muted uppercase tracking-wider">Sessions</div>
                    <div className="text-[1.4rem] font-extrabold text-[#fbbf24]">{sessions}</div>
                </div>
                <div>
                    <div className="text-[0.72rem] text-text-muted uppercase tracking-wider">Total Active</div>
                    <div className="text-[1.4rem] font-extrabold text-[#fbbf24]">{totalMin.toFixed(1)} min</div>
                </div>
                <div>
                    <div className="text-[0.72rem] text-text-muted uppercase tracking-wider">Avg Duration</div>
                    <div className="text-[1.4rem] font-extrabold text-[#fbbf24]">
                        {sessions > 0 ? (totalMin / sessions).toFixed(1) : '—'} min
                    </div>
                </div>
            </div>

            <p className="text-xs text-text-muted m-0 mb-3">Session Duration (minutes)</p>
            <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" min" />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="duration_min" name="Duration (min)" fill="#fbbf24" radius={[4, 4, 0, 0]} opacity={0.85} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

// ── Graphs: Liquid Flow ───────────────────────────────────────────────────────

function FlowCharts({ readings, range }: { readings: SensorReading[]; range: Range }) {
    let cumulative = 0
    const data = readings.map(r => {
        cumulative += r.consumption ?? 0
        const rate = (r.duration ?? 0) > 0 && r.consumption != null
            ? parseFloat(((r.consumption / (r.duration ?? 1)) * 3600).toFixed(2))
            : 0
        return {
            time: fmtTs(r.timestamp, range),
            consumption: parseFloat((r.consumption ?? 0).toFixed(2)),
            cumulative: parseFloat(cumulative.toFixed(2)),
            rate_per_hour: rate,
        }
    })

    const totalConsumption = readings.reduce((s, r) => s + (r.consumption ?? 0), 0)
    const avgRate = data.length > 0
        ? data.reduce((s, d) => s + d.rate_per_hour, 0) / data.length
        : 0

    return (
        <div>
            <div className="flex gap-6 mb-5 flex-wrap">
                <div>
                    <div className="text-[0.72rem] text-text-muted uppercase tracking-wider">Total Consumption</div>
                    <div className="text-[1.4rem] font-extrabold text-[#22d3ee]">{totalConsumption.toFixed(1)} L</div>
                </div>
                <div>
                    <div className="text-[0.72rem] text-text-muted uppercase tracking-wider">Avg Flow Rate</div>
                    <div className="text-[1.4rem] font-extrabold text-[#22d3ee]">{avgRate.toFixed(1)} L/hr</div>
                </div>
                <div>
                    <div className="text-[0.72rem] text-text-muted uppercase tracking-wider">Readings</div>
                    <div className="text-[1.4rem] font-extrabold text-[#22d3ee]">{readings.length}</div>
                </div>
            </div>

            <p className="text-xs text-text-muted m-0 mb-3">Consumption per session (L)</p>
            <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" L" />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="consumption" name="Consumption (L)" stroke="#22d3ee" strokeWidth={2} fill="url(#flowGrad)" />
                </AreaChart>
            </ResponsiveContainer>

            <p className="text-xs text-text-muted m-0 mt-5 mb-3">Cumulative total (L)</p>
            <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" L" />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="cumulative" name="Cumulative (L)" stroke="#818cf8" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

// ── Graphs: Power Meter ───────────────────────────────────────────────────────

function PowerMeterCharts({ readings, range }: { readings: SensorReading[]; range: Range }) {
    let cumKwh = 0
    const data = readings.map(r => {
        cumKwh += r.unit ?? 0
        return {
            time: fmtTs(r.timestamp, range),
            watt:  parseFloat((r.watt  ?? 0).toFixed(1)),
            volt:  parseFloat((r.volt  ?? 0).toFixed(1)),
            ampr:  parseFloat((r.ampr  ?? 0).toFixed(2)),
            pf:    parseFloat((r.pf    ?? 0).toFixed(2)),
            frqc:  parseFloat((r.frqc  ?? 0).toFixed(1)),
            unit:  parseFloat((r.unit  ?? 0).toFixed(3)),
            cumKwh: parseFloat(cumKwh.toFixed(3)),
        }
    })

    const latest = readings[readings.length - 1]
    const totalKwh = readings.reduce((s, r) => s + (r.unit ?? 0), 0)
    const avgWatt  = readings.length ? readings.reduce((s, r) => s + (r.watt ?? 0), 0) / readings.length : 0

    const Stat = ({ label, value, color }: { label: string; value: string; color: string }) => (
        <div>
            <div className="text-[0.72rem] text-text-muted uppercase tracking-wider">{label}</div>
            <div className="text-[1.3rem] font-extrabold" style={{ color }}>{value}</div>
        </div>
    )

    return (
        <div>
            {/* Live snapshot */}
            <div className="flex gap-5 mb-6 flex-wrap">
                <Stat label="Voltage"      value={latest ? `${latest.volt?.toFixed(1)} V`  : '—'} color="#a78bfa" />
                <Stat label="Current"      value={latest ? `${latest.ampr?.toFixed(2)} A`  : '—'} color="#a78bfa" />
                <Stat label="Power"        value={latest ? `${latest.watt?.toFixed(1)} W`  : '—'} color="#f472b6" />
                <Stat label="Power Factor" value={latest ? `${latest.pf?.toFixed(2)}`       : '—'} color="#a78bfa" />
                <Stat label="Frequency"    value={latest ? `${latest.frqc?.toFixed(1)} Hz` : '—'} color="#a78bfa" />
                <Stat label="Total Energy" value={`${totalKwh.toFixed(3)} kWh`}                    color="#34d399" />
                <Stat label="Avg Power"    value={`${avgWatt.toFixed(1)} W`}                       color="#f472b6" />
            </div>

            {/* Power over time */}
            <p className="text-xs text-text-muted m-0 mb-3">Power (W)</p>
            <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="wattGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#f472b6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" W" />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="watt" name="Power (W)" stroke="#f472b6" strokeWidth={2} fill="url(#wattGrad)" />
                </AreaChart>
            </ResponsiveContainer>

            {/* Voltage & Current */}
            <p className="text-xs text-text-muted m-0 mt-5 mb-3">Voltage (V) &amp; Current (A)</p>
            <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="v" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" V" />
                    <YAxis yAxisId="a" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" A" />
                    <Tooltip content={<ChartTooltip />} />
                    <Line yAxisId="v" type="monotone" dataKey="volt" name="Voltage (V)" stroke="#a78bfa" strokeWidth={2} dot={false} />
                    <Line yAxisId="a" type="monotone" dataKey="ampr" name="Current (A)" stroke="#22d3ee" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>

            {/* Cumulative energy */}
            <p className="text-xs text-text-muted m-0 mt-5 mb-3">Cumulative Energy (kWh)</p>
            <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="kwhGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#34d399" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" kWh" />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="cumKwh" name="Cumulative (kWh)" stroke="#34d399" strokeWidth={2} fill="url(#kwhGrad)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

// ── OMS Control ───────────────────────────────────────────────────────────────

// Dial geometry constants
const D_CX = 110, D_CY = 110, D_R = 80, D_SVG = 220
const D_START = 135   // lower-left in SVG coords (0°=right, clockwise)
const D_SWEEP = 270   // total arc sweep (degrees)
const D_MIN = 1_000          // ms — 1 second minimum
const D_MAX = 3_600_000      // ms — 1 hour maximum
const D_DEFAULT = 2_400      // ms
const D_OFF = 100            // ms — OFF always sends 0.1 s

const D_PRESETS = [
    { label: '1 s',    value: 1_000 },
    { label: '5 s',    value: 5_000 },
    { label: '15 s',   value: 15_000 },
    { label: '30 s',   value: 30_000 },
    { label: '1 min',  value: 60_000 },
    { label: '5 min',  value: 300_000 },
    { label: '30 min', value: 1_800_000 },
    { label: '1 hr',   value: 3_600_000 },
]

// Logarithmic scale gives fine control at low values, still reaches 1 hr
const D_LOG_MIN = Math.log(D_MIN)
const D_LOG_MAX = Math.log(D_MAX)

function dRad(deg: number) { return (deg * Math.PI) / 180 }

function dPt(angle: number, r = D_R): [number, number] {
    return [D_CX + r * Math.cos(dRad(angle)), D_CY + r * Math.sin(dRad(angle))]
}

function dArc(a1: number, a2: number, r = D_R): string {
    const [sx, sy] = dPt(a1, r)
    const [ex, ey] = dPt(a2, r)
    const sweep = a2 - a1
    if (sweep < 0.5) return ''
    return `M ${sx} ${sy} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${ex} ${ey}`
}

function valToAngle(v: number): number {
    const clamped = Math.max(D_MIN, Math.min(D_MAX, v))
    return D_START + ((Math.log(clamped) - D_LOG_MIN) / (D_LOG_MAX - D_LOG_MIN)) * D_SWEEP
}

function mouseToDialAngle(rect: DOMRect, clientX: number, clientY: number): number {
    const scaleX = D_SVG / rect.width
    const scaleY = D_SVG / rect.height
    const svgX = (clientX - rect.left) * scaleX
    const svgY = (clientY - rect.top) * scaleY
    let angle = Math.atan2(svgY - D_CY, svgX - D_CX) * (180 / Math.PI)
    if (angle < 0) angle += 360
    if (angle >= D_START) return angle
    if (angle < D_START - D_SWEEP + 360) return angle + 360
    return angle < 90 ? D_START + D_SWEEP : D_START
}

function dialAngleToVal(a: number): number {
    const logV = D_LOG_MIN + ((a - D_START) / D_SWEEP) * (D_LOG_MAX - D_LOG_MIN)
    return Math.round(Math.exp(logV))
}

function fmtMs(ms: number): string {
    if (ms < 60_000)      return `${parseFloat((ms / 1000).toFixed(1))} s`
    if (ms < 3_600_000)   return `${parseFloat((ms / 60_000).toFixed(1))} min`
    return `${parseFloat((ms / 3_600_000).toFixed(1))} hr`
}

type DurUnit = 's' | 'min' | 'hr'
const UNIT_MULT: Record<DurUnit, number> = { s: 1_000, min: 60_000, hr: 3_600_000 }

function OmsControl({ deviceId, initialDuration }: { deviceId: string; initialDuration?: number }) {
    const [duration, setDuration] = useState(initialDuration ?? D_DEFAULT)
    const [unit, setUnit] = useState<DurUnit>('s')
    const [isDragging, setIsDragging] = useState(false)
    const [sending, setSending] = useState<'on' | 'off' | null>(null)
    const [lastCmd, setLastCmd] = useState<{ type: 'on' | 'off'; ms: number; at: number } | null>(null)
    const svgRef = useRef<SVGSVGElement>(null)
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const synced = useRef(false)

    // Sync once when the device loads (initialDuration comes in async)
    useEffect(() => {
        if (!synced.current && initialDuration !== undefined) {
            synced.current = true
            setDuration(initialDuration) // plain setDuration — no PATCH
        }
    }, [initialDuration])

    // All user-initiated changes: update state + debounce-save to DynamoDB
    const updateDuration = useCallback((ms: number) => {
        const clamped = Math.max(D_MIN, Math.min(D_MAX, ms))
        setDuration(clamped)
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => {
            fetch(`/api/devices/${deviceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ defaultDuration: clamped }),
            }).catch(err => console.error('[oms] save defaultDuration:', err))
        }, 800)
    }, [deviceId])

    useEffect(() => {
        if (!isDragging) return
        const onMove = (clientX: number, clientY: number) => {
            if (!svgRef.current) return
            const a = mouseToDialAngle(svgRef.current.getBoundingClientRect(), clientX, clientY)
            updateDuration(dialAngleToVal(a))
        }
        const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY)
        const onTouchMove = (e: TouchEvent) => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY) }
        const onEnd = () => setIsDragging(false)
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onEnd)
        document.addEventListener('touchmove', onTouchMove, { passive: false })
        document.addEventListener('touchend', onEnd)
        return () => {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onEnd)
            document.removeEventListener('touchmove', onTouchMove)
            document.removeEventListener('touchend', onEnd)
        }
    }, [isDragging, updateDuration])

    const sendCommand = async (ms: number, type: 'on' | 'off') => {
        setSending(type)
        try {
            const res = await fetch(`/api/devices/${deviceId}/control`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ duration: ms }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success(type === 'on' ? `ON — ${fmtMs(ms)}` : 'Switch OFF')
            setLastCmd({ type, ms, at: Date.now() })
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to send command')
        } finally {
            setSending(null)
        }
    }

    // Derived display value in current unit (no trailing zeros)
    const displayVal = parseFloat((duration / UNIT_MULT[unit]).toFixed(2)).toString()

    const currentAngle = valToAngle(duration)
    const [hx, hy] = dPt(currentAngle)
    const trackPath = dArc(D_START, D_START + D_SWEEP)
    const fillPath  = dArc(D_START, currentAngle)
    const isActive  = !!sending

    return (
        <div className="glass-card p-5 mb-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <h2 className="m-0 text-base font-bold text-text-primary">Switch Control</h2>
                {lastCmd && (
                    <span className="text-[0.73rem] text-text-muted">
                        Last:{' '}
                        <span style={{ color: lastCmd.type === 'on' ? '#fbbf24' : '#94a3b8' }}>
                            {lastCmd.type === 'on' ? `ON (${fmtMs(lastCmd.ms)})` : 'OFF'}
                        </span>
                        {' '}· {new Date(lastCmd.at).toLocaleTimeString()}
                    </span>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">

                {/* ── Arc Dial ── */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <svg
                        ref={svgRef}
                        width={D_SVG}
                        height={D_SVG}
                        viewBox={`0 0 ${D_SVG} ${D_SVG}`}
                        style={{ touchAction: 'none', cursor: isDragging ? 'grabbing' : 'default', userSelect: 'none' }}
                    >
                        <defs>
                            <filter id="omsglow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="3.5" result="blur" />
                                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                            <radialGradient id="centerglow" cx="50%" cy="50%" r="50%">
                                <stop offset="0%"   stopColor="#fbbf24" stopOpacity="0.18" />
                                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                            </radialGradient>
                        </defs>

                        <circle cx={D_CX} cy={D_CY} r={D_R + 14}
                            fill="none" stroke="rgba(251,191,36,0.05)" strokeWidth={1} />

                        <path d={trackPath} fill="none"
                            stroke="rgba(251,191,36,0.13)" strokeWidth={11} strokeLinecap="round" />

                        {fillPath && (
                            <path d={fillPath} fill="none"
                                stroke="#fbbf24" strokeWidth={11} strokeLinecap="round"
                                opacity={0.88} filter="url(#omsglow)" />
                        )}

                        <circle cx={D_CX} cy={D_CY} r={D_R - 18} fill="url(#centerglow)" />

                        <circle cx={D_CX} cy={D_CY} r={44}
                            fill={sending === 'on' ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.07)'}
                            stroke={sending === 'on' ? 'rgba(251,191,36,0.6)' : 'rgba(251,191,36,0.25)'}
                            strokeWidth={1.5}
                            style={{ cursor: isActive ? 'not-allowed' : 'pointer', transition: 'fill 0.15s, stroke 0.15s' }}
                            onClick={() => !isActive && sendCommand(duration, 'on')}
                        />
                        <text x={D_CX} y={D_CY - 10} textAnchor="middle"
                            fill={sending === 'on' ? '#fde68a' : '#fbbf24'}
                            fontSize={15} fontWeight="800" letterSpacing="1"
                            style={{ pointerEvents: 'none' }}>
                            {sending === 'on' ? '···' : 'ON'}
                        </text>
                        <text x={D_CX} y={D_CY + 9} textAnchor="middle"
                            fill="rgba(251,191,36,0.65)" fontSize={10.5} fontWeight="500"
                            style={{ pointerEvents: 'none' }}>
                            {fmtMs(duration)}
                        </text>

                        <circle cx={hx} cy={hy} r={11}
                            fill="#1a1a2e" stroke="#fbbf24" strokeWidth={2.5}
                            filter="url(#omsglow)"
                            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                            onMouseDown={e => { e.preventDefault(); setIsDragging(true) }}
                            onTouchStart={() => setIsDragging(true)}
                        />
                        <circle cx={hx} cy={hy} r={4} fill="#fbbf24"
                            style={{ pointerEvents: 'none' }} />
                    </svg>
                    <p className="text-[0.72rem] text-text-muted -mt-1">Drag handle to set duration</p>
                </div>

                {/* ── Right panel ── */}
                <div className="flex-1 flex flex-col gap-5 w-full">

                    {/* Presets */}
                    <div>
                        <p className="text-[0.72rem] text-text-muted uppercase tracking-wider mb-2 font-medium">
                            Quick Presets
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {D_PRESETS.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => updateDuration(p.value)}
                                    className="px-3 py-1.5 rounded-lg text-[0.78rem] font-semibold border transition-all"
                                    style={duration === p.value ? {
                                        background: 'rgba(251,191,36,0.15)',
                                        borderColor: 'rgba(251,191,36,0.5)',
                                        color: '#fbbf24',
                                    } : {
                                        background: 'transparent',
                                        borderColor: 'rgba(255,255,255,0.1)',
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Human-friendly duration input */}
                    <div>
                        <p className="text-[0.72rem] text-text-muted uppercase tracking-wider mb-2 font-medium">
                            Custom Duration
                        </p>
                        <div className="flex gap-2 items-center">
                            <input
                                type="number"
                                min={0}
                                step="any"
                                value={displayVal}
                                onChange={e => {
                                    const num = parseFloat(e.target.value)
                                    if (!isNaN(num) && num > 0) {
                                        updateDuration(Math.round(num * UNIT_MULT[unit]))
                                    }
                                }}
                                className="input-dark w-28 text-sm"
                                style={{ padding: '10px 14px' }}
                            />
                            <Select value={unit} onValueChange={v => setUnit(v as DurUnit)}>
                                <SelectTrigger
                                    className="w-[100px] rounded-xl border text-sm font-medium focus:ring-1"
                                    style={{
                                        height: '42px',
                                        background: 'var(--bg-card)',
                                        borderColor: 'var(--border-light)',
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent
                                    className="rounded-xl border text-sm"
                                    style={{
                                        background: 'var(--bg-card)',
                                        borderColor: 'var(--border-light)',
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    {([
                                        { value: 's',   label: 'Seconds' },
                                        { value: 'min', label: 'Minutes' },
                                        { value: 'hr',  label: 'Hours'   },
                                    ] as { value: DurUnit; label: string }[]).map(o => (
                                        <SelectItem
                                            key={o.value}
                                            value={o.value}
                                            className="rounded-lg text-sm cursor-pointer focus:bg-[rgba(251,191,36,0.1)] focus:text-[#fbbf24] data-[state=checked]:text-[#fbbf24]"
                                        >
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* ON button */}
                    <button
                        onClick={() => !isActive && sendCommand(duration, 'on')}
                        disabled={isActive}
                        className="py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                        style={{
                            background: 'rgba(251,191,36,0.12)',
                            border: '1px solid rgba(251,191,36,0.35)',
                            color: '#fbbf24',
                        }}
                    >
                        {sending === 'on' ? 'Turning ON…' : `⚡ ON — ${fmtMs(duration)}`}
                    </button>

                    {/* OFF button */}
                    <button
                        onClick={() => !isActive && sendCommand(D_OFF, 'off')}
                        disabled={isActive}
                        className="py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                        style={{
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.28)',
                            color: '#f87171',
                        }}
                    >
                        {sending === 'off' ? 'Turning Off…' : '⏻  OFF'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Schedule Modal ────────────────────────────────────────────────────────────

function ScheduleModal({ deviceId, onClose, onAdded }: {
    deviceId: string
    onClose: () => void
    onAdded: (s: Schedule) => void
}) {
    const [form, setForm] = useState({
        mode: 'TTR',
        hh: '08', mm: '00',
        endMode: 'duration' as 'duration' | 'until',
        duration: '5',
        endHh: '08', endMm: '30',
    })
    const [city, setCity] = useState<CitySelection | null>(null)
    const [loading, setLoading] = useState(false)
    const needsSun = form.mode === 'SRS' || form.mode === 'SST'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (needsSun && !city) { toast.error('Pick a city first'); return }

        setLoading(true)
        try {
            const trigAt = form.mode === 'TTR'
                ? `${form.hh.padStart(2, '0')}${form.mm.padStart(2, '0')}`
                : '0000'
            const duration = form.mode === 'TTR' && form.endMode === 'until'
                ? computeDurationMinutes(form.hh, form.mm, form.endHh, form.endMm)
                : Number(form.duration)

            const res = await fetch(`/api/devices/${deviceId}/schedules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: form.mode,
                    trigAt,
                    duration,
                    ...(needsSun && city ? { lat: city.lat, lon: city.lon } : {}),
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success('Schedule added!')
            onAdded(data.schedule)
            onClose()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-5">
                    <h3 className="m-0 text-text-primary text-[1.05rem] font-bold">Add Schedule</h3>
                    <button onClick={onClose} className="btn-ghost px-2 py-1">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.8rem] font-medium text-text-secondary">Trigger Mode</label>
                        <select
                            className="input-dark cursor-pointer"
                            value={form.mode}
                            onChange={e => { setForm(f => ({ ...f, mode: e.target.value })); setCity(null) }}
                        >
                            <option value="TTR">⏱ Time Trigger</option>
                            <option value="SRS">🌅 Sunrise</option>
                            <option value="SST">🌇 Sunset</option>
                        </select>
                    </div>

                    {form.mode === 'TTR' && (
                        <>
                            <div className="flex gap-3">
                                <div className="flex-1 flex flex-col gap-1.5">
                                    <label className="text-[0.8rem] font-medium text-text-secondary">Start Hour (0-23)</label>
                                    <input className="input-dark" type="number" min="0" max="23" value={form.hh}
                                        onChange={e => setForm(f => ({ ...f, hh: e.target.value }))} />
                                </div>
                                <div className="flex-1 flex flex-col gap-1.5">
                                    <label className="text-[0.8rem] font-medium text-text-secondary">Start Minute (0-59)</label>
                                    <input className="input-dark" type="number" min="0" max="59" value={form.mm}
                                        onChange={e => setForm(f => ({ ...f, mm: e.target.value }))} />
                                </div>
                            </div>

                            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                {(['duration', 'until'] as const).map(m => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, endMode: m }))}
                                        className={form.endMode === m ? 'btn-primary flex-1 justify-center py-1.5 text-sm' : 'btn-ghost flex-1 justify-center py-1.5 text-sm'}
                                    >
                                        {m === 'duration' ? 'Run for...' : 'Until time...'}
                                    </button>
                                ))}
                            </div>

                            {form.endMode === 'duration' ? (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[0.8rem] font-medium text-text-secondary">ON Duration (minutes)</label>
                                    <input className="input-dark" type="number" min="1" value={form.duration}
                                        onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} required />
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <div className="flex-1 flex flex-col gap-1.5">
                                        <label className="text-[0.8rem] font-medium text-text-secondary">End Hour</label>
                                        <input className="input-dark" type="number" min="0" max="23" value={form.endHh}
                                            onChange={e => setForm(f => ({ ...f, endHh: e.target.value }))} />
                                    </div>
                                    <div className="flex-1 flex flex-col gap-1.5">
                                        <label className="text-[0.8rem] font-medium text-text-secondary">End Minute</label>
                                        <input className="input-dark" type="number" min="0" max="59" value={form.endMm}
                                            onChange={e => setForm(f => ({ ...f, endMm: e.target.value }))} />
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {needsSun && (
                        <>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[0.8rem] font-medium text-text-secondary">Location</label>
                                <CityPicker value={city} onChange={setCity} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[0.8rem] font-medium text-text-secondary">ON Duration (minutes)</label>
                                <input className="input-dark" type="number" min="1" value={form.duration}
                                    onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} required />
                            </div>
                        </>
                    )}

                    <div className="flex gap-3 mt-1">
                        <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
                        <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Schedule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TYPE_ACCENT: Record<DeviceType, string> = { oms: '#fbbf24', liquid_flow: '#22d3ee', power_meter: '#a78bfa' }

export default function DeviceDetailPage() {
    const { deviceId } = useParams() as { deviceId: string }
    const router = useRouter()
    const [device, setDevice] = useState<Device | null>(null)
    const [lastSeen, setLastSeen] = useState<number | null>(null)
    const [readings, setReadings] = useState<SensorReading[]>([])
    const [range, setRange] = useState<Range>('7d')
    const [loading, setLoading] = useState(true)
    const [showSchedule, setShowSchedule] = useState(false)

    const loadDevice = useCallback(() => {
        fetch(`/api/devices/${deviceId}`).then(r => r.json()).then(d => setDevice(d.device ?? null))
    }, [deviceId])

    const pollStatus = useCallback(() => {
        fetch(`/api/devices/${deviceId}/status`)
            .then(r => r.json())
            .then(d => { if (d.lastSeen !== undefined) setLastSeen(d.lastSeen) })
            .catch(() => {})
    }, [deviceId])

    const loadReadings = useCallback(() => {
        fetch(`/api/devices/${deviceId}/readings?range=${range}`)
            .then(r => r.json())
            .then(d => setReadings(d.readings ?? []))
            .finally(() => setLoading(false))
    }, [deviceId, range])

    useEffect(() => {
        loadDevice()
        loadReadings()
        pollStatus()
        const interval = setInterval(pollStatus, 20_000)
        return () => clearInterval(interval)
    }, [loadDevice, loadReadings, pollStatus])

    const deleteSchedule = async (scheduleId: string) => {
        try {
            await fetch(`/api/devices/${deviceId}/schedules`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scheduleId }),
            })
            toast.success('Schedule removed')
            loadDevice()
        } catch { toast.error('Failed to remove schedule') }
    }

    if (!device && !loading) {
        return (
            <div className="text-center py-16 text-text-muted">
                <p>Device not found.</p>
                <button onClick={() => router.back()} className="btn-ghost mt-4">← Go back</button>
            </div>
        )
    }

    const effectiveLastSeen = lastSeen ?? device?.lastSeen ?? null
    const isOnline = effectiveLastSeen ? Date.now() - effectiveLastSeen < 5 * 60 * 1000 : false
    const accent = device?.type ? TYPE_ACCENT[device.type] : '#60a5fa'

    const metaItems = [
        { label: 'Type',          value: device?.type ? DEVICE_TYPE_LABELS[device.type] : '—' },
        { label: 'Total Readings', value: readings.length || '—' },
        { label: 'Last Seen',     value: effectiveLastSeen ? new Date(effectiveLastSeen).toLocaleString() : 'Never' },
        { label: 'Schedules',     value: (device?.schedules ?? []).length },
        { label: 'Added',         value: device?.createdAt ? new Date(device.createdAt).toLocaleDateString() : '—' },
    ]

    return (
        <div className="max-w-[1200px] mx-auto">
            <button onClick={() => router.back()} className="btn-ghost mb-5 text-[0.85rem]">
                ← Back to Devices
            </button>

            {/* Header card */}
            <div className="glass-card p-6 mb-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                             style={{
                                 background: `linear-gradient(135deg, ${accent}22, ${accent}11)`,
                                 border: `1px solid ${accent}44`,
                                 color: accent,
                             }}>
                            {device?.type === 'liquid_flow' ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2C6.5 11 2 15.4 2 17.5 2 20.5 6.7 23 12 23s10-2.5 10-5.5C22 15.4 17.5 11 12 2z"/>
                                </svg>
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18.36 6.64A9 9 0 0 1 20.77 15"/><path d="M6.16 6.16a9 9 0 1 0 12.68 12.68"/>
                                    <line x1="12" y1="2" x2="12" y2="12"/><line x1="2" y1="2" x2="22" y2="22"/>
                                </svg>
                            )}
                        </div>
                        <div>
                            <h1 className="text-[1.4rem] font-extrabold text-text-primary m-0">
                                {device?.name ?? 'Loading...'}
                            </h1>
                            <p className="text-text-muted text-[0.8rem] m-0 mt-0.5 font-mono">{deviceId}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={isOnline ? 'badge-online' : 'badge-offline'}>
                            {isOnline ? '● Online' : '○ Offline'}
                        </span>
                        {device?.location && (
                            <span className="text-[0.8rem] text-text-secondary">📍 {device.location}</span>
                        )}
                    </div>
                </div>

                <div className="flex gap-8 mt-5 flex-wrap">
                    {metaItems.map(m => (
                        <div key={m.label}>
                            <div className="text-[0.72rem] text-text-muted uppercase tracking-wider">{m.label}</div>
                            <div className="text-[0.9rem] font-semibold text-text-secondary mt-0.5">{m.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* OMS Switch Control */}
            {device?.type === 'oms' && (
                <OmsControl deviceId={deviceId} initialDuration={device.defaultDuration} />
            )}

            {/* Charts */}
            <div className="glass-card p-5 mb-6">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <h2 className="m-0 text-base font-bold text-text-primary">
                        {device?.type === 'oms' ? 'Switch Activity' : device?.type === 'liquid_flow' ? 'Flow & Consumption' : 'Power & Energy'}
                    </h2>
                    <div className="flex gap-1.5">
                        {(['24h', '7d', '30d'] as Range[]).map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`${range === r ? 'btn-primary' : 'btn-ghost'} px-3.5 py-1.5 text-[0.8rem]`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <span className="spinner" />
                    </div>
                ) : readings.length === 0 ? (
                    <div className="text-center py-10 text-text-muted text-sm">
                        No readings yet for this range.
                    </div>
                ) : device?.type === 'oms' ? (
                    <OmsCharts readings={readings} range={range} />
                ) : device?.type === 'liquid_flow' ? (
                    <FlowCharts readings={readings} range={range} />
                ) : (
                    <PowerMeterCharts readings={readings} range={range} />
                )}
            </div>

            {/* Schedules */}
            {device?.type === 'oms' && (
            <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="m-0 text-base font-bold text-text-primary">Schedules</h2>
                    <button onClick={() => setShowSchedule(true)} className="btn-primary px-3.5 py-1.5 text-[0.82rem]">
                        + Add Schedule
                    </button>
                </div>

                {(device?.schedules ?? []).length === 0 ? (
                    <div className="text-center py-8 text-text-muted text-sm">
                        No schedules configured yet.
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {device!.schedules!.map(s => (
                            <div key={s.scheduleId} className="glass-card-hover flex items-center gap-4 px-4 py-3.5 rounded-xl border border-border-subtle">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                                     style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
                                    {s.mode === 'TTR' ? '⏱' : s.mode === 'SRS' ? '🌅' : '🌇'}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-text-primary">
                                        {s.mode === 'TTR'
                                            ? `${s.trigAt?.slice(0, 2)}:${s.trigAt?.slice(2, 4)}`
                                            : s.mode === 'SRS' ? 'At Sunrise'
                                            : 'At Sunset'}
                                    </div>
                                    <div className="text-[0.72rem] text-text-muted">
                                        ON for {s.duration} min · Added {new Date(s.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <button onClick={() => deleteSchedule(s.scheduleId)} className="btn-danger px-2.5 py-1 text-xs">
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            )}

            {showSchedule && (
                <ScheduleModal
                    deviceId={deviceId}
                    onClose={() => setShowSchedule(false)}
                    onAdded={() => { loadDevice(); setShowSchedule(false) }}
                />
            )}
        </div>
    )
}
