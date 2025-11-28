/** @type {import('tailwindcss').Config} */
module.exports = {
    presets: [require('../../packages/ui/tailwind.config')],
    content: [
        './index.html',
        './src/**/*.{ts,tsx}',
        '../../packages/ui/src/**/*.{ts,tsx}'
    ],
}
