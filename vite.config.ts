import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['5173-ihdtf9ybbtuqgohqgu1fw-da61e282.us4.manus.computer'],
  },
})
