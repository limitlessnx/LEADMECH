'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const ACTION_SELECTOR = [
  'a[href]',
  'button[type="submit"]',
  'input[type="submit"]',
  '.btn-primary',
  '[data-global-loading="true"]',
].join(',');

export function GlobalActionLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let safetyTimer: ReturnType<typeof setTimeout> | undefined;

    const hide = () => {
      if (timer) clearTimeout(timer);
      if (safetyTimer) clearTimeout(safetyTimer);
      setVisible(false);
    };

    const show = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setVisible(true), 80);
      safetyTimer = setTimeout(hide, 20000);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const action = target?.closest<HTMLElement>(ACTION_SELECTOR);
      if (!action) return;
      if (action.dataset.noGlobalLoading === 'true') return;
      if (action.getAttribute('aria-disabled') === 'true') return;
      if ('disabled' in action && Boolean((action as HTMLButtonElement).disabled)) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = action.closest<HTMLAnchorElement>('a[href]');
      if (anchor) {
        const href = anchor.getAttribute('href') || '';
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
        if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      }

      show();
    };

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (!form || form.dataset.noGlobalLoading === 'true') return;
      show();
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('submit', handleSubmit, true);
    window.addEventListener('pageshow', hide);
    window.addEventListener('unhandledrejection', hide);
    window.addEventListener('error', hide);

    return () => {
      if (timer) clearTimeout(timer);
      if (safetyTimer) clearTimeout(safetyTimer);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('submit', handleSubmit, true);
      window.removeEventListener('pageshow', hide);
      window.removeEventListener('unhandledrejection', hide);
      window.removeEventListener('error', hide);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="top-action-loader" role="status" aria-live="polite" aria-label="Loading">
      <span />
      <span />
      <span />
    </div>
  );
}
