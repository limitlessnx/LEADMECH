'use client';

import { useEffect, useLayoutEffect } from 'react';

export function LeadCountLock({ orderId, remaining }: { orderId: string; remaining: number }) {
  useLayoutEffect(() => {
    localStorage.removeItem(`leadmech-search-${orderId}`);
  }, [orderId]);

  useEffect(() => {
    const lock = () => {
      document.querySelectorAll<HTMLInputElement>('input[type="number"], input[type="range"]').forEach((input) => {
        input.value = String(remaining);
        input.disabled = true;
        input.readOnly = true;
        input.setAttribute('aria-readonly', 'true');
        input.setAttribute('aria-label', `Locked at ${remaining.toLocaleString('en-GB')} remaining leads`);
      });
    };
    lock();
    const observer = new MutationObserver(lock);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [remaining]);

  return (
    <div className="card" style={{ marginBottom: 18, borderColor: 'rgba(34,197,94,.35)' }}>
      <span className="eyebrow">Lead balance locked</span>
      <strong style={{ display: 'block', fontSize: 22, marginTop: 6 }}>{remaining.toLocaleString('en-GB')} leads remaining</strong>
      <p className="muted" style={{ marginBottom: 0 }}>This amount is fixed by your paid order. You cannot increase, decrease, or replace it during a search attempt.</p>
    </div>
  );
}
