import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, ChevronLeft, ChevronRight, MapPin, MessageSquare, Sparkles } from 'lucide-react'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import { paperPatternStyle, paperThemeVars } from '../../lib/theme'
import type { GuestbookEntry, PageResult } from '../../types/api'

const GUESTBOOK_ALIAS_STORAGE_KEY = 'blog-guestbook-alias'
const PAGE_SIZE = 12
const NOTE_ROTATIONS = [-1.2, 0.8, -0.6, 1.1, -0.4, 0.6]

const formatDate = (value?: string) => {
    if (!value) return '刚刚'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

const extractErrorMessage = (error: unknown) => {
    if (typeof error === 'object' && error !== null) {
        const maybeMessage = (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message
        if (maybeMessage) return maybeMessage
        if (typeof (error as { message?: string }).message === 'string') return (error as { message?: string }).message ?? '提交失败'
    }
    return '提交失败，请稍后重试'
}

const loadStoredAlias = () => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(GUESTBOOK_ALIAS_STORAGE_KEY) || ''
}

const persistAlias = (alias: string) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(GUESTBOOK_ALIAS_STORAGE_KEY, alias)
}

export default function GuestbookPage() {
    const shouldReduceMotion = useReducedMotion()
    const queryClient = useQueryClient()
    const [page, setPage] = useState(0)
    const [notice, setNotice] = useState<string | null>(null)
    const [form, setForm] = useState({
        authorName: '',
        location: '',
        content: '',
    })

    useEffect(() => {
        const alias = loadStoredAlias()
        if (!alias) return
        setForm((prev) => ({ ...prev, authorName: prev.authorName || alias }))
    }, [])

    const guestbookQuery = useQuery({
        queryKey: ['guestbook', page],
        queryFn: async () => {
            const res = await api.get<ApiResponse<PageResult<GuestbookEntry>>>('/guestbook', {
                params: { page, size: PAGE_SIZE },
            })
            return unwrapResponse(res.data)
        },
    })

    const submitMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                authorName: form.authorName.trim(),
                location: form.location.trim(),
                content: form.content.trim(),
            }
            const res = await api.post<ApiResponse<GuestbookEntry>>('/guestbook', payload)
            return unwrapResponse(res.data)
        },
        onSuccess: async () => {
            const trimmedAlias = form.authorName.trim()
            if (trimmedAlias) persistAlias(trimmedAlias)
            setNotice('留言已经贴到便笺墙上了。')
            setForm((prev) => ({ ...prev, content: '' }))
            setPage(0)
            await queryClient.invalidateQueries({ queryKey: ['guestbook'] })
        },
        onError: (error) => {
            setNotice(extractErrorMessage(error))
        },
    })

    const entryPage = guestbookQuery.data
    const entries = entryPage?.content ?? []
    const totalEntries = entryPage?.totalElements ?? 0
    const totalPages = Math.max(entryPage?.totalPages ?? 1, 1)
    const currentPage = (entryPage?.number ?? page) + 1
    const canSubmit = form.content.trim().length > 0 && form.content.trim().length <= 320
    const previewName = form.authorName.trim() || '匿名访客'
    const previewLocation = form.location.trim() || '未留下地点'
    const previewContent = form.content.trim() || '你可以写下读后感、路过的痕迹、合作问候，或者一段想留给未来自己的短句。'

    const heroMotion = shouldReduceMotion
        ? {}
        : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55 } }

    const statCards = useMemo(
        () => [
            { label: '总留言', value: totalEntries },
            { label: '当前页', value: currentPage },
            { label: '每页容量', value: PAGE_SIZE },
            { label: '展示顺序', value: '最新在前' },
        ],
        [currentPage, totalEntries]
    )

    return (
        <div className="relative min-h-screen bg-paper font-body text-[color:var(--ink)]" style={paperThemeVars}>
            <div className="pointer-events-none absolute inset-0 opacity-70" style={paperPatternStyle} />

            <section className="relative px-4 pb-12 pt-24 md:px-10">
                <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                    <motion.div {...heroMotion} className="space-y-6">
                        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.4em] text-[color:var(--ink-soft)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]" />
                            Guestbook
                        </div>
                        <div className="space-y-4">
                            <h1 className="text-[clamp(2.75rem,5vw,4.75rem)] font-display leading-[1.04]">留言板</h1>
                            <p className="max-w-2xl text-base leading-relaxed text-[color:var(--ink-muted)] md:text-lg">
                                给路过这里的人留一张便笺。它不需要像文章那样完整，可以是一句反馈、一个城市名、一次偶然读到后的回响，
                                也可以只是今天来过这里的证明。
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs">
                            <Link
                                to="/archive"
                                className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] px-4 py-2 font-semibold text-[color:var(--ink)] transition-colors hover:border-[color:var(--accent)]/40 hover:text-[color:var(--accent)]"
                            >
                                去看文章
                            </Link>
                            <Link
                                to="/about"
                                className="rounded-full bg-[color:var(--ink)] px-4 py-2 font-semibold text-[color:var(--paper-soft)] transition-colors hover:bg-black"
                            >
                                了解作者
                            </Link>
                        </div>
                    </motion.div>

                    <motion.div
                        {...heroMotion}
                        className="grid gap-3 rounded-[28px] border border-[color:var(--card-border)] bg-[linear-gradient(135deg,rgba(250,248,241,0.96),rgba(224,233,248,0.92))] p-5 shadow-[0_30px_60px_-48px_rgba(31,41,55,0.45)]"
                    >
                        <div className="rounded-[24px] bg-[color:var(--ink)] px-5 py-5 text-[color:var(--paper-soft)] shadow-[0_20px_50px_-35px_rgba(15,23,42,0.85)]">
                            <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">Board Notes</p>
                            <h2 className="mt-3 text-2xl font-display">让短句也有位置停留</h2>
                            <p className="mt-3 text-sm leading-7 text-white/72">
                                留言会公开展示在这里，按时间倒序排列。页面默认分页，不让首屏无限堆叠，也方便这块内容以后继续长期积累。
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {statCards.map((item, index) => (
                                <div
                                    key={item.label}
                                    className={`rounded-[22px] border border-[color:var(--card-border)] px-4 py-4 shadow-sm ${
                                        index === 0 ? 'bg-[color:var(--paper-soft)]' : 'bg-white/72'
                                    }`}
                                >
                                    <div className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--ink-soft)]">{item.label}</div>
                                    <div className="mt-2 text-2xl font-display text-[color:var(--ink)]">{item.value}</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            <section className="relative px-4 pb-12 md:px-10">
                <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.92fr_1.08fr]">
                    <div className="rounded-[30px] border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 shadow-[0_26px_55px_-42px_rgba(31,41,55,0.35)] md:p-7">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--ink-soft)]">Write A Note</p>
                                <h2 className="mt-2 text-2xl font-display text-[color:var(--ink)]">写一张便笺</h2>
                            </div>
                            <div className="rounded-full border border-[color:var(--card-border)] bg-white px-3 py-1 text-xs text-[color:var(--ink-muted)]">
                                最多 320 字
                            </div>
                        </div>

                        <div className="mt-6 space-y-4">
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm text-[color:var(--ink)]">称呼</label>
                                    <Input
                                        value={form.authorName}
                                        maxLength={40}
                                        onChange={(event) => setForm((prev) => ({ ...prev, authorName: event.target.value }))}
                                        className="border-[color:var(--card-border)] bg-white"
                                        placeholder="选填，默认会生成匿名称呼"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-[color:var(--ink)]">来自哪里</label>
                                    <Input
                                        value={form.location}
                                        maxLength={80}
                                        onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                                        className="border-[color:var(--card-border)] bg-white"
                                        placeholder="选填，比如北京 / 杭州 / 线上"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-[color:var(--ink)]">留言内容</label>
                                <textarea
                                    value={form.content}
                                    maxLength={320}
                                    onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                                    placeholder="写下一句反馈、一段印象，或者一张留给未来的短便笺。"
                                    className="min-h-[180px] w-full rounded-3xl border border-[color:var(--card-border)] bg-white px-4 py-4 text-sm leading-7 text-[color:var(--ink)] outline-none transition-all placeholder:text-[color:var(--ink-soft)] focus:border-[color:var(--accent)]/50 focus:ring-2 focus:ring-[color:var(--accent)]/10"
                                />
                            </div>

                            <div className="flex flex-col gap-3 border-t border-[color:var(--card-border)] pt-4 text-sm text-[color:var(--ink-muted)] md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-[color:var(--accent)]" />
                                    <span>{form.content.trim().length} / 320</span>
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => submitMutation.mutate()}
                                    disabled={submitMutation.isPending || !canSubmit}
                                    className="min-h-11 rounded-full bg-[color:var(--ink)] px-5 text-[color:var(--paper-soft)] hover:bg-black"
                                >
                                    {submitMutation.isPending ? '正在贴到便笺墙...' : '发布留言'}
                                </Button>
                            </div>

                            <AnimatePresence>
                                {notice && (
                                    <motion.div
                                        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-strong)] px-4 py-3 text-sm text-[color:var(--ink)]"
                                    >
                                        {notice}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="rounded-[30px] border border-[color:var(--card-border)] bg-[linear-gradient(145deg,rgba(255,255,255,0.78),rgba(243,239,230,0.96))] p-6 shadow-[0_26px_55px_-42px_rgba(31,41,55,0.35)] md:p-7">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--ink-soft)]">Preview</p>
                                <h2 className="mt-2 text-2xl font-display text-[color:var(--ink)]">便笺预览</h2>
                            </div>
                            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] text-[color:var(--accent)]">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                        </div>

                        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_220px]">
                            <div className="relative overflow-hidden rounded-[28px] border border-[rgba(15,23,42,0.12)] bg-[linear-gradient(150deg,rgba(10,17,33,0.95),rgba(16,82,159,0.82))] px-6 py-6 text-white shadow-[0_24px_55px_-35px_rgba(15,23,42,0.7)]">
                                <div className="absolute right-5 top-5 flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/72 backdrop-blur">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    note
                                </div>
                                <div className="space-y-4 pr-14">
                                    <div className="space-y-1">
                                        <p className="text-xs uppercase tracking-[0.32em] text-white/55">{previewName}</p>
                                        <div className="flex flex-wrap items-center gap-2 text-sm text-white/80">
                                            <span>{formatDate()}</span>
                                            <span className="h-1 w-1 rounded-full bg-white/30" />
                                            <span>{previewLocation}</span>
                                        </div>
                                    </div>
                                    <p className="whitespace-pre-wrap text-lg font-display leading-[1.55] text-white/94">{previewContent}</p>
                                </div>
                            </div>

                            <div className="space-y-3 rounded-[24px] border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-4 text-sm leading-7 text-[color:var(--ink-muted)]">
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--ink-soft)]">Shown Here</p>
                                    <h3 className="mt-2 text-lg font-display text-[color:var(--ink)]">展示方式</h3>
                                </div>
                                <p>留言会直接进入公开页，默认按时间倒序排列。</p>
                                <p>页面固定分页，避免留言越来越多后首屏失控。</p>
                                <p>称呼和地点都可以留空，核心是把这句话留下来。</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="relative px-4 pb-24 md:px-10">
                <div className="mx-auto max-w-6xl">
                    <div className="flex flex-col gap-4 border-b border-[color:var(--card-border)] pb-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--ink-soft)]">Notes Wall</p>
                            <h2 className="mt-2 text-2xl font-display text-[color:var(--ink)]">最近的留言</h2>
                            <p className="mt-2 text-sm leading-7 text-[color:var(--ink-muted)]">
                                这些短句按时间往下沉积。它们不是正文，却能留下一个博客真正被人经过的声音。
                            </p>
                        </div>
                        <div className="text-sm text-[color:var(--ink-soft)]">
                            第 {currentPage} / {totalPages} 页
                        </div>
                    </div>

                    <div className="mt-8">
                        {guestbookQuery.isLoading ? (
                            <div className="rounded-[28px] border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] px-6 py-10 text-sm text-[color:var(--ink-muted)]">
                                正在整理便笺墙...
                            </div>
                        ) : entries.length ? (
                            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                {entries.map((entry, index) => {
                                    const rotation = shouldReduceMotion ? 0 : NOTE_ROTATIONS[index % NOTE_ROTATIONS.length]
                                    return (
                                        <motion.article
                                            key={entry.id}
                                            initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: shouldReduceMotion ? 0 : 0.35, delay: shouldReduceMotion ? 0 : index * 0.03 }}
                                            className="group"
                                        >
                                            <div style={{ transform: `rotate(${rotation}deg)` }}>
                                                <div className="h-full rounded-[28px] border border-[color:var(--card-border)] bg-[linear-gradient(160deg,rgba(255,255,255,0.88),rgba(244,239,230,0.98))] p-5 shadow-[0_24px_50px_-40px_rgba(31,41,55,0.35)] transition-transform duration-300 group-hover:-translate-y-1">
                                                    <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--ink-soft)]">{formatDate(entry.createdAt)}</p>
                                                        <h3 className="mt-2 text-xl font-display text-[color:var(--ink)]">{entry.authorName || '匿名访客'}</h3>
                                                    </div>
                                                    {entry.location && (
                                                        <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--card-border)] bg-white px-3 py-1 text-xs text-[color:var(--ink-muted)]">
                                                            <MapPin className="h-3.5 w-3.5 text-[color:var(--accent)]" />
                                                            {entry.location}
                                                        </div>
                                                    )}
                                                </div>
                                                    <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[color:var(--ink-muted)]">{entry.content}</p>
                                                </div>
                                            </div>
                                        </motion.article>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="rounded-[28px] border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] px-6 py-12 text-center text-[color:var(--ink-muted)]">
                                <p>这里还没有第一张便笺。</p>
                                <p className="mt-2 text-sm">如果你愿意，可以让这一页先从你的那一句开始。</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm text-[color:var(--ink-soft)]">共 {totalEntries} 条留言，固定每页展示 {PAGE_SIZE} 条。</div>
                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPage((current) => Math.max(0, current - 1))}
                                disabled={page <= 0}
                                className="min-h-11 rounded-full border-[color:var(--card-border)] bg-[color:var(--paper-soft)] px-4 text-[color:var(--ink)]"
                            >
                                <ChevronLeft className="mr-1 h-4 w-4" /> 上一页
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                                disabled={page >= totalPages - 1}
                                className="min-h-11 rounded-full border-[color:var(--card-border)] bg-[color:var(--paper-soft)] px-4 text-[color:var(--ink)]"
                            >
                                下一页 <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="mt-10 rounded-[28px] border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 shadow-[0_24px_50px_-40px_rgba(31,41,55,0.32)]">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--ink-soft)]">Continue Reading</p>
                                <h3 className="mt-2 text-xl font-display text-[color:var(--ink)]">也可以从文章开始认识这里</h3>
                            </div>
                            <Link
                                to="/archive"
                                className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--accent)]"
                            >
                                浏览归档 <ArrowUpRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}