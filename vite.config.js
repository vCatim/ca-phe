import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/ca-phe/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Cà Phê',
        short_name: 'Cà Phê',
        description: 'Quản lý lịch trình và chi tiêu cá nhân',
        theme_color: '#1c1511',
        background_color: '#1c1511',
        display: 'standalone',
        start_url: '/ca-phe/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
})