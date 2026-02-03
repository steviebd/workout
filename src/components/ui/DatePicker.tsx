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
    
    const dateStr = new Date(newDate.getTime() - newDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
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
      const dateStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
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
        className={`flex h-11 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
          value ? '' : 'text-muted-foreground'
        }`}
      >
        <CalendarIcon className="h-5 w-5 text-muted-foreground" />
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
            <X className="h-5 w-5" />
          </span>
        ) : null}
      </button>

      {isOpen ? <div className="absolute top-full z-50 mt-1 w-[320px] sm:w-80 rounded-xl border bg-popover p-3 sm:p-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 active:scale-95 transition-colors touch-manipulation min-w-[48px] min-h-[48px]"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <span className="font-semibold text-base sm:text-lg px-2">
              {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 active:scale-95 transition-colors touch-manipulation min-w-[48px] min-h-[48px]"
              aria-label="Next month"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-xs sm:text-sm text-muted-foreground py-2 font-medium">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
              const isDisabled = isDateDisabled(date);
              const dateStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
              const isSelected = value === dateStr;
              const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
              const isToday = todayStr === dateStr;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  disabled={isDisabled}
                  className={`flex h-12 w-full items-center justify-center rounded-lg text-base transition-all active:scale-95 touch-manipulation ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : isToday
                      ? 'bg-accent font-medium ring-2 ring-primary/30'
                      : 'hover:bg-accent'
                  } ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                  aria-label={`Select ${monthNames[viewDate.getMonth()]} ${day}, ${viewDate.getFullYear()}`}
                  aria-pressed={isSelected}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between mt-4 pt-3 border-t">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors touch-manipulation min-h-[44px]"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-4 py-2.5 text-sm text-primary font-medium hover:bg-primary/10 rounded-lg transition-colors touch-manipulation min-h-[44px]"
            >
              Today
            </button>
          </div>
                </div> : null}
    </div>
  );
}

