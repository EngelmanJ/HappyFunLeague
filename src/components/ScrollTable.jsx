import React, { useEffect, useRef, useState } from 'react';

// The scroll viewport must have no padding: otherwise moving cells can paint
// into a gutter to the left of a sticky label. Clip at the same edge on all tables.
export default function ScrollTable({ label, children, className = '', tableClassName = '' }) {
  const viewport = useRef(null);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const element = viewport.current;
    const update = () => setOverflows(element.scrollWidth > element.clientWidth + 1);
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    observer.observe(element.querySelector('table'));
    return () => observer.disconnect();
  }, [children]);
  return (
    <div className={`table-shell ${className}`}>
      {overflows && <p className="lg:hidden px-3 py-2 text-xs text-slate-300">↔ Swipe or scroll sideways for more results</p>}
      <div ref={viewport} className="table-scroll" role="region" aria-label={label} tabIndex={0}>
        <table className={`league-table ${tableClassName}`} aria-label={label}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function FrozenCell({ heading = false, children, title }) {
  return <th scope={heading ? 'col' : 'row'} className="frozen-label" title={title}>{children}</th>;
}
