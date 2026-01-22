/* eslint-disable import/no-unassigned-import */
import { TanStackDevtools } from '@tanstack/react-devtools'
import { HeadContent, Scripts, createRootRoute, useLocation , useNavigate } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import '../styles.css'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/ToastProvider'
import { Header } from '@/components/Header'
import { BottomNav } from '@/components/BottomNav'
import { UnitProvider } from '@/lib/context/UnitContext'
import { DateFormatProvider } from '@/lib/context/DateFormatContext'

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

function RootDocument({ children }: { readonly children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const signOut = useCallback(() => {
    setUser(null);
    void fetch('/auth/signout', { method: 'GET', credentials: 'include' });
    void navigate({ to: '/' });
  }, [navigate]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (response.ok) {
          const userData = (await response.json()) as User;
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
    void checkAuth();
  }, [location.pathname]);

  return (
  	<AuthContext.Provider value={{ user, loading, setUser, signOut }}>
			<html lang={'en'}>
				<head>
					<HeadContent />
				</head>
				<body className={'min-h-screen bg-background'}>
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
