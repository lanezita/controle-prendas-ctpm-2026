import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Progressive Web App (PWA) Service Worker for offline capability
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('PWA Service Worker registered successfully:', registration.scope);

        const notifyUpdate = () => {
          console.log('Newer service worker version is available!');
          window.dispatchEvent(new CustomEvent('sw-update-available', { detail: registration }));
        };

        // If there is already a waiting service worker on load
        if (registration.waiting) {
          notifyUpdate();
        }

        // Monitor future service worker updates
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // A new worker is installed and waiting to replace the current active worker
                  notifyUpdate();
                }
              }
            };
          }
        };

        // Check for service worker updates periodically (every 5 minutes)
        setInterval(() => {
          registration.update().catch((err) => console.debug('Dynamic SW update check failed:', err));
        }, 1000 * 60 * 5);

        // Check for updates immediately when the user returns to/focuses the window
        window.addEventListener('focus', () => {
          registration.update().catch((err) => console.debug('Dynamic SW update check failed:', err));
        });
      })
      .catch((error) => {
        console.error('PWA Service Worker registration failed:', error);
      });

    // Automatically reload when a new service worker takes over the page
    let isRefreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!isRefreshing) {
        isRefreshing = true;
        console.log('New Service Worker controller activated. Reloading page...');
        window.location.reload();
      }
    });
  });
}

