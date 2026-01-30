import { Toaster, toast as sonnerToast } from 'sonner';
import type { ReactNode } from 'react';

export function ToastProvider({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'oklch(0.14 0 0)',
            color: 'oklch(0.98 0 0)',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.2)',
            borderRadius: '0.75rem',
            padding: '1rem',
            border: '1px solid oklch(0.25 0 0)',
          },
        }}
      />
    </>
  );
}

export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
  info: (message: string) => sonnerToast.info(message),
  warning: (message: string) => sonnerToast.warning(message),
};

export function useToast(): {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
} {
  return {
    success: (message: string) => sonnerToast.success(message),
    error: (message: string) => sonnerToast.error(message),
    info: (message: string) => sonnerToast.info(message),
    warning: (message: string) => sonnerToast.warning(message),
  };
}
