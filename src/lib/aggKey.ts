// Hour/day bucket keys for the DeviceAggregates table, computed in
// Asia/Kolkata — the same tz convention the mqtt-bridge already uses for
// TTR schedule times. Kolkata is a fixed UTC+5:30 offset (no DST), so the
// bucket-start math below is exact without needing a tz database.

const TZ = 'Asia/Kolkata'
const KOLKATA_OFFSET_MS = 5.5 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

const partsFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
})

function parts(ts: number): { year: string; month: string; day: string; hour: string } {
    const found = partsFmt.formatToParts(new Date(ts))
    const get = (t: string) => found.find(p => p.type === t)?.value ?? '00'
    return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') }
}

export function dayKey(ts: number): string {
    const p = parts(ts)
    return `D#${p.year}-${p.month}-${p.day}`
}

export function hourKey(ts: number): string {
    const p = parts(ts)
    return `H#${p.year}-${p.month}-${p.day}T${p.hour}`
}

export function hourBucketStart(ts: number): number {
    const shifted = ts + KOLKATA_OFFSET_MS
    return Math.floor(shifted / HOUR_MS) * HOUR_MS - KOLKATA_OFFSET_MS
}

export function dayBucketStart(ts: number): number {
    const shifted = ts + KOLKATA_OFFSET_MS
    return Math.floor(shifted / DAY_MS) * DAY_MS - KOLKATA_OFFSET_MS
}
