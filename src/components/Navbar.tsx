import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { useToast } from '../context/ToastContext';
import { NotificationBell } from './NotificationBell';

export function Navbar() {
  const { user, pendingCount, logout } = useAuth();
  const { unreadMessagesCount } = useRealtime();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    showToast('You have been signed out.', 'info');
    navigate('/');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
      isActive
        ? 'text-slate-900 border-indigo-600'
        : 'text-slate-600 border-transparent hover:text-slate-900'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Single-line brand wordmark */}
        <Link
          to={user ? '/dashboard' : '/'}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span
            aria-hidden="true"
            className="w-6 h-6 rounded-md bg-slate-900 text-white inline-flex items-center justify-center text-xs font-bold"
          >
            C
          </span>
          CampusConnect
        </Link>

        {/* Zone 2: Clean single-line navigation links */}
        <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-5">
          {user ? (
            <>
              <NavLink to="/dashboard" className={navLinkClass}>
                Home
              </NavLink>
              <NavLink to="/discover" className={navLinkClass}>
                Find Partners
              </NavLink>
              <NavLink to="/requests/new" className={navLinkClass}>
                Create Request
              </NavLink>
              <NavLink to="/my-requests" className={navLinkClass}>
                My Requests
              </NavLink>
              <NavLink to="/connections" className={navLinkClass}>
                <span className="inline-flex items-center gap-1">
                  Connections
                  {pendingCount > 0 && (
                    <span className="text-xs font-mono tabular-nums font-semibold text-indigo-700">
                      ({pendingCount})
                    </span>
                  )}
                </span>
              </NavLink>
              <NavLink to="/messages" className={navLinkClass}>
                <span className="inline-flex items-center gap-1">
                  Messages
                  {unreadMessagesCount > 0 && (
                    <span className="text-xs font-mono tabular-nums font-semibold text-indigo-700">
                      ({unreadMessagesCount})
                    </span>
                  )}
                </span>
              </NavLink>
              <NavLink to="/profile" className={navLinkClass}>
                Profile
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" end className={navLinkClass}>
                Home
              </NavLink>
              <NavLink to="/discover" className={navLinkClass}>
                Find Partners
              </NavLink>
              <a
                href="/#categories"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent"
              >
                Categories
              </a>
              <a
                href="/#how-it-works"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent"
              >
                How It Works
              </a>
            </>
          )}
        </nav>

        {/* Zone 3: Right actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {user && <NotificationBell />}

          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Logout
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-1">
          {user ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                Home
              </Link>
              <Link
                to="/discover"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                Find Partners
              </Link>
              <Link
                to="/requests/new"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                Create Request
              </Link>
              <Link
                to="/my-requests"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                My Requests
              </Link>
              <Link
                to="/connections"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                <span>Connections</span>
                {pendingCount > 0 && (
                  <span className="text-xs font-mono tabular-nums font-semibold text-indigo-700">
                    {pendingCount} pending
                  </span>
                )}
              </Link>
              <Link
                to="/messages"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                <span>Messages</span>
                {unreadMessagesCount > 0 && (
                  <span className="text-xs font-mono tabular-nums font-semibold text-indigo-700">
                    {unreadMessagesCount} unread
                  </span>
                )}
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                Profile
              </Link>
              <div className="pt-3 mt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-rose-700 hover:bg-rose-50"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                Home
              </Link>
              <Link
                to="/discover"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                Find Partners
              </Link>
              <div className="pt-3 mt-2 border-t border-slate-200 flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block text-center px-4 py-2.5 rounded-lg text-sm font-medium text-slate-800 border border-slate-200 hover:bg-slate-50"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="block text-center px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-700 hover:bg-indigo-800"
                >
                  Sign Up
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
