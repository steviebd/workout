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
            background: '#fff',
            color: '#1f2937',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            borderRadius: '0.5rem',
            padding: '1rem',
            border: '1px solid #e5e7eb',
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
