import { useMemo, useState } from 'react'
import { CheckCircle2, ClipboardList, KanbanSquare, Link2, Plus, Sparkles } from 'lucide-react'

type PlanCard = {
    id: number
    title: string
    city: string
    status: 'IDEA' | 'PLANNING' | 'BOOKED' | 'DONE'
    tasks: string[]
}

type JourneyCard = {
    id: number
    title: string
    period: string
    linkedCities: string[]
}

const MOCK_PLANS: PlanCard[] = [
    { id: 1, title: '闽南短途', city: '泉州', status: 'PLANNING', tasks: ['订车票', '定民宿', '规划步行路线'] },
    { id: 2, title: '北海道雪季', city: '札幌', status: 'IDEA', tasks: ['预算测算', '镜头清单'] },
]

const MOCK_JOURNEYS: JourneyCard[] = [
    { id: 1, title: '岭南雨季漫游', period: '2025-06', linkedCities: ['广州', '佛山', '珠海'] },
    { id: 2, title: '西北光影试验', period: '2024-09', linkedCities: ['兰州', '张掖', '敦煌'] },
]

const MOCK_ASSETS = [
    { locationId: 11, city: '惠州', photoCount: 8 },
    { locationId: 12, city: '中山', photoCount: 5 },
]

export default function PrototypeAdminFootprintChroniclePage() {
    const [tab, setTab] = useState<'journey' | 'plan' | 'asset'>('journey')
    const [keyword, setKeyword] = useState('')

    const filteredJourneys = useMemo(() => {
        const kw = keyword.trim().toLowerCase()
        if (!kw) return MOCK_JOURNEYS
        return MOCK_JOURNEYS.filter((item) => item.title.toLowerCase().includes(kw) || item.linkedCities.join(' ').toLowerCase().includes(kw))
    }, [keyword])

    return (
        <div className="min-h-screen bg-[linear-gradient(160deg,#f8fafc_0%,#eff6ff_45%,#f0fdfa_100%)] p-4 text-slate-900">
            <div className="mx-auto max-w-7xl space-y-5">
                <header className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.45)] backdrop-blur-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-emerald-700">Prototype / Admin</p>
                            <h1 className="mt-2 text-3xl font-display">足迹编年管理台（原型）</h1>
                            <p className="mt-2 text-sm text-slate-600">三标签结构：旅程管理、计划管理、素材池。用于验证录入与归档闭环。</p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm text-white">
                            <Sparkles className="h-4 w-4" />
                            原型数据
                        </div>
                    </div>
                </header>

                <nav className="flex flex-wrap gap-2">
                    {[
                        { id: 'journey', label: '旅程管理', icon: ClipboardList },
                        { id: 'plan', label: '计划管理', icon: KanbanSquare },
                        { id: 'asset', label: '素材池', icon: Link2 },
                    ].map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setTab(item.id as typeof tab)}
                            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition ${
                                tab === item.id ? 'border-emerald-400 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-600'
                            }`}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </button>
                    ))}
                </nav>

                {tab === 'journey' && (
                    <section className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
                        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.5)]">
                            <div className="flex items-center justify-between gap-3">
                                <input
                                    value={keyword}
                                    onChange={(event) => setKeyword(event.target.value)}
                                    placeholder="搜索章节或城市"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-400 focus:ring"
                                />
                                <button type="button" className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm text-white">
                                    <Plus className="h-4 w-4" />
                                    新建
                                </button>
                            </div>
                            <div className="space-y-2">
                                {filteredJourneys.map((journey) => (
                                    <div key={journey.id} className="rounded-2xl border border-slate-200 p-3">
                                        <div className="font-medium">{journey.title}</div>
                                        <div className="mt-1 text-xs text-slate-500">{journey.period} · {journey.linkedCities.join(' · ')}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.5)]">
                            <h3 className="font-semibold">旅程表单草图</h3>
                            <div className="grid gap-3 text-sm">
                                <input placeholder="title" className="rounded-xl border border-slate-200 px-3 py-2" />
                                <div className="grid grid-cols-2 gap-2">
                                    <input placeholder="startDate" className="rounded-xl border border-slate-200 px-3 py-2" />
                                    <input placeholder="endDate" className="rounded-xl border border-slate-200 px-3 py-2" />
                                </div>
                                <textarea placeholder="summary / content" className="min-h-[120px] rounded-xl border border-slate-200 px-3 py-2" />
                                <input placeholder="companions" className="rounded-xl border border-slate-200 px-3 py-2" />
                                <button type="button" className="rounded-xl bg-slate-900 px-3 py-2 text-white">保存旅程</button>
                            </div>
                        </div>
                    </section>
                )}

                {tab === 'plan' && (
                    <section className="grid gap-4 md:grid-cols-2">
                        {MOCK_PLANS.map((plan) => (
                            <article key={plan.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.5)]">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold">{plan.title}</h3>
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{plan.status}</span>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">目的地：{plan.city}</p>
                                <ul className="mt-3 space-y-1 text-sm text-slate-700">
                                    {plan.tasks.map((task) => (
                                        <li key={task} className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            {task}
                                        </li>
                                    ))}
                                </ul>
                                <button type="button" className="mt-4 rounded-xl bg-emerald-600 px-3 py-2 text-sm text-white">完成并归档</button>
                            </article>
                        ))}
                    </section>
                )}

                {tab === 'asset' && (
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.5)]">
                        <h3 className="font-semibold">素材池（拖拽原型）</h3>
                        <p className="mt-1 text-sm text-slate-500">拖动未归档地点到旅程卡，即可完成归档关联。</p>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {MOCK_ASSETS.map((asset) => (
                                <div key={asset.locationId} draggable className="cursor-grab rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm">
                                    未归档地点：{asset.city} · {asset.photoCount} 张
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}
