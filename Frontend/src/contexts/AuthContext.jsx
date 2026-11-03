import { createContext, useEffect, useState } from 'react';
import { loginApi, verifyEmailApi, getMeApi, registerApi } from '../api/auth';
import { TOKEN_KEY, USER_KEY } from '../utils/constants';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    getMeApi()
      .then((res) => { setUser(res.data.user); localStorage.setItem(USER_KEY, JSON.stringify(res.data.user)); })
      .catch(() => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); setToken(null); setUser(null); })
      .finally(() => setLoading(false));
  }, [token]);

  const persist = (t, u) => {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(t); setUser(u);
  };

  const login = async (creds) => {
    const res = await loginApi(creds);
    persist(res.data.token, res.data.user);
    return res.data.user;
  };

  const register = async (payload) => (await registerApi(payload)).data;

  const verify = async ({ email, otp }) => {
    const res = await verifyEmailApi({ email, otp });
    persist(res.data.token, res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null); setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, verify, logout, isAuthenticated: !!token, role: user?.role }}>
      {children}
    </AuthContext.Provider>
  );
}