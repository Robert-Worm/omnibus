import {useEffect, useRef, useState, type ReactNode} from 'react';

/**
 * Named scroll regions need keyboard focus (WCAG 2.1.1). The lint configuration
 * permits it only in this component; fitting tables stay out of the tab order.
 */
export default function ScrollablePreview({className, children}: {className: string; children: ReactNode}) {
  const container = useRef<HTMLElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  // A new worksheet can replace the observed child without resizing the frame.
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setOverflowing(element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight);
    });
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => observer.disconnect();
  }, [children]);
  return <section ref={container} className={className} tabIndex={overflowing ? 0 : -1} aria-label="Voorbeeld van je werkblad">{children}</section>;
}
