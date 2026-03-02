import { useMemo, useState } from 'react'
import { Calendar, ChevronRight, Clock3, Filter, MapPin, Pencil, Tag } from 'lucide-react'

type MockJourney = {
    id: number
    title: string
    period: string
    summary: string
    cities: string[]
    photoCount: number
    tags: string[]
    cover: string
    chapter: string
    postcards: string[]
}

const MOCK_JOURNEYS: MockJourney[] = [
    {
        id: 1,
        title: '岭南雨季漫游',
        period: '2025-06-12 至 2025-06-18',
        summary: '在潮湿闷热的风里，从骑楼、旧街到海边夜市，把慢节奏写进了每天的黄昏。',
        cities: ['广州', '佛山', '珠海'],
        photoCount: 42,
        tags: ['街巷', '海风', '夜市'],
        cover: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&auto=format&fit=crop&q=80',
        chapter:
            '第一天在老城区迷路，第二天在雨里吃完一碗云吞面后去了海边。所有地点都不是打卡，而是停留。',
        postcards: ['被暴雨困在骑楼下的四十分钟。', '凌晨两点的海岸线像一条低饱和胶片。'],
    },
    {
        id: 2,
        title: '西北光影试验',
        period: '2024-09-03 至 2024-09-10',
        summary: '为了拍到更干净的天空，连续一周日出前出发，晚上整理素材与路线复盘。',
        cities: ['兰州', '张掖', '敦煌'],
        photoCount: 86,
        tags: ['日出', '地貌', '公路'],
        cover: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=80',
        chapter:
            '这趟旅程像一个摄影项目：测光、等待、重拍，再在夜晚把所有路线和预算写回笔记。',
        postcards: ['第 5 天风太大，三脚架整晚都在抖。', '最好的构图来自临时改道的 15 公里。'],
    },
    {
        id: 3,
        title: '江南冬日慢车',
        period: '2023-12-21 至 2023-12-25',
        summary: '不赶景点，坐慢车穿城，把城市当作一组温度、气味和声音来记录。',
        cities: ['杭州', '绍兴'],
        photoCount: 31,
        tags: ['冬天', '慢车', '书店'],
        cover: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&auto=format&fit=crop&q=80',
        chapter:
            '写作密度最高的一次出行，几乎每一段路都对应一段当天现场记下的句子。',
        postcards: ['在旧书店地板上坐了两个小时。', '最舒服的时刻是返程车窗上的雾。'],
    },
]

const MOCK_PLANS = [
    { title: '闽南四城短途', month: '2026-04', status: '筹备中', budget: '2000-3000' },
    { title: '北海道雪季摄影', month: '2026-12', status: '想去', budget: '9000-12000' },
]

export default function PrototypeFootprintChroniclePage() {
    const [keyword, setKeyword] = useState('')
    const [tag, setTag] = useState('')
    const [selectedId, setSelectedId] = useState<number>(MOCK_JOURNEYS[0].id)

    const filtered = useMemo(() => {
        const kw = keyword.trim().toLowerCase()
        const t = tag.trim().toLowerCase()
        return MOCK_JOURNEYS.filter((item) => {
            const hitKeyword =
                !kw ||
                item.title.toLowerCase().includes(kw) ||
                item.summary.toLowerCase().includes(kw) ||
                item.cities.join(' ').toLowerCase().includes(kw)
            const hitTag = !t || item.tags.some((value) => value.toLowerCase().includes(t))
            return hitKeyword && hitTag
        })
    }, [keyword, tag])

    const selected = filtered.find((item) => item.id === selectedId) || filtered[0]

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_15%_20%,#f8fafc_0,#eef2ff_45%,#e0f2fe_100%)] px-4 py-10 text-slate-900">
            <div className="mx-auto max-w-7xl space-y-6">
                <header className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.45)] backdrop-blur-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-sky-700">Prototype / Chronicle</p>
                            <h1 className="mt-2 text-3xl font-display">旅行编年馆（原型）</h1>
                            <p className="mt-2 max-w-3xl text-sm text-slate-600">
                                以旅程章节为主轴组织回忆，地图退居辅助。该页为交互原型，使用 Mock 数据展示信息架构与视觉语气。
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="rounded-2xl bg-slate-900 px-3 py-2 text-white">
                                <div className="text-lg font-semibold">{MOCK_JOURNEYS.length}</div>
                                <div>章节</div>
                            </div>
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-inner">
                                <div className="text-lg font-semibold">{MOCK_JOURNEYS.reduce((acc, item) => acc + item.photoCount, 0)}</div>
                                <div>照片</div>
                            </div>
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-inner">
                                <div className="text-lg font-semibold">{MOCK_PLANS.length}</div>
                                <div>计划</div>
                            </div>
                        </div>
                    </div>
                </header>

                <section className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
                    <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-[0_26px_60px_-46px_rgba(15,23,42,0.45)] backdrop-blur-sm">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                                <Filter className="h-3.5 w-3.5" />
                                时间线筛选
                            </div>
                            <input
                                value={keyword}
                                onChange={(event) => setKeyword(event.target.value)}
                                placeholder="关键词"
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-sky-400 transition focus:ring"
                            />
                            <input
                                value={tag}
                                onChange={(event) => setTag(event.target.value)}
                                placeholder="标签"
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-sky-400 transition focus:ring"
                            />
                        </div>

                        <div className="space-y-3">
                            {filtered.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setSelectedId(item.id)}
                                    className={`w-full overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                                        selected?.id === item.id
                                            ? 'border-sky-300 bg-sky-50/60 shadow-[0_16px_40px_-30px_rgba(14,165,233,0.6)]'
                                            : 'border-slate-200 bg-white'
                                    }`}
                                >
                                    <div className="grid gap-3 p-4 md:grid-cols-[136px_1fr]">
                                        <div className="h-24 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${item.cover})` }} />
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="font-semibold text-slate-900">{item.title}</div>
                                                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] text-white">{item.photoCount} 张</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                                <span className="inline-flex items-center gap-1">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {item.period}
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    {item.cities.join(' · ')}
                                                </span>
                                            </div>
                                            <p className="line-clamp-2 text-sm text-slate-600">{item.summary}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                            {!filtered.length && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">没有匹配到章节</div>}
                        </div>
                    </div>

                    <aside className="space-y-4">
                        {selected && (
                            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_26px_60px_-46px_rgba(15,23,42,0.45)]">
                                <div className="h-44 bg-cover bg-center" style={{ backgroundImage: `url(${selected.cover})` }} />
                                <div className="space-y-4 p-5">
                                    <div>
                                        <h2 className="text-xl font-display text-slate-900">{selected.title}</h2>
                                        <p className="mt-1 text-sm text-slate-500">{selected.period}</p>
                                    </div>
                                    <p className="text-sm leading-relaxed text-slate-700">{selected.chapter}</p>
                                    <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
                                        <div className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            <Pencil className="h-3.5 w-3.5" />
                                            明信片摘录
                                        </div>
                                        {selected.postcards.map((line) => (
                                            <div key={line} className="text-sm text-slate-700">
                                                {line}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {selected.tags.map((value) => (
                                            <span key={value} className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs text-sky-800">
                                                <Tag className="h-3 w-3" />
                                                {value}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-100 shadow-[0_26px_60px_-46px_rgba(15,23,42,0.65)]">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">未来计划入口</h3>
                                <Clock3 className="h-4 w-4 text-slate-400" />
                            </div>
                            <div className="space-y-2">
                                {MOCK_PLANS.map((plan) => (
                                    <div key={plan.title} className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3 text-sm">
                                        <div className="font-medium text-slate-100">{plan.title}</div>
                                        <div className="mt-1 text-xs text-slate-400">{plan.month} · {plan.status} · 预算 {plan.budget}</div>
                                    </div>
                                ))}
                            </div>
                            <button type="button" className="mt-4 inline-flex items-center gap-1 text-sm text-sky-300 hover:text-sky-200">
                                查看计划看板
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </aside>
                </section>
            </div>
        </div>
    )
}
