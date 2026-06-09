'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/push';

/**
 * Registers the HopeFusion service worker on client mount.
 * Renders nothing — purely a side-effect component.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
