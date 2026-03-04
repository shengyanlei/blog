import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Badge } from '@repo/ui/components/ui/badge'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { CoverMaterial } from '../../types/api'
import { resolveMediaUrl } from '../../lib/mediaUrl'

interface CoverMaterialPickerProps {
    value?: number | null
    onChange: (coverPhotoId: number | null) => void
    disabled?: boolean
    title?: string
}

export default function CoverMaterialPicker({
    value,
    onChange,
    disabled = false,
    title = '文章封面（来自素材池）',
}: CoverMaterialPickerProps) {
    const [searchInput, setSearchInput] = useState('')
    const normalizedSearch = searchInput.trim()
    const searchPhotoId = useMemo(() => {
        if (!normalizedSearch) return null
        if (!/^\d+$/.test(normalizedSearch)) return null
        const id = Number(normalizedSearch)
        return Number.isFinite(id) && id > 0 ? id : null
    }, [normalizedSearch])
    const hasInvalidSearch = Boolean(normalizedSearch) && searchPhotoId === null
    const requestedPhotoId = searchPhotoId ?? value ?? undefined

    const recommendationsQuery = useQuery({
        queryKey: ['cover-material-recommendations', requestedPhotoId],
        queryFn: async () => {
            const res = await api.get<ApiResponse<CoverMaterial[]>>('/cover-materials/recommendations', {
                params: {
                    size: 8,
                    photoId: requestedPhotoId,
                },
            })
            return unwrapResponse(res.data)
        },
    })

    const materials = recommendationsQuery.data ?? []
    const selected = materials.find((item) => item.photoId === value) ?? null

    return (
        <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper)]/70 p-4 sm:p-5">
            <div className="mb-3 text-sm font-semibold text-[color:var(--ink)]">{title}</div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="按编号搜索图片，例如 128"
                    className="h-9 w-56 bg-[color:var(--paper)] border-[color:var(--card-border)]"
                    disabled={disabled}
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-[color:var(--card-border)]"
                    onClick={() => setSearchInput('')}
                    disabled={!searchInput.trim() || disabled}
                >
                    清空搜索
                </Button>
            </div>

            {hasInvalidSearch && <div className="mb-2 text-xs text-[#b91c1c]">请输入纯数字编号。</div>}

            {selected ? (
                <div className="mb-3 rounded-lg border border-[color:var(--card-border)] p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs text-[color:var(--ink-soft)]">
                        <span>当前封面 #{selected.photoId}</span>
                        <Badge variant={selected.usedAsCover ? 'secondary' : 'outline'}>
                            {selected.usedAsCover ? '已使用' : '未使用'}
                        </Badge>
                    </div>
                    <img src={resolveMediaUrl(selected.url)} alt="封面预览" className="h-32 w-full rounded-md object-cover md:w-72" />
                    <div className="mt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-[color:var(--card-border)]"
                            onClick={() => onChange(null)}
                            disabled={disabled}
                        >
                            清空封面
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="mb-3 text-xs text-[color:var(--ink-soft)]">未设置封面</div>
            )}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {materials.map((item) => (
                    <button
                        key={item.photoId}
                        type="button"
                        className={`overflow-hidden rounded-lg border text-left ${
                            value === item.photoId
                                ? 'border-[color:var(--accent)] ring-1 ring-[color:var(--accent)]'
                                : 'border-[color:var(--card-border)]'
                        }`}
                        onClick={() => onChange(item.photoId)}
                        disabled={disabled}
                    >
                        <img src={resolveMediaUrl(item.url)} alt={`素材 ${item.photoId}`} className="h-24 w-full object-cover" />
                        <div className="flex items-center justify-between bg-[color:var(--paper)] px-2 py-1 text-[11px] text-[color:var(--ink-soft)]">
                            <span>#{item.photoId}</span>
                            <span>{item.usedAsCover ? '已使用' : '未使用'}</span>
                        </div>
                    </button>
                ))}
                {!materials.length && !recommendationsQuery.isLoading && (
                    <div className="col-span-full rounded-lg border border-dashed border-[color:var(--card-border)] px-3 py-5 text-center text-xs text-[color:var(--ink-soft)]">
                        当前没有可用素材。
                    </div>
                )}
            </div>
        </div>
    )
}
