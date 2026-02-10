import { useState, useEffect } from 'react';
import { Plus, Mail, Edit2, Trash2, Check, X, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Teacher {
  id: string;
  email: string;
  name: string;
  password_must_change: boolean;
  created_at: string;
}

export const TeacherManagement = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    passwordMustChange: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeachers(data || []);
    } catch (err) {
      console.error('Error loading teachers:', err);
      setError('Kan docenten niet laden');
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (formData.password.length < 8) {
        setError('Wachtwoord moet minimaal 8 karakters zijn');
        setSubmitting(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Niet geautoriseerd');
        setSubmitting(false);
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-teacher`;
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      if (editingTeacher) {
        const response = await fetch(apiUrl, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            id: editingTeacher.id,
            email: formData.email,
            name: formData.name,
            password: formData.password || undefined,
            password_must_change: formData.passwordMustChange,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Fout bij bijwerken docent');
        }

        setSuccess('Docent succesvol bijgewerkt');
      } else {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            email: formData.email,
            name: formData.name,
            password: formData.password,
            password_must_change: formData.passwordMustChange,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          console.error('Edge Function error:', result);
          throw new Error(result.error || 'Fout bij toevoegen docent');
        }

        setSuccess('Docent succesvol toegevoegd');
        await sendTeacherInvitation(formData.email, formData.name, formData.password);
      }

      setFormData({ email: '', name: '', password: '', passwordMustChange: true });
      setShowForm(false);
      setEditingTeacher(null);
      loadTeachers();
    } catch (err: any) {
      console.error('Error saving teacher:', err);
      setError(err.message || 'Er is een fout opgetreden');
    } finally {
      setSubmitting(false);
    }
  };

  const sendTeacherInvitation = async (email: string, name: string, password: string) => {
    try {
      const loginUrl = `${window.location.origin}/teacher-login`;

      console.log(`
Uitnodiging voor docent:
Naam: ${name}
Email: ${email}
Wachtwoord: ${password}
Login URL: ${loginUrl}
      `);

      setSuccess(`Docent toegevoegd. Login: ${email} / ${password}`);
    } catch (err) {
      console.error('Error sending invitation:', err);
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      email: teacher.email,
      name: teacher.name,
      password: '',
      passwordMustChange: teacher.password_must_change,
    });
    setShowForm(true);
  };

  const handleDelete = async (teacherId: string) => {
    if (!confirm('Weet u zeker dat u deze docent wilt verwijderen? Alle gerelateerde gegevens worden ook verwijderd.')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Niet geautoriseerd');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-teacher`;
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ id: teacherId }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Fout bij verwijderen docent');
      }

      setSuccess('Docent succesvol verwijderd');
      loadTeachers();
    } catch (err: any) {
      console.error('Error deleting teacher:', err);
      setError(err.message || 'Kan docent niet verwijderen');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTeacher(null);
    setFormData({ email: '', name: '', password: '', passwordMustChange: true });
    setError('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Docenten Beheren</h2>
          <p className="text-gray-600 mt-1">Voeg docenten toe en beheer hun toegang</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={20} />
            Docent toevoegen
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
            <X size={18} />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-700 hover:text-green-900">
            <X size={18} />
          </button>
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {editingTeacher ? 'Docent bewerken' : 'Nieuwe docent toevoegen'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Naam
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Volledige naam"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mailadres
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="docent@kempenhorst.nl"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tijdelijk wachtwoord
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                    placeholder="Minimaal 8 karakters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Genereer
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="passwordMustChange"
                checked={formData.passwordMustChange}
                onChange={(e) => setFormData({ ...formData, passwordMustChange: e.target.checked })}
                className="w-4 h-4 text-blue-900 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="passwordMustChange" className="text-sm text-gray-700">
                Wachtwoord moet gewijzigd worden bij eerste login
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={18} />
                {submitting ? 'Bezig...' : editingTeacher ? 'Bijwerken' : 'Toevoegen'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <X size={18} />
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {teachers.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            Nog geen docenten toegevoegd
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Naam
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    E-mail
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Toegevoegd
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {teacher.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {teacher.email}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {teacher.password_must_change ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Wachtwoord wijzigen vereist
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Actief
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(teacher.created_at).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(teacher)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Bewerken"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(teacher.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Verwijderen"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
