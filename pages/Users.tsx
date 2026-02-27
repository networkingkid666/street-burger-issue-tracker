import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { StorageService } from '../services/storageService';
import { User, UserRole } from '../types';
import { 
  Plus, 
  Search, 
  Shield, 
  Trash2, 
  Loader2, 
  Mail, 
  User as UserIcon,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  KeyRound,
  Lock
} from 'lucide-react';

const Users: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.STAFF
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Reset Password Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null);
  const [newManualPassword, setNewManualPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await StorageService.getCurrentUser();
        if (!user || user.role !== UserRole.ADMIN) {
          navigate('/dashboard');
          return;
        }
        setCurrentUser(user);
        await loadUsers();
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  const loadUsers = async () => {
    try {
      const fetchedUsers = await StorageService.getUsers();
      setUsers(fetchedUsers);
    } catch (e: any) {
       setError(e.message);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      await StorageService.createUserAsAdmin(
        formData.email,
        formData.password,
        formData.name,
        formData.role
      );
      // Wait a moment for trigger to run
      await new Promise(resolve => setTimeout(resolve, 1000));
      await loadUsers();
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: UserRole.STAFF });
      showActionMessage('User created successfully');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      // Optimistic update
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      await StorageService.updateUserRole(userId, newRole);
    } catch (err) {
      console.error("Failed to update role", err);
      // Revert on fail
      await loadUsers();
    }
  };

  // Open Reset Modal
  const openResetModal = (user: User) => {
    setResetTargetUser(user);
    setNewManualPassword('');
    setResetError('');
    setIsResetModalOpen(true);
  };

  // Execute Manual Password Reset
  const handleManualPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !newManualPassword) return;

    if (newManualPassword.length < 6) {
        setResetError("Password must be at least 6 characters");
        return;
    }

    setIsResetting(true);
    setResetError('');

    try {
        await StorageService.adminUpdateUserPassword(resetTargetUser.id, newManualPassword);
        setIsResetModalOpen(false);
        showActionMessage(`Password updated for ${resetTargetUser.name}`);
    } catch (err: any) {
        setResetError(err.message || "Failed to update password");
    } finally {
        setIsResetting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Are you sure you want to remove this user from the system?")) {
      try {
        await StorageService.deleteUser(userId);
        setUsers(users.filter(u => u.id !== userId));
        showActionMessage('User removed');
      } catch (err) {
        alert("Failed to delete user.");
      }
    }
  };

  const showActionMessage = (msg: string) => {
      setActionMessage(msg);
      setTimeout(() => setActionMessage(null), 3000);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'bg-purple-100 text-purple-700 border-purple-200';
      case UserRole.TECHNICIAN: return 'bg-blue-100 text-blue-700 border-blue-200';
      case UserRole.MANAGER: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
     return (
        <Layout user={currentUser || { id: '', name: 'Guest', role: UserRole.STAFF, email: '' }}>
            <div className="p-8 text-center">
                <AlertOctagon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-800 mb-2">Error Loading Users</h2>
                <p className="text-slate-600 bg-red-50 p-3 rounded-lg inline-block border border-red-100">{error}</p>
            </div>
        </Layout>
     );
  }

  if (!currentUser) return null;

  return (
    <Layout user={currentUser}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500">Manage team members and access levels</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add User
        </button>
      </div>

      {actionMessage && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 rounded-lg flex items-center border border-emerald-100 animate-fade-in-down">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              {actionMessage}
          </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <img 
                          src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} 
                          alt={user.name} 
                          className="w-10 h-10 rounded-full border border-slate-200"
                        />
                        <div className="ml-3">
                          <div className="text-sm font-medium text-slate-900">{user.name}</div>
                          <div className="text-xs text-slate-500 flex items-center mt-0.5">
                            <Mail className="w-3 h-3 mr-1" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                        disabled={user.id === currentUser.id} // Prevent changing own role effectively to avoid lockout
                        className={`text-xs font-semibold px-2 py-1 rounded-full border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 bg-white text-slate-900 ${getRoleBadgeColor(user.role)}`}
                      >
                         <option value={UserRole.STAFF}>STAFF</option>
                         <option value={UserRole.TECHNICIAN}>TECHNICIAN</option>
                         <option value={UserRole.MANAGER}>MANAGER</option>
                         <option value={UserRole.ADMIN}>ADMIN</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={() => openResetModal(user)}
                            className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                            title="Reset Password Manually"
                        >
                            <KeyRound className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={user.id === currentUser.id}
                            className="text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors p-1"
                            title="Remove User"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Add New User</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                    placeholder="jane@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                  >
                    <option value={UserRole.STAFF}>Outlet Staff</option>
                    <option value={UserRole.TECHNICIAN}>Technician</option>
                    <option value={UserRole.MANAGER}>Manager</option>
                    <option value={UserRole.ADMIN}>Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                  placeholder="Create a password"
                  minLength={6}
                />
                <p className="text-xs text-slate-500 mt-1">Must be at least 6 characters</p>
              </div>

              {submitError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                  {submitError}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Password Reset Modal */}
      {isResetModalOpen && resetTargetUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Reset Password</h2>
                <p className="text-sm text-slate-500">For {resetTargetUser.name}</p>
              </div>
              <button 
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleManualPasswordReset} className="space-y-4">
              <div className="bg-amber-50 p-3 rounded-lg flex items-start text-xs text-amber-800 mb-4">
                <Shield className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                This will immediately overwrite the user's current password.
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="password"
                    required
                    value={newManualPassword}
                    onChange={(e) => setNewManualPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                    placeholder="Enter new password"
                    minLength={6}
                  />
                </div>
              </div>

              {resetError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                  {resetError}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
                >
                  {isResetting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Users;