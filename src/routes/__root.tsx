/* eslint-disable import/no-unassigned-import */
import { TanStackDevtools } from '@tanstack/react-devtools'
import { HeadContent, Scripts, createRootRoute, useLocation , useNavigate } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import '../styles.css'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/ToastProvider'
import { Header } from '@/components/Header'
import { BottomNav } from '@/components/BottomNav'
import { UnitProvider } from '@/lib/context/UnitContext'
import { DateFormatProvider } from '@/lib/context/DateFormatContext'
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

type User = { id: string; email: string; name: string; workosId?: string } | null;

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

function RootDocument({ children }: { readonly children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Client-only sync state to avoid SSR issues with QueryClient
  const [syncState, setSyncState] = useState({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
  });

  const signOut = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      void fetch('/auth/signout', { method: 'GET', credentials: 'include' }).catch(() => {});
    }
    void clearCachedUser();
    setUser(null);
    void navigate({ to: '/' });
  }, [navigate]);

  // Initialize sync state on client only
  useEffect(() => {
    setSyncState({
      isOnline: navigator.onLine,
      isSyncing: false,
      pendingCount: 0,
    });
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        
        if (response.ok) {
          const userData = (await response.json()) as User;
          if (userData) {
            setUser(userData);
            await cacheUser({
              id: userData.id,
              email: userData.email,
              name: userData.name,
              workosId: userData.workosId ?? '',
              cachedAt: new Date(),
            });
          } else {
            setUser(null);
          }
        } else if (response.status === 401) {
          await clearCachedUser();
          setUser(null);
        } else {
          const cachedUser = await getCachedUser();
          if (cachedUser) {
            setUser({
              id: cachedUser.id,
              email: cachedUser.email,
              name: cachedUser.name,
              workosId: cachedUser.workosId,
            });
          } else {
            setUser(null);
          }
        }
      } catch {
        const cachedUser = await getCachedUser();
        if (cachedUser) {
          setUser({
            id: cachedUser.id,
            email: cachedUser.email,
            name: cachedUser.name,
            workosId: cachedUser.workosId,
          });
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    }
    void checkAuth();
  }, [location.pathname]);

  return (
    <QueryClientProvider client={queryClient}>
    	<AuthContext.Provider value={{ user, loading, setUser, signOut, isOnline: syncState.isOnline, isSyncing: syncState.isSyncing, pendingCount: syncState.pendingCount }}>
			<html lang={'en'}>
				<head>
					<HeadContent />
				</head>
				<body className={'min-h-screen bg-background font-sans antialiased'}>
					<div className={'min-h-screen flex flex-col'}>
						<UnitProvider>
							<DateFormatProvider>
								<Header />
								<main className={'flex-1 pb-20'}>
									<div className="mx-auto max-w-lg px-4">
										<ErrorBoundary>
											<ToastProvider>
												{children}
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
  		)
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
