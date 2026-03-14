'use client'
import { useState } from 'react'
import { Sidebar } from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    return (
        <div className="flex min-h-screen">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex">
                <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
            </div>

            {/* Mobile sidebar overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-50 flex justify-start"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setMobileOpen(false)}
                >
                    <div onClick={e => e.stopPropagation()} className="h-full">
                        <Sidebar mobile collapsed={false} onToggle={() => setMobileOpen(false)} />
                    </div>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Header */}
                <header className="h-16 bg-card border-b border-border-subtle flex items-center px-6 gap-4 sticky top-0 z-10">
                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="btn-ghost p-1.5 flex md:hidden"
                        aria-label="Open menu"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                        </svg>
                    </button>

                    {/* Desktop collapse toggle */}
                    <button
                        onClick={() => setCollapsed(c => !c)}
                        className="btn-ghost p-1.5 hidden md:flex"
                        aria-label="Toggle sidebar"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                        </svg>
                    </button>

                    {/* Logo (always shown in header) */}
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                             style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 18v-6"/><path d="M10 18V5"/><path d="M14 18v-3"/><path d="M18 18v-8"/>
                            </svg>
                        </div>
                        <span className="font-bold text-[0.9rem] text-text-primary">MQTT Hub</span>
                    </div>

                    <div className="flex-1" />

                    {/* Right: live status */}
                    <div className="flex items-center gap-2">
                        <span className="status-dot-online" />
                        <span className="text-[0.8rem] text-text-secondary">Live</span>
                    </div>
                </header>

                <main className="flex-1 p-6 overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    )
}
