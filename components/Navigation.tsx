'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-900 text-white border-b-2 border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="text-lg font-bold">TAIGA Project Management</div>

          <div className="flex gap-2">
            <Link
              href="/"
              className={`px-4 py-2 rounded transition-colors ${
                pathname === '/'
                  ? 'bg-white text-gray-900 font-semibold'
                  : 'hover:bg-gray-800'
              }`}
            >
              Status Tracker
            </Link>
            <Link
              href="/experts"
              className={`px-4 py-2 rounded transition-colors ${
                pathname === '/experts'
                  ? 'bg-white text-gray-900 font-semibold'
                  : 'hover:bg-gray-800'
              }`}
            >
              Expert Management
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
