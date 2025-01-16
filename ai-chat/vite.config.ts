import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vitejs.dev/config/
export default defineConfig({
  //  basicSsl()
  plugins: [react()],
  server: {
    port: 5173,
    open: true, // 自动打开浏览器
    // https: true,
  },
});
