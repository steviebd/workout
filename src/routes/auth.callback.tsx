 
import { createFileRoute, useSearch } from '@tanstack/react-router';
import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

function Callback() {
  const search = useSearch({ from: '/auth/callback' });
  const { code, error } = search;

  useEffect(() => {
    if (error) {
      window.location.href = '/?error=auth_failed';
      return;
    }

    if (code) {
      void trackEvent('user_signed_in');
      const params = new URLSearchParams({ code });
      const searchParams = new URLSearchParams(window.location.search);
      const state = searchParams.get('state');
      if (state) params.set('state', state);
      window.location.href = `/api/auth/callback?${params.toString()}`;
    } else {
      window.location.href = '/auth/signin';
    }
  }, [code, error]);

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-destructive mb-2">Authentication Failed</h1>
            <p className="text-muted-foreground">{error}</p>
            <a className="text-primary hover:underline mt-4 block" href="/auth/signin">
              Try again
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </main>
  );
}

export const Route = createFileRoute('/auth/callback')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: search.code as string | undefined,
    error: search.error as string | undefined,
  }),
  component: Callback,
});
