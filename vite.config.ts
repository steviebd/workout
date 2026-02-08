import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { VitePWA } from 'vite-plugin-pwa'

const config = defineConfig({
  define: {
    'process.env.WORKOS_CLIENT_ID': JSON.stringify(process.env.WORKOS_CLIENT_ID),
    'process.env.ENVIRONMENT': JSON.stringify(process.env.ENVIRONMENT),
    'global': 'globalThis',
  },
  ssr: {
    noExternal: true,
  },
  plugins: [
    cloudflare({
      viteEnvironment: { name: 'ssr' },
    }),
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    VitePWA({
      injectRegister: false,
      registerType: 'autoUpdate',
      manifest: {
        name: 'Fit Workout',
        short_name: 'Fit Workout',
        theme_color: '#3b82f6',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})

export default config
