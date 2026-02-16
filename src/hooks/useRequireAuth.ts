import { useEffect } from 'react'
import { useAuth } from '@/routes/__root'

export function useRequireAuth() {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/auth/signin'
    }
  }, [loading, user])

  return { user, loading }
}
