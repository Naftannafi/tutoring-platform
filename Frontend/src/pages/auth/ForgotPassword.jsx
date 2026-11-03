import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPasswordApi } from '../../api/auth';
import { getApiError } from '../../api/client';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await forgotPasswordApi({ email });
      setSent(true);
      if (res.data?.resetToken) setDevToken(res.data.resetToken);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border p-8">
        <h1 className="text-2xl font-bold mb-1">Forgot password</h1>
        <p className="text-sm text-slate-500 mb-6">Enter your email to receive a reset link</p>

        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

        {sent ? (
          <>
            <Alert type="success">
              If <strong>{email}</strong> is registered, a reset link has been sent.
            </Alert>
            {devToken && (
              <div className="mt-4 space-y-3">
                <Alert type="info">Test token: <code className="break-all text-xs">{devToken}</code></Alert>
                <Button onClick={() => nav('/reset-password', { state: { token: devToken } })} className="w-full">
                  Continue to reset page
                </Button>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" loading={loading} size="lg" className="w-full">Send reset link</Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          Remembered it? <Link to="/login" className="text-brand-600 font-medium hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}