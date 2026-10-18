import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, las llamadas a /api se redirigen a la API de Express (puerto PORT de .env, 3001 por defecto).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': { target: `http://localhost:${env.PORT || 3001}`, changeOrigin: true }
      }
    }
  };
});
