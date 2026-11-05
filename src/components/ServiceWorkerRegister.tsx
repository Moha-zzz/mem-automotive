'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration);
        })
        .catch((err) => {
          console.warn('⚠️ Service Worker registration failed:', err);
        });
    }
  }, []);

  return null;
}
