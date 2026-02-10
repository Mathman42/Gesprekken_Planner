import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../lib/contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Overview } from './pages/Overview';
import { BaseSettings } from './pages/BaseSettings';
import { ActivityLogPage } from './pages/ActivityLogPage';
import { TeacherManagement } from './pages/TeacherManagement';

type AdminPage = 'overview' | 'teachers' | 'settings' | 'activity-log';

export const AdminDashboard = () => {
  const [currentPage, setCurrentPage] = useState<AdminPage>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout, email } = useAuth();

  useEffect(() => {
    checkFirstTimeSetup();
  }, []);

  const checkFirstTimeSetup = async () => {
    // Check if there are any events in the database
    const { data: events } = await supabase
      .from('events')
      .select('id')
      .limit(1);

    // Check if settings have been configured
    const { data: settings } = await supabase
      .from('settings')
      .select('id')
      .limit(1);

    // If no events and no settings, it's first-time setup - go to settings
    if ((!events || events.length === 0) && (!settings || settings.length === 0)) {
      setCurrentPage('settings');
    }
  };

  const navigation = [
    { id: 'overview' as AdminPage, label: 'Overzicht', icon: LayoutDashboard },
    { id: 'teachers' as AdminPage, label: 'Docenten Beheren', icon: Users },
    { id: 'settings' as AdminPage, label: 'Basisinstellingen', icon: Settings },
    { id: 'activity-log' as AdminPage, label: 'Logboek', icon: FileText },
  ];

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return <Overview />;
      case 'teachers':
        return <TeacherManagement />;
      case 'settings':
        return <BaseSettings />;
      case 'activity-log':
        return <ActivityLogPage />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-gray-600 hover:text-gray-900"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-900 to-blue-700 rounded flex items-center justify-center">
                <span className="text-white text-sm font-bold">KC</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Kempenhorst College</h1>
                <p className="text-xs text-gray-600">Ouderavond Beheer</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{email}</p>
              <p className="text-xs text-gray-600">Administrator</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Uitloggen</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:sticky top-16 lg:top-16 left-0 z-30 w-64 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out overflow-y-auto`}
        >
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 mt-auto border-t border-gray-200">
            <div className="text-xs text-gray-600">
              <p className="font-medium">Kempenhorst College</p>
              <p className="mt-1">Eikenbussel 1</p>
              <p>5689 AA Oirschot</p>
              <p className="mt-1">T: +31 (0)499 58 21 60</p>
              <a href="https://kempenhorst.nl" className="text-blue-600 hover:underline">
                kempenhorst.nl
              </a>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">{renderPage()}</div>
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
