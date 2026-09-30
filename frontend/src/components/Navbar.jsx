import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { avatarUrl } from '../utils/fileUrl';

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const landingAnchors = [
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'faq', label: 'FAQ' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const goAnchor = (id) => (e) => {
    e.preventDefault();
    if (pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate(`/#${id}`);
    }
    setMenuOpen(false);
  };

  const onLogout = () => {
    logout();
    navigate('/');
  };

  const goTop = () => {
    if (pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const studentLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/apply', label: 'Apply for Loan' },
    { to: '/loans', label: 'My Loans' },
    { to: '/payments', label: 'Payments' },
  ];
  const adminLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/admin/applications', label: 'Applications' },
    { to: '/admin/verifications', label: 'Verifications' },
    { to: '/admin/rates', label: 'Interest Rate' },
  ];
  const privateLinks = user ? [...(user.role === 'admin' ? adminLinks : studentLinks), { to: '/profile', label: 'Profile' }] : [];

  return (
    <header className={`navbar${scrolled ? ' scrolled' : ''}`}>
      <NavLink to="/" className="brand" aria-label="FundEd home" onClick={goTop}>
        <span>Fund</span>Ed
      </NavLink>

      <nav className="nav-links" aria-label="Primary">
        {user ? (
          privateLinks.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {l.label}
            </NavLink>
          ))
        ) : (
          landingAnchors.map((a) => (
            <a key={a.id} href={`#${a.id}`} onClick={goAnchor(a.id)}>
              {a.label}
            </a>
          ))
        )}
      </nav>

      <div className="nav-actions">
        {user ? (
          <div className="user-chip">
            <NavLink to="/profile" className="avatar-link">
              {user.profile_pic ? (
                <img className="avatar" src={avatarUrl(user.profile_pic)} alt="" />
              ) : (
                <span className="avatar">{user.name?.charAt(0)?.toUpperCase()}</span>
              )}
            </NavLink>
            <div className="whoami">
              <div style={{ fontWeight: 700, fontSize: 14 }}>{user.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{user.role === 'admin' ? 'Administrator' : 'Student'}</div>
            </div>
            <button className="btn outline sm" onClick={onLogout}>Logout</button>
          </div>
        ) : (
          <>
            <NavLink to="/login" className="btn outline sm">Login</NavLink>
            <NavLink to="/apply" className="btn accent-grad sm cta">Apply now</NavLink>
          </>
        )}
        <button className="icon-btn hamburger" onClick={() => setMenuOpen((o) => !o)} aria-label="Open menu" aria-expanded={menuOpen}>
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {(
        <nav className={`mobile-menu${menuOpen ? ' open' : ''}`} aria-label="Mobile" aria-hidden={!menuOpen}>
          {user ? (
            <>
              <div className="user-chip" style={{ padding: '16px 8px', borderBottom: '1px solid var(--glass-line)' }}>
                {user.profile_pic ? (
                  <img className="avatar" src={avatarUrl(user.profile_pic)} alt="" />
                ) : (
                  <span className="avatar">{user.name?.charAt(0)?.toUpperCase()}</span>
                )}
                <div>
                  <div style={{ fontWeight: 700 }}>{user.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{user.role === 'admin' ? 'Administrator' : 'Student'}</div>
                </div>
              </div>
              {privateLinks.map((l) => (
                <NavLink key={l.to} to={l.to} onClick={() => setMenuOpen(false)}>{l.label}</NavLink>
              ))}
              <button className="btn outline" onClick={onLogout} style={{ marginTop: 18 }}>Logout</button>
            </>
          ) : (
            <>
              {landingAnchors.map((a) => (
                <a key={a.id} href={`#${a.id}`} onClick={goAnchor(a.id)}>
                  {a.label}
                </a>
              ))}
              <NavLink to="/learn" onClick={() => setMenuOpen(false)}>Learn</NavLink>
              <NavLink to="/about" onClick={() => setMenuOpen(false)}>About / Our aim</NavLink>
              <NavLink to="/register" className="btn accent-grad" onClick={() => setMenuOpen(false)}>Create account</NavLink>
              <NavLink to="/login" className="btn outline" onClick={() => setMenuOpen(false)}>Login</NavLink>
            </>
          )}
        </nav>
      )}
    </header>
  );
}