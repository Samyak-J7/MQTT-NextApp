'use client'
import { useState } from 'react'
import { Sidebar } from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Desktop Sidebar */}
            <div className="hidden-mobile" style={{ display: 'flex' }}>
                <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
            </div>

            {/* Mobile sidebar overlay */}
            {mobileOpen && (
                <div
                    className="modal-overlay"
                    onClick={() => setMobileOpen(false)}
                    style={{ justifyContent: 'flex-start', padding: 0 }}
                >
                    <div onClick={e => e.stopPropagation()} style={{ height: '100%' }}>
                        <Sidebar mobile collapsed={false} onToggle={() => setMobileOpen(false)} />
                    </div>
                </div>
            )}

            {/* Main content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Top Header */}
                <header style={{
                    height: '65px',
                    background: 'var(--bg-card)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center',
                    padding: '0 1.5rem',
                    gap: '1rem',
                    position: 'sticky', top: 0, zIndex: 10,
                }}>
                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="btn-ghost show-mobile"
                        style={{ padding: '0.4rem', display: 'none' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                        </svg>
                    </button>

                    {/* Desktop collapse toggle */}
                    <button
                        onClick={() => setCollapsed(c => !c)}
                        className="btn-ghost desktop-only"
                        style={{ padding: '0.4rem' }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                        </svg>
                    </button>

                    {/* Logo for mobile */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                            width: '28px', height: '28px',
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            borderRadius: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 18v-6"/><path d="M10 18V5"/><path d="M14 18v-3"/><path d="M18 18v-8"/>
                            </svg>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>MQTT Hub</span>
                    </div>

                    <div style={{ flex: 1 }} />

                    {/* Right: status indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="status-dot-online" />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Live</span>
                    </div>
                </header>

                <main style={{ flex: 1, padding: '1.5rem', overflowX: 'hidden' }}>
                    {children}
                </main>
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .hidden-mobile { display: none !important; }
                    .show-mobile { display: flex !important; }
                    .desktop-only { display: none !important; }
                }
                @media (min-width: 769px) {
                    .show-mobile { display: none !important; }
                }
            `}</style>
        </div>
    )
}
