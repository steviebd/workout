import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useSearch } from '@tanstack/react-router';

export const Route = createFileRoute('/auth/callback')({
  validateSearch: () => ({}),
  component: Callback,
});

function Callback() {
  const search = useSearch({ from: '/auth/callback' }) || {};
  const code = (search as { code?: string }).code;
  const error = (search as { error?: string }).error;

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-600 mb-2">Authentication Failed</h1>
          <p className="text-gray-600">{error}</p>
          <a href="/auth/signin" className="text-blue-600 hover:underline mt-4 block">
            Try again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600">Completing sign in...</p>
    </div>
  );
}
