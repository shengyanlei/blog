import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export interface CategoryCardProps {
    title: string;
    slug: string;
    backgroundImage: string;
    index?: number;
}

export function CategoryCard({ title, slug, backgroundImage, index = 0 }: CategoryCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.15 }}
        >
            <Link to={`/category/${slug}`}>
                <div className="relative h-48 overflow-hidden rounded-lg group cursor-pointer">
                    {/* 背景图片 */}
                    <img
                        src={backgroundImage}
                        alt={title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />

                    {/* 半透明遮罩 */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50 group-hover:from-black/40 group-hover:to-black/60 transition-all duration-300" />

                    {/* 标题 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <h3 className="text-white text-3xl font-bold drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
                            {title}
                        </h3>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
