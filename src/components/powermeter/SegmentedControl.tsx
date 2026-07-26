'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// Pill-shaped tab switcher with a sliding active indicator (measured off
// the real button positions, so it works with any label set/width).
export function SegmentedControl<T extends string>({
    options, value, onChange,
}: {
    options: { value: T; label: string }[]
    value: T
    onChange: (v: T) => void
}) {
    const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
    const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null)

    const measure = () => {
        const btn = btnRefs.current[value]
        if (btn) setThumb({ left: btn.offsetLeft, width: btn.offsetWidth })
    }

    useLayoutEffect(measure, [value, options])

    useEffect(() => {
        window.addEventListener('resize', measure)
        return () => window.removeEventListener('resize', measure)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    return (
        <div
            className="relative inline-flex items-center gap-0.5 p-1 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
        >
            {thumb && (
                <div
                    className="absolute top-1 bottom-1 rounded-lg transition-all duration-200 ease-out"
                    style={{ left: thumb.left, width: thumb.width, background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                />
            )}
            {options.map(o => (
                <button
                    key={o.value}
                    ref={el => { btnRefs.current[o.value] = el }}
                    onClick={() => onChange(o.value)}
                    className="relative z-10 px-3.5 py-1.5 text-[0.8rem] font-semibold rounded-lg transition-colors duration-200 cursor-pointer border-none bg-transparent"
                    style={{ color: value === o.value ? '#fff' : 'var(--text-secondary)' }}
                >
                    {o.label}
                </button>
            ))}
        </div>
    )
}
