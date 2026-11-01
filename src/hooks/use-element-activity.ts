'use client';

import { useEffect, useRef, useState } from 'react';

/** Decorative playback only runs while its section is visible in the active tab. */
export function useElementActivity<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let inView = false;
    const update = () => setIsActive(inView && document.visibilityState !== 'hidden');
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    observer.observe(element);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return { ref, isActive };
}
