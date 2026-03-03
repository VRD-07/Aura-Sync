/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: {
                    main: '#0B1120',
                    card: '#111827',
                },
                border: {
                    DEFAULT: '#1F2937',
                    muted: '#374151',
                },
                primary: {
                    DEFAULT: '#2563EB',
                    hover: '#1D4ED8',
                },
                risk: {
                    high: '#DC2626',
                    medium: '#F59E0B',
                    low: '#16A34A',
                },
                text: {
                    primary: '#F9FAFB',
                    secondary: '#9CA3AF',
                    muted: '#6B7280',
                }
            },
            fontFamily: {
                inter: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
