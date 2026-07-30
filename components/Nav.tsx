import Link from 'next/link';

export function Nav() {
  return (
    <header className="container nav">
      <Link className="brand" href="/"><span className="logo">L</span>Leadmech</Link>
      <nav className="navlinks">
        <Link href="/#how">How it works</Link>
        <Link href="/#pricing">Pricing</Link>
        <Link href="/dashboard">Dashboard</Link>
      </nav>
      <Link className="btn btn-primary" href="/auth">Get started</Link>
    </header>
  );
}
