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

const LogoIcon = () => (
    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
         style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 18v-6"/><path d="M10 18V5"/><path d="M14 18v-3"/><path d="M18 18v-8"/>
        </svg>
    </div>
)

export function Sidebar({ collapsed, onToggle, mobile }: { collapsed: boolean; onToggle: () => void; mobile?: boolean }) {
    const pathname = usePathname()

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/'
        if (href === '/dashboard') return pathname === '/dashboard'
        return pathname.startsWith(href)
    }

    return (
        <aside className={[
            'flex flex-col overflow-hidden flex-shrink-0 bg-card border-r border-border-subtle',
            mobile ? 'h-full relative' : 'h-screen sticky top-0',
            collapsed ? 'w-[72px]' : 'w-60',
            'transition-[width] duration-[250ms] ease-in-out',
        ].join(' ')}>

            {/* Logo */}
            <div className={[
                'flex items-center border-b border-border-subtle min-h-[65px] flex-shrink-0',
                collapsed ? 'px-0 justify-center' : 'px-5 justify-between',
            ].join(' ')}>
                {!collapsed && (
                    <div className="flex items-center gap-2.5">
                        <LogoIcon />
                        <span className="font-bold text-[0.95rem] text-text-primary whitespace-nowrap">MQTT Hub</span>
                    </div>
                )}
                {collapsed && <LogoIcon />}
                <button
                    onClick={onToggle}
                    className="btn-ghost p-1.5 w-7 h-7 flex items-center justify-center"
                    style={{ display: collapsed ? 'none' : 'flex' }}
                    aria-label="Toggle sidebar"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                    </svg>
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-2.5 py-3 flex flex-col gap-1 overflow-y-auto">
                {navItems.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-item ${isActive(item.href) ? 'active' : ''}`}
                        style={{
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            paddingLeft:  collapsed ? '0.625rem' : undefined,
                            paddingRight: collapsed ? '0.625rem' : undefined,
                        }}
                        title={collapsed ? item.label : undefined}
                    >
                        <span className="flex-shrink-0">{item.icon}</span>
                        {!collapsed && <span>{item.label}</span>}
                    </Link>
                ))}
            </nav>

            {/* Sign Out */}
            <div className="px-2.5 py-3 border-t border-border-subtle flex-shrink-0">
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="sidebar-item w-full bg-transparent border-none"
                    style={{
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        paddingLeft:  collapsed ? '0.625rem' : undefined,
                        paddingRight: collapsed ? '0.625rem' : undefined,
                    }}
                    title={collapsed ? 'Sign Out' : undefined}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    {!collapsed && <span>Sign Out</span>}
                </button>
            </div>
        </aside>
    )
}
