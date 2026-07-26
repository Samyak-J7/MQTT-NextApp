// Cosmetic scaling defaults for the power-meter dashboard — easy to retune
// later against real hardware/connection ratings. Nothing here is derived
// from the data itself, it's just where the gauges/zones/status colors cap.

export const LOAD_MAX_WATT = 5000
export const NOMINAL_DAILY_KWH = 10

export const VOLT_ZONES = [{ limit: 200, color: '#ef4444' }, { limit: 250, color: '#22c55e' }, { limit: 999, color: '#ef4444' }]
export const AMPR_ZONES = [{ limit: 5, color: '#22c55e' }, { limit: 8, color: '#eab308' }, { limit: 999, color: '#ef4444' }]
export const FRQC_ZONES = [{ limit: 48, color: '#ef4444' }, { limit: 52, color: '#22c55e' }, { limit: 999, color: '#ef4444' }]
export const PF_ZONES = [{ limit: 0.85, color: '#ef4444' }, { limit: 0.95, color: '#eab308' }, { limit: 1.01, color: '#22c55e' }]

// A reading older than this is treated as "stale" — the device likely went
// offline or the topic stopped delivering, so the hero should say so rather
// than silently keep showing a frozen last-known number as if it were live.
export const STALE_AFTER_MS = 3 * 60 * 1000

export function loadStatusColor(watt: number): string {
    if (watt > LOAD_MAX_WATT) return '#ef4444'
    if (watt > LOAD_MAX_WATT * 0.8) return '#eab308'
    return '#22c55e'
}
