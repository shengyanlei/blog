import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
import type { LocationData } from '../../../types/api'
import { Button } from '@repo/ui/components/ui/button'

const ADCODE_MAP: Record<string, number> = {
    北京: 110000,
    北京市: 110000,
    天津: 120000,
    天津市: 120000,
    河北: 130000,
    河北省: 130000,
    山西: 140000,
    山西省: 140000,
    内蒙古: 150000,
    内蒙古自治区: 150000,
    辽宁: 210000,
    辽宁省: 210000,
    吉林: 220000,
    吉林省: 220000,
    黑龙江: 230000,
    黑龙江省: 230000,
    上海: 310000,
    上海市: 310000,
    江苏: 320000,
    江苏省: 320000,
    浙江: 330000,
    浙江省: 330000,
    安徽: 340000,
    安徽省: 340000,
    福建: 350000,
    福建省: 350000,
    江西: 360000,
    江西省: 360000,
    山东: 370000,
    山东省: 370000,
    河南: 410000,
    河南省: 410000,
    湖北: 420000,
    湖北省: 420000,
    湖南: 430000,
    湖南省: 430000,
    广东: 440000,
    广东省: 440000,
    广西: 450000,
    广西壮族自治区: 450000,
    海南: 460000,
    海南省: 460000,
    重庆: 500000,
    重庆市: 500000,
    四川: 510000,
    四川省: 510000,
    贵州: 520000,
    贵州省: 520000,
    云南: 530000,
    云南省: 530000,
    西藏: 540000,
    西藏自治区: 540000,
    陕西: 610000,
    陕西省: 610000,
    甘肃: 620000,
    甘肃省: 620000,
    青海: 630000,
    青海省: 630000,
    宁夏: 640000,
    宁夏回族自治区: 640000,
    新疆: 650000,
    新疆维吾尔自治区: 650000,
    台湾: 710000,
    台湾省: 710000,
    香港: 810000,
    香港特别行政区: 810000,
    澳门: 820000,
    澳门特别行政区: 820000,
}

interface ProvinceMapProps {
    provinceName: string
    data: LocationData[]
    onCitySelect: (city: string) => void
    onBack: () => void
}

const normalizeProvince = (name: string) =>
    name.replace(/省|市|特别行政区|壮族自治区|回族自治区|维吾尔自治区|自治区/g, '')

const normalizeCity = (name: string | undefined) =>
    (name || '').replace(/市|地区|盟|州|区|县|自治州|自治县|自治旗/g, '')

export default function ProvinceMap({ provinceName, data, onCitySelect, onBack }: ProvinceMapProps) {
    const [geoJson, setGeoJson] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const normalized = normalizeProvince(provinceName)
        const adcode = ADCODE_MAP[provinceName] ?? ADCODE_MAP[normalized]

        if (!adcode) {
            console.error('未找到对应的行政区编码', provinceName)
            setLoading(false)
            return
        }

        setLoading(true)
        fetch(`https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`)
            .then((res) => res.json())
            .then((resData) => {
                echarts.registerMap(provinceName, resData)
                setGeoJson(resData)
                setLoading(false)
            })
            .catch((err) => {
                console.error('加载省级地图失败', err)
                setLoading(false)
            })
    }, [provinceName])

    const COLORS = ['#c79b6a', '#b88a62', '#9b7b5b', '#8fa89c', '#b9a374', '#a07a6a', '#7f958f', '#d0b79a', '#8d7a66', '#bca892']

    const getOption = () => {
        if (!geoJson) return {}

        const seriesData = geoJson.features.map((f: any, index: number) => {
            const featureName = f.properties.name as string
            const cleanFeatureName = normalizeCity(featureName)
            const cityData = data.find((d) => {
                const cleanCity = normalizeCity(d.city)
                return cleanFeatureName === cleanCity || featureName.includes(d.city || '') || cleanCity.includes(cleanFeatureName)
            })

            const visitCount = cityData ? cityData.visitCount : 0
            const photoCount = cityData ? cityData.photoCount : 0
            const isVisited = visitCount > 0
            const baseColor = COLORS[index % COLORS.length]

            return {
                name: featureName,
                value: visitCount,
                photoCount,
                ...f.properties,
                itemStyle: {
                    areaColor: isVisited ? baseColor : `${baseColor}20`,
                    borderColor: '#f6f1e7',
                    borderWidth: 1,
                },
            }
        })

        return {
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    const { name, value, data: extra } = params
                    if (value > 0) {
                        return `
                        <div class="px-2 py-1">
                            <div style="color: ${params.color}; font-weight: 600; margin-bottom: 4px;">${name}</div>
                            <div class="text-xs text-ink-muted">到访：${value} 次</div>
                            <div class="text-xs text-ink-muted">照片：${extra.photoCount || 0} 张</div>
                        </div>
                        `
                    }
                    return `<div class="px-2 py-1 text-ink-muted">${name}（未到访）</div>`
                },
                backgroundColor: 'rgba(251, 248, 242, 0.96)',
                borderColor: '#e3d8c8',
                textStyle: { color: '#1f2933' },
                extraCssText: 'box-shadow: 0 8px 20px -12px rgba(31,41,55,0.35); border-radius: 10px;',
            },
            visualMap: { show: false },
            series: [
                {
                    type: 'map',
                    map: provinceName,
                    roam: true,
                    layoutCenter: ['50%', '50%'],
                    layoutSize: '80%',
                    scaleLimit: { min: 0.6, max: 6 },
                    label: {
                        show: true,
                        color: '#8a8076',
                        fontSize: 10,
                        formatter: (params: any) => params.name,
                    },
                    emphasis: {
                        label: { show: true, color: '#1f2933', fontSize: 12, fontWeight: 'bold' },
                        itemStyle: {
                            areaColor: '#f1d3a2',
                            shadowBlur: 10,
                            shadowColor: 'rgba(31, 41, 55, 0.2)',
                        },
                    },
                    itemStyle: { borderColor: '#f6f1e7', borderWidth: 1 },
                    select: { disabled: true },
                    data: seriesData,
                },
            ],
        }
    }

    const onEvents = {
        click: (params: any) => {
            if (params.name) {
                const cleanName = normalizeCity(params.name)
                onCitySelect(cleanName)
            }
        },
    }

    if (loading) {
        return <div className="flex items-center justify-center h-full text-ink-soft">正在加载 {provinceName} 地图...</div>
    }

    if (!geoJson) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="text-ink-soft">无法加载地图数据</div>
                <Button onClick={onBack} variant="outline">
                    返回全国
                </Button>
            </div>
        )
    }

    return (
        <div className="h-full w-full">
            <ReactECharts option={getOption()} style={{ height: '100%', width: '100%' }} onEvents={onEvents} />
        </div>
    )
}

