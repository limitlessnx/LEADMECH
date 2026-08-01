export type LeadPackage = {
  id: 'starter' | 'growth' | 'pro' | 'scale';
  name: string;
  leads: number;
  price: number;
  recommended?: boolean;
};

export const packages: LeadPackage[] = [
  { id: 'starter', name: 'Starter', leads: 5000, price: 35 },
  { id: 'growth', name: 'Growth', leads: 10000, price: 50 },
  { id: 'pro', name: 'Pro', leads: 25000, price: 100, recommended: true },
  { id: 'scale', name: 'Scale', leads: 50000, price: 180 },
];

export function getPackage(id?: string | null) {
  return packages.find((item) => item.id === id) ?? packages[1];
}
