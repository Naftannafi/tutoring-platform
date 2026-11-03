import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { resendOtpApi } from '../../api/auth';
import { getApiError } from '../../api/client';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';

export default function VerifyEmail() {
  const nav = useNavigate();
  const loc = useLocation();
  const email = loc.state?.email || '';
  const devOtp = loc.state?.devOtp;
  const { verify } = useAuth();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(devOtp ? `Test OTP: ${devOtp}` : '');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!email) nav('/register', { replace: true });
  }, [email, nav]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await verify({ email, otp });
      alert(`Verified! Logged in as ${user.fullName}`);
      nav('/');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    setInfo('');
    try {
      const res = await resendOtpApi({ email });
      setCooldown(60);
      setInfo(res.data?.otp ? `New Test OTP: ${res.data.otp}` : 'A new code has been sent to your email.');
    } catch (err) {
      setError(getApiError(err));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border p-8">
        <h1 className="text-2xl font-bold mb-1">Verify your email</h1>
        <p className="text-sm text-slate-500 mb-6">
          Enter the 6-digit code sent to <strong>{email}</strong>
        </p>

        {info && <div className="mb-4"><Alert type="info">{info}</Alert></div>}
        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Verification code"
            inputMode="numeric"
            maxLength={6}
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
          />
          <Button type="submit" loading={loading} size="lg" className="w-full">Verify</Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <button
            onClick={resend}
            disabled={cooldown > 0}
            className="text-brand-600 font-medium hover:underline disabled:opacity-50"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      </div>
    </div>
  );
}