import Link from 'next/link';

const items = [
  ['Dashboard', '/dashboard'],
  ['My Leads', '/dashboard/leads'],
  ['New Search', '/search'],
  ['Support', '/dashboard/support'],
  ['Orders', '/dashboard/orders'],
  ['Saved Templates', '/dashboard/templates'],
  ['Account', '/dashboard/account'],
  ['Admin', '/admin'],
] as const;

export function DashboardShell({ children, active = 'Dashboard' }: { children: React.ReactNode; active?: string }) {
  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <Link className="brand" href="/"><span className="logo">L</span>Leadmech</Link>
        <nav className="side-nav" aria-label="Dashboard navigation">
          {items.map(([label, href]) => (
            <Link key={label} className={active === label ? 'active' : ''} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
