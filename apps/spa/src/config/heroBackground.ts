/**
 * 首页背景图片配置
 */

export const heroBackgroundConfig = {
    interval: 10000,

    images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1920&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80',
        'https://images.unsplash.com/photo-1444080748397-f442aa95c3e5?w=1920&q=80',
        'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=1920&q=80',
        'https://images.unsplash.com/photo-1464802686167-b939a6910659?w=1920&q=80',
        'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=1920&q=80',
    ],

    transition: {
        duration: 2000,
        ease: [0.43, 0.13, 0.23, 0.96] as const,
    },
};

export function addCustomBackground(imageUrl: string) {
    heroBackgroundConfig.images.push(imageUrl);
}

export function removeBackground(index: number) {
    if (index >= 0 && index < heroBackgroundConfig.images.length) {
        heroBackgroundConfig.images.splice(index, 1);
    }
}

export function updateInterval(intervalMs: number) {
    heroBackgroundConfig.interval = intervalMs;
}
