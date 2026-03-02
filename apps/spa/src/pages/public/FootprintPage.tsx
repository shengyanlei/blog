import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
    Calendar,
    Camera,
    ChevronRight,
    Clock3,
    Compass,
    Filter,
    MapPin,
    Search,
    Sparkles,
    Tag,
    Users,
    Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@repo/ui/components/ui/button'
import { api, API_HOST, unwrapResponse } from '../../lib/api'
import { useAuthStore } from '../../store/useAuthStore'
import type { TravelJourneyDetail, TravelJourneySummary, TravelPlan, TravelPlanStatus } from '../../types/api'

const parseTags = (value?: string) =>
    (value || '')
        .split(/[,，]/)
        .map((item) => item.trim())
        .filter(Boolean)

const formatPeriod = (startDate?: string, endDate?: string) => {
    if (startDate && endDate) return `${startDate} 至 ${endDate}`
    return startDate || endDate || '日期待定'
}

const toMediaUrl = (url?: string) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `${API_HOST}${url}`
}

const getYearLabel = (startDate?: string, endDate?: string) => {
    const date = startDate || endDate
    if (!date) return '未标注'
    const value = date.slice(0, 4)
    return /^\d{4}$/.test(value) ? value : '未标注'
}

const formatBudget = (min?: number, max?: number) => {
    if (typeof min === 'number' && typeof max === 'number') return `¥${min} - ¥${max}`
    if (typeof min === 'number') return `¥${min}+`
    if (typeof max === 'number') return `≤ ¥${max}`
    return '未记录'
}

const statusLabelMap: Record<TravelPlanStatus, string> = {
    IDEA: '灵感池',
    PLANNING: '规划中',
    BOOKED: '已预订',
    DONE: '已完成',
    CANCELED: '已取消',
}

const statusClassMap: Record<TravelPlanStatus, string> = {
    IDEA: 'bg-fuchsia-500/20 text-fuchsia-100 border-fuchsia-400/35',
    PLANNING: 'bg-amber-500/20 text-amber-100 border-amber-400/35',
    BOOKED: 'bg-sky-500/20 text-sky-100 border-sky-400/35',
    DONE: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/35',
    CANCELED: 'bg-slate-500/20 text-slate-200 border-slate-400/35',
}

export default function FootprintPage() {
    const token = useAuthStore((state) => state.token)
    const [year, setYear] = useState<string>('')
    const [keyword, setKeyword] = useState('')
    const [tag, setTag] = useState('')
    const [onlyWithPhotos, setOnlyWithPhotos] = useState(false)
    const [selectedJourneyId, setSelectedJourneyId] = useState<number | null>(null)
    const [showLocationOverview, setShowLocationOverview] = useState(true)

    const yearsQuery = useQuery<number[]>({
        queryKey: ['journeys', 'years'],
        queryFn: async () => unwrapResponse((await api.get('/journeys/years')).data) as number[],
    })

    const journeysQuery = useQuery<TravelJourneySummary[]>({
        queryKey: ['journeys', year, keyword, tag],
        queryFn: async () =>
            unwrapResponse(
                (
                    await api.get('/journeys', {
                        params: {
                            year: year ? Number(year) : undefined,
                            keyword: keyword || undefined,
                            tag: tag || undefined,
                        },
                    })
                ).data
            ) as TravelJourneySummary[],
    })

    const selectedJourneyQuery = useQuery<TravelJourneyDetail>({
        queryKey: ['journeys', 'detail', selectedJourneyId],
        enabled: !!selectedJourneyId,
        queryFn: async () =>
            unwrapResponse((await api.get(`/journeys/${selectedJourneyId}`)).data) as TravelJourneyDetail,
    })

    const plansQuery = useQuery<TravelPlan[]>({
        queryKey: ['travel-plans', 'private'],
        enabled: !!token,
        queryFn: async () => unwrapResponse((await api.get('/travel-plans')).data) as TravelPlan[],
    })

    const filteredTimelineData = useMemo(() => {
        const source = journeysQuery.data || []
        if (!onlyWithPhotos) return source
        return source.filter((item) => item.photoCount > 0)
    }, [journeysQuery.data, onlyWithPhotos])

    const timelineData = useMemo(() => {
        const deduped = new Map<string, TravelJourneySummary>()
        filteredTimelineData.forEach((item) => {
            const key = `${item.title.trim()}|${item.startDate || ''}|${item.endDate || ''}`
            const existing = deduped.get(key)
            if (!existing) {
                deduped.set(key, item)
                return
            }
            const currentPhotos = item.photoCount || 0
            const existingPhotos = existing.photoCount || 0
            if (currentPhotos > existingPhotos || item.id > existing.id) {
                deduped.set(key, item)
            }
        })
        return Array.from(deduped.values()).sort((a, b) => {
            const leftDate = a.startDate || a.endDate || ''
            const rightDate = b.startDate || b.endDate || ''
            const byDate = rightDate.localeCompare(leftDate)
            if (byDate !== 0) return byDate
            return b.id - a.id
        })
    }, [filteredTimelineData])

    useEffect(() => {
        if (timelineData.length && !timelineData.some((item) => item.id === selectedJourneyId)) {
            setSelectedJourneyId(timelineData[0].id)
        }
        if (!timelineData.length) {
            setSelectedJourneyId(null)
        }
    }, [timelineData, selectedJourneyId])

    const overview = useMemo(() => {
        const journeys = timelineData
        const photoCount = journeys.reduce((acc, item) => acc + (item.photoCount || 0), 0)
        const cityCount = new Set(journeys.flatMap((item) => item.cities || [])).size
        return {
            journeys: journeys.length,
            photos: photoCount,
            cities: cityCount,
            years: new Set(journeys.map((item) => getYearLabel(item.startDate, item.endDate))).size,
        }
    }, [timelineData])

    const groupedTimeline = useMemo(() => {
        const map = new Map<string, TravelJourneySummary[]>()
        timelineData.forEach((item) => {
            const key = getYearLabel(item.startDate, item.endDate)
            const list = map.get(key)
            if (list) {
                list.push(item)
                return
            }
            map.set(key, [item])
        })

        return Array.from(map.entries())
            .sort(([left], [right]) => {
                if (left === '未标注') return 1
                if (right === '未标注') return -1
                return Number(right) - Number(left)
            })
            .map(([groupYear, items]) => ({
                year: groupYear,
                items: [...items].sort((a, b) => {
                    const left = a.startDate || a.endDate || ''
                    const right = b.startDate || b.endDate || ''
                    return right.localeCompare(left)
                }),
            }))
    }, [timelineData])

    const activeJourney = selectedJourneyQuery.data

    const planPreview = useMemo(() => {
        const source = plansQuery.data || []
        return [...source]
            .sort((a, b) => {
                const left = a.startDate || '9999-12-31'
                const right = b.startDate || '9999-12-31'
                return left.localeCompare(right)
            })
            .slice(0, 3)
    }, [plansQuery.data])

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#f4f7ff_0%,#edf2ff_45%,#eef6ff_100%)] pt-24 pb-16 text-[color:var(--ink)] md:pt-28">
            <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-80 w-[56rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.18)_0%,rgba(37,99,235,0)_72%)]" />
            <div className="pointer-events-none absolute -left-20 top-[24rem] -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.15)_0%,rgba(14,165,233,0)_72%)]" />
            <div className="pointer-events-none absolute -right-16 top-[34rem] -z-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.2)_0%,rgba(125,211,252,0)_70%)]" />

            <div className="container mx-auto space-y-5 px-4">
                <header className="relative overflow-hidden rounded-[32px] border border-[color:var(--card-border)] bg-[color:var(--paper-soft)]/95 p-6 shadow-[0_30px_72px_-50px_rgba(15,23,42,0.45)] backdrop-blur-sm lg:p-8">
                    <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.28)_0%,rgba(37,99,235,0)_72%)]" />
                    <div className="relative grid gap-6 lg:grid-cols-[1.45fr_1fr] lg:items-end">
                        <div>
                            <p className="text-xs uppercase tracking-[0.26em] text-[color:var(--accent)]">Travel Chronicle</p>
                            <h1 className="mt-3 text-3xl leading-tight font-display sm:text-4xl">旅行编年馆</h1>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--ink-muted)] sm:text-base">
                                用旅程章节记录真实发生的片段，把零散足迹整理成可回看的故事。未来计划只对自己可见，回忆对访客开放。
                            </p>
                            <div className="mt-5 flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
                                <span className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[color:var(--card-border)] bg-white/70 px-4 py-2 font-medium">
                                    <Sparkles className="h-4 w-4 text-[color:var(--accent)]" />
                                    记录已发生的旅程
                                </span>
                                <span className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[color:var(--card-border)] bg-white/70 px-4 py-2 font-medium">
                                    <Clock3 className="h-4 w-4 text-[color:var(--accent)]" />
                                    规划下一段目的地
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                            <div className="rounded-2xl border border-slate-900/85 bg-slate-950 p-3 text-white">
                                <div className="text-xl font-semibold leading-none">{overview.journeys}</div>
                                <div className="mt-1 text-xs text-slate-300">旅程章节</div>
                            </div>
                            <div className="rounded-2xl border border-[color:var(--card-border)] bg-white/85 p-3">
                                <div className="text-xl font-semibold leading-none">{overview.photos}</div>
                                <div className="mt-1 text-xs text-[color:var(--ink-soft)]">照片总数</div>
                            </div>
                            <div className="rounded-2xl border border-[color:var(--card-border)] bg-white/85 p-3">
                                <div className="text-xl font-semibold leading-none">{overview.cities}</div>
                                <div className="mt-1 text-xs text-[color:var(--ink-soft)]">到访城市</div>
                            </div>
                            <div className="rounded-2xl border border-[color:var(--card-border)] bg-white/85 p-3">
                                <div className="text-xl font-semibold leading-none">{overview.years}</div>
                                <div className="mt-1 text-xs text-[color:var(--ink-soft)]">覆盖年份</div>
                            </div>
                        </div>
                    </div>
                </header>

                <section className="grid gap-5 lg:grid-cols-[minmax(0,1.38fr)_minmax(320px,1fr)]">
                    <div className="space-y-4">
                        <div className="rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)]/96 p-4 shadow-[0_24px_56px_-46px_rgba(15,23,42,0.45)] lg:p-5">
                            <div className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-[color:var(--paper)] px-3 py-1.5 text-xs text-[color:var(--ink-soft)]">
                                <Filter className="h-3.5 w-3.5" />
                                时间线筛选
                            </div>

                            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[170px_1fr_1fr_auto]">
                                <select
                                    aria-label="按年份筛选旅程"
                                    value={year}
                                    onChange={(event) => setYear(event.target.value)}
                                    className="min-h-11 rounded-xl border border-[color:var(--card-border)] bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                                >
                                    <option value="">全部年份</option>
                                    {(yearsQuery.data || []).map((item) => (
                                        <option key={item} value={item}>
                                            {item}
                                        </option>
                                    ))}
                                </select>

                                <label className="relative">
                                    <Search className="pointer-events-none absolute left-2.5 top-3 h-4 w-4 text-[color:var(--ink-soft)]" />
                                    <input
                                        aria-label="按关键词筛选旅程"
                                        value={keyword}
                                        onChange={(event) => setKeyword(event.target.value)}
                                        placeholder="关键词"
                                        className="min-h-11 w-full rounded-xl border border-[color:var(--card-border)] bg-white py-2 pl-8 pr-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                                    />
                                </label>

                                <label className="relative">
                                    <Tag className="pointer-events-none absolute left-2.5 top-3 h-4 w-4 text-[color:var(--ink-soft)]" />
                                    <input
                                        aria-label="按标签筛选旅程"
                                        value={tag}
                                        onChange={(event) => setTag(event.target.value)}
                                        placeholder="标签"
                                        className="min-h-11 w-full rounded-xl border border-[color:var(--card-border)] bg-white py-2 pl-8 pr-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                                    />
                                </label>

                                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[color:var(--card-border)] bg-white px-3 py-2 text-sm text-[color:var(--ink-muted)]">
                                    <input
                                        type="checkbox"
                                        checked={onlyWithPhotos}
                                        onChange={(event) => setOnlyWithPhotos(event.target.checked)}
                                    />
                                    仅含照片
                                </label>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)]/96 p-4 shadow-[0_24px_56px_-46px_rgba(15,23,42,0.45)] lg:p-5">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-display">旅程时间线</h2>
                                    <p className="text-xs text-[color:var(--ink-soft)]">按年份倒序查看章节，点击卡片展开详细记录。</p>
                                </div>
                                <div className="rounded-full bg-[color:var(--paper)] px-3 py-1 text-xs text-[color:var(--ink-soft)]">
                                    共 {timelineData.length} 条
                                </div>
                            </div>

                            {journeysQuery.isLoading && (
                                <div className="space-y-3" aria-hidden>
                                    {[0, 1, 2].map((item) => (
                                        <div key={item} className="animate-pulse rounded-2xl border border-[color:var(--card-border)] bg-white p-4">
                                            <div className="h-4 w-36 rounded bg-slate-200" />
                                            <div className="mt-3 h-3 w-2/3 rounded bg-slate-200" />
                                            <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!journeysQuery.isLoading && groupedTimeline.length > 0 && (
                                <div className="space-y-5">
                                    {groupedTimeline.map((group) => (
                                        <section key={group.year}>
                                            <div className="mb-3 inline-flex min-h-8 items-center rounded-full border border-[color:var(--card-border)] bg-white px-3 py-1 text-xs font-medium text-[color:var(--ink-muted)]">
                                                {group.year} 年
                                            </div>

                                            <div className="space-y-3 border-l border-dashed border-slate-300/90 pl-4">
                                                {group.items.map((journey) => {
                                                    const active = selectedJourneyId === journey.id
                                                    return (
                                                        <button
                                                            key={journey.id}
                                                            type="button"
                                                            onClick={() => setSelectedJourneyId(journey.id)}
                                                            className={`group relative w-full cursor-pointer overflow-hidden rounded-2xl border text-left transition duration-200 focus:outline-none focus:ring-2 focus:ring-sky-300 ${
                                                                active
                                                                    ? 'border-sky-300 bg-sky-50 shadow-[0_18px_38px_-28px_rgba(14,165,233,0.55)]'
                                                                    : 'border-[color:var(--card-border)] bg-white hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-28px_rgba(15,23,42,0.45)]'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`absolute -left-[1.42rem] top-6 h-3.5 w-3.5 rounded-full border-2 ${
                                                                    active ? 'border-sky-500 bg-sky-300' : 'border-slate-300 bg-white'
                                                                }`}
                                                            />

                                                            <div className="grid gap-3 p-4 sm:grid-cols-[148px_1fr]">
                                                                <div
                                                                    className="h-24 rounded-xl bg-cover bg-center"
                                                                    style={{
                                                                        backgroundImage: journey.coverUrl
                                                                            ? `url(${toMediaUrl(journey.coverUrl)})`
                                                                            : 'linear-gradient(135deg,#0f172a,#1d4ed8,#0ea5e9)',
                                                                    }}
                                                                />

                                                                <div className="space-y-2">
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div className="text-base leading-tight font-semibold text-[color:var(--ink)]">{journey.title}</div>
                                                                        <span className="inline-flex min-h-7 items-center rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] text-white">
                                                                            {journey.photoCount} 张
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex flex-wrap items-center gap-3 text-xs text-[color:var(--ink-soft)]">
                                                                        <span className="inline-flex items-center gap-1">
                                                                            <Calendar className="h-3.5 w-3.5" />
                                                                            {formatPeriod(journey.startDate, journey.endDate)}
                                                                        </span>
                                                                        <span className="inline-flex items-center gap-1">
                                                                            <MapPin className="h-3.5 w-3.5" />
                                                                            {(journey.cities || []).join(' · ') || '城市待补充'}
                                                                        </span>
                                                                    </div>

                                                                    <p className="line-clamp-2 text-sm text-[color:var(--ink-muted)]">{journey.summary || '暂无摘要，等待补充旅程故事。'}</p>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </section>
                                    ))}
                                </div>
                            )}

                            {!journeysQuery.isLoading && groupedTimeline.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-[color:var(--card-border)] bg-white/70 p-8 text-center">
                                    <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                                        <Camera className="h-5 w-5" />
                                    </div>
                                    <p className="text-sm text-[color:var(--ink-muted)]">还没有可展示的旅程章节，先创建你的第一条旅行记录。</p>
                                    <div className="mt-4">
                                        <Link to={token ? '/admin/footprints' : '/admin/login'}>
                                            <Button className="min-h-11 rounded-xl bg-[color:var(--ink)] px-4 text-white hover:bg-black">
                                                {token ? '去后台创建旅程' : '登录后开始记录'}
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <aside className="space-y-4">
                        <AnimatePresence mode="wait">
                            {selectedJourneyId && selectedJourneyQuery.isLoading && !activeJourney ? (
                                <motion.div
                                    key="detail-loading"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.18 }}
                                    className="overflow-hidden rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-5"
                                >
                                    <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
                                    <div className="mt-4 h-6 w-1/2 animate-pulse rounded bg-slate-200" />
                                    <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                                    <div className="mt-4 space-y-2">
                                        <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
                                        <div className="h-3 w-4/5 animate-pulse rounded bg-slate-200" />
                                    </div>
                                </motion.div>
                            ) : activeJourney ? (
                                <motion.div
                                    key={activeJourney.id}
                                    initial={{ opacity: 0, x: 16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -16 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] shadow-[0_28px_64px_-48px_rgba(15,23,42,0.5)]"
                                >
                                    <div className="relative h-52">
                                        <div
                                            className="absolute inset-0 bg-cover bg-center"
                                            style={{
                                                backgroundImage: activeJourney.coverUrl
                                                    ? `url(${toMediaUrl(activeJourney.coverUrl)})`
                                                    : 'linear-gradient(120deg,#0f172a,#1d4ed8,#0ea5e9)',
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                                        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                                            <p className="text-[11px] uppercase tracking-[0.24em] text-white/75">Journey Chapter</p>
                                            <h2 className="mt-1 text-2xl leading-tight font-display">{activeJourney.title}</h2>
                                            <p className="mt-1 text-sm text-white/90">{formatPeriod(activeJourney.startDate, activeJourney.endDate)}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 p-5">
                                        <div className="rounded-2xl border border-[color:var(--card-border)] bg-white/70 p-4 text-sm leading-relaxed text-[color:var(--ink-muted)]">
                                            {activeJourney.content || activeJourney.summary || '这个章节还没有正文。'}
                                        </div>

                                        <div className="grid gap-2 sm:grid-cols-3">
                                            <div className="rounded-2xl border border-[color:var(--card-border)] bg-white p-3">
                                                <div className="inline-flex items-center gap-1 text-xs text-[color:var(--ink-soft)]">
                                                    <Camera className="h-3.5 w-3.5" />
                                                    照片数量
                                                </div>
                                                <div className="mt-1 text-base font-semibold">{activeJourney.photoCount || 0}</div>
                                            </div>
                                            <div className="rounded-2xl border border-[color:var(--card-border)] bg-white p-3">
                                                <div className="inline-flex items-center gap-1 text-xs text-[color:var(--ink-soft)]">
                                                    <Users className="h-3.5 w-3.5" />
                                                    同行人
                                                </div>
                                                <div className="mt-1 line-clamp-1 text-sm font-medium text-[color:var(--ink)]">
                                                    {activeJourney.companions || '未记录'}
                                                </div>
                                            </div>
                                            <div className="rounded-2xl border border-[color:var(--card-border)] bg-white p-3">
                                                <div className="inline-flex items-center gap-1 text-xs text-[color:var(--ink-soft)]">
                                                    <Wallet className="h-3.5 w-3.5" />
                                                    花费区间
                                                </div>
                                                <div className="mt-1 text-sm font-medium text-[color:var(--ink)]">
                                                    {formatBudget(activeJourney.budgetMin, activeJourney.budgetMax)}
                                                </div>
                                            </div>
                                        </div>

                                        {parseTags(activeJourney.tags).length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {parseTags(activeJourney.tags).map((value) => (
                                                    <span key={value} className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs text-sky-700">
                                                        {value}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <button
                                                type="button"
                                                aria-expanded={showLocationOverview}
                                                onClick={() => setShowLocationOverview((prev) => !prev)}
                                                className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-xl px-2 text-sm text-[color:var(--accent)] transition hover:bg-sky-50"
                                            >
                                                <Compass className="h-4 w-4" />
                                                位置概览（可选）
                                                <ChevronRight className={`h-4 w-4 transition ${showLocationOverview ? 'rotate-90' : ''}`} />
                                            </button>

                                            {showLocationOverview && (
                                                <div className="rounded-2xl border border-[color:var(--card-border)] bg-white p-3 text-sm text-[color:var(--ink-muted)]">
                                                    {(activeJourney.locations || []).length ? (
                                                        (activeJourney.locations || []).map((location) => (
                                                            <div key={location.id} className="flex items-center justify-between gap-3 py-1.5">
                                                                <span className="line-clamp-1">
                                                                    {location.province} · {location.city}
                                                                </span>
                                                                <span className="shrink-0 text-xs text-[color:var(--ink-soft)]">{location.photoCount || 0} 张</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-[color:var(--ink-soft)]">暂无关联地点</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {(activeJourney.photos || []).length > 0 && (
                                            <div className="space-y-2">
                                                <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">照片墙</div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {activeJourney.photos.slice(0, 9).map((photo, index) => (
                                                        <div
                                                            key={`${photo.id || index}-${photo.url}`}
                                                            className="group overflow-hidden rounded-xl border border-[color:var(--card-border)]"
                                                        >
                                                            <img
                                                                src={toMediaUrl(photo.url)}
                                                                alt={photo.note || `photo-${index}`}
                                                                className="h-20 w-full object-cover transition duration-300 group-hover:scale-105"
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="rounded-3xl border border-dashed border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 text-sm text-[color:var(--ink-soft)]"
                                >
                                    选择左侧旅程章节查看详情。
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {token ? (
                            <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-5 text-slate-100 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.75)]">
                                <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.33)_0%,rgba(14,165,233,0)_70%)]" />
                                <div className="relative">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">未来计划</h3>
                                        <Clock3 className="h-4 w-4 text-slate-400" />
                                    </div>

                                    <div className="space-y-2.5">
                                        {planPreview.map((plan) => (
                                            <div key={plan.id} className="rounded-2xl border border-slate-700/90 bg-slate-900/85 p-3 text-sm">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="font-medium text-slate-100">{plan.title}</div>
                                                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${statusClassMap[plan.status]}`}>
                                                        {statusLabelMap[plan.status]}
                                                    </span>
                                                </div>
                                                <div className="mt-1 text-xs text-slate-400">
                                                    {plan.province} · {plan.city} · {formatPeriod(plan.startDate, plan.endDate)}
                                                </div>
                                            </div>
                                        ))}

                                        {plansQuery.data?.length === 0 && (
                                            <div className="rounded-2xl border border-dashed border-slate-700 p-3 text-xs text-slate-400">
                                                还没有未来计划，先添加一个想去的目的地。
                                            </div>
                                        )}
                                    </div>

                                    <Link
                                        to="/admin/footprints"
                                        className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-1 text-sm text-sky-300 transition hover:text-sky-200"
                                    >
                                        管理计划与旅程
                                        <ChevronRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-3xl border border-[color:var(--card-border)] bg-white/85 p-5 text-sm text-[color:var(--ink-soft)]">
                                未来计划仅自己可见。登录后可创建计划、设置预算，并在完成后归档到旅程章节。
                                <div className="mt-3">
                                    <Link to="/admin/login">
                                        <Button size="sm" className="min-h-11 rounded-xl bg-[color:var(--ink)] px-4 text-white hover:bg-black">
                                            去登录
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </aside>
                </section>
            </div>
        </div>
    )
}
