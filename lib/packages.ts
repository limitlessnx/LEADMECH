export type LeadPackage = {
  id: 'starter' | 'growth' | 'scale';
  name: string;
  leads: number;
  price: number;
  recommended?: boolean;
};

export const packages: LeadPackage[] = [
  { id: 'starter', name: 'Starter', leads: 10000, price: 30 },
  { id: 'growth', name: 'Growth', leads: 25000, price: 75, recommended: true },
  { id: 'scale', name: 'Scale', leads: 50000, price: 145 },
];

export function getPackage(id?: string | null) {
  return packages.find((item) => item.id === id) ?? packages[1];
}
