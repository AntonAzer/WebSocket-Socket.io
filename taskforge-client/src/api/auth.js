import api, { setAccessToken } from './axios';

/**
 * Thin wrapper around the auth endpoints. Each function updates the
 * in-memory access token as a side effect so callers (AuthContext) don't
 * have to remember to do it themselves.
 */
export const authApi = {
  async signup({ name, email, password }) {
    const { data } = await api.post('/auth/signup', { name, email, password });
    setAccessToken(data.accessToken);
    return data.user;
  },

  async login({ email, password }) {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    return data.user;
  },

  async refresh() {
    const { data } = await api.post('/auth/refresh');
    setAccessToken(data.accessToken);
    return data.accessToken;
  },

  async logout() {
    await api.post('/auth/logout');
    setAccessToken(null);
  },

  async me() {
    const { data } = await api.get('/auth/me');
    return data.user;
  },
};
