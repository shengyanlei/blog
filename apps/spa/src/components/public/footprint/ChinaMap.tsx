import { useEffect, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
import { LocationData } from '../../../pages/public/FootprintPage'

interface ChinaMapProps {
    data: LocationData[]
    onProvinceSelect: (province: string) => void
}

export default function ChinaMap({ data, onProvinceSelect }: ChinaMapProps) {
    const [geoJson, setGeoJson] = useState<any>(null)
    const chartRef = useRef<any>(null)

    useEffect(() => {
        fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
            .then((res) => res.json())
            .then((resData) => {
                echarts.registerMap('china', resData)
                setGeoJson(resData)
            })
            .catch((err) => console.error('Failed to load map data', err))
    }, [])

    const COLORS = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#2f4554']

    const getOption = () => {
        if (!geoJson) return {}

        const visitedMap = new Map<string, number>()
        data.forEach((d) => {
            const current = visitedMap.get(d.province) || 0
            visitedMap.set(d.province, current + d.visitCount)
        })

        const seriesData = geoJson.features.map((f: any, index: number) => {
            const name = f.properties.name
            const visitCount = visitedMap.get(name) || 0
            const isVisited = visitCount > 0
            const baseColor = COLORS[index % COLORS.length]

            return {
                name,
                value: visitCount,
                ...f.properties,
                itemStyle: {
                    areaColor: isVisited ? baseColor : `${baseColor}20`,
                    borderColor: '#fff',
                    borderWidth: 1,
                },
            }
        })

        return {
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    const { name, value } = params
                    const provinceData = data.filter((d) => d.province === name)
                    const totalPhotos = provinceData.reduce((acc, curr) => acc + (curr.photoCount || 0), 0)
                    const cities = new Set(provinceData.map((d) => d.city)).size

                    if (value > 0) {
                        return `
                        <div class="px-2 py-1">
                            <div class="font-bold mb-1" style="color: ${params.color}">${name}</div>
                            <div class="text-xs text-slate-600">打卡城市：${cities} 个</div>
                            <div class="text-xs text-slate-600">累计照片：${totalPhotos} 张</div>
                        </div>
                        `
                    }
                    return `<div class="px-2 py-1 text-slate-500">${name}（未到访）</div>`
                },
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#e2e8f0',
                textStyle: { color: '#334155' },
                extraCssText: 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-radius: 8px;',
            },
            visualMap: { show: false },
            series: [
                {
                    name: '中国',
                    type: 'map',
                    map: 'china',
                    roam: true,
                    layoutCenter: ['50%', '50%'],
                    layoutSize: '100%',
                    scaleLimit: { min: 0.8, max: 10 },
                    label: {
                        show: true,
                        color: '#64748b',
                        fontSize: 10,
                        formatter: (params: any) => params.name,
                    },
                    emphasis: {
                        label: { show: true, color: '#000', fontSize: 12, fontWeight: 'bold' },
                        itemStyle: {
                            areaColor: '#fbbf24',
                            shadowBlur: 10,
                            shadowColor: 'rgba(0, 0, 0, 0.2)',
                        },
                    },
                    itemStyle: { borderColor: '#fff', borderWidth: 1 },
                    select: { disabled: true },
                    data: seriesData,
                },
            ],
        }
    }

    const onEvents = {
        click: (params: any) => {
            if (params.name) {
                onProvinceSelect(params.name)
            }
        },
    }

    if (!geoJson) {
        return <div className="flex items-center justify-center h-full text-slate-400">正在加载地图数据...</div>
    }

    return <ReactECharts ref={chartRef} option={getOption()} style={{ height: '100%', width: '100%' }} onEvents={onEvents} />
}
