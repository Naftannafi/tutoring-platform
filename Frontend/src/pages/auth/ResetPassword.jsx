import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { resetPasswordApi } from '../../api/auth';
import { getApiError } from '../../api/client';
import { PASSWORD_REGEX } from '../../utils/constants';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';

export default function ResetPassword() {
  const loc = useLocation();
  const nav = useNavigate();
  const [token, setToken] = useState(loc.state?.token || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!PASSWORD_REGEX.test(password)) {
      return setError('Password must be 8+ chars with uppercase, lowercase, and a number');
    }
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      await resetPasswordApi({ token, newPassword: password });
      setDone(true);
      setTimeout(() => nav('/login', { replace: true }), 1500);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border p-8">
        <h1 className="text-2xl font-bold mb-1">Reset password</h1>
        <p className="text-sm text-slate-500 mb-6">Choose a new password for your account</p>

        {done ? (
          <Alert type="success">Password reset! Redirecting to login…</Alert>
        ) : (
          <>
            {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
            <form onSubmit={submit} className="space-y-4">
              {!loc.state?.token && (
                <Input label="Reset token" required value={token} onChange={(e) => setToken(e.target.value)} />
              )}
              <Input label="New password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              <Input label="Confirm password" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              <Button type="submit" loading={loading} size="lg" className="w-full">Reset password</Button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link to="/login" className="text-brand-600 font-medium hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}