import { useState, useEffect } from 'react';
import { useAuth } from '../lib/contexts/AuthContext';
import { AdminLogin } from './auth/AdminLogin';
import { AdminRegistration } from './auth/AdminRegistration';
import { TeacherLogin } from './auth/TeacherLogin';
import { ParentLogin } from './auth/ParentLogin';
import CoordinatorLogin from './auth/CoordinatorLogin';
import { MagicLinkVerify } from './auth/MagicLinkVerify';
import { PasswordChange } from './auth/PasswordChange';
import { AdminDashboard } from './admin/AdminDashboard';
import { TeacherDashboard } from './teacher/TeacherDashboard';
import { ParentBooking } from './parent/ParentBooking';
import CoordinatorDashboard from './coordinator/CoordinatorDashboard';
import { InitAdmin } from './setup/InitAdmin';

export type Page =
  | 'home'
  | 'staff-login'
  | 'admin-login'
  | 'teacher-login'
  | 'coordinator-login'
  | 'admin-registration'
  | 'parent-login'
  | 'verify'
  | 'password-change'
  | 'admin-dashboard'
  | 'teacher-dashboard'
  | 'parent-booking'
  | 'coordinator-dashboard'
  | 'init-admin';

export const Router = () => {
  const { isAuthenticated, role, login } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [verifyToken, setVerifyToken] = useState<string>('');
  const [passwordChangeData, setPasswordChangeData] = useState<{
    email: string;
    userType: 'parent' | 'teacher';
  } | null>(null);

  const getPathForPage = (page: Page, token?: string) => {
    if (token) {
      return `/?token=${token}`;
    }

    switch (page) {
      case 'home':
        return '/';
      case 'staff-login':
        return '/staff-login';
      case 'parent-login':
        return '/plan';
      case 'teacher-login':
        return '/teacher-login';
      case 'coordinator-login':
        return '/coordinator-login';
      case 'admin-login':
        return '/admin-login';
      case 'admin-registration':
        return '/setup';
      case 'init-admin':
        return '/init-admin';
      default:
        return '/';
    }
  };

  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (path === '/setup' || path === '/admin/setup') {
      setCurrentPage('admin-registration');
      return;
    }

    if (path === '/init-admin') {
      setCurrentPage('init-admin');
      return;
    }

    if (token && !isAuthenticated) {
      setVerifyToken(token);
      setCurrentPage('verify');
      return;
    }

    if (isAuthenticated) {
      if (role === 'admin') {
        setCurrentPage('admin-dashboard');
      } else if (role === 'teacher') {
        setCurrentPage('teacher-dashboard');
      } else if (role === 'parent') {
        setCurrentPage('parent-booking');
      } else if (role === 'coordinator') {
        setCurrentPage('coordinator-dashboard');
      }
      return;
    }

    if (path === '/staff-login') {
      setCurrentPage('staff-login');
      return;
    }

    if (path === '/plan' || path === '/parent-login') {
      setCurrentPage('parent-login');
      return;
    }

    if (path === '/teacher-login') {
      setCurrentPage('teacher-login');
      return;
    }

    if (path === '/coordinator-login') {
      setCurrentPage('coordinator-login');
      return;
    }

    if (path === '/admin-login') {
      setCurrentPage('admin-login');
      return;
    }

    setCurrentPage('home');
  }, [isAuthenticated, role]);

  const navigate = (page: Page, token?: string) => {
    setCurrentPage(page);

    if (token) {
      setVerifyToken(token);
    }

    const nextPath = getPathForPage(page, token);
    window.history.pushState({}, '', nextPath);
  };

  if (currentPage === 'home') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-40 h-40 bg-gradient-to-br from-blue-900 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white text-5xl font-bold">KC</span>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Gesprekkenplanner
            </h1>
            <p className="text-gray-600 mb-8">
              Plan eenvoudig een gesprek met school.
            </p>

            <div className="max-w-md mx-auto space-y-4">
              <button
                onClick={() => navigate('parent-login')}
                className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium py-4 px-6 rounded-lg transition-colors"
              >
                <div className="text-lg mb-1">Plan een gesprek</div>
                <div className="text-sm opacity-90">Voor ouders/verzorgers</div>
              </button>

              <button
                onClick={() => navigate('staff-login')}
                className="text-blue-700 hover:text-blue-900 font-medium underline underline-offset-4"
              >
                Personeelslogin
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-600">
              <p>Kempenhorst College</p>
              <p>Eikenbussel 1, 5689 AA Oirschot</p>
              <p>T: +31 (0)499 58 21 60</p>
              <p className="mt-2">
                <a href="https://kempenhorst.nl" className="text-blue-600 hover:underline">
                  kempenhorst.nl
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'staff-login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 px-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Personeelslogin
            </h1>
            <p className="text-gray-600 mb-8">
              Kies uw rol om verder te gaan.
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('teacher-login')}
                className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-4 px-6 rounded-lg transition-colors"
              >
                <div className="text-lg mb-1">Docent</div>
                <div className="text-sm opacity-90">Beschikbaarheid beheren</div>
              </button>

              <button
                onClick={() => navigate('coordinator-login')}
                className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-4 px-6 rounded-lg transition-colors"
              >
                <div className="text-lg mb-1">Coördinator</div>
                <div className="text-sm opacity-90">Gesprekken bekijken</div>
              </button>

              <button
                onClick={() => navigate('admin-login')}
                className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-4 px-6 rounded-lg transition-colors"
              >
                <div className="text-lg mb-1">Admin</div>
                <div className="text-sm opacity-90">Beheer</div>
              </button>
            </div>

            <button
              onClick={() => navigate('home')}
              className="mt-8 text-blue-700 hover:text-blue-900 font-medium underline underline-offset-4"
            >
              Terug naar ouderingang
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'admin-login') {
    return <AdminLogin />;
  }

  if (currentPage === 'teacher-login') {
    return (
      <TeacherLogin
        onPasswordChangeRequired={(email) => {
          setPasswordChangeData({ email, userType: 'teacher' });
          setCurrentPage('password-change');
        }}
      />
    );
  }

  if (currentPage === 'coordinator-login') {
    return <CoordinatorLogin />;
  }

  if (currentPage === 'admin-registration') {
    return <AdminRegistration />;
  }

  if (currentPage === 'init-admin') {
    return <InitAdmin />;
  }

  if (currentPage === 'parent-login') {
    return (
      <ParentLogin
        onBack={() => navigate('home')}
        onLoginSuccess={(email, requirePasswordChange) => {
          if (requirePasswordChange) {
            setPasswordChangeData({ email, userType: 'parent' });
            setCurrentPage('password-change');
          } else {
            login(email, 'parent');
            setTimeout(() => {
              window.location.reload();
            }, 100);
          }
        }}
      />
    );
  }

  if (currentPage === 'verify') {
    return <MagicLinkVerify token={verifyToken} />;
  }

  if (currentPage === 'password-change' && passwordChangeData) {
    return (
      <PasswordChange
        email={passwordChangeData.email}
        userType={passwordChangeData.userType}
        isRequired={true}
        onSuccess={() => {
          const { email, userType } = passwordChangeData;
          setPasswordChangeData(null);

          if (userType === 'parent') {
            login(email, 'parent');
            setTimeout(() => {
              window.location.reload();
            }, 100);
          } else {
            window.location.reload();
          }
        }}
      />
    );
  }

  if (currentPage === 'admin-dashboard' && isAuthenticated && role === 'admin') {
    return <AdminDashboard />;
  }

  if (currentPage === 'teacher-dashboard' && isAuthenticated && role === 'teacher') {
    return <TeacherDashboard />;
  }

  if (currentPage === 'parent-booking' && isAuthenticated && role === 'parent') {
    return <ParentBooking />;
  }

  if (currentPage === 'coordinator-dashboard' && isAuthenticated && role === 'coordinator') {
    return <CoordinatorDashboard />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Laden...</h1>
      </div>
    </div>
  );
};
