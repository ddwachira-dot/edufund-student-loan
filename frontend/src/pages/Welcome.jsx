import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const stats = [
  { num: '$2,789,800+', label: 'given out in student loans' },
  { num: '4,678+', label: 'students funded so far' },
  { num: '50', label: 'states across the United States' },
];

export default function Welcome() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .post('/auth/welcome-seen')
      .then(({ data }) => setUser(data.user))
      .catch(() => setUser({ ...user, welcome_seen_at: new Date().toISOString() }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = () => {
    sessionStorage.removeItem('sl_welcome_pending');
    navigate(user?.role === 'admin' ? '/admin/applications' : '/dashboard');
  };

  return (
    <div className="container">
      <div className="card welcome-hero">
        <h1 className="page-title">Welcome to FundEd</h1>
        <p className="page-sub">
          The one place for students to apply for student loans. Since we
          started, we have given <strong>$2,789,800</strong> to over{' '}
          <strong>4,678 students</strong> all over the United States — and the list
          keeps growing.
        </p>

        <div className="impact-grid">
          {stats.map((s) => (
            <div key={s.label} className="impact-stat">
              <div className="impact-num">{s.num}</div>
              <div className="impact-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex space-between mt" style={{ alignItems: 'center', gap: 12 }}>
          <Link to="/learn" className="hint">Explore the Learn section →</Link>
          <button className="btn lg" onClick={go}>
            Go to my dashboard
          </button>
        </div>
      </div>
    </div>
  );
}