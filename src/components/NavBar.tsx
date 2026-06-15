import { useState } from 'react';
import { NavLink, Link, useParams, useNavigate } from 'react-router-dom';
import { useRepo } from '../contexts/RepoContext';

const COLOR_CLASSES: Record<string, { dot: string; badge: string }> = {
  blue:   { dot: 'bg-blue-400',   badge: 'text-blue-400 bg-blue-400/10'   },
  purple: { dot: 'bg-purple-400', badge: 'text-purple-400 bg-purple-400/10' },
  amber:  { dot: 'bg-amber-400',  badge: 'text-amber-400 bg-amber-400/10'  },
};

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { repoId } = useParams<{ repoId: string }>();
  const { activeRepo } = useRepo();
  const navigate = useNavigate();

  const base = `/${repoId}`;

  const primaryLinks = [
    { to: `${base}`,               label: 'Command Center', end: true  },
    { to: `${base}/memory-palace`, label: 'Memory Palace',  end: false },
    { to: `${base}/code-walk`,     label: 'Code Walk',      end: false },
    { to: `${base}/request-lab`,   label: 'Request Lab',    end: false },
  ];

  const secondaryLinks = [
    { to: `${base}/architecture`, label: 'Architecture Lab' },
    { to: `${base}/panic`,        label: 'Panic Mode'       },
    { to: `${base}/stefan`,       label: 'Stefan Mode'      },
  ];

  const colors = COLOR_CLASSES[activeRepo.color] ?? COLOR_CLASSES.blue;

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-surface-950/95 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">

        {/* Brand + active repo indicator */}
        <Link to={base} className="flex items-center gap-2 shrink-0">
          <span className="text-brand-400 font-mono font-bold text-sm tracking-widest">REPO OS</span>
          <span className="hidden md:inline text-gray-600 text-xs font-mono">/ Red Planet</span>
          <span className={`hidden md:inline-flex items-center gap-1.5 ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${colors.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            {activeRepo.shortLabel}
          </span>
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

          {/* Separator */}
          <span className="w-px h-4 bg-gray-800 mx-1.5" />

          {/* Switch Repo */}
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-gray-500 hover:text-gray-200 hover:bg-white/5 border border-gray-800 hover:border-gray-600"
          >
            Switch Repo
          </button>
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
          {/* Active repo pill */}
          <div className={`flex items-center gap-2 px-4 py-2 mb-2 rounded-lg text-xs font-semibold ${colors.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            {activeRepo.label}
          </div>

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

          {/* Switch Repo in mobile */}
          <button
            onClick={() => navigate('/')}
            className="block w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-gray-500 hover:text-gray-200 hover:bg-white/5 border border-gray-800 hover:border-gray-600 mt-2"
          >
            Switch Repo
          </button>
        </div>
      )}
    </nav>
  );
}
