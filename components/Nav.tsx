import Link from 'next/link';
export function Nav(){return <header className="container nav"><Link className="brand" href="/"><span className="logo">L</span>Leadmech</Link><nav className="navlinks"><a href="#how">How it works</a><a href="#pricing">Pricing</a><Link href="/dashboard">Dashboard</Link></nav><Link className="btn btn-primary" href="/auth">Get started</Link></header>}
