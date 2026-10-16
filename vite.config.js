import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/ca-phe/',
  build: {
    rollupOptions: {
      output: {
        // Tách thư viện ít thay đổi khỏi mã ứng dụng để tận dụng cache trình
        // duyệt; ical.js còn được tải động khi người dùng thật sự nhập lịch.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('ical.js')) return 'calendar-import';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('react') || id.includes('scheduler')) return 'react';
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Cà Phê',
        short_name: 'Cà Phê',
        description: 'Quản lý lịch trình và chi tiêu cá nhân',
        theme_color: '#1c1511',
        background_color: '#1c1511',
        display: 'standalone',
        start_url: '/ca-phe/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
