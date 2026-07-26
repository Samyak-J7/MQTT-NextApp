// Adaptive time-bucketing so a trend chart stays readable whether it's
// backed by 10 raw readings or 10,000 — a raw bar-per-message chart looks
// fine at low volume but turns into an unreadable wall of bars once a
// device reports every few seconds. Buckets are spaced evenly across the
// series' actual time span (not wall-clock-aligned), so this works for any
// window length and any message rate.

export interface ResampledPoint {
    time: number   // avg timestamp of points in this bucket
    avg: number
    min: number
    max: number
    count: number
}

export function resampleSeries(
    points: { timestamp: number; value: number }[],
    maxPoints: number
): ResampledPoint[] {
    if (points.length === 0) return []
    if (points.length <= maxPoints) {
        return points.map(p => ({ time: p.timestamp, avg: p.value, min: p.value, max: p.value, count: 1 }))
    }

    const first = points[0].timestamp
    const last = points[points.length - 1].timestamp
    const span = Math.max(1, last - first)

    const buckets: { sum: number; count: number; min: number; max: number; tsSum: number }[] =
        Array.from({ length: maxPoints }, () => ({ sum: 0, count: 0, min: Infinity, max: -Infinity, tsSum: 0 }))

    for (const p of points) {
        let idx = Math.floor(((p.timestamp - first) / span) * maxPoints)
        idx = Math.min(maxPoints - 1, Math.max(0, idx))
        const b = buckets[idx]
        b.sum += p.value
        b.count++
        b.tsSum += p.timestamp
        if (p.value < b.min) b.min = p.value
        if (p.value > b.max) b.max = p.value
    }

    return buckets
        .filter(b => b.count > 0)
        .map(b => ({
            time: Math.round(b.tsSum / b.count),
            avg: parseFloat((b.sum / b.count).toFixed(2)),
            min: parseFloat(b.min.toFixed(2)),
            max: parseFloat(b.max.toFixed(2)),
            count: b.count,
        }))
}
