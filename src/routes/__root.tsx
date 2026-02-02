/* eslint-disable import/no-unassigned-import */
import { TanStackDevtools } from '@tanstack/react-devtools'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import '../styles.css'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/ToastProvider'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { Header } from '@/components/Header'
import { BottomNav } from '@/components/BottomNav'
import { UnitProvider } from '@/lib/context/UnitContext'
import { DateFormatProvider } from '@/lib/context/DateFormatContext'
import { StreakProvider } from '@/lib/context/StreakContext'
import { cacheUser, getCachedUser, clearCachedUser } from '@/lib/auth/offline-auth'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

type User = { id: string; email: string; name: string } | null;

interface AuthContextType {
  user: User;
  loading: boolean;
  setUser: (user: User) => void;
  signOut: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  signOut: () => {},
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
});

export function useAuth() {
  return useContext(AuthContext);
}

function AppLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [syncState, setSyncState] = useState({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
  });

  const signOut = useCallback(() => {
    void clearCachedUser();
    setUser(null);
    window.location.href = '/auth/signout';
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      async function fetchWithTimeout(url: string, timeoutMs = 3000): Promise<Response | null> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(url, {
            credentials: 'include',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          return response;
        } catch {
          clearTimeout(timeoutId);
          return null;
        }
      }

      try {
        const [cachedUser, apiResponse] = await Promise.all([
          getCachedUser(),
          fetchWithTimeout('/api/auth/me', 3000),
        ]);

        if (!isMounted) return;

        if (cachedUser && !apiResponse) {
          setUser({
            id: cachedUser.id,
            email: cachedUser.email,
            name: cachedUser.name,
          });
          setLoading(false);
          return;
        }

        if (apiResponse?.ok) {
          const userData = (await apiResponse.json()) as User;
          if (userData) {
            setUser(userData);
            await cacheUser({
              id: userData.id,
              email: userData.email,
              name: userData.name,
            });
          } else {
            setUser(null);
          }
        } else if (apiResponse?.status === 401) {
          await clearCachedUser();
          setUser(null);
        } else if (apiResponse) {
          if (cachedUser) {
            setUser({
              id: cachedUser.id,
              email: cachedUser.email,
              name: cachedUser.name,
            });
          } else {
            setUser(null);
          }
        } else if (cachedUser) {
          setUser({
            id: cachedUser.id,
            email: cachedUser.email,
            name: cachedUser.name,
          });
        } else {
          setUser(null);
        }
      } catch {
        if (isMounted) {
          const cachedUser = await getCachedUser();
          if (cachedUser) {
            setUser({
              id: cachedUser.id,
              email: cachedUser.email,
              name: cachedUser.name,
            });
          } else {
            setUser(null);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setSyncState({
      isOnline: navigator.onLine,
      isSyncing: false,
      pendingCount: 0,
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ user, loading, setUser, signOut, isOnline: syncState.isOnline, isSyncing: syncState.isSyncing, pendingCount: syncState.pendingCount }}>
        <html lang={'en'}>
          <head>
            <HeadContent />
          </head>
          <body className={'min-h-screen bg-background font-sans antialiased'}>
            <div className={'min-h-screen flex flex-col'}>
              <UnitProvider userId={user?.id}>
                <DateFormatProvider userId={user?.id}>
                  <StreakProvider workosId={user?.id ?? ''}>
                    <Header />
                  </StreakProvider>
                  <main className={'flex-1 pb-20'}>
                    <div className="mx-auto max-w-lg px-4">
                    <ErrorBoundary>
                      <ToastProvider>
                        <TooltipProvider>
                          <Outlet />
                        </TooltipProvider>
                      </ToastProvider>
                    </ErrorBoundary>
                    </div>
                  </main>
                  <BottomNav />
                </DateFormatProvider>
              </UnitProvider>
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
    </QueryClientProvider>
  );
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
  component: AppLayout,
})
