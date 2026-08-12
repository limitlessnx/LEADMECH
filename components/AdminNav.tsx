import Link from 'next/link';

const items = [
  ['Overview', '/admin'],
  ['Orders', '/admin/orders'],
  ['Runs', '/admin/runs'],
  ['Users', '/admin/users'],
  ['Files', '/admin/files'],
  ['Support', '/admin/support'],
];

export function AdminNav({ active }: { active: string }) {
  return (
    <div className="card" style={{ marginBottom: 18, padding: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {items.map(([label, href]) => (
          <Link key={href} href={href} className={`btn ${active === label ? 'btn-primary' : 'btn-secondary'}`}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
