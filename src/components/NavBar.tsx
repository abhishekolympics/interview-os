import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';

const primaryLinks = [
  { to: '/',              label: 'Mission Control', end: true },
  { to: '/memory-palace', label: 'Memory Palace',   end: false },
  { to: '/stefan',        label: 'Stefan',          end: false },
  { to: '/panic',         label: 'Panic Mode',      end: false },
];

const secondaryLinks = [
  { to: '/request-lab',   label: 'Request Lab' },
  { to: '/request-flow',  label: 'Request Flow' },
  { to: '/architecture',  label: 'Architecture' },
  { to: '/overview',      label: 'Repo Overview' },
];

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-surface-950/95 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">

        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-brand-400 font-mono font-bold text-sm tracking-widest">INTERVIEW OS</span>
          <span className="hidden md:inline text-gray-600 text-xs font-mono">/ Red Planet</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-0.5">
          {primaryLinks.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
                }`
              }
            >
              {label}
            </NavLink>
          ))}

          {/* Separator */}
          <span className="w-px h-4 bg-gray-800 mx-1.5" />

          {secondaryLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-800 text-gray-200'
                    : 'text-gray-600 hover:text-gray-300 hover:bg-white/5'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <span className="block w-5 h-0.5 bg-current mb-1" />
          <span className="block w-5 h-0.5 bg-current mb-1" />
          <span className="block w-5 h-0.5 bg-current" />
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-800 bg-surface-950 px-4 py-4 space-y-1" onClick={() => setMenuOpen(false)}>
          {[...primaryLinks, ...secondaryLinks].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
