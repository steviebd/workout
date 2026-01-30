import { useState, useCallback, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export function Collapsible({
  title,
  children,
  defaultOpen = false,
  onToggle
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => {
      const newValue = !prev;
      onToggle?.(newValue);
      return newValue;
    });
  }, [onToggle]);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 bg-secondary hover:bg-secondary/80 transition-colors"
        onClick={handleToggle}
        type="button"
      >
        <span className="font-medium text-sm">{title}</span>
        {isOpen ? (
          <ChevronDown size={18} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={18} className="text-muted-foreground" />
        )}
      </button>
      {isOpen ? <div className="p-3 border-t border-border">
          {children}
                </div> : null}
    </div>
  );
}

interface CollapsibleSectionProps {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({
  label,
  children,
  defaultOpen = false
}: CollapsibleSectionProps) {
  return (
    <Collapsible
      title={label}
      defaultOpen={defaultOpen}
    >
      {children}
    </Collapsible>
  );
}
