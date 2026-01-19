import { createRouter as createTanStackRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
export const router = createTanStackRouter({
  routeTree,
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
})

// Export for TanStack Start
export const getRouter = () => router
export const createRouter = () => router
