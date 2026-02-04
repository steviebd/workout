'use client';

import { useState } from 'react';
import { GripVertical, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { useDashboard, type WidgetType } from '@/lib/context/DashboardContext';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { cn } from '@/lib/cn';

const widgetLabels: Record<WidgetType, string> = {
  emptyState: 'Welcome Banner',
  streak: 'Streak Card',
  volume: 'Volume Summary',
  quickActions: 'Quick Actions',
  recentPRs: 'Recent PRs',
};

export function DashboardCustomizer() {
  const { widgets, toggleWidget, reorderWidgets, resetToDefault, isCustomizing, setIsCustomizing } = useDashboard();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    reorderWidgets(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);

  return (
    <Dialog open={isCustomizing} onOpenChange={setIsCustomizing}>
      <DialogTrigger asChild={true}>
        <Button variant="outline" size="sm" className="gap-2">
          <GripVertical className="h-4 w-4" />
          Customize
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Drag widgets to reorder them. Toggle the eye icon to show or hide widgets.
          </p>
          <div className="space-y-2">
            {sortedWidgets.map((widget, index) => (
              <div
                key={widget.id}
                draggable={true}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                role="button"
                tabIndex={0}
                className={cn(
                  'flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all cursor-grab active:cursor-grabbing',
                  draggedIndex === index && 'opacity-50 scale-[0.98]',
                  !widget.enabled && 'opacity-60'
                )}
              >
                <div className="text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                </div>
                <span className="flex-1 text-sm font-medium">
                  {widgetLabels[widget.id]}
                </span>
                <button
                  onClick={() => toggleWidget(widget.id)}
                  className="rounded-lg p-1.5 hover:bg-secondary transition-colors"
                  title={widget.enabled ? 'Hide widget' : 'Show widget'}
                >
                  {widget.enabled ? (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefault}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Default
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
