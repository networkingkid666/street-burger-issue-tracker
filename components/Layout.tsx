import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  List, 
  LogOut, 
  ShieldCheck,
  Menu,
  X,
  Users,
  User as UserIcon,
  FileText
} from 'lucide-react';
import { User, UserRole } from '../types';
import { StorageService } from '../services/storageService';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
}

const Layout: React.FC<LayoutProps> = ({ children, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  
  const handleLogout = async () => {
    await StorageService.signOut();
    navigate('/login');
  };

  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const isActive = location.pathname === to;
    return (
      <button
        onClick={() => {
          navigate(to);
          setIsMobileMenuOpen(false);
        }}
        className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-all rounded-lg mb-1
          ${isActive 
            ? 'bg-blue-600 text-white shadow-md' 
            : 'text-slate-600 hover:bg-slate-100'
          }`}
      >
        <Icon className="w-5 h-5 mr-3" />
        {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row transition-colors duration-300">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center text-blue-700 font-bold text-lg">
          <ShieldCheck className="w-6 h-6 mr-2" />
          SB Issue Tracker
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center">
            <ShieldCheck className="w-8 h-8 text-blue-600 mr-2" />
            <span className="text-xl font-bold text-slate-800">SB Issue Tracker</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div 
            onClick={() => navigate('/profile')}
            className="mb-6 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <img 
              src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} 
              alt={user.name}
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
            />
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 capitalize truncate">{user.role.toLowerCase()}</p>
            </div>
          </div>

          <nav className="space-y-1">
            <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem to="/issues" icon={List} label="All Issues" />
            <NavItem to="/reports" icon={FileText} label="Monthly Report" />
            {user.role !== UserRole.TECHNICIAN && (
              <NavItem to="/create" icon={PlusCircle} label="Report Issue" />
            )}
            <NavItem to="/profile" icon={UserIcon} label="My Profile" />
            
            {user.role === UserRole.ADMIN && (
              <div className="pt-4 mt-4 border-t border-slate-100">
                <div className="px-4 text-xs font-semibold text-slate-400 uppercase mb-2">Admin</div>
                <NavItem to="/users" icon={Users} label="Manage Users" />
              </div>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100 space-y-2">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;