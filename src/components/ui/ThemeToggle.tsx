'use client';

import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { Button } from './Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './DropdownMenu';
import { useTheme } from '@/lib/context/ThemeContext';

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const isLightChecked = resolvedTheme === 'light' && theme !== 'system';
  const isDarkChecked = resolvedTheme === 'dark' && theme !== 'system';
  const isSystemChecked = theme === 'system';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild={true}>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 px-0 overflow-hidden group hover:bg-secondary/80"
        >
          <div className="relative h-4 w-4">
            <Sun
              className={`absolute inset-0 h-4 w-4 transition-all duration-300 ease-out ${
                theme === 'system'
                  ? 'opacity-0 scale-50 rotate-90'
                  : resolvedTheme === 'dark'
                    ? 'opacity-0 scale-50 rotate-90'
                    : 'opacity-100 scale-100 rotate-0'
              }`}
            />
            <Moon
              className={`absolute inset-0 h-4 w-4 transition-all duration-300 ease-out ${
                theme === 'system'
                  ? 'opacity-0 scale-50 -rotate-90'
                  : resolvedTheme === 'dark'
                    ? 'opacity-100 scale-100 rotate-0'
                    : 'opacity-0 scale-50 -rotate-90'
              }`}
            />
            <Monitor
              className={`absolute inset-0 h-4 w-4 transition-all duration-300 ease-out ${
                theme === 'system'
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-75'
              }`}
            />
          </div>
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className="flex items-center gap-2 group/item"
        >
          <Sun className="h-4 w-4 transition-transform duration-200 group-hover/item:rotate-45" />
          <span>Light</span>
          <Check
            className={`ml-auto h-3.5 w-3.5 transition-all duration-200 ${
              isLightChecked ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          />
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className="flex items-center gap-2 group/item"
        >
          <Moon className="h-4 w-4 transition-transform duration-200 group-hover/item:-rotate-12" />
          <span>Dark</span>
          <Check
            className={`ml-auto h-3.5 w-3.5 transition-all duration-200 ${
              isDarkChecked ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          />
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className="flex items-center gap-2 group/item"
        >
          <Monitor className="h-4 w-4 transition-transform duration-200 group-hover/item:scale-110" />
          <span>System</span>
          <Check
            className={`ml-auto h-3.5 w-3.5 transition-all duration-200 ${
              isSystemChecked ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggleCompact() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    } else {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  };

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/50 text-muted-foreground shadow-sm ring-1 ring-border/50 backdrop-blur-sm transition-all duration-300 hover:bg-secondary hover:text-foreground hover:shadow-md hover:ring-border hover:scale-105 active:scale-95"
    >
      <div className="relative h-5 w-5">
        <Sun
          className={`absolute inset-0 h-5 w-5 transition-all duration-500 ease-out ${
            isDark
              ? 'opacity-0 rotate-180 scale-0'
              : 'opacity-100 rotate-0 scale-100'
          }`}
          strokeWidth={2}
        />
        <Moon
          className={`absolute inset-0 h-5 w-5 transition-all duration-500 ease-out ${
            isDark
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-180 scale-0'
          }`}
          strokeWidth={2}
        />
      </div>
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
