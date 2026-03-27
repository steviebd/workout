import { useEffect } from 'react'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { useAuth } from '@/routes/__root'
// eslint-disable-next-line import/extensions
import { routeTree } from '~/routeTree.gen'

const getRouter = () =>
  createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  })

export function useRequireAuth() {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      void getRouter().navigate({ to: '/auth/signin' })
    }
  }, [loading, user])

  return { user, loading }
}
