'use client'

// Read-only radial gauge for live power-meter metrics (voltage, load, etc.)
// Arc math mirrors the drag-dial in the OMS device page (dPt/dArc) but
// without any pointer handling — this is display-only. Geometry scales off
// a single `size` (px width) prop so the same component can be a small grid
// tile or a large hero gauge.

const G_START = 160   // degrees, 0=right/3-o'clock, clockwise, y-down SVG coords
const G_SWEEP = 220

function gRad(deg: number) { return (deg * Math.PI) / 180 }

function gPt(cx: number, cy: number, r: number, angle: number): [number, number] {
    return [cx + r * Math.cos(gRad(angle)), cy + r * Math.sin(gRad(angle))]
}

function gArc(cx: number, cy: number, r: number, a1: number, a2: number): string {
    const [sx, sy] = gPt(cx, cy, r, a1)
    const [ex, ey] = gPt(cx, cy, r, a2)
    const sweep = a2 - a1
    if (sweep < 0.5) return ''
    return `M ${sx} ${sy} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${ex} ${ey}`
}

function valToAngle(v: number, min: number, max: number): number {
    const frac = Math.max(0, Math.min(1, (v - min) / (max - min)))
    return G_START + frac * G_SWEEP
}

export interface GaugeZone { limit: number; color: string }

export function zoneColor(value: number, zones: GaugeZone[] | undefined, fallback: string): string {
    if (!zones || zones.length === 0) return fallback
    for (const z of zones) if (value <= z.limit) return z.color
    return zones[zones.length - 1].color
}

export function PowerGauge({
    label, value, unit, min, max, decimals = 1, color = '#60a5fa', zones, updatedAt, gaugeId, size = 160,
}: {
    label: string
    value: number
    unit: string
    min: number
    max: number
    decimals?: number
    color?: string
    zones?: GaugeZone[]
    updatedAt?: number | null
    gaugeId: string
    size?: number
}) {
    const cx = size / 2
    const cy = size * 0.55
    const r = size * 0.365
    const strokeW = Math.max(6, size * 0.056)

    const active = zoneColor(value, zones, color)
    const angle = valToAngle(value, min, max)
    const trackPath = gArc(cx, cy, r, G_START, G_START + G_SWEEP)
    const fillPath = gArc(cx, cy, r, G_START, angle)
    const [hx, hy] = gPt(cx, cy, r, angle)
    const filterId = `gaugeglow-${gaugeId}`

    return (
        <div className="glass-card p-4 flex flex-col items-center">
            <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.8}`}>
                <defs>
                    <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                <path d={trackPath} fill="none" stroke={`${active}22`} strokeWidth={strokeW} strokeLinecap="round" />
                {fillPath && (
                    <path d={fillPath} fill="none" stroke={active} strokeWidth={strokeW} strokeLinecap="round"
                        opacity={0.9} filter={`url(#${filterId})`} />
                )}
                <circle cx={hx} cy={hy} r={strokeW * 0.45} fill={active} />

                <text x={cx} y={cy - size * 0.04} textAnchor="middle" fontSize={size * 0.12} fontWeight="800" fill="var(--text-primary)">
                    {value.toFixed(decimals)}
                </text>
                <text x={cx} y={cy + size * 0.08} textAnchor="middle" fontSize={size * 0.062} fontWeight="600" fill="var(--text-muted)">
                    {unit}
                </text>
            </svg>
            <div className="text-[0.72rem] text-text-muted uppercase tracking-wider mt-1">{label}</div>
            {updatedAt != null && (
                <div className="text-[0.68rem] text-text-muted mt-0.5">
                    ↓ {new Date(updatedAt).toLocaleTimeString([], { hour12: false })}
                </div>
            )}
        </div>
    )
}
