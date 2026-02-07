import { useMemo, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, BookOpen, Mail, MapPin, Sparkles } from 'lucide-react'

const focusAreas = [
    {
        title: '产品叙事',
        description: '把产品体验拆成结构化笔记，让灵感可以复用。',
    },
    {
        title: '前端工程',
        description: '从组件到系统，关注可维护与长期演进。',
    },
    {
        title: '视觉排版',
        description: '用杂志式的版式训练，让文字更有呼吸感。',
    },
]

const principles = [
    '用简洁而一致的框架记录复杂问题',
    '每篇文章至少留下一个可复用的方案',
    '在设计与工程之间寻找平衡',
]

const nowList = [
    '搭建更轻盈的设计系统',
    '收集城市里的微光与色调',
    '练习慢写作的节奏感',
]

const timeline = [
    {
        year: '2022',
        title: '建立第一版知识图谱',
        note: '把项目复盘与灵感收集放在同一条时间线里。',
    },
    {
        year: '2023',
        title: '完成多篇设计系统拆解',
        note: '将抽象概念沉淀成可复用的组件规则。',
    },
    {
        year: '2024',
        title: '开始书写「城市与技术」系列',
        note: '把旅行与编码的节奏揉成叙事稿。',
    },
]

export default function AboutPage() {
    const themeStyles = useMemo(
        () =>
            ({
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
                '--font-display': '"Libre Bodoni", "Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", "Times New Roman", serif',
                '--font-body': '"Public Sans", "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif',
            }) as CSSProperties,
        []
    )

    const paperPattern = useMemo(
        () =>
            ({
                backgroundImage:
                    'radial-gradient(circle at 12% 18%, rgba(180, 83, 9, 0.12), transparent 45%), radial-gradient(circle at 88% 0%, rgba(15, 118, 110, 0.12), transparent 40%), linear-gradient(transparent 93%, rgba(31, 41, 55, 0.04) 93%), linear-gradient(90deg, transparent 93%, rgba(31, 41, 55, 0.04) 93%)',
                backgroundSize: '280px 280px, 320px 320px, 32px 32px, 32px 32px',
            }) as CSSProperties,
        []
    )

    return (
        <div className="relative min-h-screen bg-paper font-body text-[color:var(--ink)]" style={themeStyles}>
            <div className="pointer-events-none absolute inset-0 opacity-70" style={paperPattern} />

            <section className="relative px-4 pt-24 pb-12 md:px-10">
                <div className="mx-auto max-w-6xl grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.4em] text-[color:var(--ink-soft)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]" />
                            About
                        </div>
                        <h1 className="text-[clamp(2.5rem,4.5vw,4.5rem)] font-display leading-[1.05]">
                            关于我
                        </h1>
                        <p className="text-base md:text-lg text-[color:var(--ink-muted)] leading-relaxed">
                            我在设计、前端与写作之间切换，把复杂问题拆解成可复用的结构。这里记录思考、实践与城市漫游，希望这些笔记能为你留下灵感的标记。
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                            <Link
                                to="/archive"
                                className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] px-4 py-2 font-semibold text-[color:var(--ink)] transition-colors hover:border-[color:var(--accent)]/40 hover:text-[color:var(--accent)]"
                            >
                                查看文章
                            </Link>
                            <Link
                                to="/about"
                                className="rounded-full bg-[color:var(--ink)] px-4 py-2 font-semibold text-[color:var(--paper-soft)] transition-colors hover:bg-black"
                            >
                                联系我
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 shadow-[0_28px_55px_-45px_rgba(31,41,55,0.35)]">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[color:var(--card-border)] bg-[color:var(--paper-strong)] text-2xl font-display text-[color:var(--ink)]">
                                S
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">
                                    Writer / Engineer
                                </p>
                                <h2 className="text-2xl font-display text-[color:var(--ink)]">shyl</h2>
                                <p className="text-sm text-[color:var(--ink-muted)]">记录技术与生活的交汇。</p>
                            </div>
                        </div>
                        <div className="mt-6 grid gap-3 text-sm text-[color:var(--ink-muted)]">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-[color:var(--accent)]" />
                                深圳 / 远程协作
                            </div>
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-[color:var(--accent)]" />
                                产品体验、设计系统、前端工程
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-[color:var(--accent)]" />
                                hello@shyl.dev
                            </div>
                        </div>
                        <div className="mt-6 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border border-[color:var(--card-border)] bg-white px-3 py-1 text-[color:var(--ink-muted)]">
                                Portfolio
                            </span>
                            <span className="rounded-full border border-[color:var(--card-border)] bg-white px-3 py-1 text-[color:var(--ink-muted)]">
                                UI/UX
                            </span>
                            <span className="rounded-full border border-[color:var(--card-border)] bg-white px-3 py-1 text-[color:var(--ink-muted)]">
                                Writing
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="relative px-4 pb-12 md:px-10">
                <div className="mx-auto max-w-6xl">
                    <div className="flex items-end justify-between border-b border-[color:var(--card-border)] pb-3">
                        <div>
                            <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--ink-soft)]">
                                Focus
                            </p>
                            <h2 className="text-2xl font-display text-[color:var(--ink)]">写作方向</h2>
                        </div>
                    </div>
                    <div className="mt-6 grid gap-6 md:grid-cols-3">
                        {focusAreas.map((area) => (
                            <div
                                key={area.title}
                                className="rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 shadow-[0_22px_45px_-38px_rgba(31,41,55,0.35)]"
                            >
                                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">
                                    <Sparkles className="h-3.5 w-3.5 text-[color:var(--accent)]" />
                                    Column
                                </div>
                                <h3 className="mt-3 text-xl font-display text-[color:var(--ink)]">{area.title}</h3>
                                <p className="mt-3 text-sm text-[color:var(--ink-muted)] leading-relaxed">
                                    {area.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="relative px-4 pb-12 md:px-10">
                <div className="mx-auto max-w-6xl grid gap-6 lg:grid-cols-[1fr_1fr]">
                    <div className="rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 shadow-[0_22px_45px_-38px_rgba(31,41,55,0.35)]">
                        <h3 className="text-xl font-display text-[color:var(--ink)]">工作方式</h3>
                        <ul className="mt-4 space-y-2 text-sm text-[color:var(--ink-muted)]">
                            {principles.map((item) => (
                                <li key={item} className="flex items-start gap-2">
                                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 shadow-[0_22px_45px_-38px_rgba(31,41,55,0.35)]">
                        <h3 className="text-xl font-display text-[color:var(--ink)]">最近在做</h3>
                        <ul className="mt-4 space-y-2 text-sm text-[color:var(--ink-muted)]">
                            {nowList.map((item) => (
                                <li key={item} className="flex items-start gap-2">
                                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[color:var(--teal)]" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            <section className="relative px-4 pb-20 md:px-10">
                <div className="mx-auto max-w-6xl">
                    <div className="flex items-end justify-between border-b border-[color:var(--card-border)] pb-3">
                        <div>
                            <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--ink-soft)]">
                                Timeline
                            </p>
                            <h2 className="text-2xl font-display text-[color:var(--ink)]">时间线</h2>
                        </div>
                    </div>
                    <div className="mt-6 space-y-4">
                        {timeline.map((item) => (
                            <div
                                key={item.year}
                                className="flex flex-col gap-3 rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 shadow-[0_20px_40px_-35px_rgba(31,41,55,0.35)] md:flex-row md:items-center md:justify-between"
                            >
                                <div>
                                    <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">{item.year}</p>
                                    <h3 className="text-lg font-display text-[color:var(--ink)]">{item.title}</h3>
                                    <p className="mt-2 text-sm text-[color:var(--ink-muted)]">{item.note}</p>
                                </div>
                                <Link
                                    to="/archive"
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--accent)]"
                                >
                                    查看相关记录
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    )
}
