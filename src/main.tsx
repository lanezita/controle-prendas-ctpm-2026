import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Force-cleanup old Progressive Web App (PWA) Service Workers and Caches to prevent locking versions
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister().then((unregistered) => {
        if (unregistered) {
          console.log('Successfully unregistered old service worker');
        }
      });
    });
  });
}

if ('caches' in window) {
  caches.keys().then((names) => {
    names.forEach((name) => {
      caches.delete(name).then((deleted) => {
        if (deleted) {
          console.log('Successfully deleted old cache:', name);
        }
      });
    });
  });
}

