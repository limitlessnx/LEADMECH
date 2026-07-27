import Link from 'next/link';

export function DashboardShell({ children, active = 'Dashboard' }: { children: React.ReactNode; active?: string }) {
  const items = [
    ['Dashboard', '/dashboard'],
    ['New Search', '/search'],
    ['Orders', '/dashboard'],
    ['Saved Templates', '/dashboard'],
    ['Account', '/dashboard'],
    ['Admin', '/admin'],
  ];

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <Link className="brand" href="/"><span className="logo">L</span>Leadmech</Link>
        <div className="side-nav">
          {items.map(([label, href]) => <Link key={label} className={active === label ? 'active' : ''} href={href}>{label}</Link>)}
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
