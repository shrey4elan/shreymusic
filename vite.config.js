
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/jio-api': {
        target: 'https://www.jiosaavn.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/jio-api/, '/api.php'),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.jiosaavn.com/'
        }
      }
    }
  },
  preview: {
    allowedHosts: true,
    proxy: {
      '/jio-api': {
        target: 'https://www.jiosaavn.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/jio-api/, '/api.php'),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.jiosaavn.com/'
        }
      }
    }
  },
})
