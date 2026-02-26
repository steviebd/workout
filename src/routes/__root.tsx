/* eslint-disable import/no-unassigned-import */
import { HeadContent, Outlet, Scripts, createRootRoute, useLocation } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import '../styles.css'
import { ErrorBoundary } from '@/components/app/ErrorBoundary'
import { ToastProvider } from '@/components/app/ToastProvider'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { AppProviders } from '@/components/app/Providers'
import { cacheUser, getCachedUser, clearCachedUser } from '@/lib/auth/offline-auth'
import { trackEvent, identifyUser } from '@/lib/analytics'


let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    return new QueryClient({
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
    })
  }
  browserQueryClient ??= new QueryClient({
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
    })
  return browserQueryClient
}

interface AuthUserData {
  id: string;
  email: string;
  name: string;
}

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
})

export const useAuth = () => useContext(AuthContext)

function AppLayout() {
  const queryClient = getQueryClient()
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [syncState, setSyncState] = useState({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
  });

  const signOut = useCallback(() => {
    void trackEvent('user_signed_out');
    setUser(null);
    void clearCachedUser();
    localStorage.removeItem('auth_user');
    window.location.href = '/api/auth/signout';
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

        if (apiResponse?.ok) {
          const userData = (await apiResponse.json()) as AuthUserData | null;
          if (userData) {
            setUser(userData);
            void identifyUser(userData.id, {
              email: userData.email,
              name: userData.name,
            });
            await cacheUser({
              id: userData.id,
              email: userData.email,
              name: userData.name,
            });
          } else {
            setUser(null);
          }
        } else if (apiResponse?.status === 401) {
          setUser(null);
          await clearCachedUser();
        } else if (!apiResponse && !cachedUser) {
          setUser(null);
        } else if (cachedUser) {
          setUser({
            id: cachedUser.id,
            email: cachedUser.email,
            name: cachedUser.name,
          });
          void identifyUser(cachedUser.id, {
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

  useEffect(() => {
    function handleGlobalError(event: ErrorEvent) {
      void trackEvent('error_unhandled', {
        error_message: event.message,
        error_filename: event.filename,
        error_lineno: event.lineno,
        error_colno: event.colno,
      });
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      void trackEvent('error_promise_rejection', {
        error_message: event.reason?.message ?? String(event.reason),
        error_stack: event.reason?.stack,
      });
    }

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      void trackEvent('page_viewed', {
        path: location.pathname,
        search: location.search,
      });
    }
  }, [location, loading]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ user, loading, setUser, signOut, isOnline: syncState.isOnline, isSyncing: syncState.isSyncing, pendingCount: syncState.pendingCount }}>
        <html lang="en" suppressHydrationWarning={true}>
          <head>
            <HeadContent />
            <script
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html: `
                  (function() {
                    try {
                      var theme = localStorage.getItem('theme');
                      var resolved = 'light';
                      if (theme === 'dark') {
                        resolved = 'dark';
                      } else if (theme === 'light') {
                        resolved = 'light';
                      } else {
                        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                      }
                      document.documentElement.classList.add(resolved);
                    } catch (e) {}
                  })();
                `,
              }}
            />
          </head>
          <body className="min-h-screen bg-background font-sans antialiased">
            <div className="min-h-screen flex flex-col">
              <AppProviders userId={user?.id}>
                <Header />
                <main className="flex-1 overflow-auto">
                  <div className="mx-auto max-w-lg">
                  <ErrorBoundary>
                    <ToastProvider>
                      <TooltipProvider>
                        <Outlet />
                      </TooltipProvider>
                    </ToastProvider>
                  </ErrorBoundary>
                  </div>
                </main>
                {!location.pathname.startsWith('/workouts/') && <BottomNav />}
              </AppProviders>
            </div>

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
