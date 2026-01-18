import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.spec.ts'],
  },
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    react(),
  ],
});
