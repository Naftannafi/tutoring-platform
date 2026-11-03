import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { getApiError } from '../../api/client';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { PASSWORD_REGEX, PHONE_REGEX, BLOCKED_EMAIL_DOMAINS } from '../../utils/constants';

export default function Register() {
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', phone: '',
    role: 'student',
    location: { kebele: '', woreda: '', city: 'Dire Dawa', specificAddress: '' },
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    if (!PASSWORD_REGEX.test(form.password)) return 'Password must be 8+ chars with uppercase, lowercase, and a number';
    if (!PHONE_REGEX.test(form.phone)) return 'Use a valid Ethiopian phone (e.g., 0912345678)';
    const domain = form.email.split('@')[1]?.toLowerCase();
    if (BLOCKED_EMAIL_DOMAINS.includes(domain)) return 'Please use a real email address';
    if (!form.location.kebele || !form.location.woreda) return 'Kebele and Woreda are required';
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const v = validate();
    if (v) return setError(v);
    setLoading(true);
    try {
      const res = await register(form);
      navigate('/verify-email', { state: { email: form.email, devOtp: res.otp } });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border p-8">
        <h1 className="text-2xl font-bold mb-1">Create your account</h1>
        <p className="text-sm text-slate-500 mb-6">Join Dire Dawa Tutors</p>

        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">I am a</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="student">Student</option>
                <option value="tutor">Tutor</option>
              </select>
            </div>
            <Input label="Full name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 chars, 1 upper, 1 lower, 1 number" />
          <Input label="Phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0912345678" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Kebele" required value={form.location.kebele} onChange={(e) => setForm({ ...form, location: { ...form.location, kebele: e.target.value } })} />
            <Input label="Woreda" required value={form.location.woreda} onChange={(e) => setForm({ ...form, location: { ...form.location, woreda: e.target.value } })} />
          </div>
          <Button type="submit" loading={loading} size="lg" className="w-full">Create account</Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account? <Link to="/login" className="text-brand-600 font-medium hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}