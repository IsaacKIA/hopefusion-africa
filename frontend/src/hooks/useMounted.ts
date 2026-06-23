import { useState, useEffect } from 'react';

/**
 * Returns true only after the component has mounted on the client.
 * Use this to defer rendering of user-dependent content (e.g. user?.email)
 * that would cause SSR/client hydration mismatches, since localStorage is
 * unavailable during server-side rendering.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}
