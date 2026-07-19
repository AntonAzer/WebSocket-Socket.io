import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

/**
 * The in-memory access token. Deliberately NOT persisted to localStorage
 * or sessionStorage — a stray XSS payload can read those, but it can't
 * read a plain JS module variable outside its own execution context in
 * any way that matters here. Lost on full page refresh, which is exactly
 * why `AuthContext` calls `/auth/refresh` on app boot to silently
 * re-establish a session from the httpOnly cookie.
 */
let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends/receives the httpOnly refresh-token cookie
});

// Attach the access token to every outgoing request.
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Queue of requests waiting on an in-flight token refresh, so concurrent
// 401s don't each trigger their own /refresh call.
let isRefreshing = false;
let pendingQueue = [];

const resolvePendingQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthRoute = originalRequest?.url?.includes('/auth/');

    // Only attempt a silent refresh for a 401 on a non-auth route, and
    // only once per request (the `_retry` flag prevents infinite loops
    // if the refreshed token is somehow rejected again).
    if (status === 401 && !isAuthRoute && !originalRequest._retry) {
      if (isRefreshing) {
        // A refresh is already underway — queue this request behind it.
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.accessToken);
        resolvePendingQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        resolvePendingQueue(refreshError, null);
        setAccessToken(null);
        // Let the app react to a fully-expired session (e.g. redirect to
        // /login) rather than deciding that here — see AuthContext.
        window.dispatchEvent(new CustomEvent('taskforge:session-expired'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
