import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { GraduationCap, LogOut } from 'lucide-react';
import Avatar from '../components/ui/Avatar';

export default function MainLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const nav = useNavigate();

  const dashboardPath =
    user?.role === 'admin' ? '/admin' : user?.role === 'tutor' ? '/tutor' : '/student';

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition ${isActive ? 'text-brand-600' : 'text-slate-600 hover:text-brand-600'}`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-brand-600 text-lg">
            <GraduationCap className="h-6 w-6" />
            <span>Dire Dawa Tutors</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <NavLink to="/tutors" className={linkClass}>Find Tutors</NavLink>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to={dashboardPath} className="flex items-center gap-2 rounded-full hover:bg-slate-100 p-1 pr-3 transition">
                  <Avatar name={user?.fullName} src={user?.profileImage} size="sm" />
                  <span className="hidden sm:inline text-sm font-medium text-slate-700">
                    {user?.fullName?.split(' ')[0]}
                  </span>
                </Link>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-brand-600">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 text-sm font-medium transition"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-white">
        <div className="max-w-7xl mx-auto px-4 py-8 text-sm text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Dire Dawa Tutors · Connecting students and tutors</p>
          <div className="flex gap-4">
            <Link to="/tutors" className="hover:text-brand-600">Tutors</Link>
            <Link to="/register" className="hover:text-brand-600">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}