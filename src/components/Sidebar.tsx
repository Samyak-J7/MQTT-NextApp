'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const navItems = [
    {
        href: '/',
        label: 'Home',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
        )
    },
    {
        href: '/dashboard',
        label: 'Overview',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
        )
    },
    {
        href: '/dashboard/devices',
        label: 'Devices',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
            </svg>
        )
    },
    {
        href: '/dashboard/schedules',
        label: 'Schedules',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
        )
    },
    {
        href: '/dashboard/analytics',
        label: 'Analytics',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
        )
    },
]

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
    const pathname = usePathname()

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/'
        if (href === '/dashboard') return pathname === '/dashboard'
        return pathname.startsWith(href)
    }

    return (
        <aside style={{
            width: collapsed ? '72px' : '240px',
            minHeight: '100vh',
            background: 'var(--bg-card)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.25s ease',
            overflow: 'hidden',
            flexShrink: 0,
        }}>
            {/* Logo */}
            <div style={{
                padding: collapsed ? '1.25rem 0' : '1.25rem 1.25rem',
                display: 'flex', alignItems: 'center',
                gap: '0.75rem',
                borderBottom: '1px solid var(--border)',
                justifyContent: collapsed ? 'center' : 'space-between',
                minHeight: '65px',
            }}>
                {!collapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{
                            width: '32px', height: '32px',
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            borderRadius: '10px', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 18v-6"/><path d="M10 18V5"/><path d="M14 18v-3"/><path d="M18 18v-8"/>
                            </svg>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                            MQTT Hub
                        </span>
                    </div>
                )}
                {collapsed && (
                    <div style={{
                        width: '32px', height: '32px',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 18v-6"/><path d="M10 18V5"/><path d="M14 18v-3"/><path d="M18 18v-8"/>
                        </svg>
                    </div>
                )}
                <button
                    onClick={onToggle}
                    className="btn-ghost"
                    style={{
                        padding: '0.35rem', width: '28px', height: '28px',
                        flexShrink: 0, display: collapsed ? 'none' : 'flex',
                        alignItems: 'center', justifyContent: 'center',
                    }}
                    aria-label="Toggle sidebar"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                    </svg>
                </button>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '0.75rem 0.625rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {navItems.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-item ${isActive(item.href) ? 'active' : ''}`}
                        style={{
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            paddingLeft: collapsed ? '0.625rem' : '0.875rem',
                            paddingRight: collapsed ? '0.625rem' : '0.875rem',
                        }}
                        title={collapsed ? item.label : undefined}
                    >
                        <span style={{ flexShrink: 0 }}>{item.icon}</span>
                        {!collapsed && <span>{item.label}</span>}
                    </Link>
                ))}
            </nav>

            {/* Bottom / Logout */}
            <div style={{
                padding: '0.75rem 0.625rem',
                borderTop: '1px solid var(--border)',
            }}>
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="sidebar-item"
                    style={{
                        width: '100%',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        paddingLeft: collapsed ? '0.625rem' : '0.875rem',
                        paddingRight: collapsed ? '0.625rem' : '0.875rem',
                        background: 'none', border: 'none',
                    }}
                    title={collapsed ? 'Sign Out' : undefined}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    {!collapsed && <span>Sign Out</span>}
                </button>
            </div>
        </aside>
    )
}
