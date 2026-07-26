// Value leads (strong, high-contrast) and the series name follows (muted) —
// the reader has the series already and wants the number. Identity comes
// from a short colored line-key beside the name, not from coloring the
// text itself (a light hue as text would be illegible on the card anyway).
export const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color?: string }>; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-card border border-border-light rounded-xl px-4 py-3 text-[0.82rem] shadow-lg">
            {label && <p className="text-text-muted m-0 mb-2 text-[0.7rem] uppercase tracking-wide">{label}</p>}
            <div className="flex flex-col gap-1.5">
                {payload.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="inline-block w-3 h-[2px] rounded-full shrink-0" style={{ background: p.color ?? '#60a5fa' }} />
                        <span className="text-text-secondary">{p.name}</span>
                        <span className="text-text-primary font-bold ml-auto pl-3">{p.value}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
