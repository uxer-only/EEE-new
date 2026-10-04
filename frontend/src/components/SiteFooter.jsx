import { Link } from 'react-router-dom';

export const SiteFooter = () => (
  <footer className="section-padding py-12 border-t border-[#27272A] relative z-10" data-testid="footer">
    <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4">
      <p className="text-[#52525B] text-sm text-center sm:text-left">
        © 2026 Elite Escorts Europe. All rights reserved.
      </p>
      <div className="flex gap-6 sm:gap-8 text-[#52525B] text-sm">
        <Link to="/terms" className="hover:text-[#A3243B] transition-colors" data-testid="footer-terms-link">Terms, Privacy &amp; Cookies</Link>
        <Link to="/advertising-prices" className="hover:text-[#A3243B] transition-colors" data-testid="footer-advertising-link">Advertising prices</Link>
        <Link to="/contact" className="hover:text-[#A3243B] transition-colors" data-testid="footer-contact-link">Contact</Link>
        <Link to="/admin/login" className="hover:text-[#A3243B] transition-colors" data-testid="footer-admin-link">Admin</Link>
      </div>
    </div>
  </footer>
);
