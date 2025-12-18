import React, { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Calendar, MapPin, X, ChevronLeft, ChevronRight, Image as ImageIcon, Pencil } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@repo/ui/components/ui/button'
import { LocationData, FootprintPhoto } from '../../../pages/public/FootprintPage'
import { api, unwrapResponse, API_HOST } from '../../../lib/api'
import { useAuthStore } from '../../../store/useAuthStore'

interface CityDetailProps {
    provinceName: string
    cityName: string
    data?: LocationData
    onBack: () => void
}

type UploadParseResponse = {
    url: string
    province?: string
    city?: string
    shotAt?: string
}

export default function CityDetail({ provinceName, cityName, data, onBack }: CityDetailProps) {
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
    const [dragOver, setDragOver] = useState(false)
    const [uploadHint, setUploadHint] = useState<string | null>(null)
    const [editingPhoto, setEditingPhoto] = useState<FootprintPhoto | null>(null)
    const [noteDraft, setNoteDraft] = useState('')
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const queryClient = useQueryClient()
    const photos = data?.photos || []
    const token = useAuthStore((state) => state.token)

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1) {
            setSelectedPhotoIndex(selectedPhotoIndex + 1)
        }
    }

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
            setSelectedPhotoIndex(selectedPhotoIndex - 1)
        }
    }

    const openLightbox = (index: number) => setSelectedPhotoIndex(index)
    const closeLightbox = () => setSelectedPhotoIndex(null)

    const ensureLocationId = async () => {
        if (data?.id) return data.id
        const created = unwrapResponse(
            (
                await api.post('/footprints', {
                    province: provinceName,
                    city: cityName,
                    visitCount: 1,
                    photos: [],
                })
            ).data
        ) as LocationData
        queryClient.invalidateQueries({ queryKey: ['footprints', 'cities', provinceName] })
        queryClient.invalidateQueries({ queryKey: ['footprints', 'provinces'] })
        return created.id
    }

    const requireAuth = () => {
        if (!token) {
            setUploadHint('请先登录后台后再进行上传/编辑（点击右上角“后台管理”登录）。')
            return false
        }
        return true
    }

    const addPhotosMutation = useMutation({
        mutationFn: async (files: File[]) => {
            const locationId = await ensureLocationId()
            if (!locationId) throw new Error('未获取到地点 ID')
            const uploaded = []
            for (const file of files) {
                const formData = new FormData()
                formData.append('file', file)
                const uploadRes = unwrapResponse(
                    (
                        await api.post('/footprints/upload', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                        })
                    ).data
                ) as UploadParseResponse
                uploaded.push(uploadRes)
                unwrapResponse(
                    (
                        await api.post(`/footprints/${locationId}/photos`, {
                            photos: [
                                {
                                    url: uploadRes.url,
                                    shotAt: uploadRes.shotAt,
                                    cover: photos.length === 0 && uploaded.length === 1,
                                },
                            ],
                        })
                    ).data
                )
                if (uploadRes.province || uploadRes.city) {
                    setUploadHint(`已解析：${uploadRes.province || ''} ${uploadRes.city || ''}`.trim())
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['footprints', 'city', cityName] })
            queryClient.invalidateQueries({ queryKey: ['footprints', 'cities', provinceName] })
            queryClient.invalidateQueries({ queryKey: ['footprints', 'provinces'] })
        },
        onError: (err: any) => {
            const status = err?.response?.status
            if (status === 401 || status === 403) {
                setUploadHint('未登录或权限不足，请先登录后台后再上传。')
                return
            }
            setUploadHint(err?.response?.data?.message || err?.message || '上传失败，请重试')
        },
    })

    const handleFiles = (files: FileList | File[]) => {
        const arr = Array.from(files || [])
        if (!arr.length) return
        if (!requireAuth()) return
        addPhotosMutation.mutate(arr)
    }

    const updateNoteMutation = useMutation({
        mutationFn: async (payload: { id: number; note: string }) => {
            if (!token) {
                throw new Error('未登录或权限不足')
            }
            return unwrapResponse(
                (
                    await api.put(`/footprints/photos/${payload.id}/note`, {
                        note: payload.note,
                    })
                ).data
            )
        },
        onSuccess: () => {
            setEditingPhoto(null)
            setNoteDraft('')
            queryClient.invalidateQueries({ queryKey: ['footprints', 'city', cityName] })
            queryClient.invalidateQueries({ queryKey: ['footprints', 'cities', provinceName] })
            queryClient.invalidateQueries({ queryKey: ['footprints', 'provinces'] })
        },
        onError: (err: any) => {
            if (err?.response?.status === 401 || err?.response?.status === 403 || err?.message === '未登录或权限不足') {
                setUploadHint('未登录或权限不足，请先登录后台后再编辑。')
                return
            }
            setUploadHint(err?.response?.data?.message || err?.message || '保存备注失败，请重试')
        },
    })

    const openEdit = (photo: FootprintPhoto) => {
        if (!requireAuth()) return
        setEditingPhoto(photo)
        setNoteDraft(photo.note || '')
    }

    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setDragOver(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files)
        }
    }

    const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setDragOver(true)
    }

    const onDragLeave = () => setDragOver(false)

    const renderPhotoUrl = (url?: string) => {
        if (!url) return ''
        if (url.startsWith('http://') || url.startsWith('https://')) return url
        return `${API_HOST}${url}`
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-slate-600">
                        <ArrowLeft className="h-4 w-4" /> 返回
                    </Button>
                    <div>
                        <div className="text-xl font-bold text-slate-800">{cityName}</div>
                        <div className="text-sm text-slate-600">
                            到访 {data?.visitCount ?? 0} 次 · {data?.photoCount ?? 0} 张照片 · 最近 {data?.lastVisited ?? '--'}
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <Calendar className="h-4 w-4" />
                            <span>省份：{provinceName}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-6 border-2 border-dashed rounded-xl p-4 min-h-[160px]"
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
            >
                {photos.map((photo, index) => (
                    <button
                        key={photo.id ?? index}
                        type="button"
                        onClick={() => openLightbox(index)}
                        className="relative group [perspective:1200px] h-36 focus:outline-none"
                    >
                        <div className="relative w-full h-full rounded-xl border border-slate-200 shadow-sm overflow-hidden [transform-style:preserve-3d]">
                            <div className="absolute inset-0 transition-transform duration-500 [transform:rotateY(0deg)] [backface-visibility:hidden] group-hover:[transform:rotateY(180deg)]">
                                <img
                                    src={renderPhotoUrl(photo.url)}
                                    alt={`Photo ${index}`}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute bottom-2 left-2 text-white text-xs flex items-center gap-1">
                                    <ImageIcon className="h-4 w-4" />
                                    {photo.shotAt || ''}
                                </div>
                            </div>

                            <div className="absolute inset-0 transition-transform duration-500 [transform:rotateY(180deg)] group-hover:[transform:rotateY(0deg)] [backface-visibility:hidden] bg-white text-slate-800 p-3 flex flex-col justify-between">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="text-xs uppercase tracking-widest text-indigo-500 font-semibold">Postcard</div>
                                    <button
                                        type="button"
                                        className="rounded-full bg-white/90 shadow px-1.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-white"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            openEdit(photo)
                                        }}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="text-sm leading-snug h-20 overflow-hidden">
                                    {photo.note?.trim() || '还没有写下这张照片的备注，点击右上角编辑吧。'}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-200">
                                    <span>{photo.shotAt || '—'}</span>
                                    <span className="truncate">{photo.tags || '旅途札记'}</span>
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
                {photos.length === 0 && (
                    <div className="col-span-full text-center text-slate-400 py-10">暂无照片，拖拽到这里或点击上传</div>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`col-span-full mt-2 text-sm text-indigo-600 hover:text-indigo-700 border border-dashed rounded-lg py-2 ${
                        dragOver ? 'bg-indigo-50 border-indigo-300' : 'border-slate-200'
                    }`}
                >
                    {addPhotosMutation.isLoading ? '上传中...' : '点击选择图片或拖拽到区域'}
                </button>
            </div>
            {uploadHint && <div className="text-sm text-slate-500 mt-2">{uploadHint}</div>}

            {editingPhoto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setEditingPhoto(null)}>
                    <div
                        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-base font-semibold text-slate-900">编辑照片备注</div>
                                <div className="text-xs text-slate-500">城市 {cityName} · {editingPhoto.shotAt || '日期未知'}</div>
                            </div>
                            <button className="text-slate-500 hover:text-slate-700" onClick={() => setEditingPhoto(null)}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-700">明信片文字</label>
                            <textarea
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 min-h-[120px]"
                                placeholder="写下一段旅行的记忆..."
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setEditingPhoto(null)}>
                                取消
                            </Button>
                            <Button
                                className="bg-indigo-600 text-white"
                                disabled={updateNoteMutation.isLoading}
                                onClick={() => {
                                    if (!editingPhoto?.id) return
                                    updateNoteMutation.mutate({ id: editingPhoto.id, note: noteDraft })
                                }}
                            >
                                {updateNoteMutation.isLoading ? '保存中...' : '保存备注'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
                <AnimatePresence>
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={closeLightbox}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative max-w-4xl w-full px-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className="absolute right-4 top-4 text-white hover:text-slate-200 z-10"
                                onClick={closeLightbox}
                            >
                                <X className="h-6 w-6" />
                            </button>

                            <img
                                src={renderPhotoUrl(photos[selectedPhotoIndex].url)}
                                alt="detail"
                                className="w-full max-h-[80vh] object-contain rounded-2xl shadow-xl"
                            />

                            <div className="absolute inset-y-0 left-0 flex items-center">
                                <button className="p-2 text-white hover:text-indigo-200" onClick={handlePrev}>
                                    <ChevronLeft className="h-8 w-8" />
                                </button>
                            </div>
                            <div className="absolute inset-y-0 right-0 flex items-center">
                                <button className="p-2 text-white hover:text-indigo-200" onClick={handleNext}>
                                    <ChevronRight className="h-8 w-8" />
                                </button>
                            </div>

                            <div className="mt-3 text-white text-sm flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>
                                    {provinceName} · {cityName}
                                </span>
                                <span>|</span>
                                <Calendar className="h-4 w-4" />
                                <span>{photos[selectedPhotoIndex].shotAt || ''}</span>
                            </div>
                        </motion.div>
                    </div>
                </AnimatePresence>
            )}
        </div>
    )
}
