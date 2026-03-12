import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/sumo/',
  plugins: [react()],
  server: {
    host: true,
    headers: {
      'Permissions-Policy': 'accelerometer=(self), gyroscope=(self)',
    },
  },
});
