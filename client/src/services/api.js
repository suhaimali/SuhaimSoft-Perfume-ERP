import axios from 'axios';
import { isTokenExpired } from '../utils/token';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise = null;

// Request interceptor: check if access token is expired and proactively refresh it
api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');

  // If access token is expired but refresh token exists, refresh before sending
  if (token && isTokenExpired(token) && refreshToken && !config.url?.includes('/auth/')) {
    if (!refreshPromise) {
      refreshPromise = axios
        .post('/api/v1/auth/refresh', { refreshToken })
        .then((res) => {
          const newTokens = res.data.data.tokens;
          localStorage.setItem('access_token', newTokens.access);
          localStorage.setItem('refresh_token', newTokens.refresh);
          return newTokens.access;
        })
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          return null;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const refreshedToken = await refreshPromise;
    if (refreshedToken) {
      token = refreshedToken;
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 fallback gracefully
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      !original?._retry &&
      !original?.url?.includes('/auth/login') &&
      !original?.url?.includes('/auth/refresh')
    ) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken && !isTokenExpired(refreshToken)) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken });
          const newAccess = data.data.tokens.access;
          localStorage.setItem('access_token', newAccess);
          localStorage.setItem('refresh_token', data.data.tokens.refresh);
          original.headers.Authorization = `Bearer ${newAccess}`;
          return api(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
