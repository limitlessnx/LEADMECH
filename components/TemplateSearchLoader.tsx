'use client';

import { useEffect, useState } from 'react';
import { SearchBuilder } from '@/components/SearchBuilder';

type OrderSummary = {
  id: string;
  orderCode: string;
  leadCount: number;
  packageName: string;
  deliveryEmail: string;
};

export function TemplateSearchLoader({ order, templateFilters }: { order: OrderSummary; templateFilters?: Record<string, unknown> | null }) {
  const [ready, setReady] = useState(!templateFilters);

  useEffect(() => {
    if (!templateFilters) return;
    try {
      localStorage.removeItem(`leadmech-search-${order.id}`);
      localStorage.setItem(`leadmech-search-${order.id}`, JSON.stringify(templateFilters));
    } finally {
      setReady(true);
    }
  }, [order.id, templateFilters]);

  if (!ready) return <div className="card"><p className="muted">Loading saved search filters…</p></div>;
  return <SearchBuilder order={order} />;
}
