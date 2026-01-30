import { type DateFormat } from './db/preferences';

export function formatDate(dateString: string, dateFormat: DateFormat): string {
  const date = new Date(dateString);
  if (dateFormat === 'dd/mm/yyyy') {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  }
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  });
}

export function formatDateLong(dateString: string, dateFormat: DateFormat): string {
  const date = new Date(dateString);
  if (dateFormat === 'dd/mm/yyyy') {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  });
}

export function formatDateShort(dateString: string, dateFormat: DateFormat): string {
  const date = new Date(dateString);
  if (dateFormat === 'dd/mm/yyyy') {
    return date.toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
    });
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
