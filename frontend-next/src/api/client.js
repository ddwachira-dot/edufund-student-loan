import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sl_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    // A closed/banned account is rejected on every request, so drop the stale
    // session instead of leaving the user on a page that cannot load.
    const closed = status === 403 && /^this account has been closed/i.test(err.response?.data?.message || '');
    if (status === 401 || closed) {
      localStorage.removeItem('sl_token');
      localStorage.removeItem('sl_user');
      sessionStorage.removeItem('sl_welcome_pending');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;