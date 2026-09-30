import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { avatarUrl } from '../utils/fileUrl';

const DOC_LABEL = { drivers_license: 'US driver’s license', passport: 'Passport' };

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [uplBusy, setUplBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [verification, setVerification] = useState(null);

  useEffect(() => {
    if (user?.role === 'student') {
      api
        .get('/verify/identity')
        .then(({ data }) => setVerification(data.verification))
        .catch(() => setVerification(null));
    }
  }, [user?.role]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const applyUser = (u) => {
    localStorage.setItem('sl_user', JSON.stringify(u));
    setUser(u);
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setOk('');
    setUplBusy(true);
    setPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post('/auth/profile-picture', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      applyUser(data.user);
      setOk('Profile photo updated');
    } catch (err) {
      setError(err.response?.data?.message || 'Photo upload failed');
      setPreview(null);
    } finally {
      setUplBusy(false);
      e.target.value = '';
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    setBusy(true);
    try {
      const { data } = await api.patch('/auth/profile', form);
      applyUser(data.user);
      setOk('Profile updated');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update profile');
    } finally {
      setBusy(false);
    }
  };

  const avatarSrc = preview || avatarUrl(user?.profile_pic);

  return (
    <div className="container">
      <h1 className="page-title">Profile</h1>
      <p className="page-sub">Your account details and profile picture</p>

      {error && <div className="alert error mb">{error}</div>}
      {ok && <div className="alert success mb">{ok}</div>}

      <div className="card mb">
        <div className="profile-head">
          {avatarSrc ? (
            <img className="avatar avatar-lg" src={avatarSrc} alt={user?.name} />
          ) : (
            <div className="avatar avatar-lg">{user?.name?.charAt(0)?.toUpperCase()}</div>
          )}
          <div>
            <h3 style={{ margin: 0 }}>{user?.name}</h3>
            <div className="muted">{user?.email}</div>
            <div className="hint" style={{ marginTop: 6 }}>
              <span className={`badge ${user?.role}`}>{user?.role}</span>
            </div>
            <label className="btn outline sm upload-btn" style={{ marginTop: 12 }}>
              {uplBusy ? 'Uploading…' : 'Upload photo'}
              <input type="file" accept="image/*" onChange={uploadPhoto} disabled={uplBusy} hidden />
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <form className="card" onSubmit={save}>
          <h3 className="mb">Personal information</h3>
          <div className="field">
            <label>Full name</label>
            <input className="input" value={form.name} onChange={set('name')} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input className="input" value={user?.email || ''} disabled />
            <p className="hint">Email is your login and cannot be changed here.</p>
          </div>
          <div className="field">
            <label>Phone</label>
            <input className="input" value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" />
          </div>
          <div className="field">
            <label>Address</label>
            <textarea className="textarea" value={form.address} onChange={set('address')} placeholder="Current residential address" />
          </div>
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </form>

        <div className="card">
          <h3 className="mb">Account details</h3>
          <div className="profile-row"><span>Account type</span><strong>{user?.role}</strong></div>
          <div className="profile-row"><span>Member since</span><strong>{new Date(user?.created_at).toLocaleDateString()}</strong></div>
          <div className="profile-row">
            <span>Terms accepted</span>
            <strong>{user?.accepted_terms_at ? new Date(user.accepted_terms_at).toLocaleDateString() : '—'}</strong>
          </div>
          <div className="profile-row"><span>Loan status</span><strong>{user?.role === 'admin' ? 'Administrator' : 'Student borrower'}</strong></div>
          {user?.role === 'student' && (
            <div className="profile-row">
              <span>Identity verification</span>
              <strong>
                {verification ? (
                  <>
                    {DOC_LABEL[verification.doc_type]}{' '}
                    <span className={`badge ${verification.status}`}>{verification.status}</span>
                  </>
                ) : (
                  <Link to="/verify">Not verified — complete it →</Link>
                )}
              </strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}