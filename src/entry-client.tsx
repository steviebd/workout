import { StartClient } from '@tanstack/react-start/client';
import { hydrateRoot } from 'react-dom/client';

const root = document;

if (root) {
  try {
    hydrateRoot(root, <StartClient />);
  } catch (error) {
    console.error('Hydration error:', error);
    window.location.reload();
  }
}
