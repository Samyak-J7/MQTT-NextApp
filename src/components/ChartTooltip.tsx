export const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color?: string }>; label?: string }) => {
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
