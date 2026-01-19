import { HeadContent, Scripts, createRootRoute, Link, useRouter } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useLocation } from '@tanstack/react-router'

import '../styles.css'

type User = { id: string; email: string; name: string } | null;

const AuthContext = createContext<{
  user: User;
  loading: boolean;
  setUser: (user: User) => void;
  signOut: () => void;
}>({
  user: null,
  loading: true,
  setUser: () => {},
  signOut: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Fit Workout App',
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const router = useRouter();

  const signOut = useCallback(() => {
    setUser(null);
    fetch('/auth/signout', { method: 'GET', credentials: 'include' });
    router.navigate({ to: '/' });
  }, [router]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (response.ok) {
          const userData = await response.json() as { id: string; email: string; name: string };
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [location.pathname]);

  return (
      <AuthContext.Provider value={{ user, loading, setUser, signOut }}>
        <html lang="en">
          <head>
            <HeadContent />
          </head>
          <body className="min-h-screen bg-gray-50">
            <div className="min-h-screen flex flex-col">
              <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex justify-between h-16">
                    <div className="flex">
                      <Link to="/" className="flex-shrink-0 flex items-center">
                        <span className="text-xl font-bold text-gray-900">Fit Workout</span>
                      </Link>
                      <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                        <Link to="/exercises" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                          Exercises
                        </Link>
                        <Link to="/templates" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                          Templates
                        </Link>
                        <Link to="/workouts/new" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                          Start Workout
                        </Link>
                        <Link to="/history" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                          History
                        </Link>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {loading ? (
                        <span className="text-sm text-gray-500">Loading...</span>
                      ) : user ? (
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-700">{user.name}</span>
                          <button
                            onClick={signOut}
                            className="text-sm text-gray-500 hover:text-gray-700 bg-transparent border-none cursor-pointer p-0"
                          >
                            Sign Out
                          </button>
                        </div>
                      ) : (
                        <a href="/auth/signin" className="text-sm text-blue-600 hover:text-blue-500">
                          Sign In
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </header>
              <main className="flex-1">
                {children}
              </main>
            </div>
            <TanStackDevtools
              config={{
                position: 'bottom-right',
              }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
              ]}
            />
            <Scripts />
          </body>
        </html>
      </AuthContext.Provider>
  )
}
