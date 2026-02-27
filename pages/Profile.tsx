import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { StorageService } from '../services/storageService';
import { User, UserRole } from '../types';
import { Save, Lock, User as UserIcon, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await StorageService.getCurrentUser();
        if (!currentUser) {
          navigate('/login');
          return;
        }
        setUser(currentUser);
        setName(currentUser.name);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role !== UserRole.ADMIN) return;
    setSaving(true);
    setMessage(null);

    try {
      await StorageService.updateProfile(user.id, {
        name
      });
      setUser({ ...user, name });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: "Passwords do not match." });
      setSaving(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: "Password must be at least 6 characters." });
      setSaving(false);
      return;
    }

    try {
      await StorageService.updatePassword(newPassword);
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }
  
  if (!user) return null;

  const inputClasses = "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 transition-colors";
  const disabledInputClasses = "w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed";
  
  const isNameEditable = user.role === UserRole.ADMIN;

  return (
    <Layout user={user}>
      <h1 className="text-2xl font-bold text-slate-900 mb-6 animate-fade-up">My Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-up">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit transition-colors">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mr-4">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <UserIcon className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">General Information</h2>
              <p className="text-xs text-slate-500">Manage your basic account details</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isNameEditable}
                className={isNameEditable ? inputClasses : disabledInputClasses}
              />
              {!isNameEditable && (
                <p className="text-xs text-slate-400 mt-1">Full name can only be changed by an Administrator.</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={user.email}
                disabled
                className={disabledInputClasses}
              />
              <p className="text-xs text-slate-400 mt-1">Email cannot be changed manually.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Access Level</label>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-sm font-medium">
                {user.role}
              </div>
            </div>

            {isNameEditable && (
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-70 transition-all shadow-md shadow-blue-200"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="space-y-6">
          {user.role === UserRole.ADMIN ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-colors">
                <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center mr-3">
                    <Lock className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Security & Password</h2>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                    <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className={inputClasses}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                    <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className={inputClasses}
                    />
                </div>

                <div className="pt-4">
                    <button
                    type="submit"
                    disabled={saving || !newPassword}
                    className="flex items-center px-6 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 disabled:opacity-70 transition-all shadow-md"
                    >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                    Update Password
                    </button>
                </div>
                </form>
            </div>
          ) : (
            <div className="bg-blue-50 rounded-xl border border-blue-100 p-6 flex items-start">
                <ShieldAlert className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" />
                <div>
                    <h3 className="text-blue-900 font-semibold">Security & Access</h3>
                    <p className="text-blue-700 text-sm mt-1">
                        Your account credentials and security settings are managed centrally. To update your name or password, please contact an IT Administrator.
                    </p>
                </div>
            </div>
          )}

          {message && (
            <div className={`p-4 rounded-lg flex items-center border animate-fade-in ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-red-50 text-red-800 border-red-100'}`}>
               {message.type === 'success' && <CheckCircle2 className="w-5 h-5 mr-2" />}
               {message.text}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Profile;