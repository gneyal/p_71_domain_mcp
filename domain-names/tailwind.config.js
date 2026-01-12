/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI', 'Roboto', 'sans-serif'],
				mono: ['SF Mono', 'Monaco', 'Consolas', 'monospace']
			},
			colors: {
				gray: {
					apple: '#86868b',
					'apple-bg': '#f5f5f7',
					'apple-border': '#e5e5e5'
				}
			},
			animation: {
				'fade-in-up': 'fadeInUp 0.4s ease forwards'
			},
			keyframes: {
				fadeInUp: {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				}
			}
		}
	},
	plugins: []
};
