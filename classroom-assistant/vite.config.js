/**
 * Vite configuration file for the Intel Classroom Assistant frontend
 * 
 * Configures the build tool for the React application including:
 * - React plugin integration
 * - Development server settings
 * - Base path configuration
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  base: '/'
})
