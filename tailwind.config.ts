import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            colors: {
                // App palette mapped to CSS variables
                surface:    'var(--bg-primary)',
                'surface-2':'var(--bg-secondary)',
                card:       'var(--bg-card)',
                'card-hover':'var(--bg-card-hover)',
                'border-subtle': 'var(--border)',
                'border-light':  'var(--border-light)',
                'text-primary':  'var(--text-primary)',
                'text-secondary':'var(--text-secondary)',
                'text-muted':    'var(--text-muted)',
                accent:     'var(--accent)',
                'accent-hover': 'var(--accent-hover)',
                success:    'var(--success)',
                danger:     'var(--danger)',
                warning:    'var(--warning)',
                purple:     'var(--purple)',
                cyan:       'var(--cyan)',
                // shadcn tokens (kept for radix components)
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                border:  'hsl(var(--border-hsl))',
                input:   'hsl(var(--input))',
                ring:    'hsl(var(--ring))',
                chart: {
                    '1': 'hsl(var(--chart-1))',
                    '2': 'hsl(var(--chart-2))',
                    '3': 'hsl(var(--chart-3))',
                    '4': 'hsl(var(--chart-4))',
                    '5': 'hsl(var(--chart-5))',
                },
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            keyframes: {
                'pulse-green': {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(34,197,94,0.4)' },
                    '50%': { boxShadow: '0 0 0 6px rgba(34,197,94,0)' },
                },
                shimmer: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.6' },
                },
                'spin-slow': {
                    to: { transform: 'rotate(360deg)' },
                },
                floatUp: {
                    from: { opacity: '0', transform: 'translateY(30px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                drift1: {
                    from: { transform: 'translate(0,0) scale(1)' },
                    to: { transform: 'translate(40px,60px) scale(1.1)' },
                },
            },
            animation: {
                'pulse-green': 'pulse-green 2s infinite',
                shimmer: 'shimmer 2s ease-in-out infinite',
                'spin-slow': 'spin-slow 3s linear infinite',
                'float-up': 'floatUp 0.7s ease forwards',
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
} satisfies Config;
