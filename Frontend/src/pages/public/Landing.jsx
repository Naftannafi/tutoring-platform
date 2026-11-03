import { Link } from 'react-router-dom';
import { Search, Users, Shield, GraduationCap } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-brand-600 text-lg">
            <GraduationCap className="h-6 w-6" /> Dire Dawa Tutors
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-brand-600">Login</Link>
            <Link to="/register" className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 text-sm font-medium">Sign up</Link>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-br from-brand-600 to-brand-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <GraduationCap className="mx-auto h-16 w-16 mb-6" />
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Find Your Perfect Tutor in Dire Dawa</h1>
          <p className="text-lg md:text-xl text-brand-100 mb-8 max-w-2xl mx-auto">
            Connect with verified, experienced tutors for all subjects. Book sessions online and pay securely.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/register" className="rounded-lg bg-white text-brand-700 px-6 py-3 font-medium hover:bg-brand-50">Get Started</Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-6">
        {[
          { icon: Search, title: 'Search & Filter', desc: 'Find tutors by subject, grade level, and price.' },
          { icon: Shield, title: 'Verified Tutors', desc: 'Every tutor is reviewed and approved by our team.' },
          { icon: Users, title: 'Secure Booking', desc: 'Book sessions, chat, and pay — all in one place.' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white rounded-xl border p-6 text-center">
            <Icon className="mx-auto h-10 w-10 text-brand-600 mb-4" />
            <h3 className="font-semibold mb-2">{title}</h3>
            <p className="text-sm text-slate-600">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}