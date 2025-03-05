import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
	],
	build: {
		outDir: "build",
	},
	server: {
		host: "0.0.0.0", // Allows access from Docker
		port: 5173,
		strictPort: true,
		allowedHosts: ["*"],
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': '*',
			'Access-Control-Allow-Headers': '*',
		},
		//proxy: {
		//	'/api': {
		//		target: 'http://zig_backend:8080', // Backend server
		//		//changeOrigin: true,
		//	},
		//	'/solver': {
		//		target: 'http://zig_solver:8081', // Backend server
		//		//changeOrigin: true,
		//	},
		//},
	},
})
