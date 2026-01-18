import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useAuth } from './__root';

export const Route = createFileRoute('/exercises/_index')({
  component: Exercises,
});

function Exercises() {
  const auth = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      setRedirecting(true);
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  if (auth.loading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Exercises</h1>
        <p className="text-gray-600">Coming soon...</p>
      </div>
    </div>
  );
}
