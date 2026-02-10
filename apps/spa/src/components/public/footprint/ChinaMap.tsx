import { useEffect, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
import type { LocationData } from '../../../types/api'

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

    const COLORS = ['#c79b6a', '#b88a62', '#9b7b5b', '#8fa89c', '#b9a374', '#a07a6a', '#7f958f', '#d0b79a', '#8d7a66', '#bca892']

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
                    borderColor: '#f6f1e7',
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
                            <div style="color: ${params.color}; font-weight: 600; margin-bottom: 4px;">${name}</div>
                            <div class="text-xs text-ink-muted">打卡城市：${cities} 个</div>
                            <div class="text-xs text-ink-muted">累计照片：${totalPhotos} 张</div>
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
                    name: '中国',
                    type: 'map',
                    map: 'china',
                    roam: true,
                    layoutCenter: ['50%', '50%'],
                    layoutSize: '100%',
                    scaleLimit: { min: 0.8, max: 10 },
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
                onProvinceSelect(params.name)
            }
        },
    }

    if (!geoJson) {
        return <div className="flex items-center justify-center h-full text-ink-soft">正在加载地图数据...</div>
    }

    return <ReactECharts ref={chartRef} option={getOption()} style={{ height: '100%', width: '100%' }} onEvents={onEvents} />
}

