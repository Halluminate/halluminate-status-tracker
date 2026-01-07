'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <nav className="bg-primary text-primary-foreground border-b border-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="text-lg font-bold">Project Status Tracker</div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className={`px-4 py-2 rounded-md transition-colors ${
                pathname === '/'
                  ? 'bg-background text-foreground font-semibold'
                  : 'hover:bg-primary-foreground/10'
              }`}
            >
              Problem Management
            </Link>
            <Link
              href="/experts"
              className={`px-4 py-2 rounded-md transition-colors ${
                pathname === '/experts' || pathname?.startsWith('/experts/')
                  ? 'bg-background text-foreground font-semibold'
                  : 'hover:bg-primary-foreground/10'
              }`}
            >
              Expert Management
            </Link>
            <Link
              href="/bonuses"
              className={`px-4 py-2 rounded-md transition-colors ${
                pathname === '/bonuses'
                  ? 'bg-background text-foreground font-semibold'
                  : 'hover:bg-primary-foreground/10'
              }`}
            >
              Bonus Management
            </Link>
            <div className="ml-2 border-l border-primary-foreground/20 pl-2">
              <ThemeToggle />
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-md transition-colors hover:bg-destructive ml-2"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
