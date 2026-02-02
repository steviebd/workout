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

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return '1 month ago';
  return `${Math.floor(diffDays / 30)} months ago`;
}
