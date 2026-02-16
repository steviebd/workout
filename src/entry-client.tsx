import { StartClient } from '@tanstack/react-start/client';
import { hydrateRoot } from 'react-dom/client';

const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('weekStart') ||
      message.includes('stackedBarStart') ||
      message.includes('tooltipPosition') ||
      message.includes('parentViewBox') ||
      message.includes('isActive') ||
      message.includes('dataKey') ||
      message.includes('The width') ||
      message.includes('and height'))
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

const root = document;

if (root) {
  try {
    hydrateRoot(root, <StartClient />);
  } catch (error) {
    console.error('Hydration error:', error);
    window.location.reload();
  }
}
