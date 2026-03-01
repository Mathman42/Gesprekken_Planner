import { useState, useEffect } from 'react';
import {
  Calendar,
  LogOut,
  Menu,
  X,
  Clock,
  Users,
  BookOpen,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../lib/contexts/AuthContext';
import { AvailabilityManager } from './pages/AvailabilityManager';
import { ParentsManagement } from './pages/ParentsManagement';
import { TeacherSettings } from './pages/TeacherSettings';
import { MyBookings } from './pages/MyBookings';
import AgendaManager from './pages/AgendaManager';
import ClosedAgendaViewer from './pages/ClosedAgendaViewer';
import AgendaEditorModal from './modals/AgendaEditorModal';
import { supabase } from '../../lib/supabase';

type TeacherPage = 'availability' | 'parents' | 'events' | 'bookings' | 'settings';

export const TeacherDashboard = () => {
  const [currentPage, setCurrentPage] = useState<TeacherPage>('parents');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [viewingAgendaId, setViewingAgendaId] = useState<string | null>(null);
  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);
  const [showAgendaEditor, setShowAgendaEditor] = useState(false);
  const { logout, email } = useAuth();

  useEffect(() => {
    if (email) {
      loadTeacherId();
    }
  }, [email]);

  const loadTeacherId = async () => {
    if (!email) return;

    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;
      if (data) setTeacherId(data.id);
    } catch (err) {
      console.error('Failed to load teacher ID:', err);
    }
  };

  const navigation = [
    { id: 'parents' as TeacherPage, label: 'Ouders Beheren', icon: Users },
    { id: 'events' as TeacherPage, label: 'Agenda\'s Beheren', icon: Calendar },
    { id: 'bookings' as TeacherPage, label: 'Mijn Gesprekken', icon: BookOpen },
    { id: 'availability' as TeacherPage, label: 'Beschikbaarheid', icon: Clock },
    { id: 'settings' as TeacherPage, label: 'Basisinstellingen', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const handleCreateAgenda = () => {
    setEditingAgendaId(null);
    setShowAgendaEditor(true);
  };

  const handleEditAgenda = (agendaId: string) => {
    setEditingAgendaId(agendaId);
    setShowAgendaEditor(true);
  };

  const handleViewAgenda = (agendaId: string) => {
    setViewingAgendaId(agendaId);
  };

  const handleCloseAgendaEditor = () => {
    setShowAgendaEditor(false);
    setEditingAgendaId(null);
  };

  const handleAgendaSaved = () => {
    setShowAgendaEditor(false);
    setEditingAgendaId(null);
  };

  const renderPage = () => {
    if (currentPage === 'events' && viewingAgendaId) {
      return (
        <ClosedAgendaViewer
          agendaId={viewingAgendaId}
          onBack={() => setViewingAgendaId(null)}
        />
      );
    }

    switch (currentPage) {
      case 'parents':
        return <ParentsManagement />;
      case 'events':
        return teacherId ? (
          <AgendaManager
            teacherId={teacherId}
            onEditAgenda={handleEditAgenda}
            onViewAgenda={handleViewAgenda}
            onCreateNew={handleCreateAgenda}
          />
        ) : (
          <div className="p-8 text-center text-gray-600">Loading...</div>
        );
      case 'bookings':
        return <MyBookings />;
      case 'availability':
        return <AvailabilityManager />;
      case 'settings':
        return <TeacherSettings />;
      default:
        return <ParentsManagement />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
                <p className="text-xs text-gray-600">Docent Dashboard</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{email}</p>
              <p className="text-xs text-gray-600">Docent</p>
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

        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">{renderPage()}</div>
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {showAgendaEditor && teacherId && (
        <AgendaEditorModal
          teacherId={teacherId}
          agendaId={editingAgendaId}
          onClose={handleCloseAgendaEditor}
          onSave={handleAgendaSaved}
        />
      )}
    </div>
  );
};
