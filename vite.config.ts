import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

const config = defineConfig({
  define: {
    'process.env.WORKOS_CLIENT_ID': JSON.stringify(process.env.WORKOS_CLIENT_ID),
    'process.env.WORKOS_API_KEY': JSON.stringify(process.env.WORKOS_API_KEY),
    'global': 'globalThis',
  },
  ssr: {
    noExternal: true,
  },
  plugins: [
    devtools(),
    cloudflare({
      viteEnvironment: { name: 'ssr' },
    }),
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
