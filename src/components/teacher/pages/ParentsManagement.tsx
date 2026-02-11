import { useState, useEffect } from 'react';
import { Plus, Mail, Edit2, Trash2, Check, X, Send, Eye, EyeOff, FileText, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/contexts/AuthContext';
import bcrypt from 'bcryptjs';

interface Parent {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  password_must_change: boolean;
  created_at: string;
}

export const ParentsManagement = () => {
  const { email: teacherEmail } = useAuth();
  const [parents, setParents] = useState<Parent[]>([]);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [selectedParents, setSelectedParents] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    hasPassword: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState('');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [previewParentId, setPreviewParentId] = useState<string>('');
  const [teacherName, setTeacherName] = useState('');
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);

  useEffect(() => {
    loadTeacherAndParents();
    loadPasswordChangeSetting();
  }, [teacherEmail]);

  const loadTeacherAndParents = async () => {
    try {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id, name')
        .eq('email', teacherEmail)
        .single();

      if (teacher) {
        setTeacherId(teacher.id);
        setTeacherName(teacher.name);
        await loadParents(teacher.id);
        await loadEmailTemplate(teacher.id);
      }
    } catch (err) {
      console.error('Error loading teacher:', err);
      setError('Kan gegevens niet laden');
    } finally {
      setLoading(false);
    }
  };

  const loadParents = async (teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from('parents')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setParents(data || []);
    } catch (err) {
      console.error('Error loading parents:', err);
      setError('Kan ouders niet laden');
    }
  };

  const loadEmailTemplate = async (teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from('teacher_settings')
        .select('invitation_email_template')
        .eq('teacher_id', teacherId)
        .single();

      if (error) throw error;

      const defaultTemplate = `Onderwerp: Uitnodiging voortgangsgesprek

Beste ouder/verzorger,

U bent uitgenodigd om een voortgangsgesprek in te plannen.
Klik op de link hieronder om een datum en tijd te kiezen.

Inloggen kan met:

Gebruikersnaam: [email-ouder]
Wachtwoord: [wachtwoord]

Link: [login-link]

Met vriendelijke groet,
[naam-docent]`;

      setEmailTemplate(data?.invitation_email_template || defaultTemplate);
    } catch (err) {
      console.error('Error loading email template:', err);
    }
  };

  const loadPasswordChangeSetting = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'parent_password_must_change_on_first_login')
        .maybeSingle();

      if (data && data.value !== undefined) {
        setRequirePasswordChange(data.value === true);
      }
    } catch (err) {
      console.error('Error loading password change setting:', err);
    }
  };

  const saveEmailTemplate = async () => {
    if (!teacherId) return;

    setTemplateLoading(true);
    try {
      const { error } = await supabase
        .from('teacher_settings')
        .update({ invitation_email_template: emailTemplate })
        .eq('teacher_id', teacherId);

      if (error) throw error;
      setSuccess('Template succesvol opgeslagen');
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Kan template niet opslaan');
    } finally {
      setTemplateLoading(false);
    }
  };

  const resetToDefaultTemplate = () => {
    const defaultTemplate = `Onderwerp: Uitnodiging voortgangsgesprek

Beste ouder/verzorger,

U bent uitgenodigd om een voortgangsgesprek in te plannen.
Klik op de link hieronder om een datum en tijd te kiezen.

Inloggen kan met:

Gebruikersnaam: [email-ouder]
Wachtwoord: [wachtwoord]

Link: [login-link]

Met vriendelijke groet,
[naam-docent]`;

    setEmailTemplate(defaultTemplate);
  };

  const getPreviewContent = () => {
    if (!previewParentId) return emailTemplate;

    const parent = parents.find(p => p.id === previewParentId);
    if (!parent) return emailTemplate;

    const loginUrl = `${window.location.origin}/parent-login`;

    let preview = emailTemplate;
    preview = preview.replace(/\[naam-ouder\]/g, parent.name);
    preview = preview.replace(/\[email-ouder\]/g, parent.email);
    preview = preview.replace(/\[naam-docent\]/g, teacherName);
    preview = preview.replace(/\[login-link\]/g, loginUrl);

    if (parent.password_hash) {
      preview = preview.replace(/\[wachtwoord\]/g, '[persoonlijk wachtwoord]');
    } else {
      preview = preview.replace(/\[wachtwoord\]/g, '(gebruik magic link om in te loggen)');
    }

    return preview;
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password, hasPassword: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (!teacherId) {
        setError('Docent ID niet gevonden');
        setSubmitting(false);
        return;
      }

      let hashedPassword = null;
      if (formData.hasPassword && formData.password) {
        if (formData.password.length < 8) {
          setError('Wachtwoord moet minimaal 8 karakters zijn');
          setSubmitting(false);
          return;
        }
        hashedPassword = await bcrypt.hash(formData.password, 10);
      }

      if (editingParent) {
        const updateData: any = {
          email: formData.email,
          name: formData.name,
        };

        if (hashedPassword) {
          updateData.password_hash = hashedPassword;
          updateData.password_must_change = true;
        }

        const { error: updateError } = await supabase
          .from('parents')
          .update(updateData)
          .eq('id', editingParent.id);

        if (updateError) throw updateError;
        setSuccess('Ouder succesvol bijgewerkt');
      } else {
        const { error: insertError } = await supabase
          .from('parents')
          .insert({
            email: formData.email,
            name: formData.name,
            password_hash: hashedPassword,
            password_must_change: hashedPassword ? requirePasswordChange : false,
            teacher_id: teacherId,
          });

        if (insertError) throw insertError;
        setSuccess('Ouder succesvol toegevoegd');
      }

      setFormData({ email: '', name: '', password: '', hasPassword: false });
      setShowForm(false);
      setEditingParent(null);
      if (teacherId) loadParents(teacherId);
    } catch (err: any) {
      console.error('Error saving parent:', err);
      setError(err.message || 'Er is een fout opgetreden');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (parent: Parent) => {
    setEditingParent(parent);
    setFormData({
      email: parent.email,
      name: parent.name,
      password: '',
      hasPassword: !!parent.password_hash,
    });
    setShowForm(true);
  };

  const handleDelete = async (parentId: string) => {
    if (!confirm('Weet u zeker dat u deze ouder wilt verwijderen?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('parents')
        .delete()
        .eq('id', parentId);

      if (error) throw error;
      setSuccess('Ouder succesvol verwijderd');
      if (teacherId) loadParents(teacherId);
    } catch (err: any) {
      console.error('Error deleting parent:', err);
      setError(err.message || 'Kan ouder niet verwijderen');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingParent(null);
    setFormData({ email: '', name: '', password: '', hasPassword: false });
    setError('');
  };

  const toggleSelectParent = (parentId: string) => {
    const newSelected = new Set(selectedParents);
    if (newSelected.has(parentId)) {
      newSelected.delete(parentId);
    } else {
      newSelected.add(parentId);
    }
    setSelectedParents(newSelected);
  };

  const selectAll = () => {
    if (selectedParents.size === parents.length) {
      setSelectedParents(new Set());
    } else {
      setSelectedParents(new Set(parents.map(p => p.id)));
    }
  };

  const sendInvitations = async () => {
    if (selectedParents.size === 0) {
      setError('Selecteer minimaal één ouder');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    const selectedParentsList = parents.filter(p => selectedParents.has(p.id));
    const loginUrl = `${window.location.origin}/parent-login`;
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const parent of selectedParentsList) {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
          errors.push(`Geen sessie gevonden. Log opnieuw in.`);
          failCount++;
          continue;
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invitation`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              parentName: parent.name,
              parentEmail: parent.email,
              parentPassword: parent.password_hash ? '[persoonlijk wachtwoord]' : undefined,
              teacherName: teacherName,
              template: emailTemplate,
              loginLink: loginUrl,
            }),
          }
        );

        if (response.ok) {
          successCount++;
          console.log(`Email succesvol verstuurd naar ${parent.email}`);
        } else {
          failCount++;
          const errorText = await response.text();
          let errorDetail = '';
          try {
            const errorJson = JSON.parse(errorText);
            errorDetail = errorJson.error || errorJson.message || 'Onbekende fout';
          } catch {
            errorDetail = errorText || 'Onbekende fout';
          }
          errors.push(`${parent.email}: ${errorDetail}`);
          console.error(`Failed to send to ${parent.email}:`, errorDetail);
        }
      } catch (err) {
        failCount++;
        const errorMessage = err instanceof Error ? err.message : 'Onbekende fout';
        errors.push(`${parent.email}: ${errorMessage}`);
        console.error(`Error sending to ${parent.email}:`, err);
      }
    }

    setSubmitting(false);

    if (successCount > 0 && failCount === 0) {
      setSuccess(`${successCount} uitnodiging(en) succesvol verstuurd!`);
      setSelectedParents(new Set());
    } else if (successCount > 0 && failCount > 0) {
      setError(`${successCount} geslaagd, ${failCount} mislukt. Details: ${errors.join('; ')}`);
      setSelectedParents(new Set());
    } else {
      setError(`Alle uitnodigingen zijn mislukt. Details: ${errors.join('; ')}`);
    }
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
          <h2 className="text-2xl font-bold text-gray-900">Ouders Beheren</h2>
          <p className="text-gray-600 mt-1">Voeg ouders toe en verstuur uitnodigingen</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={20} />
            Ouder toevoegen
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
            {editingParent ? 'Ouder bewerken' : 'Nieuwe ouder toevoegen'}
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
                placeholder="ouder@voorbeeld.nl"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasPassword"
                checked={formData.hasPassword}
                onChange={(e) => setFormData({ ...formData, hasPassword: e.target.checked, password: '' })}
                className="w-4 h-4 text-blue-900 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="hasPassword" className="text-sm text-gray-700">
                Wachtwoord instellen (anders alleen magic link)
              </label>
            </div>

            {formData.hasPassword && (
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
                      required={formData.hasPassword}
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
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={18} />
                {submitting ? 'Bezig...' : editingParent ? 'Bijwerken' : 'Toevoegen'}
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

      {parents.length > 0 && (
        <>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <button
              onClick={() => setShowTemplateEditor(!showTemplateEditor)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="text-blue-900" size={24} />
                <div>
                  <h3 className="font-bold text-gray-900">Email Template Aanpassen</h3>
                  <p className="text-sm text-gray-600">Pas het uitnodigingsbericht aan</p>
                </div>
              </div>
              {showTemplateEditor ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {showTemplateEditor && (
              <div className="border-t border-gray-200 p-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Email Template
                    </label>
                    <button
                      onClick={resetToDefaultTemplate}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <RotateCcw size={16} />
                      Standaard herstellen
                    </button>
                  </div>
                  <textarea
                    value={emailTemplate}
                    onChange={(e) => setEmailTemplate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    rows={12}
                    placeholder="Vul hier uw email template in..."
                  />
                  <div className="mt-2 text-sm text-gray-600">
                    <p className="font-medium mb-1">Beschikbare placeholders:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div><code className="bg-gray-100 px-2 py-1 rounded">[naam-ouder]</code> - Naam van de ouder</div>
                      <div><code className="bg-gray-100 px-2 py-1 rounded">[email-ouder]</code> - Email adres</div>
                      <div><code className="bg-gray-100 px-2 py-1 rounded">[wachtwoord]</code> - Wachtwoord (indien van toepassing)</div>
                      <div><code className="bg-gray-100 px-2 py-1 rounded">[login-link]</code> - Link naar login pagina</div>
                      <div><code className="bg-gray-100 px-2 py-1 rounded">[naam-docent]</code> - Uw naam</div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Preview
                    </label>
                    {parents.length > 0 && (
                      <select
                        value={previewParentId}
                        onChange={(e) => setPreviewParentId(e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Selecteer ouder voor preview</option>
                        {parents.map(parent => (
                          <option key={parent.id} value={parent.id}>
                            {parent.name} ({parent.email})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 whitespace-pre-wrap font-mono text-sm text-gray-800 max-h-64 overflow-y-auto">
                    {getPreviewContent()}
                  </div>
                </div>

                <button
                  onClick={saveEmailTemplate}
                  disabled={templateLoading}
                  className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <Check size={18} />
                  {templateLoading ? 'Bezig met opslaan...' : 'Template Opslaan'}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {selectedParents.size === parents.length ? 'Deselecteer alles' : 'Selecteer alles'}
                </button>
                <span className="text-sm text-gray-600">
                  {selectedParents.size} geselecteerd
                </span>
              </div>
              <button
                onClick={sendInvitations}
                disabled={selectedParents.size === 0 || submitting}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
                {submitting ? 'Bezig met versturen...' : 'Uitnodigingen versturen'}
              </button>
            </div>
          </div>
        </>
      )}

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {parents.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            Nog geen ouders toegevoegd
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedParents.size === parents.length && parents.length > 0}
                      onChange={selectAll}
                      className="w-4 h-4 text-blue-900 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Naam
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    E-mail
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Login methode
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
                {parents.map((parent) => (
                  <tr key={parent.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedParents.has(parent.id)}
                        onChange={() => toggleSelectParent(parent.id)}
                        className="w-4 h-4 text-blue-900 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {parent.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {parent.email}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {parent.password_hash ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Wachtwoord + Magic Link
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Alleen Magic Link
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(parent.created_at).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(parent)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Bewerken"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(parent.id)}
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
