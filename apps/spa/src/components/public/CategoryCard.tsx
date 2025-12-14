import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export interface CategoryCardProps {
    id: number
    name: string
    description?: string
    index?: number
}

const gradients = [
    'from-pink-500 via-rose-500 to-orange-400',
    'from-indigo-500 via-sky-500 to-cyan-400',
    'from-emerald-500 via-teal-500 to-lime-400',
    'from-amber-500 via-orange-500 to-red-400',
]

export function CategoryCard({ id, name, description, index = 0 }: CategoryCardProps) {
    const gradient = gradients[index % gradients.length]

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.15 }}
        >
            <Link to={`/?categoryId=${id}`}>
                <div className={`relative h-48 overflow-hidden rounded-lg group cursor-pointer bg-gradient-to-br ${gradient}`}>
                    <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,#fff,transparent_35%),radial-gradient(circle_at_80%_0%,#fff,transparent_30%)]" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                        <h3 className="text-white text-2xl font-bold drop-shadow-lg group-hover:scale-105 transition-transform duration-300">
                            {name}
                        </h3>
                        {description && (
                            <p className="mt-2 text-sm text-white/80 line-clamp-2 group-hover:line-clamp-3 transition-all">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
            </Link>
        </motion.div>
    )
}
