import { defineConfig } from 'vite'
import tailwindcss	from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss()
	],
	build: {
		outDir: "build",
	},
	server: {
		port: 4430,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': '*',
		},
		proxy: {
			'/api': {
				target: 'http://localhost:8080', // Backend server
				changeOrigin: true,
				rewrite: path => path.replace(/^\/api/, ''), // Optional URL rewrite
			},
		},
	},
})
