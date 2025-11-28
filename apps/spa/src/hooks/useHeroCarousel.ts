import { useState, useEffect } from 'react';
import { heroBackgroundConfig } from '../config/heroBackground';

/**
 * Hero 背景轮播 Hook
 * 
 * @returns currentImageIndex - 当前图片索引
 * @returns currentImage - 当前图片 URL
 * @returns nextImage - 下一张图片 URL（用于预加载）
 */
export function useHeroCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const images = heroBackgroundConfig.images;

    useEffect(() => {
        // 预加载所有图片
        images.forEach((src) => {
            const img = new Image();
            img.src = src;
        });

        // 设置定时器
        const timer = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
        }, heroBackgroundConfig.interval);

        return () => clearInterval(timer);
    }, [images]);

    return {
        currentImageIndex: currentIndex,
        currentImage: images[currentIndex],
        nextImage: images[(currentIndex + 1) % images.length],
    };
}
