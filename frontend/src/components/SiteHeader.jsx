import { useState } from 'react';
import { Link } from 'react-router-dom';
import { List, X } from 'phosphor-react';
import { useAuth } from '@/context/AuthContext';

/**
 * Responsive site header with mobile hamburger.
 * Props:
 *  - links: Array<{ to, label, variant?: 'ghost' | 'primary', onClick? }>
 *    If onClick is provided, renders a <button> instead of <Link>.
 */
export default function SiteHeader({ links = [], leftSlot = null }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const renderItem = (item, onClick) => {
    const className =
      item.variant === 'primary' ? 'btn-primary' : 'btn-ghost';
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
            <h1 className="text-xl md:text-2xl font-playfair text-[#C6A87C] whitespace-nowrap">Only Elite Escorts</h1>
          </Link>
        )}

        {/* Desktop */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => renderItem(l))}
        </nav>

        {/* Mobile hamburger */}
        {links.length > 0 && (
          <button
            type="button"
            className="md:hidden text-[#F2F0ED] p-2 -mr-2"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            data-testid="mobile-menu-toggle"
          >
            {open ? <X size={24} weight="bold" /> : <List size={24} weight="bold" />}
          </button>
        )}
      </div>

      {/* Mobile drawer */}
      {open && (
        <nav
          className="md:hidden border-t border-[#27272A] bg-[#0A0A0C]/95 backdrop-blur"
          data-testid="mobile-menu"
        >
          <div className="section-padding py-4 flex flex-col gap-2">
            {links.map((l) => (
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
