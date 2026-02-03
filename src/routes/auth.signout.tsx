import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { clearCachedUser } from '@/lib/auth/offline-auth';

function SignOut() {
  const [signingOut, setSigningOut] = useState(true);

  useEffect(() => {
    async function performSignout() {
      try {
        console.log('[signout] Starting signout...');
        const response = await fetch('/api/auth/signout', {
          method: 'POST',
          credentials: 'include',
        });
        const data = await response.json() as { success: boolean; logoutUrl?: string };
        console.log('[signout] API response:', response.status, data);

        await clearCachedUser();
        localStorage.removeItem('auth_user');
        console.log('[signout] Cleared local storage');

        if (data.logoutUrl) {
          console.log('[signout] Triggering WorkOS logout in iframe...');
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = data.logoutUrl;
          document.body.appendChild(iframe);
          setTimeout(() => document.body.removeChild(iframe), 1000);
        }
      } catch (err) {
        console.error('Signout error:', err);
      } finally {
        setSigningOut(false);
      }
    }

    void performSignout();
  }, []);

  if (signingOut) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <Loader2 className="w-12 h-12 animate-spin text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Signing out...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="max-w-sm w-full text-center space-y-8">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <LogOut className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">You're signed out</h1>
          <p className="text-muted-foreground text-lg">
            Thanks for using Fit Workout. Come back anytime!
          </p>
        </div>

        <a
          href="/auth/signin"
          className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Sign In or Sign Up
        </a>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/auth/signout')({
  component: SignOut,
});
