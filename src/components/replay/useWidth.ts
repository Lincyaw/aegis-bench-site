import { useLayoutEffect, useRef, useState } from 'react';

/** An element's width as it lays out, kept up to date as it resizes; 0 until it has laid out. */
export function useWidth<Element extends HTMLElement>() {
  const ref = useRef<Element>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      throw new Error('the element to measure renders before its layout effect runs');
    }
    const measure = () => setWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}
