import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Badge } from '@repo/ui/components/ui/badge'
import { api, unwrapResponse, API_HOST } from '../../lib/api'
import { MapPin, Trash2, Shuffle } from 'lucide-react'
import { LocationData, FootprintPhoto } from '../public/FootprintPage'
import { motion } from 'framer-motion'

type ProvinceSummary = {
    province: string
    visitedCities: number
    visitCount: number
    photoCount: number
    lastVisited?: string
}

export default function FootprintManagerPage() {
    const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
    const [selectedCityId, setSelectedCityId] = useState<number | null>(null)
    const [selectedCityName, setSelectedCityName] = useState<string | null>(null)
    const [reassignTarget, setReassignTarget] = useState<{ photoId: number; province: string; city: string } | null>(null)
    const queryClient = useQueryClient()

    const provincesQuery = useQuery({
        queryKey: ['admin', 'footprints', 'provinces'],
        queryFn: async () => unwrapResponse((await api.get('/footprints/provinces')).data) as ProvinceSummary[],
    })

    const citiesQuery = useQuery({
        queryKey: ['admin', 'footprints', 'cities', selectedProvince],
        enabled: !!selectedProvince,
        queryFn: async () => unwrapResponse((await api.get(`/footprints/provinces/${encodeURIComponent(selectedProvince || '')}/cities`)).data) as LocationData[],
    })

    const cityDetailQuery = useQuery({
        queryKey: ['admin', 'footprints', 'city', selectedCityId],
        enabled: !!selectedCityId,
        queryFn: async () => unwrapResponse((await api.get(`/footprints/cities/${selectedCityId}`)).data) as LocationData,
    })

    useEffect(() => {
        if (citiesQuery.data && citiesQuery.data.length && !selectedCityId) {
            const first = citiesQuery.data[0]
            setSelectedCityId(first.id || null)
            setSelectedCityName(first.city || null)
        }
    }, [citiesQuery.data, selectedCityId])

    const deleteMutation = useMutation({
        mutationFn: async (photoId: number) => unwrapResponse((await api.delete(`/footprints/photos/${photoId}`)).data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'footprints', 'city', selectedCityId] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'footprints', 'provinces'] })
        },
    })

    const reassignMutation = useMutation({
        mutationFn: async (payload: { photoId: number; province: string; city: string }) =>
            unwrapResponse(
                (
                    await api.post(`/footprints/photos/${payload.photoId}/reassign`, {
                        province: payload.province,
                        city: payload.city,
                    })
                ).data
            ),
        onSuccess: () => {
            setReassignTarget(null)
            queryClient.invalidateQueries({ queryKey: ['admin', 'footprints', 'city', selectedCityId] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'footprints', 'provinces'] })
        },
    })

    const renderUrl = (url?: string) => {
        if (!url) return ''
        if (url.startsWith('http://') || url.startsWith('https://')) return url
        return `${API_HOST}${url}`
    }

    const photos: FootprintPhoto[] = useMemo(() => cityDetailQuery.data?.photos || [], [cityDetailQuery.data])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">足迹管理</h1>
                <p className="text-muted-foreground">按省份/城市查看足迹，支持删除照片或调整归属</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>省份</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {provincesQuery.isLoading && <div className="text-sm text-muted-foreground">加载中...</div>}
                        {!provincesQuery.isLoading && (
                            <div className="space-y-2">
                                {(provincesQuery.data || []).map((p) => (
                                    <button
                                        key={p.province}
                                        className={`w-full text-left rounded-md border px-3 py-2 flex items-center justify-between ${
                                            selectedProvince === p.province ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'
                                        }`}
                                        onClick={() => {
                                            setSelectedProvince(p.province)
                                            setSelectedCityId(null)
                                            setSelectedCityName(null)
                                        }}
                                    >
                                        <div className="space-y-0.5">
                                            <div className="font-semibold text-slate-800">{p.province}</div>
                                            <div className="text-xs text-slate-500">城市 {p.visitedCities} · 照片 {p.photoCount}</div>
                                        </div>
                                        <Badge variant="outline">{p.visitCount} 次</Badge>
                                    </button>
                                ))}
                                {!(provincesQuery.data || []).length && <div className="text-sm text-muted-foreground">暂无数据</div>}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid gap-4">
                    <Card className="border border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle>城市</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedProvince ? (
                                <div className="flex flex-wrap gap-2">
                                    {(citiesQuery.data || []).map((city) => (
                                        <Button
                                            key={city.id}
                                            variant={selectedCityId === city.id ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => {
                                                setSelectedCityId(city.id || null)
                                                setSelectedCityName(city.city || null)
                                            }}
                                        >
                                            {city.city} <span className="ml-2 text-xs text-slate-200">({city.photoCount ?? 0})</span>
                                        </Button>
                                    ))}
                                    {!citiesQuery.isLoading && !(citiesQuery.data || []).length && (
                                        <span className="text-sm text-muted-foreground">该省暂无城市记录</span>
                                    )}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">请先选择省份</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle>
                                照片
                                {selectedCityName ? <span className="text-sm text-muted-foreground ml-2">({selectedCityName})</span> : null}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {cityDetailQuery.isLoading && <div className="text-sm text-muted-foreground">加载中...</div>}
                            {!cityDetailQuery.isLoading && photos.length === 0 && (
                                <div className="text-sm text-muted-foreground">暂无照片</div>
                            )}
                            {!cityDetailQuery.isLoading && photos.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {photos.map((photo, idx) => (
                                        <motion.div
                                            key={photo.id ?? idx}
                                            className="relative group rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm"
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <img
                                                src={renderUrl(photo.url)}
                                                alt={photo.note || `Photo ${idx}`}
                                                className="h-32 w-full object-cover"
                                            />
                                            <div className="p-2 space-y-1">
                                                <div className="text-sm font-medium text-slate-800 truncate">{photo.note || photo.trip || `Photo ${idx + 1}`}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {selectedProvince} · {selectedCityName}
                                                </div>
                                            </div>
                                            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/30 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    className="flex-1 px-2 py-1 hover:bg-black/50 flex items-center justify-center gap-1"
                                                    onClick={() =>
                                                        setReassignTarget({
                                                            photoId: photo.id!,
                                                            province: selectedProvince || '',
                                                            city: selectedCityName || '',
                                                        })
                                                    }
                                                >
                                                    <Shuffle className="h-3 w-3" /> 调整归属
                                                </button>
                                                <button
                                                    className="flex-1 px-2 py-1 hover:bg-black/50 flex items-center justify-center gap-1 text-red-200"
                                                    onClick={() => {
                                                        if (photo.id) deleteMutation.mutate(photo.id)
                                                    }}
                                                >
                                                    <Trash2 className="h-3 w-3" /> 删除
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Reassign modal */}
            {reassignTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>调整归属</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm text-muted-foreground">省份</label>
                                <Input
                                    value={reassignTarget.province}
                                    onChange={(e) => setReassignTarget({ ...reassignTarget, province: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-muted-foreground">城市</label>
                                <Input
                                    value={reassignTarget.city}
                                    onChange={(e) => setReassignTarget({ ...reassignTarget, city: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setReassignTarget(null)}>
                                    取消
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (!reassignTarget.province || !reassignTarget.city) return
                                        reassignMutation.mutate({
                                            photoId: reassignTarget.photoId,
                                            province: reassignTarget.province,
                                            city: reassignTarget.city,
                                        })
                                    }}
                                    disabled={reassignMutation.isLoading}
                                >
                                    {reassignMutation.isLoading ? '提交中...' : '确认调整'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
