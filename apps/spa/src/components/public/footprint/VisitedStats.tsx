import { LocationData } from '../../../pages/public/FootprintPage'
import { MapPin, Image as ImageIcon, Calendar } from 'lucide-react'

interface VisitedStatsProps {
    data: LocationData[]
}

export function VisitedStats({ data }: VisitedStatsProps) {
    const provincesWithPhotos = data.filter((d) => (d.photoCount || 0) > 0)
    const visitedProvinces = new Set(provincesWithPhotos.map((d) => d.province)).size
    const visitedCities =
        provincesWithPhotos.reduce((acc, curr) => acc + (curr.visitedCitiesWithPhotos ?? 0), 0) ||
        new Set(provincesWithPhotos.map((d) => d.city).filter(Boolean)).size
    const totalPhotos = data.reduce((acc, curr) => acc + (curr.photoCount || 0), 0)
    const latest = data
        .map((d) => d.lastVisited)
        .filter(Boolean)
        .sort()
        .pop()

    return (
        <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center">
                <div className="text-sm text-slate-500 mb-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    去过的省/市
                </div>
                <div className="text-2xl font-bold text-slate-800">
                    {visitedProvinces}
                    <span className="text-xs text-slate-400 font-normal mx-1">省</span>
                    {visitedCities}
                    <span className="text-xs text-slate-400 font-normal">市</span>
                </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center">
                <div className="text-sm text-slate-500 mb-1 flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    照片总数
                </div>
                <div className="text-2xl font-bold text-slate-800">{totalPhotos}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center">
                <div className="text-sm text-slate-500 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    最近出行
                </div>
                <div className="text-lg font-bold text-slate-800">{latest ?? '-'}</div>
            </div>
        </div>
    )
}
