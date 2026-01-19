 
import { createFileRoute , useSearch } from '@tanstack/react-router';
import { useEffect } from 'react';

function Callback() {
  const search = useSearch({ from: '/auth/callback' });
  const { code, error } = search;

  useEffect(() => {
    if (error) {
      window.location.href = '/?error=auth_failed';
      return;
    }

    if (code) {
      window.location.href = `/api/auth/callback?code=${encodeURIComponent(code)}`;
    } else {
      window.location.href = '/auth/signin';
    }
  }, [code, error]);

  if (error) {
    return (
	<div className={'min-h-screen flex items-center justify-center'}>
		<div className={'text-center'}>
			<h1 className={'text-xl font-semibold text-red-600 mb-2'}>{'Authentication Failed'}</h1>
			<p className={'text-gray-600'}>{error}</p>
			<a className={'text-blue-600 hover:underline mt-4 block'} href={'/auth/signin'}>
				{'Try again'}
			</a>
		</div>
	</div>
    );
  }

  return (
	<div className={'min-h-screen flex items-center justify-center'}>
		<p className={'text-gray-600'}>{'Completing sign in...'}</p>
	</div>
  );
}

export const Route = createFileRoute('/auth/callback')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: search.code as string | undefined,
    error: search.error as string | undefined,
  }),
  component: Callback,
});
