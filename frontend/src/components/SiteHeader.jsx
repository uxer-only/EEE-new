import { useState } from 'react';
import { Link } from 'react-router-dom';
import { List, X } from 'phosphor-react';
import { useAuth } from '@/context/AuthContext';

/**
 * Global site header with the standard three-item nav:
 *   - Logged out : Browse / Login / Advertise
 *   - Logged in  : Browse / Dashboard / Advertise
 *
 * Props (all optional):
 *  - leftSlot: React node rendered instead of the default logo (e.g. admin badge)
 *  - links: Array<{ to, label, variant?, testId, onClick? }>
 *      Overrides the default nav when explicitly provided. Kept for admin/back-link cases.
 */
export default function SiteHeader({ leftSlot = null, links = null }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const defaultLinks = user
    ? [
        { to: '/browse', label: 'Browse', testId: 'nav-browse' },
        { to: '/dashboard', label: 'Dashboard', testId: 'nav-dashboard' },
        { to: '/register/provider', label: 'Advertise', variant: 'primary', testId: 'nav-advertise' },
      ]
    : [
        { to: '/browse', label: 'Browse', testId: 'nav-browse' },
        { to: '/login', label: 'Login', testId: 'nav-login' },
        { to: '/register/provider', label: 'Advertise', variant: 'primary', testId: 'nav-advertise' },
      ];

  const navLinks = Array.isArray(links) && links.length > 0 ? links : defaultLinks;

  const renderItem = (item, onClick) => {
    const className = item.variant === 'primary' ? 'btn-primary' : 'btn-ghost';
    const handleClick = () => {
      onClick && onClick();
      item.onClick && item.onClick();
    };
    if (item.onClick && !item.to) {
      return (
        <button
          key={item.label}
          onClick={handleClick}
          className={className}
          data-testid={item.testId}
        >
          {item.label}
        </button>
      );
    }
    return (
      <Link
        key={item.label}
        to={item.to}
        className={className}
        data-testid={item.testId}
        onClick={onClick}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <header className="floating-header" data-testid="header">
      <div className="section-padding py-5 md:py-6 flex items-center justify-between">
        {leftSlot ? (
          leftSlot
        ) : (
          <Link to="/" data-testid="logo-link" onClick={() => setOpen(false)}>
            <h1 className="text-xl md:text-2xl font-playfair font-bold text-[#DA4167] whitespace-nowrap">
              Only Elite Escorts
            </h1>
          </Link>
        )}

        {/* Desktop */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => renderItem(l))}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden text-[#F2F0ED] p-2 -mr-2"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          data-testid="mobile-menu-toggle"
        >
          {open ? <X size={24} weight="bold" /> : <List size={24} weight="bold" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <nav
          className="md:hidden border-t border-[#27272A] bg-[#0A0A0C]/95 backdrop-blur"
          data-testid="mobile-menu"
        >
          <div className="section-padding py-4 flex flex-col gap-2">
            {navLinks.map((l) => (
              <div key={l.label} className="py-2">
                {renderItem(l, () => setOpen(false))}
              </div>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
