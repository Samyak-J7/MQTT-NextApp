'use client'
import { useState, useEffect, useRef } from 'react'
import { searchCity, GeocodeResult } from '@/lib/geocode'

export type CitySelection = GeocodeResult

export function CityPicker({ value, onChange }: {
    value: CitySelection | null
    onChange: (v: CitySelection | null) => void
}) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<GeocodeResult[]>([])
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (!query.trim()) { setResults([]); setOpen(false); return }

        debounceRef.current = setTimeout(() => {
            setLoading(true)
            searchCity(query)
                .then(r => { setResults(r); setOpen(true) })
                .finally(() => setLoading(false))
        }, 350)

        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [query])

    if (value) {
        return (
            <div className="input-dark flex items-center justify-between gap-2">
                <span className="truncate">📍 {value.label}</span>
                <button type="button" onClick={() => onChange(null)} className="btn-ghost px-2 py-0.5 text-xs shrink-0">
                    Change
                </button>
            </div>
        )
    }

    return (
        <div className="relative">
            <input
                className="input-dark"
                placeholder="Search city, e.g. Mumbai"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => results.length > 0 && setOpen(true)}
                autoComplete="off"
            />
            {loading && <div className="text-xs text-text-muted mt-1">Searching…</div>}
            {open && results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 rounded-xl border border-border-light bg-card overflow-hidden shadow-lg">
                    {results.map((r, i) => (
                        <button
                            key={i}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 text-text-primary"
                            onClick={() => { onChange(r); setOpen(false); setQuery('') }}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            )}
            {open && !loading && results.length === 0 && query.trim() && (
                <div className="absolute z-10 w-full mt-1 rounded-xl border border-border-light bg-card px-3 py-2 text-sm text-text-muted">
                    No matches
                </div>
            )}
        </div>
    )
}
