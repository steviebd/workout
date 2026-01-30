import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface DuplicateWarningProps {
  existingName: string;
  onUseExisting: () => void;
  onCreateNew: () => void;
  onCancel: () => void;
}

export function DuplicateWarning({
  existingName,
  onUseExisting,
  onCreateNew,
  onCancel,
}: DuplicateWarningProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
            <AlertCircle size={24} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold">Similar Exercise Found</h3>
            <p className="text-sm text-muted-foreground">
              An exercise with a similar name already exists
            </p>
          </div>
        </div>

        <div className="p-3 bg-secondary rounded-lg mb-4">
          <p className="font-medium">{existingName}</p>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Would you like to use this existing exercise or create a new one?
        </p>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button variant="outline" onClick={onCreateNew} className="flex-1">
            Create New
          </Button>
          <Button onClick={onUseExisting} className="flex-1">
            Use Existing
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onClose: () => void;
}

export function WarningToast({
  message,
  type = 'warning',
  onClose,
}: ToastProps) {
  const colors = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  };

  return (
    <div className={`fixed bottom-4 right-4 ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-2`}>
      <AlertCircle size={20} />
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        ×
      </button>
    </div>
  );
}
