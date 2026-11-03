import { Link, NavLink, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Avatar from '../components/ui/Avatar';
import {
  Home, Calendar, DollarSign, User, LogOut,
  GraduationCap, Settings, Users, ShieldCheck, BarChart3
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout } = useAuth();

  const links =
    user?.role === 'admin'
      ? [
          { to: '/admin', label: 'Overview', icon: Home, end: true },
          { to: '/admin/tutors/pending', label: 'Pending Tutors', icon: ShieldCheck },
          { to: '/admin/tutors', label: 'All Tutors', icon: GraduationCap },
          { to: '/admin/users', label: 'Users', icon: Users },
          { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
        ]
      : user?.role === 'tutor'
      ? [
          { to: '/tutor', label: 'Dashboard', icon: Home, end: true },
          { to: '/tutor/sessions', label: 'Sessions', icon: Calendar },
          { to: '/tutor/availability', label: 'Availability', icon: Calendar },
          { to: '/tutor/earnings', label: 'Earnings', icon: DollarSign },
          { to: '/tutor/profile', label: 'My Profile', icon: User },
        ]
      : [
          { to: '/student', label: 'Dashboard', icon: Home, end: true },
          { to: '/student/sessions', label: 'My Sessions', icon: Calendar },
          { to: '/student/profile', label: 'Profile', icon: User },
          { to: '/tutors', label: 'Find a Tutor', icon: GraduationCap },
        ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="hidden md:flex w-64 bg-white border-r flex-col sticky top-0 h-screen">
        <Link to="/" className="px-5 py-4 border-b flex items-center gap-2 font-bold text-brand-600">
          <GraduationCap className="h-5 w-5" />
          <span className="text-sm">Dire Dawa Tutors</span>
        </Link>

        <div className="px-4 py-4 border-b flex items-center gap-3">
          <Avatar name={user?.fullName} src={user?.profileImage} size="md" />
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{user?.fullName}</p>
            <p className="text-xs text-brand-600 capitalize">{user?.role}</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold text-brand-600 text-sm">Dire Dawa Tutors</Link>
          <button onClick={logout} className="text-red-600 text-sm">Logout</button>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}