import { useMemo } from 'react';
import { AccessTime, Email, Facebook, LinkedIn, LocationOn, Phone, Twitter } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  const navigate = useNavigate();

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const brand = {
    name: 'EATZILLA',
    tagline: 'Food delivery & restaurant management platform.',
    addressLine1: '123 Main Street',
    addressLine2: 'Lahore, Punjab',
    phone: '+92 300 1234567',
  };

  const menuItems = [
    { label: 'Menu', href: '/customer/menu' },
    { label: 'Reservations', href: '/reservations' },
    { label: 'Our Story', href: '/about' },
    { label: 'Contact Us', href: '/contact' },
  ];

  const legalLinks = [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
  ];

  return (
    <footer className="eatz-footer" aria-label="EATZILLA footer">
      <div className="eatz-footer__container">
        <div className="eatz-footer__grid">
          <section className="eatz-footer__brand" aria-label="Brand information">
            <div>
              <div className="eatz-footer__brand-name">
                EAT<span>ZILLA</span>
              </div>
              <p className="eatz-footer__brand-tagline">{brand.tagline}</p>
              <p className="eatz-footer__brand-tagline">Serving Lahore since 2024.</p>
            </div>

            <div className="eatz-footer__social" aria-label="Social links">
              <a className="eatz-footer__social-btn" href="#" aria-label="Facebook" onClick={(e) => e.preventDefault()}>
                <Facebook className="eatz-footer__icon" />
              </a>
              <a className="eatz-footer__social-btn" href="#" aria-label="LinkedIn" onClick={(e) => e.preventDefault()}>
                <LinkedIn className="eatz-footer__icon" />
              </a>
              <a className="eatz-footer__social-btn" href="#" aria-label="Twitter" onClick={(e) => e.preventDefault()}>
                <Twitter className="eatz-footer__icon" />
              </a>
            </div>
          </section>

          <section className="eatz-footer__contact-block" aria-label="Contact">
            <div className="eatz-footer__heading">Contact</div>
            <div className="eatz-footer__contact">
              <div className="eatz-footer__contact-row">
                <LocationOn className="eatz-footer__contact-icon" />
                <div className="eatz-footer__contact-text">{brand.addressLine1}, {brand.addressLine2}</div>
              </div>
              <div className="eatz-footer__contact-row">
                <Phone className="eatz-footer__contact-icon" />
                <div className="eatz-footer__contact-text">{brand.phone}</div>
              </div>
              <div className="eatz-footer__contact-row">
                <Email className="eatz-footer__contact-icon" />
                <div className="eatz-footer__contact-text">hello@eatzilla.com</div>
              </div>
              <div className="eatz-footer__contact-row">
                <AccessTime className="eatz-footer__contact-icon" />
                <div className="eatz-footer__contact-text">Mon–Sat: 11AM–11PM</div>
              </div>
            </div>
          </section>

          <nav className="eatz-footer__nav eatz-footer__nav--simple" aria-label="Quick links">
            <div className="eatz-footer__heading">Quick Links</div>
            <ul className="eatz-footer__list">
              {menuItems.map((item) => (
                <li key={item.label}>
                  <a
                    className="eatz-footer__link"
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(item.href);
                    }}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="eatz-footer__bottom" aria-label="Footer bottom bar">
          <div className="eatz-footer__bottom-inner">
            <div className="eatz-footer__copyright">
              © {currentYear} Eatzilla. All rights reserved.
            </div>
            <div className="eatz-footer__bottom-links">
              {legalLinks.map((item) => (
                <a
                  key={item.label}
                  className="eatz-footer__bottom-link"
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.href);
                  }}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
