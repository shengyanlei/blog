import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Map, ListFilter, Plus } from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import ChinaMap from '../../components/public/footprint/ChinaMap'
import ProvinceMap from '../../components/public/footprint/ProvinceMap'
import CityDetail from '../../components/public/footprint/CityDetail'
import { VisitedStats } from '../../components/public/footprint/VisitedStats'
import { api, unwrapResponse } from '../../lib/api'
import { useAuthStore } from '../../store/useAuthStore'

const STATIC_PROVINCES = [
    '北京市',
    '天津市',
    '上海市',
    '重庆市',
    '河北省',
    '山西省',
    '辽宁省',
    '吉林省',
    '黑龙江省',
    '江苏省',
    '浙江省',
    '安徽省',
    '福建省',
    '江西省',
    '山东省',
    '河南省',
    '湖北省',
    '湖南省',
    '广东省',
    '广西壮族自治区',
    '海南省',
    '四川省',
    '贵州省',
    '云南省',
    '西藏自治区',
    '陕西省',
    '甘肃省',
    '青海省',
    '宁夏回族自治区',
    '新疆维吾尔自治区',
    '内蒙古自治区',
    '香港特别行政区',
    '澳门特别行政区',
    '台湾省',
]

const STATIC_CITIES: Record<string, string[]> = {
    北京市: ['北京市'],
    天津市: ['天津市'],
    上海市: ['上海市'],
    重庆市: ['重庆市'],
    河北省: ['石家庄', '唐山', '秦皇岛', '邯郸', '邢台', '保定', '张家口', '承德', '沧州', '廊坊', '衡水'],
    山西省: ['太原', '大同', '阳泉', '长治', '晋城', '朔州', '晋中', '运城', '忻州', '临汾', '吕梁'],
    辽宁省: ['沈阳', '大连', '鞍山', '抚顺', '本溪', '丹东', '锦州', '营口', '阜新', '辽阳', '盘锦', '铁岭', '朝阳', '葫芦岛'],
    吉林省: ['长春', '吉林', '四平', '辽源', '通化', '白山', '松原', '白城', '延边朝鲜族自治州'],
    黑龙江省: ['哈尔滨', '齐齐哈尔', '牡丹江', '佳木斯', '大庆', '伊春', '鸡西', '鹤岗', '双鸭山', '七台河', '黑河', '绥化', '大兴安岭地区'],
    江苏省: ['南京', '苏州', '无锡', '常州', '镇江', '南通', '泰州', '扬州', '盐城', '连云港', '淮安', '宿迁'],
    浙江省: ['杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水'],
    安徽省: ['合肥', '芜湖', '蚌埠', '淮南', '马鞍山', '淮北', '铜陵', '安庆', '黄山', '滁州', '阜阳', '宿州', '六安', '亳州', '池州', '宣城'],
    福建省: ['福州', '厦门', '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德'],
    江西省: ['南昌', '景德镇', '萍乡', '九江', '新余', '鹰潭', '赣州', '吉安', '宜春', '抚州', '上饶'],
    山东省: ['济南', '青岛', '淄博', '枣庄', '东营', '烟台', '潍坊', '济宁', '泰安', '威海', '日照', '临沂', '德州', '聊城', '滨州', '菏泽'],
    河南省: ['郑州', '开封', '洛阳', '平顶山', '安阳', '鹤壁', '新乡', '焦作', '濮阳', '许昌', '漯河', '三门峡', '南阳', '商丘', '信阳', '周口', '驻马店', '济源'],
    湖北省: ['武汉', '黄石', '十堰', '宜昌', '襄阳', '鄂州', '荆门', '孝感', '荆州', '黄冈', '咸宁', '随州', '恩施土家族苗族自治州', '仙桃', '潜江', '天门', '神农架林区'],
    湖南省: ['长沙', '株洲', '湘潭', '衡阳', '邵阳', '岳阳', '常德', '张家界', '益阳', '郴州', '永州', '怀化', '娄底', '湘西土家族苗族自治州'],
    广东省: ['广州', '深圳', '珠海', '汕头', '佛山', '韶关', '湛江', '肇庆', '江门', '茂名', '惠州', '梅州', '汕尾', '河源', '阳江', '清远', '东莞', '中山', '潮州', '揭阳', '云浮'],
    广西壮族自治区: ['南宁', '柳州', '桂林', '梧州', '北海', '防城港', '钦州', '贵港', '玉林', '百色', '贺州', '河池', '来宾', '崇左'],
    海南省: ['海口', '三亚', '三沙', '儋州', '文昌', '万宁', '东方', '五指山', '定安县', '屯昌县', '澄迈县', '临高县', '琼海', '琼中黎族苗族自治县', '保亭黎族苗族自治县', '白沙黎族自治县', '昌江黎族自治县', '乐东黎族自治县', '陵水黎族自治县'],
    四川省: ['成都', '自贡', '攀枝花', '泸州', '德阳', '绵阳', '广元', '遂宁', '内江', '乐山', '南充', '眉山', '宜宾', '广安', '达州', '雅安', '巴中', '资阳', '阿坝藏族羌族自治州', '甘孜藏族自治州', '凉山彝族自治州'],
    贵州省: ['贵阳', '六盘水', '遵义', '安顺', '毕节', '铜仁', '黔西南布依族苗族自治州', '黔东南苗族侗族自治州', '黔南布依族苗族自治州'],
    云南省: ['昆明', '曲靖', '玉溪', '保山', '昭通', '丽江', '普洱', '临沧', '楚雄彝族自治州', '红河哈尼族彝族自治州', '文山壮族苗族自治州', '西双版纳傣族自治州', '大理白族自治州', '德宏傣族景颇族自治州', '怒江傈僳族自治州', '迪庆藏族自治州'],
    西藏自治区: ['拉萨', '日喀则', '昌都', '林芝', '山南', '那曲', '阿里地区'],
    陕西省: ['西安', '铜川', '宝鸡', '咸阳', '渭南', '延安', '汉中', '榆林', '安康', '商洛'],
    甘肃省: ['兰州', '嘉峪关', '金昌', '白银', '天水', '武威', '张掖', '平凉', '酒泉', '庆阳', '定西', '陇南', '临夏回族自治州', '甘南藏族自治州'],
    青海省: ['西宁', '海东', '海北藏族自治州', '黄南藏族自治州', '海南藏族自治州', '果洛藏族自治州', '玉树藏族自治州', '海西蒙古族藏族自治州'],
    宁夏回族自治区: ['银川', '石嘴山', '吴忠', '固原', '中卫'],
    新疆维吾尔自治区: [
        '乌鲁木齐',
        '克拉玛依',
        '吐鲁番',
        '哈密',
        '昌吉回族自治州',
        '博尔塔拉蒙古自治州',
        '巴音郭楞蒙古自治州',
        '阿克苏',
        '克孜勒苏柯尔克孜自治州',
        '喀什',
        '和田',
        '伊犁哈萨克自治州',
        '塔城',
        '阿勒泰',
    ],
    内蒙古自治区: ['呼和浩特', '包头', '乌海', '赤峰', '通辽', '鄂尔多斯', '呼伦贝尔', '巴彦淖尔', '乌兰察布', '兴安盟', '锡林郭勒盟', '阿拉善盟'],
    香港特别行政区: ['香港特别行政区'],
    澳门特别行政区: ['澳门特别行政区'],
    台湾省: ['台北', '新北', '桃园', '台中', '台南', '高雄', '基隆', '新竹', '嘉义', '宜兰', '彰化', '南投', '云林', '屏东', '台东', '花莲', '澎湖'],
}

const normalizeProvinceKey = (province?: string) => {
    if (!province) return ''
    const p = province.trim()
    if (STATIC_CITIES[p]) return p
    const candidates = [
        `${p}省`,
        `${p}市`,
        `${p}自治区`,
        `${p}特别行政区`,
    ]
    const hit = candidates.find((k) => STATIC_CITIES[k])
    return hit || p
}

export type ViewLevel = 'china' | 'province' | 'city'

export interface FootprintPhoto {
    id?: number
    url: string
    shotAt?: string
    trip?: string
    note?: string
    tags?: string
    cover?: boolean
}

export interface LocationData {
    id?: number
    province: string
    city?: string
    visitedCities?: number
    visitedCitiesWithPhotos?: number
    visitCount: number
    photoCount: number
    lastVisited?: string
    tags?: string
    coverUrl?: string
    photos?: FootprintPhoto[]
}

export default function FootprintPage() {
    const [viewLevel, setViewLevel] = useState<ViewLevel>('china')
    const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
    const [selectedCity, setSelectedCity] = useState<string | null>(null)
    const [showAdd, setShowAdd] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [draft, setDraft] = useState<{ province: string; city: string; visitCount: number; tags: string; photoUrl: string }>({
        province: '',
        city: '',
        visitCount: 1,
        tags: '',
        photoUrl: '',
    })
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [showProvinceDropdown, setShowProvinceDropdown] = useState(false)
    const [showCityDropdown, setShowCityDropdown] = useState(false)
    const [provinceActiveIndex, setProvinceActiveIndex] = useState(0)
    const [cityActiveIndex, setCityActiveIndex] = useState(0)
    const token = useAuthStore((state) => state.token)

    const ensureAuth = () => {
        if (!token) {
            setErrorMsg('需要登录后台后才能新增或上传足迹，请点击右上角“后台管理”先登录。')
            return false
        }
        return true
    }

    const provincesQuery = useQuery({
        queryKey: ['footprints', 'provinces'],
        queryFn: async () => unwrapResponse((await api.get('/footprints/provinces')).data),
    })
    const queryClient = useQueryClient()
    const provinceCitiesQuery = useQuery({
        queryKey: ['footprints', 'cities', selectedProvince],
        enabled: viewLevel === 'province' && !!selectedProvince,
        queryFn: async () =>
            unwrapResponse(
                (await api.get(`/footprints/provinces/${encodeURIComponent(selectedProvince || '')}/cities`)).data
            ),
    })
    const cityOptionsQuery = useQuery({
        queryKey: ['footprints', 'cities', 'draft', draft.province],
        enabled: !!draft.province,
        queryFn: async () =>
            unwrapResponse(
                (await api.get(`/footprints/provinces/${encodeURIComponent(draft.province || '')}/cities`)).data
            ),
    })
    const cityDetailQuery = useQuery({
        queryKey: ['footprints', 'city', selectedCity],
        enabled: viewLevel === 'city' && !!selectedCity && !!selectedProvince,
        queryFn: async () => {
            const id = provinceCitiesQuery.data?.find((c: any) => c.city === selectedCity)?.id
            if (!id) return null
            return unwrapResponse((await api.get(`/footprints/cities/${id}`)).data)
        },
    })

    const createMutation = useMutation({
        mutationFn: async () => {
            if (!token) {
                throw new Error('未登录或权限不足')
            }
            const dynamicCities = (cityOptionsQuery.data || []).map((c: any) => c.city).filter(Boolean)
            const provinceKey = normalizeProvinceKey(draft.province)
            const allowedCities = new Set([...(STATIC_CITIES[provinceKey] || []), ...dynamicCities])
            if (!draft.city || !allowedCities.has(draft.city)) {
                throw new Error('请选择当前省份下的城市')
            }
            let coverUrl = draft.photoUrl
            if (photoFile) {
                const formData = new FormData()
                formData.append('file', photoFile)
                const uploadRes = unwrapResponse(
                    (
                        await api.post('/footprints/upload', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                        })
                    ).data
                ) as { url: string }
                coverUrl = uploadRes.url
            }
            return unwrapResponse(
                (
                    await api.post('/footprints', {
                        province: draft.province,
                        city: draft.city,
                        visitCount: draft.visitCount,
                        tags: draft.tags,
                        photos: coverUrl ? [{ url: coverUrl, cover: true }] : [],
                    })
                ).data
            )
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['footprints'] })
            setShowAdd(false)
            setDraft({ province: '', city: '', visitCount: 1, tags: '', photoUrl: '' })
            setPhotoFile(null)
            setErrorMsg(null)
        },
        onError: (err: any) => {
            if (err?.response?.status === 401 || err?.response?.status === 403 || err?.message === '未登录或权限不足') {
                setErrorMsg('未登录或权限不足，请先登录后台后再保存。')
                return
            }
            const message = err?.response?.data?.message || err?.message || '保存失败，请稍后重试'
            setErrorMsg(message)
        },
    })

    const handleProvinceSelect = (provinceName: string) => {
        setSelectedProvince(provinceName)
        setSelectedCity(null)
        setViewLevel('province')
    }

    const provinceOptions = Array.from(
        new Set([...(provincesQuery.data || []).map((p: any) => p.province), ...STATIC_PROVINCES])
    ).filter(Boolean)
    const cityOptions = (cityOptionsQuery.data || []).map((c: any) => c.city).filter(Boolean)
    const provinceKey = normalizeProvinceKey(draft.province)
    const mergedCityOptions = Array.from(new Set([...(STATIC_CITIES[provinceKey] || []), ...cityOptions])).filter(Boolean)
    const filteredProvinces = provinceOptions.filter((p) =>
        p.toLowerCase().includes((draft.province || '').toLowerCase())
    )
    const filteredCities = mergedCityOptions.filter((c: string) =>
        c.toLowerCase().includes((draft.city || '').toLowerCase())
    )

    useEffect(() => {
        setProvinceActiveIndex(0)
    }, [draft.province])

    useEffect(() => {
        setCityActiveIndex(0)
    }, [draft.city, draft.province])

    const handleCitySelect = (cityName: string) => {
        setSelectedCity(cityName)
        setViewLevel('city')
    }

    const handleBack = () => {
        if (viewLevel === 'city') {
            setViewLevel('province')
            setSelectedCity(null)
        } else if (viewLevel === 'province') {
            setViewLevel('china')
            setSelectedProvince(null)
        }
    }

    const handleBackToNational = () => {
        setViewLevel('china')
        setSelectedProvince(null)
        setSelectedCity(null)
    }

    return (
        <div className="min-h-screen bg-slate-50 pt-16 pb-20">
            {/* Header / Top Bar */}
            <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-sm">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Map className="h-5 w-5 text-indigo-500" />
                        <h1 className="text-lg font-bold text-slate-800">我的足迹</h1>

                        {/* Breadcrumbs */}
                        {viewLevel !== 'china' && (
                            <div className="flex items-center gap-2 text-sm text-slate-500 ml-4 pl-4 border-l border-slate-300">
                                <button onClick={handleBackToNational} className="hover:text-indigo-600 transition-colors">
                                    全国
                                </button>
                                <span>&gt;</span>
                                <button
                                    onClick={() => viewLevel === 'city' && handleBack()}
                                    className={`${viewLevel === 'city' ? 'hover:text-indigo-600 transition-colors' : 'font-medium text-slate-800'}`}
                                >
                                    {selectedProvince}
                                </button>
                                {viewLevel === 'city' && (
                                    <>
                                        <span>&gt;</span>
                                        <span className="font-medium text-slate-800">{selectedCity}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="gap-1 text-slate-600">
                            <ListFilter className="h-4 w-4" />
                            <span className="hidden sm:inline">统计/筛选</span>
                        </Button>
                        <Button
                            size="sm"
                            className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                            onClick={() => {
                                setErrorMsg(null)
                                if (!ensureAuth()) return
                                setShowAdd(true)
                            }}
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">添加足迹</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="container mx-auto px-4 py-6 relative min-h-[600px]">
                <AnimatePresence mode="wait">
                    {viewLevel === 'china' && (
                        <motion.div
                            key="china"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.3 }}
                        >
                            <VisitedStats data={provincesQuery.data || []} />
                            <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-100 h-[85vh] min-h-[600px] relative overflow-hidden">
                                <ChinaMap
                                    data={(provincesQuery.data || []).map((p: any) => ({
                                        province: p.province,
                                        visitCount: p.visitCount,
                                        photoCount: p.photoCount,
                                        visitedCities: p.visitedCities,
                                        lastVisited: p.lastVisited,
                                    }))}
                                    onProvinceSelect={handleProvinceSelect}
                                />
                                {(provincesQuery.data || []).length === 0 && (
                                    <div className="absolute bottom-10 left-0 right-0 text-center text-slate-400">
                                        还没有足迹，点右上角添加第一条旅行记录?                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {viewLevel === 'province' && selectedProvince && (
                        <motion.div
                            key="province"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-[82vh] min-h-[600px] overflow-hidden">
                                <ProvinceMap
                                    provinceName={selectedProvince}
                                    data={provinceCitiesQuery.data || []}
                                    onCitySelect={handleCitySelect}
                                    onBack={handleBackToNational}
                                />
                            </div>
                        </motion.div>
                    )}

                    {viewLevel === 'city' && selectedCity && (
                        <motion.div
                            key="city"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <CityDetail
                                provinceName={selectedProvince!}
                                cityName={selectedCity}
                                data={cityDetailQuery.data}
                                onBack={handleBack}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {showAdd && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
                    >
                        <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-800">添加足迹</h3>
                                <button className="text-slate-500 hover:text-slate-700" onClick={() => setShowAdd(false)}>
                                    ×
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="text-sm text-slate-600 space-y-1 relative">
                                    <span>省份</span>
                                    <input
                                        className="w-full rounded border border-slate-200 px-2 py-1"
                                        value={draft.province}
                                        onFocus={() => setShowProvinceDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowProvinceDropdown(false), 150)}
                                        onChange={(e) => {
                                            setDraft({ ...draft, province: e.target.value, city: '' })
                                            setShowProvinceDropdown(true)
                                        }}
                                        onKeyDown={(e) => {
                                            if (!showProvinceDropdown) return
                                            if (e.key === 'ArrowDown') {
                                                e.preventDefault()
                                                setProvinceActiveIndex((prev) =>
                                                    Math.min(prev + 1, Math.max(filteredProvinces.length - 1, 0))
                                                )
                                            }
                                            if (e.key === 'ArrowUp') {
                                                e.preventDefault()
                                                setProvinceActiveIndex((prev) => Math.max(prev - 1, 0))
                                            }
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                const p = filteredProvinces[provinceActiveIndex]
                                                if (p) {
                                                    setDraft({ ...draft, province: p, city: '' })
                                                    setShowProvinceDropdown(false)
                                                }
                                            }
                                            if (e.key === 'Escape') {
                                                setShowProvinceDropdown(false)
                                            }
                                        }}
                                        placeholder="如：广东"
                                    />
                                    {showProvinceDropdown && provinceOptions.length > 0 && (
                                        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-scroll rounded-md border border-slate-200 bg-white shadow-md">
                                            {filteredProvinces.map((p, idx) => (
                                                <button
                                                    type="button"
                                                    key={p}
                                                    className={`w-full text-left px-3 py-2 text-sm ${
                                                        idx === provinceActiveIndex ? 'bg-slate-100' : 'hover:bg-slate-100'
                                                    }`}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onMouseEnter={() => setProvinceActiveIndex(idx)}
                                                    onClick={() => {
                                                        setDraft({ ...draft, province: p, city: '' })
                                                        setShowProvinceDropdown(false)
                                                    }}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </label>
                                <label className="text-sm text-slate-600 space-y-1 relative">
                                    <span>城市</span>
                                    <input
                                        className="w-full rounded border border-slate-200 px-2 py-1"
                                        value={draft.city}
                                        onFocus={() => draft.province && setShowCityDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowCityDropdown(false), 150)}
                                        onChange={(e) => {
                                            setDraft({ ...draft, city: e.target.value })
                                            if (draft.province) setShowCityDropdown(true)
                                        }}
                                        onKeyDown={(e) => {
                                            if (!showCityDropdown) return
                                            if (e.key === 'ArrowDown') {
                                                e.preventDefault()
                                                setCityActiveIndex((prev) =>
                                                    Math.min(prev + 1, Math.max(filteredCities.length - 1, 0))
                                                )
                                            }
                                            if (e.key === 'ArrowUp') {
                                                e.preventDefault()
                                                setCityActiveIndex((prev) => Math.max(prev - 1, 0))
                                            }
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                const c = filteredCities[cityActiveIndex]
                                                if (c) {
                                                    setDraft({ ...draft, city: c })
                                                    setShowCityDropdown(false)
                                                }
                                            }
                                            if (e.key === 'Escape') {
                                                setShowCityDropdown(false)
                                            }
                                        }}
                                        placeholder="如：深圳"
                                        disabled={!draft.province}
                                    />
                                    {showCityDropdown && draft.province && filteredCities.length > 0 && (
                                        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-scroll rounded-md border border-slate-200 bg-white shadow-md">
                                            {filteredCities.map((c, idx) => (
                                                <button
                                                    type="button"
                                                    key={c}
                                                    className={`w-full text-left px-3 py-2 text-sm ${
                                                        idx === cityActiveIndex ? 'bg-slate-100' : 'hover:bg-slate-100'
                                                    }`}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onMouseEnter={() => setCityActiveIndex(idx)}
                                                    onClick={() => {
                                                        setDraft({ ...draft, city: c })
                                                        setShowCityDropdown(false)
                                                    }}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </label>
                                <label className="text-sm text-slate-600 space-y-1">
                                    <span>到访次数</span>
                                    <input
                                        type="number"
                                        min={1}
                                        className="w-full rounded border border-slate-200 px-2 py-1"
                                        value={draft.visitCount}
                                        onChange={(e) => setDraft({ ...draft, visitCount: Number(e.target.value) || 1 })}
                                    />
                                </label>
                                <label className="text-sm text-slate-600 space-y-1">
                                    <span>标签（逗号分隔）</span>
                                    <input
                                        className="w-full rounded border border-slate-200 px-2 py-1"
                                        value={draft.tags}
                                        onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                                        placeholder="海边,美食"
                                    />
                                </label>
                                <label className="col-span-2 text-sm text-slate-600 space-y-1">
                                    <span>首张照片链接（可选）</span>
                                    <input
                                        className="w-full rounded border border-slate-200 px-2 py-1"
                                        value={draft.photoUrl}
                                        onChange={(e) => setDraft({ ...draft, photoUrl: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </label>
                                <label className="col-span-2 text-sm text-slate-600 space-y-1">
                                    <span>或上传首张照片（可选）</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="w-full rounded border border-slate-200 px-2 py-1 bg-white"
                                        onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                                    />
                                    {photoFile && <div className="text-xs text-slate-500">已选择：{photoFile.name}</div>}
                                </label>
                            </div>
                            {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}
                            <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" onClick={() => setShowAdd(false)}>
                                    取消
                                </Button>
                                <Button
                                    className="bg-indigo-600 text-white"
                                    onClick={() => {
                                        setErrorMsg(null)
                                        if (!ensureAuth()) return
                                        createMutation.mutate()
                                    }}
                                    disabled={!draft.province || !draft.city || createMutation.isLoading}
                                >
                                    {createMutation.isLoading ? '保存中...' : '保存'}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

