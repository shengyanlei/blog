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
        <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-3">
            <div className="bg-[color:var(--paper-soft)] rounded-xl p-4 shadow-[0_20px_40px_-35px_rgba(31,41,55,0.3)] border border-[color:var(--card-border)] flex flex-col items-center justify-center">
                <div className="text-sm text-[color:var(--ink-soft)] mb-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-[color:var(--accent)]" />
                    去过的省/市
                </div>
                <div className="text-2xl font-bold text-[color:var(--ink)]">
                    {visitedProvinces}
                    <span className="text-xs text-[color:var(--ink-soft)] font-normal mx-1">省</span>
                    {visitedCities}
                    <span className="text-xs text-[color:var(--ink-soft)] font-normal">市</span>
                </div>
            </div>
            <div className="bg-[color:var(--paper-soft)] rounded-xl p-4 shadow-[0_20px_40px_-35px_rgba(31,41,55,0.3)] border border-[color:var(--card-border)] flex flex-col items-center justify-center">
                <div className="text-sm text-[color:var(--ink-soft)] mb-1 flex items-center gap-1">
                    <ImageIcon className="h-3 w-3 text-[color:var(--accent)]" />
                    照片总数
                </div>
                <div className="text-2xl font-bold text-[color:var(--ink)]">{totalPhotos}</div>
            </div>
            <div className="bg-[color:var(--paper-soft)] rounded-xl p-4 shadow-[0_20px_40px_-35px_rgba(31,41,55,0.3)] border border-[color:var(--card-border)] flex flex-col items-center justify-center">
                <div className="text-sm text-[color:var(--ink-soft)] mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-[color:var(--accent)]" />
                    最近出行
                </div>
                <div className="text-lg font-bold text-[color:var(--ink)]">{latest ?? '-'}</div>
            </div>
        </div>
    )
}
