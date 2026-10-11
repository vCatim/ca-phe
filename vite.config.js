import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' để đường dẫn file là tương đối → chạy đúng khi đặt ở https://<tên>.github.io/<repo>/
export default defineConfig({
  plugins: [react()],
  base: './',
});
