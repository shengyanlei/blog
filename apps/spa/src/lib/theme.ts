import type { CSSProperties } from 'react'

export const paperThemeVars = {
    '--paper': '#f6f1e7',
    '--paper-soft': '#fbf8f2',
    '--paper-strong': '#efe6d7',
    '--ink': '#1f2933',
    '--ink-muted': '#6b6157',
    '--ink-soft': '#8a8076',
    '--accent': '#b45309',
    '--teal': '#0f766e',
    '--card-border': '#e3d8c8',
    '--shadow-soft': '0 32px 60px -44px rgba(31, 41, 55, 0.35)',
    '--font-display':
        '"Libre Bodoni", "Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", "Times New Roman", serif',
    '--font-body':
        '"Public Sans", "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif',
} as CSSProperties

export const paperPatternStyle = {
    backgroundImage:
        'radial-gradient(circle at 12% 18%, rgba(180, 83, 9, 0.12), transparent 45%), radial-gradient(circle at 88% 0%, rgba(15, 118, 110, 0.12), transparent 40%), linear-gradient(transparent 93%, rgba(31, 41, 55, 0.04) 93%), linear-gradient(90deg, transparent 93%, rgba(31, 41, 55, 0.04) 93%)',
    backgroundSize: '280px 280px, 320px 320px, 32px 32px, 32px 32px',
} as CSSProperties
