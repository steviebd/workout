export function getWeekStart(date: Date = new Date()): Date {
  const dayOfWeek = date.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export function getWeekStartStr(date: Date = new Date()): string {
  const weekStart = getWeekStart(date);
  return new Date(weekStart.getTime() - weekStart.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

export function getWeekEnd(date: Date = new Date()): Date {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

export function getWeekEndStr(date: Date = new Date()): string {
  const weekEnd = getWeekEnd(date);
  return new Date(weekEnd.getTime() - weekEnd.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

export function getMonthStart(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getMonthStartStr(date: Date = new Date()): string {
  const monthStart = getMonthStart(date);
  return new Date(monthStart.getTime() - monthStart.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

export function getMonthsAgo(months: number, date: Date = new Date()): Date {
  const result = new Date(date);
  result.setMonth(date.getMonth() - months);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function getMonthsAgoStr(months: number, date: Date = new Date()): string {
  const dateVal = getMonthsAgo(months, date);
  return new Date(dateVal.getTime() - dateVal.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

export function getDaysAgo(days: number, date: Date = new Date()): Date {
  const result = new Date(date);
  result.setDate(date.getDate() - days);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function getDaysAgoStr(days: number, date: Date = new Date()): string {
  const dateVal = getDaysAgo(days, date);
  return new Date(dateVal.getTime() - dateVal.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

export function getTodayStr(): string {
  return new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
}
