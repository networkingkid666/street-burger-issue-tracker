import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import DashboardStats from '../components/DashboardStats';
import { StorageService } from '../services/storageService';
import { Issue, User, UserRole, IssueStatus } from '../types';
import { Clock, AlertTriangle, ArrowRight, Loader2, Database, RefreshCw } from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      
      const currentUser = await StorageService.getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      if (!user) setUser(currentUser);
      
      const allIssues = await StorageService.getIssues();
      if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.TECHNICIAN || currentUser.role === UserRole.MANAGER) {
        setIssues(allIssues);
      } else {
        setIssues(allIssues.filter(i => i.reportedBy === currentUser.id));
      }
      setLastUpdated(new Date());
    } catch (e: any) {
      console.error("Failed to load dashboard", e);
      setError(e.message || "Failed to load data.");
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [navigate, user]);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 30000);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  if (loading && !user) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          </div>
      );
  }

  if (error) {
      return (
          <Layout user={user || { id: '', name: 'Guest', role: UserRole.STAFF, email: '' }}>
              <div className="p-6 bg-red-50 border border-red-200 rounded-xl flex items-start">
                  <Database className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
                  <div>
                      <h3 className="text-red-800 font-bold">Database Error</h3>
                      <p className="text-red-700 mt-1">{error}</p>
                      <p className="text-red-600 text-sm mt-2">
                        Please check your Supabase SQL setup and run the provided configuration script.
                      </p>
                  </div>
              </div>
          </Layout>
      );
  }

  if (!user) return null;

  const recentIssues = [...issues].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

  const getStatusColor = (status: IssueStatus) => {
    switch (status) {
      case IssueStatus.OPEN: return 'bg-red-100 text-red-800';
      case IssueStatus.IN_PROGRESS: return 'bg-amber-100 text-amber-800';
      case IssueStatus.RESOLVED: return 'bg-emerald-100 text-emerald-800';
      case IssueStatus.CLOSED: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <Layout user={user}>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user.name.split(' ')[0]}
          </h1>
          <p className="text-slate-500">
            Overview for {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">
                Updated {lastUpdated.toLocaleTimeString()}
            </span>
            <button 
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
                title="Refresh Data"
            >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
        </div>
      </div>

      <DashboardStats issues={issues} />

      <div className="mt-8 animate-fade-up" style={{animationDelay: '100ms'}}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
          <button 
            onClick={() => navigate('/issues')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
          >
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {recentIssues.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No recent issues found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentIssues.map(issue => (
                <div 
                  key={issue.id} 
                  onClick={() => navigate(`/issues/${issue.id}`)}
                  className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${
                      issue.priority === 'CRITICAL' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {issue.priority === 'CRITICAL' ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{issue.title}</h3>
                      <p className="text-xs text-slate-500">
                        {issue.category} • Updated {new Date(issue.updatedAt).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {issue.assignedTo === user.id && (
                        <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                            Assigned to you
                        </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                        {issue.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;