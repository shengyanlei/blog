import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card'
import { Input } from '@repo/ui/components/ui/input'
import { api, API_HOST, unwrapResponse } from '../../lib/api'
import { CHINA_COUNTRY, CHINA_PROVINCE_CITY_OPTIONS, CHINA_PROVINCES } from '../../constants/china-address'
import type {
    AssetPendingScope,
    AssetUploadJob,
    BindPendingResult,
    PendingAssetPhoto,
    PageResult,
    TravelJourneyDetail,
    TravelJourneySummary,
    TravelPlan,
    TravelPlanPriority,
    TravelPlanStatus,
    UnassignedLocationAsset,
} from '../../types/api'

type Tab = 'journey' | 'plan' | 'asset'
type FootprintManagerMode = 'footprints' | 'materials'

const statusOptions: TravelPlanStatus[] = ['IDEA', 'PLANNING', 'BOOKED', 'DONE', 'CANCELED']
const priorityOptions: TravelPlanPriority[] = ['LOW', 'MEDIUM', 'HIGH']

const statusLabel: Record<TravelPlanStatus, string> = {
    IDEA: '灵感池',
    PLANNING: '规划中',
    BOOKED: '已预订',
    DONE: '已完成',
    CANCELED: '已取消',
}

const priorityLabel: Record<TravelPlanPriority, string> = {
    LOW: '低',
    MEDIUM: '中',
    HIGH: '高',
}

const tabDescription: Record<Tab, string> = {
    journey: '旅程管理：维护已发生的旅程章节（前台公开展示）。',
    plan: '计划管理：维护未来计划（仅登录后可见）。',
    asset: '照片墙：先上传图片，再绑定标准地址，最后将地址桶归档到旅程。',
}

const emptyJourneyForm = {
    title: '',
    startDate: '',
    endDate: '',
    summary: '',
    content: '',
    tags: '',
    companions: '',
    budgetMin: '',
    budgetMax: '',
    coverUrl: '',
}

const emptyPlanForm = {
    title: '',
    province: '',
    city: '',
    startDate: '',
    endDate: '',
    status: 'IDEA' as TravelPlanStatus,
    priority: 'MEDIUM' as TravelPlanPriority,
    budgetMin: '',
    budgetMax: '',
    tags: '',
    notes: '',
    tasksText: '',
}

const formatPeriod = (startDate?: string, endDate?: string) => {
    if (startDate && endDate) return `${startDate} - ${endDate}`
    return startDate || endDate || '--'
}

const formatDateTime = (value?: string) => {
    if (!value) return '--'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d} ${hh}:${mm}`
}

const formatFileSize = (size: number) => {
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
    if (size >= 1024) return `${Math.ceil(size / 1024)} KB`
    return `${size} B`
}

const toMediaUrl = (url?: string) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `${API_HOST}${url}`
}

const PENDING_PAGE_SIZE = 24
const UPLOAD_BATCH_SIZE = 10
const UPLOAD_BATCH_CONCURRENCY = 2
const UPLOAD_FILE_LIMIT = 50

type HasShotAtFilter = 'all' | 'yes' | 'no'
type UploadJobState = AssetUploadJob & { file?: File }
type AssetAddressTab = 'country' | 'province' | 'city' | 'detail'

const extractErrorMessage = (error: any) => {
    const statusCode = error?.response?.status
    const requestUrl = String(error?.config?.url || '')
    if (statusCode === 413 && requestUrl.includes('/materials/upload')) {
        return '上传失败：请求体过大（413）。请将 Nginx 的 client_max_body_size 调大到 20m 或以上，并重启 Nginx。'
    }
    if (statusCode === 404 && requestUrl.includes('/materials/')) {
        return '后端未加载照片墙新接口（/api/materials/*）。请重启 backend 并确认运行的是最新代码。'
    }
    const message = error?.response?.data?.message || error?.message
    if (typeof message === 'string' && message.trim()) {
        return message.trim()
    }
    return '操作失败，请稍后重试'
}

export default function FootprintManagerPage({ mode = 'footprints' }: { mode?: FootprintManagerMode }) {
    const qc = useQueryClient()
    const availableTabs = mode === 'materials' ? (['asset'] as Tab[]) : (['journey', 'plan'] as Tab[])

    const [tab, setTab] = useState<Tab>(availableTabs[0])
    const [keyword, setKeyword] = useState('')

    const [journeyId, setJourneyId] = useState<number | null>(null)
    const [isJourneyDraft, setIsJourneyDraft] = useState(false)
    const [j, setJ] = useState(emptyJourneyForm)

    const [planId, setPlanId] = useState<number | null>(null)
    const [isPlanDraft, setIsPlanDraft] = useState(false)
    const [p, setP] = useState(emptyPlanForm)

    const [dragLocationId, setDragLocationId] = useState<number | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const [assetUploadJobs, setAssetUploadJobs] = useState<UploadJobState[]>([])
    const [assetUploadHint, setAssetUploadHint] = useState('')
    const [assetDragOver, setAssetDragOver] = useState(false)
    const [selectedPendingPhotoIds, setSelectedPendingPhotoIds] = useState<number[]>([])
    const [pendingPage, setPendingPage] = useState(0)
    const [pendingScope, setPendingScope] = useState<AssetPendingScope>('ALL')
    const [pendingKeyword, setPendingKeyword] = useState('')
    const [pendingMonth, setPendingMonth] = useState('')
    const [pendingHasShotAt, setPendingHasShotAt] = useState<HasShotAtFilter>('all')
    const [addressTab, setAddressTab] = useState<AssetAddressTab>('country')
    const [bindCountry, setBindCountry] = useState(CHINA_COUNTRY)
    const [bindProvince, setBindProvince] = useState('')
    const [bindCity, setBindCity] = useState('')
    const [bindAddressDetail, setBindAddressDetail] = useState('')
    const [selectedAssetLocationIds, setSelectedAssetLocationIds] = useState<number[]>([])
    const [selectedArchivedLocationIds, setSelectedArchivedLocationIds] = useState<number[]>([])
    const [archiveJourneyId, setArchiveJourneyId] = useState<number | null>(null)

    const journeys = useQuery<TravelJourneySummary[]>({
        queryKey: ['admin', 'journeys', keyword],
        queryFn: async () =>
            unwrapResponse(
                (
                    await api.get('/journeys', {
                        params: { keyword: keyword || undefined },
                    })
                ).data
            ) as TravelJourneySummary[],
    })

    const journeyDetail = useQuery<TravelJourneyDetail>({
        queryKey: ['admin', 'journey', journeyId],
        enabled: !!journeyId && !isJourneyDraft,
        queryFn: async () => unwrapResponse((await api.get(`/journeys/${journeyId}`)).data) as TravelJourneyDetail,
    })

    const plans = useQuery<TravelPlan[]>({
        queryKey: ['admin', 'plans'],
        queryFn: async () => unwrapResponse((await api.get('/travel-plans')).data) as TravelPlan[],
    })

    const assets = useQuery<UnassignedLocationAsset[]>({
        queryKey: ['admin', 'assets'],
        queryFn: async () => unwrapResponse((await api.get('/materials/unassigned')).data) as UnassignedLocationAsset[],
    })

    const pendingAssetsQuery = useQuery<PageResult<PendingAssetPhoto>>({
        queryKey: ['admin', 'pending-assets', pendingPage, pendingScope, pendingKeyword, pendingMonth, pendingHasShotAt],
        enabled: tab === 'asset',
        queryFn: async () =>
            unwrapResponse(
                (
                    await api.get('/materials/pending', {
                        params: {
                            page: pendingPage,
                            size: PENDING_PAGE_SIZE,
                            scope: pendingScope,
                            keyword: pendingKeyword || undefined,
                            month: pendingMonth || undefined,
                            hasShotAt:
                                pendingHasShotAt === 'all'
                                    ? undefined
                                    : pendingHasShotAt === 'yes',
                        },
                    })
                ).data
            ) as PageResult<PendingAssetPhoto>,
    })

    const archiveJourneyDetailQuery = useQuery<TravelJourneyDetail>({
        queryKey: ['admin', 'journey-archive', archiveJourneyId],
        enabled: tab === 'asset' && !!archiveJourneyId,
        queryFn: async () => unwrapResponse((await api.get(`/journeys/${archiveJourneyId}`)).data) as TravelJourneyDetail,
    })

    useEffect(() => {
        const list = journeys.data || []
        if (isJourneyDraft) return
        if (!list.length) {
            setJourneyId(null)
            return
        }
        if (!journeyId || !list.some((item) => item.id === journeyId)) {
            setJourneyId(list[0].id)
        }
    }, [journeys.data, journeyId, isJourneyDraft])

    useEffect(() => {
        if (isJourneyDraft) return
        const detail = journeyDetail.data
        if (!detail) return
        setJ({
            title: detail.title || '',
            startDate: detail.startDate || '',
            endDate: detail.endDate || '',
            summary: detail.summary || '',
            content: detail.content || '',
            tags: detail.tags || '',
            companions: detail.companions || '',
            budgetMin: detail.budgetMin != null ? String(detail.budgetMin) : '',
            budgetMax: detail.budgetMax != null ? String(detail.budgetMax) : '',
            coverUrl: detail.coverUrl || '',
        })
    }, [journeyDetail.data, isJourneyDraft])

    useEffect(() => {
        const list = plans.data || []
        if (isPlanDraft) return
        if (!list.length) {
            setPlanId(null)
            return
        }
        if (!planId || !list.some((item) => item.id === planId)) {
            setPlanId(list[0].id)
        }
    }, [plans.data, planId, isPlanDraft])

    useEffect(() => {
        if (isPlanDraft) return
        const detail = (plans.data || []).find((item) => item.id === planId)
        if (!detail) return
        setP({
            title: detail.title || '',
            province: detail.province || '',
            city: detail.city || '',
            startDate: detail.startDate || '',
            endDate: detail.endDate || '',
            status: detail.status,
            priority: detail.priority,
            budgetMin: detail.budgetMin != null ? String(detail.budgetMin) : '',
            budgetMax: detail.budgetMax != null ? String(detail.budgetMax) : '',
            tags: detail.tags || '',
            notes: detail.notes || '',
            tasksText: (detail.tasks || []).map((task) => task.title).join('\n'),
        })
    }, [plans.data, planId, isPlanDraft])

    useEffect(() => {
        setPendingPage(0)
    }, [pendingScope, pendingKeyword, pendingMonth, pendingHasShotAt])

    useEffect(() => {
        if (!availableTabs.includes(tab)) {
            setTab(availableTabs[0])
        }
    }, [availableTabs, tab])

    useEffect(() => {
        if (!bindProvince) {
            setBindCity('')
            return
        }
        const options = CHINA_PROVINCE_CITY_OPTIONS[bindProvince] || []
        if (!options.length) {
            setBindCity('')
            return
        }
        if (!bindCity || !options.includes(bindCity)) {
            setBindCity(options[0])
        }
    }, [bindProvince, bindCity])

    useEffect(() => {
        if (tab !== 'asset') return
        const list = journeys.data || []
        if (!list.length) {
            setArchiveJourneyId(null)
            return
        }
        if (!archiveJourneyId || !list.some((item) => item.id === archiveJourneyId)) {
            setArchiveJourneyId(list[0].id)
        }
    }, [tab, journeys.data, archiveJourneyId])

    const saveJourney = useMutation({
        mutationFn: async () => {
            const body = {
                ...j,
                budgetMin: j.budgetMin ? Number(j.budgetMin) : undefined,
                budgetMax: j.budgetMax ? Number(j.budgetMax) : undefined,
            }
            if (!isJourneyDraft && journeyId) {
                return unwrapResponse((await api.put(`/journeys/${journeyId}`, body)).data)
            }
            return unwrapResponse((await api.post('/journeys', body)).data)
        },
        onSuccess: (data: any) => {
            qc.invalidateQueries({ queryKey: ['admin', 'journeys'] })
            qc.invalidateQueries({ queryKey: ['journeys'] })
            if (data?.id) {
                setJourneyId(data.id)
                setIsJourneyDraft(false)
            }
        },
    })

    const removeJourney = useMutation({
        mutationFn: async () => {
            if (!journeyId) return null
            return unwrapResponse((await api.delete(`/journeys/${journeyId}`)).data)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'journeys'] })
            qc.invalidateQueries({ queryKey: ['journeys'] })
            setJourneyId(null)
            setIsJourneyDraft(false)
            setJ(emptyJourneyForm)
        },
    })

    const savePlan = useMutation({
        mutationFn: async () => {
            const tasks = p.tasksText
                .split('\n')
                .map((item) => item.trim())
                .filter(Boolean)
                .map((title, index) => ({ title, done: false, sortOrder: index }))

            const body = {
                ...p,
                budgetMin: p.budgetMin ? Number(p.budgetMin) : undefined,
                budgetMax: p.budgetMax ? Number(p.budgetMax) : undefined,
                tasks,
            }

            if (!isPlanDraft && planId) {
                return unwrapResponse((await api.put(`/travel-plans/${planId}`, body)).data)
            }
            return unwrapResponse((await api.post('/travel-plans', body)).data)
        },
        onSuccess: (data: any) => {
            qc.invalidateQueries({ queryKey: ['admin', 'plans'] })
            qc.invalidateQueries({ queryKey: ['travel-plans'] })
            if (data?.id) {
                setPlanId(data.id)
                setIsPlanDraft(false)
            }
        },
    })

    const removePlan = useMutation({
        mutationFn: async () => {
            if (!planId) return null
            return unwrapResponse((await api.delete(`/travel-plans/${planId}`)).data)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'plans'] })
            qc.invalidateQueries({ queryKey: ['travel-plans'] })
            setPlanId(null)
            setIsPlanDraft(false)
            setP(emptyPlanForm)
        },
    })

    const completePlan = useMutation({
        mutationFn: async () => {
            if (!planId) return null
            return unwrapResponse((await api.post(`/travel-plans/${planId}/complete-and-archive`, {})).data)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'plans'] })
            qc.invalidateQueries({ queryKey: ['travel-plans'] })
            qc.invalidateQueries({ queryKey: ['admin', 'journeys'] })
            qc.invalidateQueries({ queryKey: ['journeys'] })
        },
    })

    const linkLocation = useMutation({
        mutationFn: async ({ jid, lid }: { jid: number; lid: number }) =>
            unwrapResponse((await api.post(`/journeys/${jid}/locations:link`, { locationIds: [lid] })).data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'journey', journeyId] })
            qc.invalidateQueries({ queryKey: ['admin', 'journey-archive', archiveJourneyId] })
            qc.invalidateQueries({ queryKey: ['admin', 'assets'] })
            qc.invalidateQueries({ queryKey: ['journeys'] })
        },
    })

    const linkLocationsBatch = useMutation({
        mutationFn: async ({ jid, locationIds }: { jid: number; locationIds: number[] }) =>
            unwrapResponse((await api.post(`/journeys/${jid}/locations:link`, { locationIds })).data),
        onSuccess: (_: any, variables) => {
            setAssetUploadHint(`已归档 ${variables.locationIds.length} 个地址桶到旅程。`)
            setSelectedAssetLocationIds([])
            qc.invalidateQueries({ queryKey: ['admin', 'assets'] })
            qc.invalidateQueries({ queryKey: ['admin', 'journey', archiveJourneyId] })
            qc.invalidateQueries({ queryKey: ['admin', 'journey-archive', archiveJourneyId] })
            qc.invalidateQueries({ queryKey: ['admin', 'journeys'] })
            qc.invalidateQueries({ queryKey: ['journeys'] })
        },
        onError: (error: any) => {
            setAssetUploadHint(extractErrorMessage(error))
        },
    })

    const unlinkLocation = useMutation({
        mutationFn: async ({ jid, lid }: { jid: number; lid: number }) =>
            unwrapResponse((await api.delete(`/journeys/${jid}/locations/${lid}`)).data),
        onSuccess: (_: any, variables) => {
            setAssetUploadHint('已取出 1 个归档地址桶。')
            setSelectedArchivedLocationIds((prev) => prev.filter((id) => id !== variables.lid))
            qc.invalidateQueries({ queryKey: ['admin', 'assets'] })
            qc.invalidateQueries({ queryKey: ['admin', 'journey-archive', archiveJourneyId] })
            qc.invalidateQueries({ queryKey: ['admin', 'journeys'] })
            qc.invalidateQueries({ queryKey: ['journeys'] })
        },
        onError: (error: any) => {
            setAssetUploadHint(extractErrorMessage(error))
        },
    })

    const unlinkLocationsBatch = useMutation({
        mutationFn: async ({ jid, locationIds }: { jid: number; locationIds: number[] }) => {
            for (const lid of locationIds) {
                await api.delete(`/journeys/${jid}/locations/${lid}`)
            }
            return true
        },
        onSuccess: (_: any, variables) => {
            setAssetUploadHint(`已取出 ${variables.locationIds.length} 个归档地址桶。`)
            setSelectedArchivedLocationIds([])
            qc.invalidateQueries({ queryKey: ['admin', 'assets'] })
            qc.invalidateQueries({ queryKey: ['admin', 'journey-archive', archiveJourneyId] })
            qc.invalidateQueries({ queryKey: ['admin', 'journeys'] })
            qc.invalidateQueries({ queryKey: ['journeys'] })
        },
        onError: (error: any) => {
            setAssetUploadHint(extractErrorMessage(error))
        },
    })

    const bindPendingToAddress = useMutation({
        mutationFn: async ({
            photoIds,
            country,
            province,
            city,
            addressDetail,
        }: {
            photoIds: number[]
            country: string
            province: string
            city: string
            addressDetail?: string
        }) =>
            unwrapResponse(
                (
                    await api.post('/materials/pending/bind-address', {
                        photoIds,
                        address: { country, province, city, addressDetail },
                    })
                ).data
            ) as BindPendingResult,
        onSuccess: (result) => {
            setSelectedPendingPhotoIds([])
            const destination = result.fullAddress || [result.country, result.province, result.city, result.addressDetail].filter(Boolean).join(' · ')
            setAssetUploadHint(
                `绑定完成：新增 ${result.boundCount || 0}，重绑 ${result.reboundCount || 0}，跳过 ${result.skippedCount || 0}。目标：${destination || '--'}`
            )
            qc.invalidateQueries({ queryKey: ['admin', 'pending-assets'] })
            qc.invalidateQueries({ queryKey: ['admin', 'assets'] })
            qc.invalidateQueries({ queryKey: ['admin', 'journeys'] })
            qc.invalidateQueries({ queryKey: ['journeys'] })
        },
        onError: (error: any) => {
            setAssetUploadHint(extractErrorMessage(error))
        },
    })

    const removePendingPhoto = useMutation({
        mutationFn: async (photoId: number) => unwrapResponse((await api.delete(`/footprints/photos/${photoId}`)).data),
        onSuccess: (_: any, photoId) => {
            setSelectedPendingPhotoIds((prev) => prev.filter((id) => id !== photoId))
            qc.invalidateQueries({ queryKey: ['admin', 'pending-assets'] })
            qc.invalidateQueries({ queryKey: ['admin', 'assets'] })
        },
        onError: (error: any) => {
            setAssetUploadHint(extractErrorMessage(error))
        },
    })

    const pendingAssetsPage = pendingAssetsQuery.data
    const pendingPhotos = pendingAssetsPage?.content || []
    const pendingTotal = pendingAssetsPage?.totalElements || 0
    const pendingTotalPages = pendingAssetsPage?.totalPages || 0
    const provinceOptions = CHINA_PROVINCES
    const cityOptions = bindProvince ? (CHINA_PROVINCE_CITY_OPTIONS[bindProvince] || []) : []
    const assetsList = assets.data || []
    const archivedLocations = archiveJourneyDetailQuery.data?.locations || []

    const selectedPendingSet = useMemo(() => new Set(selectedPendingPhotoIds), [selectedPendingPhotoIds])
    const allCurrentPageSelected = pendingPhotos.length > 0 && pendingPhotos.every((item) => selectedPendingSet.has(item.photoId))
    const pendingSelectedCount = selectedPendingPhotoIds.length
    const selectedAssetLocationSet = useMemo(() => new Set(selectedAssetLocationIds), [selectedAssetLocationIds])
    const selectedAssetLocationCount = selectedAssetLocationIds.length
    const selectedArchivedLocationSet = useMemo(() => new Set(selectedArchivedLocationIds), [selectedArchivedLocationIds])
    const selectedArchivedLocationCount = selectedArchivedLocationIds.length

    const uploadSummary = useMemo(
        () =>
            assetUploadJobs.reduce(
                (acc, item) => {
                    acc.total += 1
                    if (item.status === 'uploading') acc.uploading += 1
                    if (item.status === 'success') acc.success += 1
                    if (item.status === 'failed') acc.failed += 1
                    if (item.status === 'pending') acc.pending += 1
                    return acc
                },
                { total: 0, uploading: 0, success: 0, failed: 0, pending: 0 }
            ),
        [assetUploadJobs]
    )
    const isUploadingAssets = uploadSummary.uploading > 0
    const isBindingPending = bindPendingToAddress.isPending
    const isUnlinkingLocations = unlinkLocation.isPending || unlinkLocationsBatch.isPending
    const hasFailedUploads = uploadSummary.failed > 0

    useEffect(() => {
        const totalPages = pendingAssetsPage?.totalPages || 0
        if (!totalPages && pendingPage !== 0) {
            setPendingPage(0)
            return
        }
        if (totalPages > 0 && pendingPage > totalPages - 1) {
            setPendingPage(totalPages - 1)
        }
    }, [pendingAssetsPage?.totalPages, pendingPage])

    useEffect(() => {
        const currentIds = new Set(pendingPhotos.map((item) => item.photoId))
        setSelectedPendingPhotoIds((prev) => prev.filter((id) => currentIds.has(id)))
    }, [pendingPhotos])

    useEffect(() => {
        const currentIds = new Set((assets.data || []).map((item) => item.locationId))
        setSelectedAssetLocationIds((prev) => prev.filter((id) => currentIds.has(id)))
    }, [assets.data])

    useEffect(() => {
        const currentIds = new Set(archivedLocations.map((item) => item.id))
        setSelectedArchivedLocationIds((prev) => prev.filter((id) => currentIds.has(id)))
    }, [archivedLocations])

    useEffect(() => {
        setSelectedPendingPhotoIds([])
    }, [pendingPage, pendingScope, pendingKeyword, pendingMonth, pendingHasShotAt])

    const patchUploadJobs = (localIds: string[], patch: Partial<UploadJobState>) => {
        const localIdSet = new Set(localIds)
        setAssetUploadJobs((prev) =>
            prev.map((item) => {
                if (!localIdSet.has(item.localId)) return item
                return { ...item, ...patch }
            })
        )
    }

    const runUploadJobs = async (jobs: UploadJobState[]) => {
        if (!jobs.length) return { successCount: 0, failedCount: 0 }

        const batches: UploadJobState[][] = []
        for (let i = 0; i < jobs.length; i += UPLOAD_BATCH_SIZE) {
            batches.push(jobs.slice(i, i + UPLOAD_BATCH_SIZE))
        }

        let cursor = 0
        let successCount = 0
        let failedCount = 0

        const worker = async () => {
            for (;;) {
                const batchIndex = cursor
                cursor += 1
                if (batchIndex >= batches.length) return

                const batch = batches[batchIndex].filter((item) => !!item.file)
                if (!batch.length) continue
                const ids = batch.map((item) => item.localId)
                patchUploadJobs(ids, { status: 'uploading', error: undefined })

                const formData = new FormData()
                batch.forEach((item) => {
                    if (item.file) {
                        formData.append('files', item.file)
                    }
                })

                try {
                    await api.post('/materials/upload', formData)
                    successCount += batch.length
                    patchUploadJobs(ids, { status: 'success', error: undefined })
                } catch (error: any) {
                    failedCount += batch.length
                    const message = extractErrorMessage(error)
                    setAssetUploadJobs((prev) =>
                        prev.map((item) =>
                            ids.includes(item.localId)
                                ? { ...item, status: 'failed', error: message }
                                : item
                        )
                    )
                }
            }
        }

        const workers = Array.from({ length: Math.min(UPLOAD_BATCH_CONCURRENCY, batches.length) }, () => worker())
        await Promise.all(workers)

        if (successCount > 0) {
            await qc.invalidateQueries({ queryKey: ['admin', 'pending-assets'] })
        }
        return { successCount, failedCount }
    }

    const createUploadJobs = (files: File[]) =>
        files.map((file) => ({
            localId:
                typeof window !== 'undefined' && window.crypto?.randomUUID
                    ? window.crypto.randomUUID()
                    : `${Date.now()}-${Math.random()}`,
            name: file.name,
            size: file.size,
            status: 'pending' as const,
            error: undefined,
            file,
        }))

    const handleUploadFiles = async (files: File[]) => {
        if (!files.length) return
        if (isUploadingAssets) {
            setAssetUploadHint('正在上传，请等待当前批次完成。')
            return
        }

        const imageFiles = files.filter((file) => file.type.startsWith('image/'))
        if (!imageFiles.length) {
            setAssetUploadHint('只支持图片文件。')
            return
        }

        const limitedFiles = imageFiles.slice(0, UPLOAD_FILE_LIMIT)
        if (imageFiles.length > UPLOAD_FILE_LIMIT) {
            setAssetUploadHint(`单次最多 ${UPLOAD_FILE_LIMIT} 张，已自动截取前 ${UPLOAD_FILE_LIMIT} 张。`)
        } else {
            setAssetUploadHint(`已加入 ${limitedFiles.length} 张，开始上传。`)
        }

        const jobs = createUploadJobs(limitedFiles)
        setAssetUploadJobs((prev) => [...jobs, ...prev].slice(0, 200))

        const result = await runUploadJobs(jobs)
        if (result.failedCount > 0) {
            setAssetUploadHint(`上传完成：成功 ${result.successCount} 张，失败 ${result.failedCount} 张，可点“重试失败项”。`)
            return
        }
        setAssetUploadHint(`上传完成：成功 ${result.successCount} 张。`)
    }

    const retryFailedUploads = async () => {
        if (isUploadingAssets) return
        const failedJobs = assetUploadJobs.filter((item) => item.status === 'failed' && item.file)
        if (!failedJobs.length) return

        patchUploadJobs(
            failedJobs.map((item) => item.localId),
            { status: 'pending', error: undefined }
        )
        setAssetUploadHint(`正在重试 ${failedJobs.length} 张失败项...`)
        const result = await runUploadJobs(failedJobs.map((item) => ({ ...item, status: 'pending', error: undefined })))
        if (result.failedCount > 0) {
            setAssetUploadHint(`重试完成：成功 ${result.successCount} 张，失败 ${result.failedCount} 张。`)
            return
        }
        setAssetUploadHint(`重试完成：成功 ${result.successCount} 张。`)
    }

    const clearUploadJobs = () => {
        if (isUploadingAssets) return
        setAssetUploadJobs([])
    }

    const togglePendingPhoto = (photoId: number) => {
        setSelectedPendingPhotoIds((prev) =>
            prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
        )
    }

    const toggleSelectCurrentPage = () => {
        if (allCurrentPageSelected) {
            setSelectedPendingPhotoIds([])
            return
        }
        setSelectedPendingPhotoIds(pendingPhotos.map((item) => item.photoId))
    }

    const toggleAssetLocation = (locationId: number) => {
        setSelectedAssetLocationIds((prev) =>
            prev.includes(locationId) ? prev.filter((id) => id !== locationId) : [...prev, locationId]
        )
    }

    const toggleArchivedLocation = (locationId: number) => {
        setSelectedArchivedLocationIds((prev) =>
            prev.includes(locationId) ? prev.filter((id) => id !== locationId) : [...prev, locationId]
        )
    }

    const bindSelectedPendingAssets = () => {
        if (!pendingSelectedCount) {
            setAssetUploadHint('请先在队列里勾选要绑定地址的图片。')
            return
        }
        if (!bindCountry || !bindProvince || !bindCity) {
            setAssetUploadHint('请先补全地址（国家/省份/城市）。')
            return
        }
        bindPendingToAddress.mutate({
            photoIds: selectedPendingPhotoIds,
            country: bindCountry,
            province: bindProvince,
            city: bindCity,
            addressDetail: bindAddressDetail.trim() || undefined,
        })
    }

    const archiveSelectedLocations = () => {
        if (!selectedAssetLocationCount) {
            setAssetUploadHint('请先勾选要归档的地址桶。')
            return
        }
        if (!archiveJourneyId) {
            setAssetUploadHint('请先选择归档目标旅程。')
            return
        }
        linkLocationsBatch.mutate({ jid: archiveJourneyId, locationIds: selectedAssetLocationIds })
    }

    const takeOutSelectedLocations = () => {
        if (!selectedArchivedLocationCount) {
            setAssetUploadHint('请先勾选要取出的归档地址桶。')
            return
        }
        if (!archiveJourneyId) {
            setAssetUploadHint('请先选择旅程。')
            return
        }
        unlinkLocationsBatch.mutate({ jid: archiveJourneyId, locationIds: selectedArchivedLocationIds })
    }

    const uploadInputDisabled = isUploadingAssets
    const bindActionDisabled =
        isBindingPending ||
        pendingSelectedCount === 0 ||
        !bindCountry ||
        !bindProvince ||
        !bindCity

    const journeyCountLabel = useMemo(() => (journeys.data || []).length, [journeys.data])
    const planCountLabel = useMemo(() => (plans.data || []).length, [plans.data])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="mb-2 text-3xl font-display font-semibold text-[color:var(--ink)]">
                    {mode === 'materials' ? '照片墙管理' : '足迹编年管理'}
                </h1>
                <p className="text-[color:var(--ink-muted)]">
                    {mode === 'materials' ? '上传照片、绑定标准地址并归档到旅程。' : '管理旅程章节与未来计划。'}
                </p>
            </div>

            <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                    {availableTabs.map((item) => (
                        <Button
                            key={item}
                            variant={tab === item ? 'default' : 'outline'}
                            className={
                                tab === item
                                    ? 'bg-[color:var(--accent)] text-white hover:bg-[#92400e]'
                                    : 'border-[color:var(--card-border)] text-[color:var(--ink-muted)]'
                            }
                            onClick={() => setTab(item)}
                        >
                            {item === 'journey' ? '旅程管理' : item === 'plan' ? '计划管理' : '照片墙'}
                        </Button>
                    ))}
                </div>
                <div className="rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2 text-sm text-[color:var(--ink-muted)]">
                    {tabDescription[tab]}
                </div>
            </div>

            {tab === 'journey' && (
                <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                    <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)]">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>旅程列表</span>
                                <Badge variant="outline" className="border-[color:var(--card-border)]">
                                    {journeyCountLabel} 条
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Input
                                value={keyword}
                                onChange={(event) => setKeyword(event.target.value)}
                                placeholder="搜索旅程标题"
                                className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                            />
                            {(journeys.data || []).map((item) => (
                                <button
                                    key={item.id}
                                    className={`w-full rounded-xl border px-3 py-2 text-left ${
                                        !isJourneyDraft && journeyId === item.id
                                            ? 'border-[color:var(--accent)]/40 bg-sky-50'
                                            : 'border-[color:var(--card-border)] bg-[color:var(--paper)]'
                                    }`}
                                    onClick={() => {
                                        setIsJourneyDraft(false)
                                        setJourneyId(item.id)
                                    }}
                                >
                                    <div className="font-medium">{item.title}</div>
                                    <div className="text-xs text-[color:var(--ink-soft)]">
                                        {formatPeriod(item.startDate, item.endDate)} · {item.photoCount} 张
                                    </div>
                                </button>
                            ))}

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="w-full border-[color:var(--card-border)]"
                                    onClick={() => {
                                        setJourneyId(null)
                                        setIsJourneyDraft(true)
                                        setJ(emptyJourneyForm)
                                    }}
                                    disabled={saveJourney.isPending}
                                >
                                    新建旅程
                                </Button>
                                {isJourneyDraft && (
                                    <Button
                                        variant="outline"
                                        className="border-[color:var(--card-border)]"
                                        onClick={() => {
                                            setIsJourneyDraft(false)
                                            setJ(emptyJourneyForm)
                                        }}
                                    >
                                        取消
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)]">
                        <CardHeader>
                            <CardTitle>{isJourneyDraft ? '新建旅程' : '旅程表单'}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="space-y-1">
                                    <div className="text-xs font-medium text-[color:var(--ink-muted)]">旅程标题</div>
                                    <Input
                                        value={j.title}
                                        onChange={(event) => setJ({ ...j, title: event.target.value })}
                                        placeholder="例：东京五日散步"
                                        className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-xs font-medium text-[color:var(--ink-muted)]">封面图片 URL</div>
                                    <Input
                                        value={j.coverUrl}
                                        onChange={(event) => setJ({ ...j, coverUrl: event.target.value })}
                                        placeholder="https://..."
                                        className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-xs font-medium text-[color:var(--ink-muted)]">开始日期</div>
                                    <Input
                                        type="date"
                                        value={j.startDate}
                                        onChange={(event) => setJ({ ...j, startDate: event.target.value })}
                                        className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-xs font-medium text-[color:var(--ink-muted)]">结束日期</div>
                                    <Input
                                        type="date"
                                        value={j.endDate}
                                        onChange={(event) => setJ({ ...j, endDate: event.target.value })}
                                        className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-xs font-medium text-[color:var(--ink-muted)]">标签</div>
                                    <Input
                                        value={j.tags}
                                        onChange={(event) => setJ({ ...j, tags: event.target.value })}
                                        placeholder="例：樱花,美食,散步"
                                        className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-xs font-medium text-[color:var(--ink-muted)]">同行人</div>
                                    <Input
                                        value={j.companions}
                                        onChange={(event) => setJ({ ...j, companions: event.target.value })}
                                        placeholder="例：半喵"
                                        className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                    />
                                </label>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="space-y-1">
                                    <div className="text-xs font-medium text-[color:var(--ink-muted)]">预算下限（元）</div>
                                    <Input
                                        value={j.budgetMin}
                                        onChange={(event) => setJ({ ...j, budgetMin: event.target.value })}
                                        placeholder="可选"
                                        className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-xs font-medium text-[color:var(--ink-muted)]">预算上限（元）</div>
                                    <Input
                                        value={j.budgetMax}
                                        onChange={(event) => setJ({ ...j, budgetMax: event.target.value })}
                                        placeholder="可选"
                                        className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                    />
                                </label>
                            </div>

                            <label className="space-y-1">
                                <div className="text-xs font-medium text-[color:var(--ink-muted)]">旅程摘要（卡片展示）</div>
                                <textarea
                                    value={j.summary}
                                    onChange={(event) => setJ({ ...j, summary: event.target.value })}
                                    className="min-h-[72px] w-full rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] p-3 text-sm"
                                    placeholder="前台卡片会展示这段摘要"
                                />
                            </label>

                            <label className="space-y-1">
                                <div className="text-xs font-medium text-[color:var(--ink-muted)]">旅程正文</div>
                                <textarea
                                    value={j.content}
                                    onChange={(event) => setJ({ ...j, content: event.target.value })}
                                    className="min-h-[100px] w-full rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] p-3 text-sm"
                                    placeholder="写下这段旅程的完整记录"
                                />
                            </label>

                            <div className="flex gap-2">
                                <Button
                                    onClick={() => {
                                        if (saveJourney.isPending) return
                                        saveJourney.mutate()
                                    }}
                                    className="bg-[color:var(--accent)] text-white hover:bg-[#92400e]"
                                    disabled={!j.title.trim() || saveJourney.isPending}
                                >
                                    {isJourneyDraft ? '创建旅程' : '更新旅程'}
                                </Button>
                                {!isJourneyDraft && journeyId && (
                                    <Button
                                        variant="outline"
                                        className="border-red-200 text-red-600"
                                        onClick={() => removeJourney.mutate()}
                                        disabled={removeJourney.isPending}
                                    >
                                        删除
                                    </Button>
                                )}
                            </div>

                            <div className="rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper)] p-3">
                                <div className="mb-2 text-sm font-medium">已关联地点</div>
                                {(journeyDetail.data?.locations || []).map((location) => (
                                    <div key={location.id} className="rounded-lg border border-[color:var(--card-border)] px-3 py-2 text-sm">
                                        {location.province} · {location.city}{' '}
                                        <span className="text-xs text-[color:var(--ink-soft)]">{location.photoCount || 0} 张</span>
                                    </div>
                                ))}
                                {!(journeyDetail.data?.locations || []).length && (
                                    <div className="text-sm text-[color:var(--ink-soft)]">暂无关联地点</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {tab === 'plan' && (
                <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                    <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)]">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>计划列表</span>
                                <Badge variant="outline" className="border-[color:var(--card-border)]">
                                    {planCountLabel} 条
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {(plans.data || []).map((item) => (
                                <button
                                    key={item.id}
                                    className={`w-full rounded-xl border px-3 py-2 text-left ${
                                        !isPlanDraft && planId === item.id
                                            ? 'border-[color:var(--accent)]/40 bg-sky-50'
                                            : 'border-[color:var(--card-border)] bg-[color:var(--paper)]'
                                    }`}
                                    onClick={() => {
                                        setIsPlanDraft(false)
                                        setPlanId(item.id)
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{item.title}</span>
                                        <Badge variant="outline" className="border-[color:var(--card-border)]">
                                            {statusLabel[item.status]}
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-[color:var(--ink-soft)]">
                                        {item.province} · {item.city}
                                    </div>
                                </button>
                            ))}

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="w-full border-[color:var(--card-border)]"
                                    onClick={() => {
                                        setPlanId(null)
                                        setIsPlanDraft(true)
                                        setP(emptyPlanForm)
                                    }}
                                    disabled={savePlan.isPending}
                                >
                                    新建计划
                                </Button>
                                {isPlanDraft && (
                                    <Button
                                        variant="outline"
                                        className="border-[color:var(--card-border)]"
                                        onClick={() => {
                                            setIsPlanDraft(false)
                                            setP(emptyPlanForm)
                                        }}
                                    >
                                        取消
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)]">
                        <CardHeader>
                            <CardTitle>{isPlanDraft ? '新建计划' : '计划表单'}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="space-y-1">
                                    <div className="text-xs font-medium text-[color:var(--ink-muted)]">计划标题</div>
                                    <Input
                                        value={p.title}
                                        onChange={(event) => setP({ ...p, title: event.target.value })}
                                        placeholder="例：东京春季行程"
                                        className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-xs font-medium text-[color:var(--ink-muted)]">目的地省份/都道府县</div>
                                    <Input
                                        value={p.province}
                                        onChange={(event) => setP({ ...p, province: event.target.value })}
                                        placeholder="例：东京都"
                                        className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-xs font-medium text-[color:var(--ink-muted)]">目的地城市</div>
                                    <Input
                                        value={p.city}
                                        onChange={(event) => setP({ ...p, city: event.target.value })}
                                        placeholder="例：东京"
                                        className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-xs font-medium text-[color:var(--ink-muted)]">计划状态</div>
                                    <select
                                        value={p.status}
                                        onChange={(event) => setP({ ...p, status: event.target.value as TravelPlanStatus })}
                                        className="min-h-10 rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2 text-sm"
                                    >
                                        {statusOptions.map((status) => (
                                            <option key={status} value={status}>
                                                {statusLabel[status]}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="space-y-1">
                                    <div className="text-xs font-medium text-[color:var(--ink-muted)]">优先级</div>
                                    <select
                                        value={p.priority}
                                        onChange={(event) => setP({ ...p, priority: event.target.value as TravelPlanPriority })}
                                        className="min-h-10 rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2 text-sm"
                                    >
                                        {priorityOptions.map((priority) => (
                                            <option key={priority} value={priority}>
                                                {priorityLabel[priority]}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="space-y-1">
                                    <div className="text-xs font-medium text-[color:var(--ink-muted)]">出发日期</div>
                                    <Input
                                        type="date"
                                        value={p.startDate}
                                        onChange={(event) => setP({ ...p, startDate: event.target.value })}
                                        className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-xs font-medium text-[color:var(--ink-muted)]">结束日期</div>
                                    <Input
                                        type="date"
                                        value={p.endDate}
                                        onChange={(event) => setP({ ...p, endDate: event.target.value })}
                                        className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-xs font-medium text-[color:var(--ink-muted)]">标签</div>
                                    <Input
                                        value={p.tags}
                                        onChange={(event) => setP({ ...p, tags: event.target.value })}
                                        placeholder="例：美食,赏樱"
                                        className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                    />
                                </label>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="space-y-1">
                                    <div className="text-xs font-medium text-[color:var(--ink-muted)]">预算下限（元）</div>
                                    <Input
                                        value={p.budgetMin}
                                        onChange={(event) => setP({ ...p, budgetMin: event.target.value })}
                                        placeholder="可选"
                                        className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <div className="text-xs font-medium text-[color:var(--ink-muted)]">预算上限（元）</div>
                                    <Input
                                        value={p.budgetMax}
                                        onChange={(event) => setP({ ...p, budgetMax: event.target.value })}
                                        placeholder="可选"
                                        className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                    />
                                </label>
                            </div>

                            <label className="space-y-1">
                                <div className="text-xs font-medium text-[color:var(--ink-muted)]">备注</div>
                                <textarea
                                    value={p.notes}
                                    onChange={(event) => setP({ ...p, notes: event.target.value })}
                                    className="min-h-[80px] w-full rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] p-3 text-sm"
                                    placeholder="记录补充信息，例如酒店偏好、预算说明等"
                                />
                            </label>

                            <label className="space-y-1">
                                <div className="text-xs font-medium text-[color:var(--ink-muted)]">待办清单（每行一项）</div>
                                <textarea
                                    value={p.tasksText}
                                    onChange={(event) => setP({ ...p, tasksText: event.target.value })}
                                    className="min-h-[100px] w-full rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] p-3 text-sm"
                                    placeholder={'例：\n预订机票\n预订酒店\n买保险'}
                                />
                            </label>

                            <div className="flex flex-wrap gap-2">
                                <Button
                                    onClick={() => {
                                        if (savePlan.isPending) return
                                        savePlan.mutate()
                                    }}
                                    className="bg-[color:var(--accent)] text-white hover:bg-[#92400e]"
                                    disabled={!p.title.trim() || !p.province.trim() || !p.city.trim() || savePlan.isPending}
                                >
                                    {isPlanDraft ? '创建计划' : '更新计划'}
                                </Button>
                                {!isPlanDraft && planId && (
                                    <>
                                        <Button
                                            variant="outline"
                                            className="border-emerald-200 text-emerald-700"
                                            onClick={() => completePlan.mutate()}
                                            disabled={completePlan.isPending}
                                        >
                                            完成并归档
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="border-red-200 text-red-600"
                                            onClick={() => removePlan.mutate()}
                                            disabled={removePlan.isPending}
                                        >
                                            删除
                                        </Button>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {tab === 'asset' && (
                <div className="space-y-4">
                    <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)]">
                        <CardHeader>
                            <CardTitle>步骤 1：上传图片到待分配队列</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(event) => {
                                    const files = Array.from(event.target.files || [])
                                    if (files.length) {
                                        void handleUploadFiles(files)
                                    }
                                    event.currentTarget.value = ''
                                }}
                            />

                            <div
                                onDragOver={(event) => {
                                    event.preventDefault()
                                    if (!uploadInputDisabled) {
                                        setAssetDragOver(true)
                                    }
                                }}
                                onDragLeave={() => setAssetDragOver(false)}
                                onDrop={(event) => {
                                    event.preventDefault()
                                    setAssetDragOver(false)
                                    if (uploadInputDisabled) return
                                    const files = Array.from(event.dataTransfer.files || [])
                                    if (files.length) {
                                        void handleUploadFiles(files)
                                    }
                                }}
                                className={`rounded-xl border border-dashed p-5 transition ${
                                    assetDragOver
                                        ? 'border-[color:var(--accent)] bg-amber-50'
                                        : 'border-[color:var(--card-border)] bg-[color:var(--paper)]'
                                }`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-medium">拖拽图片到这里，或点击按钮选择文件</div>
                                        <div className="text-xs text-[color:var(--ink-soft)]">
                                            首版限制：单次最多 {UPLOAD_FILE_LIMIT} 张，按每批 {UPLOAD_BATCH_SIZE} 张并发上传。
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="border-[color:var(--card-border)]"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadInputDisabled}
                                        >
                                            上传图片
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="border-[color:var(--card-border)]"
                                            onClick={() => void retryFailedUploads()}
                                            disabled={!hasFailedUploads || uploadInputDisabled}
                                        >
                                            重试失败项
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="border-[color:var(--card-border)]"
                                            onClick={clearUploadJobs}
                                            disabled={uploadInputDisabled || !assetUploadJobs.length}
                                        >
                                            清空记录
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-2 text-xs text-[color:var(--ink-soft)] sm:grid-cols-2 lg:grid-cols-5">
                                <div className="rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2">总计：{uploadSummary.total}</div>
                                <div className="rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2">等待：{uploadSummary.pending}</div>
                                <div className="rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2">上传中：{uploadSummary.uploading}</div>
                                <div className="rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2">成功：{uploadSummary.success}</div>
                                <div className="rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2">失败：{uploadSummary.failed}</div>
                            </div>

                            {assetUploadHint && (
                                <div className="rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2 text-sm text-[color:var(--ink-muted)]">
                                    {assetUploadHint}
                                </div>
                            )}

                            {!!assetUploadJobs.length && (
                                <div className="space-y-2">
                                    <div className="text-xs font-medium text-[color:var(--ink-muted)]">上传记录</div>
                                    <div className="max-h-56 space-y-1 overflow-auto pr-1">
                                        {assetUploadJobs.map((job) => (
                                            <div
                                                key={job.localId}
                                                className="flex items-center justify-between rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2 text-xs"
                                            >
                                                <div className="min-w-0">
                                                    <div className="truncate font-medium">{job.name}</div>
                                                    <div className="text-[color:var(--ink-soft)]">{formatFileSize(job.size)}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div
                                                        className={`font-medium ${
                                                            job.status === 'failed'
                                                                ? 'text-red-600'
                                                                : job.status === 'success'
                                                                    ? 'text-emerald-700'
                                                                    : 'text-[color:var(--ink-muted)]'
                                                        }`}
                                                    >
                                                        {job.status === 'pending'
                                                            ? '等待中'
                                                            : job.status === 'uploading'
                                                                ? '上传中'
                                                                : job.status === 'success'
                                                                    ? '已成功'
                                                                    : '失败'}
                                                    </div>
                                                    {job.error && <div className="max-w-[240px] truncate text-red-500">{job.error}</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
                        <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)]">
                            <CardHeader>
                                <CardTitle>步骤 2：待处理图片队列</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-3 gap-2">
                                    {(['ALL', 'PENDING', 'BOUND'] as AssetPendingScope[]).map((scope) => (
                                        <Button
                                            key={scope}
                                            variant={pendingScope === scope ? 'default' : 'outline'}
                                            className={
                                                pendingScope === scope
                                                    ? 'bg-[color:var(--accent)] text-white hover:bg-[#92400e]'
                                                    : 'border-[color:var(--card-border)]'
                                            }
                                            onClick={() => setPendingScope(scope)}
                                        >
                                            {scope === 'ALL' ? '全部' : scope === 'PENDING' ? '待分配' : '已绑定'}
                                        </Button>
                                    ))}
                                </div>

                                <div className="grid gap-2 md:grid-cols-2">
                                    <Input
                                        value={pendingKeyword}
                                        onChange={(event) => setPendingKeyword(event.target.value)}
                                        placeholder="地址关键词（国家/省/市/详细地址）"
                                        className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                    />
                                    <Input
                                        type="month"
                                        value={pendingMonth}
                                        onChange={(event) => setPendingMonth(event.target.value)}
                                        className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                    />
                                    <select
                                        value={pendingHasShotAt}
                                        onChange={(event) => setPendingHasShotAt(event.target.value as HasShotAtFilter)}
                                        className="min-h-10 rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2 text-sm"
                                    >
                                        <option value="all">全部拍摄日期状态</option>
                                        <option value="yes">仅有拍摄日期</option>
                                        <option value="no">仅无拍摄日期</option>
                                    </select>
                                    <Button
                                        variant="outline"
                                        className="border-[color:var(--card-border)]"
                                        onClick={() => {
                                            setPendingScope('ALL')
                                            setPendingKeyword('')
                                            setPendingMonth('')
                                            setPendingHasShotAt('all')
                                        }}
                                    >
                                        清空筛选
                                    </Button>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <Button
                                        variant="outline"
                                        className="border-[color:var(--card-border)]"
                                        onClick={toggleSelectCurrentPage}
                                        disabled={!pendingPhotos.length}
                                    >
                                        {allCurrentPageSelected ? '取消全选当前页' : '全选当前页'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-[color:var(--card-border)]"
                                        onClick={() => setSelectedPendingPhotoIds([])}
                                        disabled={!pendingSelectedCount}
                                    >
                                        清空选择
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-[color:var(--card-border)]"
                                        onClick={() => pendingAssetsQuery.refetch()}
                                        disabled={pendingAssetsQuery.isFetching}
                                    >
                                        刷新队列
                                    </Button>
                                    <span className="text-[color:var(--ink-soft)]">当前页已选 {pendingSelectedCount} 张</span>
                                </div>

                                {pendingAssetsQuery.isLoading && (
                                    <div className="rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-6 text-center text-sm text-[color:var(--ink-soft)]">
                                        正在加载待分配队列...
                                    </div>
                                )}

                                {pendingAssetsQuery.isError && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                                        {extractErrorMessage(pendingAssetsQuery.error)}
                                    </div>
                                )}

                                {!pendingAssetsQuery.isLoading && !pendingAssetsQuery.isError && !pendingPhotos.length && (
                                    <div className="rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-6 text-center text-sm text-[color:var(--ink-soft)]">
                                        {pendingScope === 'ALL'
                                            ? '暂无图片，先上传一批素材。'
                                            : pendingScope === 'PENDING'
                                                ? '暂无待分配图片，先上传或切换到“已绑定”。'
                                                : '暂无已绑定图片，先在步骤 3 绑定地址。'}
                                    </div>
                                )}

                                {!pendingAssetsQuery.isError && !!pendingPhotos.length && (
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        {pendingPhotos.map((photo) => (
                                            <div
                                                key={photo.photoId}
                                                className={`rounded-xl border bg-[color:var(--paper)] ${
                                                    selectedPendingSet.has(photo.photoId)
                                                        ? 'border-[color:var(--accent)]/40'
                                                        : 'border-[color:var(--card-border)]'
                                                }`}
                                            >
                                                <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl bg-slate-100">
                                                    {photo.url ? (
                                                        <img
                                                            src={toMediaUrl(photo.url)}
                                                            alt={`pending-${photo.photoId}`}
                                                            loading="lazy"
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center text-xs text-[color:var(--ink-soft)]">
                                                            无预览
                                                        </div>
                                                    )}
                                                    <label className="absolute left-2 top-2 flex items-center gap-1 rounded bg-white/90 px-2 py-1 text-xs">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedPendingSet.has(photo.photoId)}
                                                            onChange={() => togglePendingPhoto(photo.photoId)}
                                                        />
                                                        选择
                                                    </label>
                                                    <button
                                                        type="button"
                                                        className="absolute right-2 top-2 rounded bg-white/90 px-2 py-1 text-xs text-red-600 hover:bg-white"
                                                        onClick={() => removePendingPhoto.mutate(photo.photoId)}
                                                        disabled={removePendingPhoto.isPending}
                                                    >
                                                        删除
                                                    </button>
                                                    <div className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-xs">
                                                        {photo.bound ? '已绑定' : '未绑定'}
                                                    </div>
                                                </div>
                                                <div className="space-y-1 px-3 py-2 text-xs text-[color:var(--ink-muted)]">
                                                    <div>拍摄日期：{photo.shotAt || '未知'}</div>
                                                    <div>上传时间：{formatDateTime(photo.uploadedAt)}</div>
                                                    <div className="truncate">地址：{photo.fullAddress || '未绑定地址'}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                    <div className="text-[color:var(--ink-soft)]">
                                        共 {pendingTotal} 张，当前第 {pendingTotal === 0 ? 0 : pendingPage + 1} / {Math.max(pendingTotalPages, 1)} 页
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="border-[color:var(--card-border)]"
                                            onClick={() => setPendingPage((prev) => Math.max(prev - 1, 0))}
                                            disabled={pendingPage <= 0}
                                        >
                                            上一页
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="border-[color:var(--card-border)]"
                                            onClick={() =>
                                                setPendingPage((prev) => {
                                                    const last = Math.max((pendingAssetsPage?.totalPages || 1) - 1, 0)
                                                    return Math.min(prev + 1, last)
                                                })
                                            }
                                            disabled={pendingPage >= Math.max((pendingAssetsPage?.totalPages || 1) - 1, 0)}
                                        >
                                            下一页
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)]">
                            <CardHeader>
                                <CardTitle>步骤 3：绑定标准地址</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-4 gap-2">
                                    <Button
                                        variant={addressTab === 'country' ? 'default' : 'outline'}
                                        className={
                                            addressTab === 'country'
                                                ? 'bg-[color:var(--accent)] text-white hover:bg-[#92400e]'
                                                : 'border-[color:var(--card-border)]'
                                        }
                                        onClick={() => setAddressTab('country')}
                                    >
                                        国家
                                    </Button>
                                    <Button
                                        variant={addressTab === 'province' ? 'default' : 'outline'}
                                        className={
                                            addressTab === 'province'
                                                ? 'bg-[color:var(--accent)] text-white hover:bg-[#92400e]'
                                                : 'border-[color:var(--card-border)]'
                                        }
                                        onClick={() => setAddressTab('province')}
                                    >
                                        省份
                                    </Button>
                                    <Button
                                        variant={addressTab === 'city' ? 'default' : 'outline'}
                                        className={
                                            addressTab === 'city'
                                                ? 'bg-[color:var(--accent)] text-white hover:bg-[#92400e]'
                                                : 'border-[color:var(--card-border)]'
                                        }
                                        onClick={() => setAddressTab('city')}
                                    >
                                        城市
                                    </Button>
                                    <Button
                                        variant={addressTab === 'detail' ? 'default' : 'outline'}
                                        className={
                                            addressTab === 'detail'
                                                ? 'bg-[color:var(--accent)] text-white hover:bg-[#92400e]'
                                                : 'border-[color:var(--card-border)]'
                                        }
                                        onClick={() => setAddressTab('detail')}
                                    >
                                        详细地址
                                    </Button>
                                </div>

                                {addressTab === 'country' && (
                                    <div className="space-y-2">
                                        <label className="space-y-1">
                                            <div className="text-xs font-medium text-[color:var(--ink-muted)]">国家（V1）</div>
                                            <select
                                                value={bindCountry}
                                                onChange={(event) => setBindCountry(event.target.value)}
                                                className="min-h-10 w-full rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2 text-sm"
                                            >
                                                <option value={CHINA_COUNTRY}>{CHINA_COUNTRY}</option>
                                            </select>
                                        </label>
                                        <div className="rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2 text-xs text-[color:var(--ink-soft)]">
                                            一期固定中国，已预留全球扩展结构。
                                        </div>
                                    </div>
                                )}

                                {addressTab === 'province' && (
                                    <div className="space-y-2">
                                        <label className="space-y-1">
                                            <div className="text-xs font-medium text-[color:var(--ink-muted)]">省份</div>
                                            <select
                                                value={bindProvince}
                                                onChange={(event) => setBindProvince(event.target.value)}
                                                className="min-h-10 w-full rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2 text-sm"
                                            >
                                                <option value="">请选择省份</option>
                                                {provinceOptions.map((province) => (
                                                    <option key={province} value={province}>
                                                        {province}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                )}

                                {addressTab === 'city' && (
                                    <div className="space-y-2">
                                        <label className="space-y-1">
                                            <div className="text-xs font-medium text-[color:var(--ink-muted)]">城市</div>
                                            <select
                                                value={bindCity}
                                                onChange={(event) => setBindCity(event.target.value)}
                                                className="min-h-10 w-full rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2 text-sm"
                                                disabled={!bindProvince}
                                            >
                                                <option value="">{bindProvince ? '请选择城市' : '请先选择省份'}</option>
                                                {cityOptions.map((city) => (
                                                    <option key={city} value={city}>
                                                        {city}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                )}

                                {addressTab === 'detail' && (
                                    <label className="space-y-1">
                                        <div className="text-xs font-medium text-[color:var(--ink-muted)]">详细地址（可选）</div>
                                        <Input
                                            value={bindAddressDetail}
                                            onChange={(event) => setBindAddressDetail(event.target.value)}
                                            placeholder="例如：武侯区人民南路四段"
                                            className="border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                        />
                                    </label>
                                )}

                                <div className="rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2 text-xs text-[color:var(--ink-soft)]">
                                    当前地址：{[bindCountry, bindProvince, bindCity, bindAddressDetail.trim()].filter(Boolean).join(' · ') || '--'}
                                </div>

                                <div className="rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2 text-xs text-[color:var(--ink-soft)]">
                                    当前已选图片：{pendingSelectedCount} 张（支持待分配与已绑定重绑）。
                                </div>

                                <Button
                                    onClick={bindSelectedPendingAssets}
                                    className="w-full bg-[color:var(--accent)] text-white hover:bg-[#92400e]"
                                    disabled={bindActionDisabled}
                                >
                                    {isBindingPending ? '绑定中...' : '批量绑定地址'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)]">
                        <CardHeader>
                            <CardTitle>步骤 4：地址桶归档到旅程</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                                <select
                                    value={archiveJourneyId ?? ''}
                                    onChange={(event) => setArchiveJourneyId(event.target.value ? Number(event.target.value) : null)}
                                    className="min-h-10 rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2 text-sm"
                                >
                                    <option value="">选择归档旅程</option>
                                    {(journeys.data || []).map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.title}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    onClick={archiveSelectedLocations}
                                    className="bg-[color:var(--accent)] text-white hover:bg-[#92400e]"
                                    disabled={!archiveJourneyId || !selectedAssetLocationCount || linkLocationsBatch.isPending}
                                >
                                    {linkLocationsBatch.isPending ? '归档中...' : `一键归档 ${selectedAssetLocationCount} 个地址桶`}
                                </Button>
                            </div>

                            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                                <div className="rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2 text-sm text-[color:var(--ink-muted)]">
                                    已归档地址桶：{archivedLocations.length} 个，已选中：{selectedArchivedLocationCount} 个
                                </div>
                                <Button
                                    variant="outline"
                                    className="border-[color:var(--card-border)]"
                                    onClick={takeOutSelectedLocations}
                                    disabled={!archiveJourneyId || !selectedArchivedLocationCount || isUnlinkingLocations}
                                >
                                    {isUnlinkingLocations ? '取出中...' : `一键取出 ${selectedArchivedLocationCount} 个`}
                                </Button>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="space-y-2">
                                    {assetsList.map((asset) => (
                                        <div
                                            key={asset.locationId}
                                            draggable
                                            onDragStart={() => setDragLocationId(asset.locationId)}
                                            onDragEnd={() => setDragLocationId(null)}
                                            className="cursor-grab rounded-xl border border-dashed border-[color:var(--card-border)] bg-[color:var(--paper)] p-3"
                                        >
                                            <label className="flex items-start gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAssetLocationSet.has(asset.locationId)}
                                                    onChange={() => toggleAssetLocation(asset.locationId)}
                                                    className="mt-1"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate font-medium">{asset.fullAddress || `${asset.province} · ${asset.city}`}</div>
                                                    <div className="text-xs text-[color:var(--ink-soft)]">{asset.photoCount || 0} 张照片</div>
                                                </div>
                                            </label>
                                        </div>
                                    ))}
                                    {!assetsList.length && (
                                        <div className="text-sm text-[color:var(--ink-soft)]">暂无未归档地址桶</div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {(journeys.data || []).map((item) => (
                                        <div
                                            key={item.id}
                                            onDragOver={(event) => event.preventDefault()}
                                            onDrop={() => {
                                                if (!dragLocationId) return
                                                linkLocation.mutate({ jid: item.id, lid: dragLocationId })
                                                setDragLocationId(null)
                                            }}
                                            className="rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper)] p-3"
                                        >
                                            <div className="font-medium">{item.title}</div>
                                            <div className="text-xs text-[color:var(--ink-soft)]">可拖拽单个地址桶到此旅程</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2 rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper)] p-3">
                                <div className="text-sm font-medium text-[color:var(--ink)]">当前旅程已归档地址桶（可取出）</div>
                                {!archiveJourneyId && (
                                    <div className="text-xs text-[color:var(--ink-soft)]">请选择一个旅程后查看归档地址桶。</div>
                                )}
                                {archiveJourneyId && archiveJourneyDetailQuery.isLoading && (
                                    <div className="text-xs text-[color:var(--ink-soft)]">正在加载归档地址桶...</div>
                                )}
                                {archiveJourneyId && !archiveJourneyDetailQuery.isLoading && !archivedLocations.length && (
                                    <div className="text-xs text-[color:var(--ink-soft)]">该旅程暂无已归档地址桶。</div>
                                )}
                                {!!archivedLocations.length && (
                                    <div className="grid gap-2 lg:grid-cols-2">
                                        {archivedLocations.map((location) => (
                                            <div
                                                key={location.id}
                                                className="rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-3"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <label className="flex items-start gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedArchivedLocationSet.has(location.id)}
                                                            onChange={() => toggleArchivedLocation(location.id)}
                                                            className="mt-1"
                                                        />
                                                        <div>
                                                            <div className="text-sm font-medium">{location.province} · {location.city}</div>
                                                            <div className="text-xs text-[color:var(--ink-soft)]">{location.photoCount || 0} 张照片</div>
                                                        </div>
                                                    </label>
                                                    <Button
                                                        variant="outline"
                                                        className="h-8 border-[color:var(--card-border)] px-2 text-xs"
                                                        onClick={() => {
                                                            if (!archiveJourneyId) return
                                                            unlinkLocation.mutate({ jid: archiveJourneyId, lid: location.id })
                                                        }}
                                                        disabled={isUnlinkingLocations}
                                                    >
                                                        取出
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-lg border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2 text-xs text-[color:var(--ink-soft)]">
                                支持两种方式：拖拽单桶归档，或勾选多个地址桶后“一键归档”；归档后可在下方单个或批量取出。
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
