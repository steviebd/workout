/* eslint-disable import/no-unassigned-import */
import { TanStackDevtools } from '@tanstack/react-devtools'
import { HeadContent, Link, Scripts, createRootRoute, useLocation , useNavigate } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import '../styles.css'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/ToastProvider'

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
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
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
			<body className={'min-h-screen bg-gray-50'}>
				<div className={'min-h-screen flex flex-col'}>
					<header className={'bg-white shadow'}>
						<div className={'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}>
							<div className={'flex justify-between h-16'}>
								<div className={'flex'}>
									<Link className={'flex-shrink-0 flex items-center'} to={'/'}>
										<span className={'text-xl font-bold text-gray-900'}>{'Fit Workout'}</span>
									</Link>
									<div className={'hidden sm:ml-6 sm:flex sm:space-x-8'}>
										<Link className={'inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300'} to={'/exercises'}>
											{'Exercises'}
										</Link>
										<Link className={'inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300'} to={'/templates'}>
											{'Templates'}
										</Link>
										<Link className={'inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300'} to={'/workouts/new'}>
											{'Start Workout'}
										</Link>
										<Link className={'inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300'} to={'/history'}>
											{'History'}
										</Link>
									</div>
								</div>
								<div className={'flex items-center'}>
									{loading ? (
										<span className={'text-sm text-gray-500'}>{'Loading...'}</span>
									) : user ? (
	<div className={'flex items-center space-x-4'}>
		<span className={'text-sm text-gray-700'}>{user.name}</span>
		<button
			className={'text-sm text-gray-500 hover:text-gray-700 bg-transparent border-none cursor-pointer p-0'}
			onClick={signOut}
		>
			{'Sign Out'}
		</button>
	</div>
									) : (
	<a className={'text-sm text-blue-600 hover:text-blue-500'} href={'/auth/signin'}>
		{'Sign In'}
	</a>
									)}
								</div>
							</div>
						</div>
					</header>
					<main className={'flex-1'}>
						<ErrorBoundary>
							<ToastProvider>
								{children}
							</ToastProvider>
						</ErrorBoundary>
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
