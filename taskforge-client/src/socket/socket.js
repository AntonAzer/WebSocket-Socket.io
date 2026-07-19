import { io } from 'socket.io-client';
import { getAccessToken } from '@/api/axios';
import { authApi } from '@/api/auth';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

/**
 * Lazily creates the single shared socket connection, authenticated with
 * the current in-memory access token. `autoConnect: false` because we
 * want AuthContext to control exactly when a session exists before
 * opening the socket.
 */
const getSocket = () => {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
    auth: (cb) => cb({ token: getAccessToken() }),
  });

  /**
   * The access token is 15-minute-lived. If it expired between page load
   * and this connection attempt (or during a long session), the server's
   * socketAuth middleware rejects the handshake with 'invalid or expired
   * token'. Rather than surfacing that to the user, silently refresh via
   * the same REST endpoint the axios interceptor uses, then retry once
   * with the new token.
   */
  socket.on('connect_error', async (err) => {
    if (err.message?.includes('token') && !socket._retriedAuth) {
      socket._retriedAuth = true;
      try {
        await authApi.refresh();
        socket.connect();
      } catch {
        // Refresh token is also gone — AuthContext's own refresh-on-load
        // and 'taskforge:session-expired' handling will route the user
        // back to /login; nothing more for the socket layer to do.
      }
    }
  });

  socket.on('connect', () => {
    socket._retriedAuth = false;
  });

  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  socket?.disconnect();
};

export default getSocket;
