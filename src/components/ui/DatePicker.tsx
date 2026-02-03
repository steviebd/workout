'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useDateFormat } from '@/lib/context/DateFormatContext';

interface DatePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  min?: string;
  max?: string;
  placeholder?: string;
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'Select date',
}: DatePickerProps) {
  const { formatDate, loading: dateFormatLoading } = useDateFormat();
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (value) {
      return new Date(`${value}T00:00:00`);
    }
    return new Date();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDisplayDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    if (dateFormatLoading) return dateStr; // Return ISO date while loading
    return formatDate(dateStr);
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (min) {
      const minDate = new Date(`${min}T00:00:00`);
      if (date < minDate) return true;
    }
    
    if (max) {
      const maxDate = new Date(`${max}T00:00:00`);
      if (date > maxDate) return true;
    }
    
    return false;
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(viewDate);
    newDate.setDate(day);
    
    if (isDateDisabled(newDate)) return;
    
    const dateStr = newDate.toISOString().split('T')[0];
    onChange(dateStr);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    if (!isDateDisabled(today)) {
      const dateStr = today.toISOString().split('T')[0];
      onChange(dateStr);
      setViewDate(today);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    setIsOpen(false);
  };

  const daysInMonth = getDaysInMonth(viewDate);
  const firstDay = getFirstDayOfMonth(viewDate);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
          value ? '' : 'text-muted-foreground'
        }`}
      >
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-left">
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                handleClear();
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Clear date"
          >
            <X className="h-4 w-4" />
          </span>
        ) : null}
      </button>

      {isOpen ? <div className="absolute top-full z-50 mt-1 w-72 rounded-lg border bg-popover p-3 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-accent rounded"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-medium text-sm">
              {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-accent rounded"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-xs text-muted-foreground py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="p-1" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
              const isDisabled = isDateDisabled(date);
              const isSelected = value === date.toISOString().split('T')[0];
              const isToday = new Date().toISOString().split('T')[0] === date.toISOString().split('T')[0];

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  disabled={isDisabled}
                  className={`p-1 text-sm rounded transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : isToday
                      ? 'bg-accent font-medium'
                      : 'hover:bg-accent'
                  } ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between mt-3 pt-2 border-t">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="text-xs text-primary hover:underline"
            >
              Today
            </button>
          </div>
                </div> : null}
    </div>
  );
}

